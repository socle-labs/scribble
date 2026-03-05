import { createAuth } from "@scribble/auth";
import { db } from "@scribble/db";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { env } from "./env";
import { errorHandler } from "./middleware/error-handler";
import { requestId } from "./middleware/request-id";
import { exportRoutes } from "./routes/exports";
import { folderRoutes } from "./routes/folders";
import { guideRoutes } from "./routes/guides";
import { orgRoutes } from "./routes/orgs";
import { recordingRoutes } from "./routes/recordings";
import { shareRoutes } from "./routes/shares";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

const auth = createAuth();

// Global middleware
app.use("*", requestId);
app.use("*", logger());
app.use("*", secureHeaders());
app.use(
	"*",
	cors({
		origin: env.CORS_ORIGIN,
		credentials: true,
	}),
);

// Global error handler
app.onError(errorHandler);

// Readiness probe
app.get("/ready", (c) => c.json({ status: "ok" }));

// Health check
app.get("/health", async (c) => {
	const checks: Record<
		string,
		{ status: "healthy" | "unhealthy"; latencyMs?: number; error?: string }
	> = {};

	const dbStart = Date.now();
	try {
		await db.execute(sql`SELECT 1`);
		checks.database = { status: "healthy", latencyMs: Date.now() - dbStart };
	} catch (err) {
		checks.database = {
			status: "unhealthy",
			latencyMs: Date.now() - dbStart,
			error: err instanceof Error ? err.message : "Unknown error",
		};
	}

	const allHealthy = Object.values(checks).every((c) => c.status === "healthy");

	return c.json(
		{
			status: allHealthy ? "ok" : "degraded",
			timestamp: new Date().toISOString(),
			checks,
		},
		allHealthy ? 200 : 503,
	);
});

// Better Auth handler - all /api/auth/* routes
app.all("/api/auth/*", (c) => auth.handler(c.req.raw));

// API routes
app.route("/api/v1", orgRoutes);
app.route("/api/v1", guideRoutes);
app.route("/api/v1", recordingRoutes);
app.route("/api/v1", shareRoutes);
app.route("/api/v1", exportRoutes);
app.route("/api/v1", folderRoutes);

// Serve uploaded files in local storage mode
if (env.STORAGE_PROVIDER === "local") {
	const { serveStatic } = await import("hono/bun");
	app.use("/uploads/*", serveStatic({ root: env.LOCAL_STORAGE_PATH }));
}

console.log(`Scribble API starting on port ${env.PORT}`);

export default {
	port: env.PORT,
	fetch: app.fetch,
};
