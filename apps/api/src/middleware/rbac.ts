import { resolvePermissions } from "@scribble/auth/permissions";
import { type Permission, hasPermission } from "@scribble/shared";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types";

/**
 * Organization membership middleware - resolves org and checks membership.
 * Must be used after authMiddleware.
 * Expects :orgId in route params.
 */
export const orgMiddleware = createMiddleware<AppEnv>(async (c, next) => {
	const user = c.get("user");
	const orgId = c.req.param("orgId");

	if (!orgId) {
		return c.json({ error: "Organization ID required" }, 400);
	}

	const resolved = await resolvePermissions(user.id, orgId);
	if (!resolved) {
		return c.json({ error: "Not a member of this organization" }, 403);
	}

	c.set("organizationId", orgId);
	c.set("permissions", resolved.permissions);

	await next();
});

/**
 * Permission check middleware factory.
 * Must be used after orgMiddleware.
 */
export function requirePermission(permission: Permission) {
	return createMiddleware<AppEnv>(async (c, next) => {
		const permissions = c.get("permissions");

		if (!hasPermission(permissions, permission)) {
			return c.json({ error: "Insufficient permissions", required: permission }, 403);
		}

		await next();
	});
}
