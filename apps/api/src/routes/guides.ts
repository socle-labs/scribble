import { zValidator } from "@hono/zod-validator";
import { db, guideSteps, guides } from "@scribble/db";
import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { orgMiddleware, requirePermission } from "../middleware/rbac";
import type { AppEnv } from "../types";

const router = new Hono<AppEnv>();

router.use("/*", authMiddleware);

// List guides for an org
router.get("/orgs/:orgId/guides", orgMiddleware, async (c) => {
	const orgId = c.get("organizationId");
	const folderId = c.req.query("folderId");

	const conditions = [eq(guides.organizationId, orgId)];
	if (folderId) {
		conditions.push(eq(guides.folderId, folderId));
	}

	const result = await db
		.select()
		.from(guides)
		.where(and(...conditions))
		.orderBy(guides.updatedAt);

	return c.json(result);
});

// Get single guide with steps
router.get("/orgs/:orgId/guides/:guideId", orgMiddleware, async (c) => {
	const guideId = c.req.param("guideId");

	const [guide] = await db.select().from(guides).where(eq(guides.id, guideId)).limit(1);

	if (!guide) {
		return c.json({ error: "Guide not found" }, 404);
	}

	const steps = await db
		.select()
		.from(guideSteps)
		.where(eq(guideSteps.guideId, guideId))
		.orderBy(asc(guideSteps.stepNumber));

	return c.json({ ...guide, steps });
});

// Create guide
router.post(
	"/orgs/:orgId/guides",
	orgMiddleware,
	requirePermission("guide.create"),
	zValidator(
		"json",
		z.object({
			title: z.string().min(1),
			description: z.string().optional(),
			folderId: z.string().optional(),
		}),
	),
	async (c) => {
		const orgId = c.get("organizationId");
		const user = c.get("user");
		const body = c.req.valid("json");

		const [guide] = await db
			.insert(guides)
			.values({
				id: crypto.randomUUID(),
				organizationId: orgId,
				createdById: user.id,
				title: body.title,
				description: body.description,
				folderId: body.folderId,
			})
			.returning();

		return c.json(guide, 201);
	},
);

// Update guide
router.patch(
	"/orgs/:orgId/guides/:guideId",
	orgMiddleware,
	requirePermission("guide.edit"),
	zValidator(
		"json",
		z.object({
			title: z.string().min(1).optional(),
			description: z.string().optional(),
			status: z.enum(["draft", "published", "archived"]).optional(),
			folderId: z.string().nullable().optional(),
			isPublic: z.boolean().optional(),
			allowEmbed: z.boolean().optional(),
		}),
	),
	async (c) => {
		const guideId = c.req.param("guideId");
		const body = c.req.valid("json");

		const [updated] = await db
			.update(guides)
			.set({ ...body, updatedAt: new Date() })
			.where(eq(guides.id, guideId))
			.returning();

		return c.json(updated);
	},
);

// Delete guide
router.delete(
	"/orgs/:orgId/guides/:guideId",
	orgMiddleware,
	requirePermission("guide.delete"),
	async (c) => {
		const guideId = c.req.param("guideId");

		await db.delete(guides).where(eq(guides.id, guideId));

		return c.json({ success: true });
	},
);

// --- Guide Steps ---

// Add step to guide
router.post(
	"/orgs/:orgId/guides/:guideId/steps",
	orgMiddleware,
	requirePermission("guide.edit"),
	zValidator(
		"json",
		z.object({
			title: z.string().min(1),
			description: z.string().optional(),
			actionType: z.enum(["click", "type", "navigate", "scroll", "select", "custom"]).optional(),
			pageUrl: z.string().optional(),
			pageTitle: z.string().optional(),
			elementSelector: z.string().optional(),
		}),
	),
	async (c) => {
		const guideId = c.req.param("guideId");
		const body = c.req.valid("json");

		// Get next step number
		const existingSteps = await db
			.select({ stepNumber: guideSteps.stepNumber })
			.from(guideSteps)
			.where(eq(guideSteps.guideId, guideId))
			.orderBy(asc(guideSteps.stepNumber));

		const nextNumber =
			existingSteps.length > 0 ? existingSteps[existingSteps.length - 1]!.stepNumber + 1 : 1;

		const [step] = await db
			.insert(guideSteps)
			.values({
				id: crypto.randomUUID(),
				guideId,
				stepNumber: nextNumber,
				title: body.title,
				description: body.description,
				actionType: body.actionType ?? "click",
				pageUrl: body.pageUrl,
				pageTitle: body.pageTitle,
				elementSelector: body.elementSelector,
			})
			.returning();

		return c.json(step, 201);
	},
);

// Update step
router.patch(
	"/orgs/:orgId/guides/:guideId/steps/:stepId",
	orgMiddleware,
	requirePermission("guide.edit"),
	zValidator(
		"json",
		z.object({
			title: z.string().min(1).optional(),
			description: z.string().optional(),
			stepNumber: z.number().int().positive().optional(),
			annotations: z.any().optional(),
		}),
	),
	async (c) => {
		const stepId = c.req.param("stepId");
		const body = c.req.valid("json");

		const [updated] = await db
			.update(guideSteps)
			.set({ ...body, updatedAt: new Date() })
			.where(eq(guideSteps.id, stepId))
			.returning();

		return c.json(updated);
	},
);

// Delete step
router.delete(
	"/orgs/:orgId/guides/:guideId/steps/:stepId",
	orgMiddleware,
	requirePermission("guide.edit"),
	async (c) => {
		const stepId = c.req.param("stepId");

		await db.delete(guideSteps).where(eq(guideSteps.id, stepId));

		return c.json({ success: true });
	},
);

// Reorder steps
router.put(
	"/orgs/:orgId/guides/:guideId/steps/reorder",
	orgMiddleware,
	requirePermission("guide.edit"),
	zValidator(
		"json",
		z.object({
			stepIds: z.array(z.string()),
		}),
	),
	async (c) => {
		const body = c.req.valid("json");

		for (let i = 0; i < body.stepIds.length; i++) {
			await db
				.update(guideSteps)
				.set({ stepNumber: i + 1, updatedAt: new Date() })
				.where(eq(guideSteps.id, body.stepIds[i]!));
		}

		return c.json({ success: true });
	},
);

export { router as guideRoutes };
