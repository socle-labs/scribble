"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useGuide, useUpdateGuide } from "@/lib/hooks/use-guides";
import { useOrg } from "@/lib/org-context";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function GuideEditPage() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const { currentOrg } = useOrg();
	const queryClient = useQueryClient();
	const { data: guide, isLoading } = useGuide(id);
	const updateGuide = useUpdateGuide(id);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");

	useEffect(() => {
		if (guide) {
			setTitle(guide.title);
			setDescription(guide.description ?? "");
		}
	}, [guide]);

	const handleSave = async () => {
		try {
			await updateGuide.mutateAsync({ title, description });
			toast.success("Guide saved");
		} catch {
			toast.error("Failed to save guide");
		}
	};

	const handleAddStep = async () => {
		try {
			await api.post(`/api/v1/orgs/${currentOrg!.id}/guides/${id}/steps`, {
				title: "New step",
				actionType: "click",
			});
			queryClient.invalidateQueries({ queryKey: ["guide", id] });
			toast.success("Step added");
		} catch {
			toast.error("Failed to add step");
		}
	};

	const handleDeleteStep = async (stepId: string) => {
		try {
			await api.delete(`/api/v1/orgs/${currentOrg!.id}/guides/${id}/steps/${stepId}`);
			queryClient.invalidateQueries({ queryKey: ["guide", id] });
			toast.success("Step deleted");
		} catch {
			toast.error("Failed to delete step");
		}
	};

	if (isLoading) {
		return (
			<div className="container mx-auto max-w-4xl p-8">
				<Skeleton className="h-10 w-full mb-4" />
				<Skeleton className="h-8 w-full mb-8" />
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={i} className="h-32 mb-4" />
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
				<Button variant="ghost" size="icon" onClick={() => router.push(`/guides/${id}`)}>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<span className="text-muted-foreground">Editing guide</span>
				<div className="flex-1" />
				<Button onClick={handleSave} disabled={updateGuide.isPending}>
					<Save className="h-4 w-4" />
					Save
				</Button>
			</div>

			<div className="space-y-4 mb-8">
				<Input
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					placeholder="Guide title"
					className="text-2xl font-bold h-12"
				/>
				<Input
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					placeholder="Add a description..."
				/>
			</div>

			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold">Steps</h2>
					<Button variant="outline" size="sm" onClick={handleAddStep}>
						<Plus className="h-4 w-4" />
						Add Step
					</Button>
				</div>

				{guide.steps?.map((step) => (
					<Card key={step.id}>
						<CardContent className="p-4">
							<div className="flex items-start gap-3">
								<button type="button" className="mt-1 cursor-grab text-muted-foreground">
									<GripVertical className="h-5 w-5" />
								</button>
								<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
									{step.stepNumber}
								</div>
								<div className="flex-1 space-y-2">
									<Input defaultValue={step.title} placeholder="Step title" />
									<Input defaultValue={step.description ?? ""} placeholder="Step description" />
									{step.screenshotUrl && (
										<div className="rounded-lg border overflow-hidden">
											<img
												src={step.screenshotUrl}
												alt={`Step ${step.stepNumber}`}
												className="w-full max-h-64 object-contain"
											/>
										</div>
									)}
								</div>
								<Button variant="ghost" size="icon" onClick={() => handleDeleteStep(step.id)}>
									<Trash2 className="h-4 w-4 text-destructive" />
								</Button>
							</div>
						</CardContent>
					</Card>
				))}

				{(!guide.steps || guide.steps.length === 0) && (
					<Card className="p-8 text-center">
						<p className="text-muted-foreground mb-4">
							No steps yet. Add steps manually or use the browser extension to record.
						</p>
						<Button variant="outline" onClick={handleAddStep}>
							<Plus className="h-4 w-4" />
							Add first step
						</Button>
					</Card>
				)}
			</div>
		</div>
	);
}
