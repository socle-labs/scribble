import { z } from "zod";

export const guideStatusSchema = z.enum(["draft", "published", "archived"]);
export type GuideStatus = z.infer<typeof guideStatusSchema>;

export const actionTypeSchema = z.enum(["click", "type", "navigate", "scroll", "select", "custom"]);
export type ActionType = z.infer<typeof actionTypeSchema>;

export const recordingStatusSchema = z.enum(["uploading", "processing", "completed", "failed"]);
export type RecordingStatus = z.infer<typeof recordingStatusSchema>;

export const exportFormatSchema = z.enum(["pdf", "markdown", "html"]);
export type ExportFormat = z.infer<typeof exportFormatSchema>;

export const exportStatusSchema = z.enum(["pending", "processing", "completed", "failed"]);
export type ExportStatus = z.infer<typeof exportStatusSchema>;

export const shareVisibilitySchema = z.enum(["public", "password", "org_only"]);
export type ShareVisibility = z.infer<typeof shareVisibilitySchema>;

// Permissions
export const PERMISSIONS = [
	"org.update",
	"org.delete",
	"guide.create",
	"guide.edit",
	"guide.delete",
	"guide.share",
	"member.invite",
	"member.remove",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PREDEFINED_ROLES = {
	owner: PERMISSIONS,
	editor: ["guide.create", "guide.edit", "guide.delete", "guide.share"] as const,
	viewer: [] as const,
} as const;

export type PredefinedRole = keyof typeof PREDEFINED_ROLES;

export function hasPermission(permissions: readonly string[], permission: Permission): boolean {
	return permissions.includes(permission);
}

export function getPermissionsForRole(role: string): readonly Permission[] {
	if (role in PREDEFINED_ROLES) {
		return PREDEFINED_ROLES[role as PredefinedRole];
	}
	return [];
}
