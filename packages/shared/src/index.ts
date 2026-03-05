export {
	PERMISSIONS,
	PREDEFINED_ROLES,
	hasPermission,
	getPermissionsForRole,
	type Permission,
	type PredefinedRole,
} from "./types";
export {
	guideStatusSchema,
	actionTypeSchema,
	recordingStatusSchema,
	exportFormatSchema,
	exportStatusSchema,
	shareVisibilitySchema,
	type GuideStatus,
	type ActionType,
	type RecordingStatus,
	type ExportFormat,
	type ExportStatus,
	type ShareVisibility,
} from "./types";

/**
 * Parse a Redis URL into a BullMQ-compatible connection object.
 */
export function parseRedisUrl(url: string): { host: string; port: number } {
	const parsed = new URL(url);
	return { host: parsed.hostname, port: Number(parsed.port) || 6379 };
}
