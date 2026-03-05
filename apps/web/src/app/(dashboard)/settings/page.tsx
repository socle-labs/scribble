"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useInviteMember, useMembers } from "@/lib/hooks/use-members";
import { useOrg } from "@/lib/org-context";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
	const { currentOrg } = useOrg();
	const { data: members, isLoading } = useMembers();
	const inviteMember = useInviteMember();
	const [inviteEmail, setInviteEmail] = useState("");

	const handleInvite = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await inviteMember.mutateAsync({ email: inviteEmail });
			setInviteEmail("");
			toast.success("Invitation sent");
		} catch {
			toast.error("Failed to send invitation");
		}
	};

	if (isLoading) {
		return (
			<div className="container mx-auto max-w-4xl p-8">
				<Skeleton className="h-8 w-48 mb-8" />
				<Skeleton className="h-64" />
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-4xl p-8">
			<h1 className="text-2xl font-bold mb-8">Settings</h1>

			<div className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle>Organization</CardTitle>
						<CardDescription>Manage your organization settings</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<label htmlFor="org-name" className="text-sm font-medium">
								Name
							</label>
							<Input id="org-name" defaultValue={currentOrg?.name} disabled />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Members</CardTitle>
						<CardDescription>Manage team members and invitations</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleInvite} className="flex gap-2 mb-6">
							<Input
								value={inviteEmail}
								onChange={(e) => setInviteEmail(e.target.value)}
								placeholder="email@example.com"
								type="email"
								required
							/>
							<Button type="submit" disabled={inviteMember.isPending}>
								<UserPlus className="h-4 w-4" />
								Invite
							</Button>
						</form>

						<div className="space-y-2">
							{members?.map((member) => (
								<div
									key={member.id}
									className="flex items-center justify-between rounded-lg border p-3"
								>
									<span className="text-sm">{member.userId}</span>
									<span className="text-sm text-muted-foreground">{member.role}</span>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
