import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations, users } from "./auth";

// Folders (hierarchical grouping for guides)
export const folders = pgTable(
	"folders",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		parentId: text("parent_id"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		index("folders_org_idx").on(table.organizationId),
		index("folders_parent_idx").on(table.parentId),
	],
);

// Guides
export const guides = pgTable(
	"guides",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		createdById: text("created_by_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		description: text("description"),
		status: text("status").notNull().default("draft"),
		slug: text("slug"),
		folderId: text("folder_id").references(() => folders.id, { onDelete: "set null" }),
		isPublic: boolean("is_public").notNull().default(false),
		allowEmbed: boolean("allow_embed").notNull().default(false),
		viewCount: integer("view_count").notNull().default(0),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		index("guides_org_idx").on(table.organizationId),
		index("guides_folder_idx").on(table.folderId),
		index("guides_created_by_idx").on(table.createdById),
	],
);

// Guide Steps
export const guideSteps = pgTable(
	"guide_steps",
	{
		id: text("id").primaryKey(),
		guideId: text("guide_id")
			.notNull()
			.references(() => guides.id, { onDelete: "cascade" }),
		stepNumber: integer("step_number").notNull(),
		title: text("title").notNull(),
		description: text("description"),
		screenshotUrl: text("screenshot_url"),
		screenshotStorageKey: text("screenshot_storage_key"),
		elementSelector: text("element_selector"),
		actionType: text("action_type").notNull().default("click"),
		pageUrl: text("page_url"),
		pageTitle: text("page_title"),
		annotations: jsonb("annotations")
			.$type<{
				highlights?: { x: number; y: number; width: number; height: number }[];
				arrows?: { startX: number; startY: number; endX: number; endY: number }[];
				blurRegions?: { x: number; y: number; width: number; height: number }[];
			}>()
			.default({}),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		index("guide_steps_guide_idx").on(table.guideId),
		index("guide_steps_order_idx").on(table.guideId, table.stepNumber),
	],
);

// Recordings
export const recordings = pgTable(
	"recordings",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		createdById: text("created_by_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		guideId: text("guide_id").references(() => guides.id, { onDelete: "set null" }),
		status: text("status").notNull().default("uploading"),
		metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		index("recordings_org_idx").on(table.organizationId),
		index("recordings_created_by_idx").on(table.createdById),
	],
);

// Recording Events
export const recordingEvents = pgTable(
	"recording_events",
	{
		id: text("id").primaryKey(),
		recordingId: text("recording_id")
			.notNull()
			.references(() => recordings.id, { onDelete: "cascade" }),
		eventIndex: integer("event_index").notNull(),
		eventType: text("event_type").notNull(),
		timestamp: timestamp("timestamp").notNull(),
		pageUrl: text("page_url"),
		pageTitle: text("page_title"),
		elementSelector: text("element_selector"),
		elementText: text("element_text"),
		inputValue: text("input_value"),
		screenshotStorageKey: text("screenshot_storage_key"),
		viewport: jsonb("viewport").$type<{ width: number; height: number }>(),
		coordinates: jsonb("coordinates").$type<{ x: number; y: number }>(),
		metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
	},
	(table) => [
		index("recording_events_recording_idx").on(table.recordingId),
		index("recording_events_order_idx").on(table.recordingId, table.eventIndex),
	],
);

// Shares
export const shares = pgTable(
	"shares",
	{
		id: text("id").primaryKey(),
		guideId: text("guide_id")
			.notNull()
			.references(() => guides.id, { onDelete: "cascade" }),
		token: text("token").notNull().unique(),
		visibility: text("visibility").notNull().default("public"),
		passwordHash: text("password_hash"),
		expiresAt: timestamp("expires_at"),
		customSlug: text("custom_slug").unique(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [index("shares_guide_idx").on(table.guideId)],
);

// Exports
export const exports = pgTable(
	"exports",
	{
		id: text("id").primaryKey(),
		guideId: text("guide_id")
			.notNull()
			.references(() => guides.id, { onDelete: "cascade" }),
		format: text("format").notNull(),
		status: text("status").notNull().default("pending"),
		storageKey: text("storage_key"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [index("exports_guide_idx").on(table.guideId)],
);

// Guide Comments
export const guideComments = pgTable(
	"guide_comments",
	{
		id: text("id").primaryKey(),
		guideId: text("guide_id")
			.notNull()
			.references(() => guides.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		stepId: text("step_id").references(() => guideSteps.id, { onDelete: "cascade" }),
		content: text("content").notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [index("guide_comments_guide_idx").on(table.guideId)],
);

// API Keys
export const apiKeys = pgTable(
	"api_keys",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		keyHash: text("key_hash").notNull(),
		prefix: text("prefix").notNull(),
		lastUsedAt: timestamp("last_used_at"),
		expiresAt: timestamp("expires_at"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		index("api_keys_org_idx").on(table.organizationId),
		index("api_keys_prefix_idx").on(table.prefix),
	],
);
