import { zValidator } from "@hono/zod-validator";
import { db, exports as exportsTable } from "@scribble/db";
import type { ExportGuideJobData } from "@scribble/shared/queues";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { exportGuideQueue } from "../lib/queue";
import { storage } from "../lib/storage";
import { authMiddleware } from "../middleware/auth";
import { orgMiddleware } from "../middleware/rbac";
import type { AppEnv } from "../types";

const router = new Hono<AppEnv>();

router.use("/*", authMiddleware);

// Trigger export
router.post(
	"/orgs/:orgId/guides/:guideId/exports",
	orgMiddleware,
	zValidator(
		"json",
		z.object({
			format: z.enum(["pdf", "markdown", "html"]),
		}),
	),
	async (c) => {
		const guideId = c.req.param("guideId");
		const body = c.req.valid("json");

		const exportId = crypto.randomUUID();

		const [exportRecord] = await db
			.insert(exportsTable)
			.values({
				id: exportId,
				guideId,
				format: body.format,
				status: "pending",
			})
			.returning();

		await exportGuideQueue.add("export", {
			exportId,
			guideId,
			format: body.format,
		} satisfies ExportGuideJobData);

		return c.json(exportRecord, 201);
	},
);

// Get export status
router.get("/orgs/:orgId/guides/:guideId/exports/:exportId", orgMiddleware, async (c) => {
	const exportId = c.req.param("exportId");

	const [exportRecord] = await db
		.select()
		.from(exportsTable)
		.where(eq(exportsTable.id, exportId))
		.limit(1);

	if (!exportRecord) {
		return c.json({ error: "Export not found" }, 404);
	}

	const result: Record<string, unknown> = { ...exportRecord };
	if (exportRecord.status === "completed" && exportRecord.storageKey) {
		result.downloadUrl = storage.getUrl(exportRecord.storageKey);
	}

	return c.json(result);
});

export { router as exportRoutes };
