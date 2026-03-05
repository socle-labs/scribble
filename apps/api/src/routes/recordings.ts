import { zValidator } from "@hono/zod-validator";
import { db, recordingEvents, recordings } from "@scribble/db";
import type { ProcessRecordingJobData } from "@scribble/shared/queues";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { processRecordingQueue } from "../lib/queue";
import { storage } from "../lib/storage";
import { authMiddleware } from "../middleware/auth";
import { orgMiddleware } from "../middleware/rbac";
import type { AppEnv } from "../types";

const router = new Hono<AppEnv>();

router.use("/*", authMiddleware);

// List recordings
router.get("/orgs/:orgId/recordings", orgMiddleware, async (c) => {
	const orgId = c.get("organizationId");

	const result = await db
		.select()
		.from(recordings)
		.where(eq(recordings.organizationId, orgId))
		.orderBy(recordings.createdAt);

	return c.json(result);
});

// Get single recording
router.get("/orgs/:orgId/recordings/:recordingId", orgMiddleware, async (c) => {
	const recordingId = c.req.param("recordingId");

	const [recording] = await db
		.select()
		.from(recordings)
		.where(eq(recordings.id, recordingId))
		.limit(1);

	if (!recording) {
		return c.json({ error: "Recording not found" }, 404);
	}

	return c.json(recording);
});

// Create recording session
router.post("/orgs/:orgId/recordings", orgMiddleware, async (c) => {
	const orgId = c.get("organizationId");
	const user = c.get("user");

	const [recording] = await db
		.insert(recordings)
		.values({
			id: crypto.randomUUID(),
			organizationId: orgId,
			createdById: user.id,
			status: "uploading",
		})
		.returning();

	return c.json(recording, 201);
});

// Upload recording events (batched from extension)
router.post(
	"/orgs/:orgId/recordings/:recordingId/events",
	orgMiddleware,
	zValidator(
		"json",
		z.object({
			events: z.array(
				z.object({
					eventType: z.string(),
					timestamp: z.string(),
					pageUrl: z.string().optional(),
					pageTitle: z.string().optional(),
					elementSelector: z.string().optional(),
					elementText: z.string().optional(),
					inputValue: z.string().optional(),
					viewport: z.object({ width: z.number(), height: z.number() }).optional(),
					coordinates: z.object({ x: z.number(), y: z.number() }).optional(),
					metadata: z.record(z.unknown()).optional(),
					screenshot: z.string().optional(), // base64 encoded
				}),
			),
		}),
	),
	async (c) => {
		const recordingId = c.req.param("recordingId");
		const body = c.req.valid("json");

		// Get current event count for indexing
		const existing = await db
			.select({ eventIndex: recordingEvents.eventIndex })
			.from(recordingEvents)
			.where(eq(recordingEvents.recordingId, recordingId))
			.orderBy(recordingEvents.eventIndex);

		let nextIndex = existing.length > 0 ? existing[existing.length - 1]!.eventIndex + 1 : 0;

		for (const event of body.events) {
			let screenshotKey: string | undefined;

			// Store screenshot if provided
			if (event.screenshot) {
				screenshotKey = `recordings/${recordingId}/${nextIndex}.png`;
				const buffer = Buffer.from(event.screenshot, "base64");
				await storage.upload(screenshotKey, buffer, "image/png");
			}

			await db.insert(recordingEvents).values({
				id: crypto.randomUUID(),
				recordingId,
				eventIndex: nextIndex,
				eventType: event.eventType,
				timestamp: new Date(event.timestamp),
				pageUrl: event.pageUrl,
				pageTitle: event.pageTitle,
				elementSelector: event.elementSelector,
				elementText: event.elementText,
				inputValue: event.inputValue,
				screenshotStorageKey: screenshotKey,
				viewport: event.viewport,
				coordinates: event.coordinates,
				metadata: event.metadata ?? {},
			});

			nextIndex++;
		}

		return c.json({ success: true, eventsStored: body.events.length });
	},
);

// Finish recording and trigger processing
router.post("/orgs/:orgId/recordings/:recordingId/finish", orgMiddleware, async (c) => {
	const recordingId = c.req.param("recordingId");
	const orgId = c.get("organizationId");

	await db
		.update(recordings)
		.set({ status: "processing", updatedAt: new Date() })
		.where(eq(recordings.id, recordingId));

	// Queue processing job
	await processRecordingQueue.add("process", {
		recordingId,
		organizationId: orgId,
	} satisfies ProcessRecordingJobData);

	return c.json({ success: true, status: "processing" });
});

export { router as recordingRoutes };
