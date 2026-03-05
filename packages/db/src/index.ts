import { createEnv } from "@scribble/shared/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";
import * as schema from "./schema";

const dbEnv = createEnv(
	z.object({
		DATABASE_URL: z.string().default("postgres://scribble:scribble@localhost:5432/scribble"),
	}),
);

const client = postgres(dbEnv.DATABASE_URL);
export const db = drizzle(client, { schema });

export type Database = typeof db;

export * from "./schema";
