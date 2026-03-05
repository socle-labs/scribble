import { createEnv, port } from "@scribble/shared/env";
import { z } from "zod";

export const env = createEnv(
	z.object({
		DATABASE_URL: z.string().default("postgres://scribble:scribble@localhost:5432/scribble"),
		REDIS_URL: z.string().default("redis://localhost:6379"),
		WORKER_HEALTH_PORT: port.default(3002),
	}),
);
