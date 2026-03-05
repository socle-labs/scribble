import { db } from "@scribble/db";
import { orgMembers } from "@scribble/db/schema";
import {
	PREDEFINED_ROLES,
	type Permission,
	type PredefinedRole,
	hasPermission,
} from "@scribble/shared";
import { and, eq } from "drizzle-orm";

export interface ResolvedPermissions {
	role: string;
	permissions: readonly Permission[];
}

/**
 * Resolve a user's effective permissions for a given org.
 */
export async function resolvePermissions(
	userId: string,
	organizationId: string,
): Promise<ResolvedPermissions | null> {
	const member = await db
		.select()
		.from(orgMembers)
		.where(and(eq(orgMembers.organizationId, organizationId), eq(orgMembers.userId, userId)))
		.limit(1);

	if (member.length === 0) {
		return null;
	}

	const orgMember = member[0]!;
	const role = orgMember.role;

	if (role in PREDEFINED_ROLES) {
		return {
			role,
			permissions: PREDEFINED_ROLES[role as PredefinedRole],
		};
	}

	return { role, permissions: [] };
}

/**
 * Check if a user has a specific permission in a given context.
 */
export async function checkPermission(
	userId: string,
	organizationId: string,
	permission: Permission,
): Promise<boolean> {
	const resolved = await resolvePermissions(userId, organizationId);
	if (!resolved) return false;
	return hasPermission(resolved.permissions, permission);
}
