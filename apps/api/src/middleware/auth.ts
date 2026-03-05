import { createAuth } from "@scribble/auth";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types";

const auth = createAuth();

/**
 * Authentication middleware - validates session and attaches user to context.
 */
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	});

	if (!session?.user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	c.set("user", {
		id: session.user.id,
		email: session.user.email,
		name: session.user.name,
	});

	await next();
});
