"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { useOrg } from "@/lib/org-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();
	const { currentOrg, isLoading: orgLoading } = useOrg();

	useEffect(() => {
		if (!isPending && !session) {
			router.replace("/login");
		}
	}, [isPending, session, router]);

	if (isPending || orgLoading || (!currentOrg && session)) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="space-y-4 w-full max-w-md p-8">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-32 w-full" />
				</div>
			</div>
		);
	}

	if (!session) {
		return null;
	}

	return <>{children}</>;
}
