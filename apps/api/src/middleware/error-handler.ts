import type { Context } from "hono";
import { ZodError } from "zod";
import type { AppEnv } from "../types";

/**
 * Global error handler — returns consistent JSON error responses
 * and logs structured error information.
 */
export function errorHandler(err: Error, c: Context<AppEnv>): Response {
	const requestId = c.get("requestId") as string | undefined;

	// Zod validation errors
	if (err instanceof ZodError) {
		const message = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
		console.error(
			JSON.stringify({
				level: "warn",
				msg: "Validation error",
				requestId,
				path: c.req.path,
				errors: err.errors,
			}),
		);
		return c.json({ error: message }, 400);
	}

	// Known HTTP errors with status
	if ("status" in err && typeof (err as { status: number }).status === "number") {
		const status = (err as { status: number }).status;
		console.error(
			JSON.stringify({
				level: "warn",
				msg: err.message,
				requestId,
				path: c.req.path,
				status,
			}),
		);
		return c.json({ error: err.message }, status as 400);
	}

	// Unexpected errors
	console.error(
		JSON.stringify({
			level: "error",
			msg: "Internal server error",
			requestId,
			path: c.req.path,
			method: c.req.method,
			error: err.message,
			stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
		}),
	);

	return c.json({ error: "Internal server error" }, 500);
}
