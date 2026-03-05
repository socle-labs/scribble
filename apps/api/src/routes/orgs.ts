import { zValidator } from "@hono/zod-validator";
import { db, invitations, orgMembers, organizations, users } from "@scribble/db";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { orgMiddleware, requirePermission } from "../middleware/rbac";
import type { AppEnv } from "../types";

const router = new Hono<AppEnv>();

router.use("/*", authMiddleware);

// List user's organizations
router.get("/orgs", async (c) => {
	const user = c.get("user");

	const orgs = await db
		.select({
			id: organizations.id,
			name: organizations.name,
			slug: organizations.slug,
			logo: organizations.logo,
			role: orgMembers.role,
		})
		.from(orgMembers)
		.innerJoin(organizations, eq(orgMembers.organizationId, organizations.id))
		.where(eq(orgMembers.userId, user.id));

	return c.json(orgs);
});

// Get organization details
router.get("/orgs/:orgId", orgMiddleware, async (c) => {
	const orgId = c.get("organizationId");

	const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);

	if (!org) {
		return c.json({ error: "Organization not found" }, 404);
	}

	return c.json(org);
});

// Update organization
router.patch(
	"/orgs/:orgId",
	orgMiddleware,
	requirePermission("org.update"),
	zValidator(
		"json",
		z.object({
			name: z.string().min(1).optional(),
		}),
	),
	async (c) => {
		const orgId = c.get("organizationId");
		const body = c.req.valid("json");

		const [updated] = await db
			.update(organizations)
			.set(body)
			.where(eq(organizations.id, orgId))
			.returning();

		return c.json(updated);
	},
);

// List members
router.get("/orgs/:orgId/members", orgMiddleware, async (c) => {
	const orgId = c.get("organizationId");

	const members = await db
		.select({
			id: orgMembers.id,
			userId: orgMembers.userId,
			role: orgMembers.role,
			createdAt: orgMembers.createdAt,
			userName: users.name,
			userEmail: users.email,
		})
		.from(orgMembers)
		.innerJoin(users, eq(orgMembers.userId, users.id))
		.where(eq(orgMembers.organizationId, orgId));

	return c.json(members);
});

// Invite member
router.post(
	"/orgs/:orgId/invitations",
	orgMiddleware,
	requirePermission("member.invite"),
	zValidator(
		"json",
		z.object({
			email: z.string().email(),
			role: z.string().default("viewer"),
		}),
	),
	async (c) => {
		const orgId = c.get("organizationId");
		const user = c.get("user");
		const body = c.req.valid("json");

		const [invitation] = await db
			.insert(invitations)
			.values({
				id: crypto.randomUUID(),
				organizationId: orgId,
				email: body.email,
				role: body.role,
				inviterId: user.id,
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			})
			.returning();

		return c.json(invitation, 201);
	},
);

// Remove member
router.delete(
	"/orgs/:orgId/members/:memberId",
	orgMiddleware,
	requirePermission("member.remove"),
	async (c) => {
		const orgId = c.get("organizationId");
		const memberId = c.req.param("memberId");

		await db
			.delete(orgMembers)
			.where(and(eq(orgMembers.id, memberId), eq(orgMembers.organizationId, orgId)));

		return c.json({ success: true });
	},
);

export { router as orgRoutes };
