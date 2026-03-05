import { createEnv, csvList, port } from "@scribble/shared/env";
import { z } from "zod";

export const env = createEnv(
	z.object({
		// Server
		PORT: port.default(3000),
		CORS_ORIGIN: z.string().url().default("http://localhost:3001"),
		API_BASE_URL: z.string().url().optional(),
		TRUSTED_ORIGINS: csvList,

		// Database
		DATABASE_URL: z.string().url().default("postgres://scribble:scribble@localhost:5432/scribble"),

		// Redis
		REDIS_URL: z.string().default("redis://localhost:6379"),

		// Storage
		STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
		LOCAL_STORAGE_PATH: z.string().default("./uploads"),
		S3_BUCKET: z.string().optional(),
		S3_REGION: z.string().optional(),
		S3_ACCESS_KEY_ID: z.string().optional(),
		S3_SECRET_ACCESS_KEY: z.string().optional(),
		S3_ENDPOINT: z.string().optional(),
	}),
);
