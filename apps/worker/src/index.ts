import { createServer } from "node:http";
import { parseRedisUrl } from "@scribble/shared";
import {
	type ExportGuideJobData,
	type ProcessRecordingJobData,
	QUEUE_EXPORT_GUIDE,
	QUEUE_GENERATE_SCREENSHOTS,
	QUEUE_PROCESS_RECORDING,
} from "@scribble/shared/queues";
import { Worker } from "bullmq";
import { env } from "./env";
import { handleExportGuide } from "./jobs/export-guide";
import { handleProcessRecording } from "./jobs/process-recording";

const connection = parseRedisUrl(env.REDIS_URL);

console.log(`Scribble Worker starting (redis: ${env.REDIS_URL})...`);

// --- Workers ---

const processRecordingWorker = new Worker<ProcessRecordingJobData>(
	QUEUE_PROCESS_RECORDING,
	async (job) => {
		console.log(`[${QUEUE_PROCESS_RECORDING}] Processing job ${job.id}`);
		await handleProcessRecording(job.data);
	},
	{ connection, concurrency: 2 },
);

const generateScreenshotsWorker = new Worker(
	QUEUE_GENERATE_SCREENSHOTS,
	async (job) => {
		console.log(`[${QUEUE_GENERATE_SCREENSHOTS}] Processing job ${job.id}`);
		// Screenshot post-processing (cropping, annotations) — to be implemented
	},
	{ connection, concurrency: 2 },
);

const exportGuideWorker = new Worker<ExportGuideJobData>(
	QUEUE_EXPORT_GUIDE,
	async (job) => {
		console.log(`[${QUEUE_EXPORT_GUIDE}] Processing job ${job.id}`);
		await handleExportGuide(job.data);
	},
	{ connection, concurrency: 2 },
);

// --- Error handlers ---

const allWorkers = [processRecordingWorker, generateScreenshotsWorker, exportGuideWorker];

for (const worker of allWorkers) {
	worker.on("failed", (job, err) => {
		console.error(`Job ${job?.id} in ${worker.name} failed:`, err.message);
	});
	worker.on("completed", (job) => {
		console.log(`Job ${job.id} in ${worker.name} completed`);
	});
}

console.log("Scribble Worker ready — listening for jobs");

// --- Health check HTTP server ---

const healthServer = createServer((req, res) => {
	res.setHeader("Content-Type", "application/json");

	if (req.url === "/health") {
		const workerStatuses = allWorkers.map((w) => ({
			name: w.name,
			running: w.isRunning(),
		}));
		const allRunning = workerStatuses.every((w) => w.running);
		res.writeHead(allRunning ? 200 : 503);
		res.end(
			JSON.stringify({
				status: allRunning ? "ok" : "degraded",
				timestamp: new Date().toISOString(),
				workers: workerStatuses,
			}),
		);
		return;
	}

	if (req.url === "/ready") {
		res.writeHead(200);
		res.end(JSON.stringify({ status: "ok" }));
		return;
	}

	res.writeHead(404);
	res.end(JSON.stringify({ error: "Not Found" }));
});

healthServer.on("error", (err: NodeJS.ErrnoException) => {
	if (err.code === "EADDRINUSE") {
		console.warn(
			`Worker health server port ${env.WORKER_HEALTH_PORT} in use — skipping health endpoint`,
		);
	} else {
		console.error("Worker health server error:", err);
	}
});
healthServer.listen(env.WORKER_HEALTH_PORT, () => {
	console.log(`Worker health server on port ${env.WORKER_HEALTH_PORT}`);
});

// --- Graceful shutdown ---

const shutdown = async () => {
	console.log("Worker shutting down...");
	await Promise.all(allWorkers.map((w) => w.close()));
	process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
