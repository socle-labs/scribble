import { zValidator } from "@hono/zod-validator";
import { db, guideSteps, guides, shares } from "@scribble/db";
import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { orgMiddleware, requirePermission } from "../middleware/rbac";
import type { AppEnv } from "../types";

const router = new Hono<AppEnv>();

// Public share view (no auth required)
router.get("/share/:token", async (c) => {
	const token = c.req.param("token");

	const [share] = await db.select().from(shares).where(eq(shares.token, token)).limit(1);

	if (!share) {
		return c.json({ error: "Share not found" }, 404);
	}

	if (share.expiresAt && share.expiresAt < new Date()) {
		return c.json({ error: "Share link has expired" }, 410);
	}

	if (share.visibility === "password") {
		const password = c.req.header("x-share-password");
		if (!password) {
			return c.json({ error: "Password required", requiresPassword: true }, 401);
		}
		const hash = await Bun.password.hash(password);
		const valid = share.passwordHash
			? await Bun.password.verify(password, share.passwordHash)
			: false;
		if (!valid) {
			return c.json({ error: "Invalid password" }, 401);
		}
	}

	const [guide] = await db.select().from(guides).where(eq(guides.id, share.guideId)).limit(1);

	if (!guide) {
		return c.json({ error: "Guide not found" }, 404);
	}

	// Increment view count
	await db
		.update(guides)
		.set({ viewCount: guide.viewCount + 1 })
		.where(eq(guides.id, guide.id));

	const steps = await db
		.select()
		.from(guideSteps)
		.where(eq(guideSteps.guideId, guide.id))
		.orderBy(asc(guideSteps.stepNumber));

	return c.json({ guide: { ...guide, steps }, share });
});

// --- Authenticated share management ---

router.use("/orgs/*", authMiddleware);

// List shares for a guide
router.get("/orgs/:orgId/guides/:guideId/shares", orgMiddleware, async (c) => {
	const guideId = c.req.param("guideId");

	const result = await db.select().from(shares).where(eq(shares.guideId, guideId));

	return c.json(result);
});

// Create share link
router.post(
	"/orgs/:orgId/guides/:guideId/shares",
	orgMiddleware,
	requirePermission("guide.share"),
	zValidator(
		"json",
		z.object({
			visibility: z.enum(["public", "password", "org_only"]).optional(),
			password: z.string().optional(),
			expiresAt: z.string().optional(),
			customSlug: z.string().optional(),
		}),
	),
	async (c) => {
		const guideId = c.req.param("guideId");
		const body = c.req.valid("json");

		let passwordHash: string | undefined;
		if (body.visibility === "password" && body.password) {
			passwordHash = await Bun.password.hash(body.password);
		}

		const [share] = await db
			.insert(shares)
			.values({
				id: crypto.randomUUID(),
				guideId,
				token: crypto.randomUUID(),
				visibility: body.visibility ?? "public",
				passwordHash,
				expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
				customSlug: body.customSlug,
			})
			.returning();

		return c.json(share, 201);
	},
);

// Delete share link
router.delete(
	"/orgs/:orgId/guides/:guideId/shares/:shareId",
	orgMiddleware,
	requirePermission("guide.share"),
	async (c) => {
		const shareId = c.req.param("shareId");

		await db.delete(shares).where(eq(shares.id, shareId));

		return c.json({ success: true });
	},
);

export { router as shareRoutes };
