"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type Guide, useCreateGuide, useGuides } from "@/lib/hooks/use-guides";
import { useOrg } from "@/lib/org-context";
import { BookOpen, Eye, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

function GuideCard({ guide }: { guide: Guide }) {
	const router = useRouter();

	return (
		<Card
			className="cursor-pointer transition-shadow hover:shadow-md"
			onClick={() => router.push(`/guides/${guide.id}`)}
		>
			<CardHeader>
				<div className="flex items-start justify-between">
					<CardTitle className="text-lg">{guide.title}</CardTitle>
					<Badge variant={guide.status === "published" ? "default" : "secondary"}>
						{guide.status}
					</Badge>
				</div>
				{guide.description && <CardDescription>{guide.description}</CardDescription>}
			</CardHeader>
			<CardContent>
				<div className="flex items-center gap-4 text-sm text-muted-foreground">
					<span className="flex items-center gap-1">
						<Eye className="h-4 w-4" />
						{guide.viewCount} views
					</span>
					<span>{new Date(guide.createdAt).toLocaleDateString()}</span>
				</div>
			</CardContent>
		</Card>
	);
}

export default function DashboardPage() {
	const { currentOrg } = useOrg();
	const { data: guides, isLoading } = useGuides();
	const createGuide = useCreateGuide();
	const router = useRouter();

	const handleCreateGuide = async () => {
		try {
			const guide = await createGuide.mutateAsync({ title: "Untitled Guide" });
			router.push(`/guides/${guide.id}/edit`);
		} catch {
			toast.error("Failed to create guide");
		}
	};

	if (isLoading) {
		return (
			<div className="container mx-auto max-w-6xl p-8">
				<Skeleton className="h-8 w-48 mb-8" />
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-40" />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-6xl p-8">
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-2xl font-bold">{currentOrg?.name}</h1>
					<p className="text-muted-foreground">Your step-by-step guides</p>
				</div>
				<Button onClick={handleCreateGuide} disabled={createGuide.isPending}>
					<Plus className="h-4 w-4" />
					New Guide
				</Button>
			</div>

			{guides && guides.length > 0 ? (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{guides.map((guide) => (
						<GuideCard key={guide.id} guide={guide} />
					))}
				</div>
			) : (
				<Card className="p-12 text-center">
					<BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
					<h2 className="text-xl font-semibold mb-2">No guides yet</h2>
					<p className="text-muted-foreground mb-4">
						Create your first guide or install the browser extension to start recording.
					</p>
					<Button onClick={handleCreateGuide}>
						<Plus className="h-4 w-4" />
						Create your first guide
					</Button>
				</Card>
			)}
		</div>
	);
}
