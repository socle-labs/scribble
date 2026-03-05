import type { Permission } from "@scribble/shared";

export interface AuthUser {
	id: string;
	email: string;
	name: string;
}

export interface AppEnv {
	Variables: {
		user: AuthUser;
		organizationId: string;
		permissions: readonly Permission[];
		requestId: string;
	};
}
