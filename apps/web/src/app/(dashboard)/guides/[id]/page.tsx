"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGuide } from "@/lib/hooks/use-guides";
import { ArrowLeft, Download, Edit, Share2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export default function GuideViewPage() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const { data: guide, isLoading } = useGuide(id);

	if (isLoading) {
		return (
			<div className="container mx-auto max-w-4xl p-8">
				<Skeleton className="h-8 w-64 mb-4" />
				<Skeleton className="h-4 w-96 mb-8" />
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={i} className="h-48 mb-4" />
				))}
			</div>
		);
	}

	if (!guide) {
		return (
			<div className="container mx-auto max-w-4xl p-8 text-center">
				<p className="text-muted-foreground">Guide not found</p>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-4xl p-8">
			<div className="flex items-center gap-2 mb-6">
				<Button variant="ghost" size="icon" onClick={() => router.push("/")}>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div className="flex-1">
					<div className="flex items-center gap-2">
						<h1 className="text-2xl font-bold">{guide.title}</h1>
						<Badge variant={guide.status === "published" ? "default" : "secondary"}>
							{guide.status}
						</Badge>
					</div>
					{guide.description && <p className="text-muted-foreground mt-1">{guide.description}</p>}
				</div>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={() => router.push(`/guides/${id}/edit`)}>
						<Edit className="h-4 w-4" />
						Edit
					</Button>
					<Button variant="outline" size="sm">
						<Share2 className="h-4 w-4" />
						Share
					</Button>
					<Button variant="outline" size="sm">
						<Download className="h-4 w-4" />
						Export
					</Button>
				</div>
			</div>

			<div className="space-y-6">
				{guide.steps?.map((step) => (
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
									{step.pageUrl && (
										<p className="text-xs text-muted-foreground mt-2">Page: {step.pageUrl}</p>
									)}
								</div>
							</div>
						</CardContent>
					</Card>
				))}

				{(!guide.steps || guide.steps.length === 0) && (
					<Card className="p-8 text-center">
						<p className="text-muted-foreground">No steps yet. Edit this guide to add steps.</p>
					</Card>
				)}
			</div>
		</div>
	);
}
