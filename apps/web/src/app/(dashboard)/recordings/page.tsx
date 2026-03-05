"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecordings } from "@/lib/hooks/use-recordings";
import { Video } from "lucide-react";

export default function RecordingsPage() {
	const { data: recordings, isLoading } = useRecordings();

	if (isLoading) {
		return (
			<div className="container mx-auto max-w-4xl p-8">
				<Skeleton className="h-8 w-48 mb-8" />
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={i} className="h-20 mb-4" />
				))}
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-4xl p-8">
			<h1 className="text-2xl font-bold mb-8">Recordings</h1>

			{recordings && recordings.length > 0 ? (
				<div className="space-y-4">
					{recordings.map((recording) => (
						<Card key={recording.id}>
							<CardContent className="p-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<Video className="h-5 w-5 text-muted-foreground" />
										<div>
											<p className="font-medium">Recording</p>
											<p className="text-sm text-muted-foreground">
												{new Date(recording.createdAt).toLocaleString()}
											</p>
										</div>
									</div>
									<Badge
										variant={
											recording.status === "completed"
												? "default"
												: recording.status === "failed"
													? "destructive"
													: "secondary"
										}
									>
										{recording.status}
									</Badge>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			) : (
				<Card className="p-12 text-center">
					<Video className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
					<h2 className="text-xl font-semibold mb-2">No recordings yet</h2>
					<p className="text-muted-foreground">
						Install the Scribble browser extension to start recording workflows.
					</p>
				</Card>
			)}
		</div>
	);
}
