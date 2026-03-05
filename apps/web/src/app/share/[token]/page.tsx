"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface SharedGuide {
	guide: {
		title: string;
		description: string | null;
		steps: {
			id: string;
			stepNumber: number;
			title: string;
			description: string | null;
			screenshotUrl: string | null;
			pageUrl: string | null;
		}[];
	};
}

export default function SharePage() {
	const { token } = useParams<{ token: string }>();

	const { data, isLoading, error } = useQuery({
		queryKey: ["shared-guide", token],
		queryFn: async () => {
			const res = await fetch(`${API_BASE}/api/v1/share/${token}`);
			if (!res.ok) throw new Error("Guide not found");
			return res.json() as Promise<SharedGuide>;
		},
	});

	if (isLoading) {
		return (
			<div className="container mx-auto max-w-4xl p-8">
				<Skeleton className="h-8 w-64 mb-4" />
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={i} className="h-48 mb-4" />
				))}
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p className="text-muted-foreground">This guide is not available.</p>
			</div>
		);
	}

	const { guide } = data;

	return (
		<div className="container mx-auto max-w-4xl p-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold">{guide.title}</h1>
				{guide.description && <p className="text-muted-foreground mt-2">{guide.description}</p>}
				<p className="text-xs text-muted-foreground mt-4">Created with Scribble</p>
			</div>

			<div className="space-y-6">
				{guide.steps.map((step) => (
					<Card key={step.id}>
						<CardContent className="p-6">
							<div className="flex items-start gap-4">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
									{step.stepNumber}
								</div>
								<div className="flex-1">
									<h3 className="font-semibold text-lg">{step.title}</h3>
									{step.description && (
										<p className="text-muted-foreground mt-1">{step.description}</p>
									)}
									{step.screenshotUrl && (
										<div className="mt-4 rounded-lg border overflow-hidden">
											<img
												src={step.screenshotUrl}
												alt={`Step ${step.stepNumber}`}
												className="w-full"
											/>
										</div>
									)}
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
