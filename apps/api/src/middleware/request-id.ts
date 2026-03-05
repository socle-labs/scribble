import type { Context, Next } from "hono";
import type { AppEnv } from "../types";

/**
 * Adds a unique request ID to each request for tracing.
 * Uses the incoming X-Request-ID header if present, otherwise generates one.
 */
export async function requestId(c: Context<AppEnv>, next: Next) {
	const id = c.req.header("x-request-id") ?? crypto.randomUUID();
	c.set("requestId", id);
	c.header("X-Request-ID", id);
	await next();
}
