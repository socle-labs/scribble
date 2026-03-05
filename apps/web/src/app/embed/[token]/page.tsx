"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface SharedGuide {
	guide: {
		title: string;
		steps: {
			id: string;
			stepNumber: number;
			title: string;
			description: string | null;
			screenshotUrl: string | null;
		}[];
	};
}

export default function EmbedPage() {
	const { token } = useParams<{ token: string }>();

	const { data, isLoading } = useQuery({
		queryKey: ["embedded-guide", token],
		queryFn: async () => {
			const res = await fetch(`${API_BASE}/api/v1/share/${token}`);
			if (!res.ok) throw new Error("Guide not found");
			return res.json() as Promise<SharedGuide>;
		},
	});

	if (isLoading) {
		return <div className="p-4 text-sm text-muted-foreground">Loading guide...</div>;
	}

	if (!data) {
		return <div className="p-4 text-sm text-muted-foreground">Guide not available</div>;
	}

	const { guide } = data;

	return (
		<div className="p-4 max-w-2xl">
			<h2 className="text-lg font-bold mb-4">{guide.title}</h2>
			<div className="space-y-4">
				{guide.steps.map((step) => (
					<div key={step.id} className="flex items-start gap-3">
						<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
							{step.stepNumber}
						</span>
						<div>
							<p className="font-medium text-sm">{step.title}</p>
							{step.description && (
								<p className="text-xs text-muted-foreground">{step.description}</p>
							)}
							{step.screenshotUrl && (
								<img
									src={step.screenshotUrl}
									alt={`Step ${step.stepNumber}`}
									className="mt-2 rounded border max-w-full"
								/>
							)}
						</div>
					</div>
				))}
			</div>
			<p className="text-xs text-muted-foreground mt-6">Powered by Scribble</p>
		</div>
	);
}
