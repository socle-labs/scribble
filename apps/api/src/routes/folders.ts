import { zValidator } from "@hono/zod-validator";
import { db, folders, guides } from "@scribble/db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { orgMiddleware } from "../middleware/rbac";
import type { AppEnv } from "../types";

const router = new Hono<AppEnv>();

router.use("/*", authMiddleware);

// List folders
router.get("/orgs/:orgId/folders", orgMiddleware, async (c) => {
	const orgId = c.get("organizationId");

	const result = await db
		.select()
		.from(folders)
		.where(eq(folders.organizationId, orgId))
		.orderBy(folders.name);

	return c.json(result);
});

// Create folder
router.post(
	"/orgs/:orgId/folders",
	orgMiddleware,
	zValidator(
		"json",
		z.object({
			name: z.string().min(1),
			parentId: z.string().optional(),
		}),
	),
	async (c) => {
		const orgId = c.get("organizationId");
		const body = c.req.valid("json");

		const [folder] = await db
			.insert(folders)
			.values({
				id: crypto.randomUUID(),
				organizationId: orgId,
				name: body.name,
				parentId: body.parentId,
			})
			.returning();

		return c.json(folder, 201);
	},
);

// Update folder
router.patch(
	"/orgs/:orgId/folders/:folderId",
	orgMiddleware,
	zValidator(
		"json",
		z.object({
			name: z.string().min(1).optional(),
			parentId: z.string().nullable().optional(),
		}),
	),
	async (c) => {
		const folderId = c.req.param("folderId");
		const body = c.req.valid("json");

		const [updated] = await db
			.update(folders)
			.set({ ...body, updatedAt: new Date() })
			.where(eq(folders.id, folderId))
			.returning();

		return c.json(updated);
	},
);

// Delete folder
router.delete("/orgs/:orgId/folders/:folderId", orgMiddleware, async (c) => {
	const folderId = c.req.param("folderId");

	// Move guides in this folder to no folder
	await db.update(guides).set({ folderId: null }).where(eq(guides.folderId, folderId));

	await db.delete(folders).where(eq(folders.id, folderId));

	return c.json({ success: true });
});

export { router as folderRoutes };
