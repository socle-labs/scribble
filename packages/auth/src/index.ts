import { db } from "@scribble/db";
import * as schema from "@scribble/db/schema";
import { createEnv, csvList } from "@scribble/shared/env";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { z } from "zod";

const authEnv = createEnv(
	z.object({
		GITHUB_CLIENT_ID: z.string().optional(),
		GITHUB_CLIENT_SECRET: z.string().optional(),
		GOOGLE_CLIENT_ID: z.string().optional(),
		GOOGLE_CLIENT_SECRET: z.string().optional(),
		TRUSTED_ORIGINS: csvList,
	}),
);

export function createAuth() {
	const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};

	if (authEnv.GITHUB_CLIENT_ID && authEnv.GITHUB_CLIENT_SECRET) {
		socialProviders.github = {
			clientId: authEnv.GITHUB_CLIENT_ID,
			clientSecret: authEnv.GITHUB_CLIENT_SECRET,
		};
	}
	if (authEnv.GOOGLE_CLIENT_ID && authEnv.GOOGLE_CLIENT_SECRET) {
		socialProviders.google = {
			clientId: authEnv.GOOGLE_CLIENT_ID,
			clientSecret: authEnv.GOOGLE_CLIENT_SECRET,
		};
	}

	const trustedOrigins =
		authEnv.TRUSTED_ORIGINS.length > 0 ? authEnv.TRUSTED_ORIGINS : ["http://localhost:3001"];

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",
			schema: {
				user: schema.users,
				session: schema.sessions,
				account: schema.accounts,
				verification: schema.verifications,
				organization: schema.organizations,
				member: schema.orgMembers,
				invitation: schema.invitations,
			},
		}),
		emailAndPassword: {
			enabled: true,
		},
		socialProviders,
		plugins: [
			organization({
				allowUserToCreateOrganization: true,
			}),
		],
		trustedOrigins,
	});
}

export type Auth = ReturnType<typeof createAuth>;
