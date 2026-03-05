import { z } from "zod";

/**
 * Helper to create validated env configs.
 * Parses process.env against a Zod schema at import time,
 * throwing a clear error if required vars are missing.
 */
export function createEnv<T extends z.ZodRawShape>(schema: z.ZodObject<T>): z.infer<typeof schema> {
	const result = schema.safeParse(process.env);

	if (!result.success) {
		const formatted = result.error.issues
			.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
			.join("\n");

		throw new Error(`Environment validation failed:\n${formatted}`);
	}

	return result.data;
}

// Common env var transforms
export const port = z.coerce.number().int().positive();
export const booleanStr = z
	.enum(["true", "false", "1", "0"])
	.transform((v) => v === "true" || v === "1")
	.default("false");
export const booleanStrTrue = z
	.enum(["true", "false", "1", "0"])
	.transform((v) => v === "true" || v === "1")
	.default("true");
export const csvList = z
	.string()
	.transform((v) =>
		v
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean),
	)
	.default("");
