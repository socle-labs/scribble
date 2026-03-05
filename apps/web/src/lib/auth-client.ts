import { createScribbleAuthClient } from "@scribble/auth/client";

export const authClient = createScribbleAuthClient(
	process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
);
