import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { useOrg } from "../org-context";

export interface Member {
	id: string;
	userId: string;
	role: string;
	createdAt: string;
}

export function useMembers() {
	const { currentOrg } = useOrg();
	return useQuery({
		queryKey: ["members", currentOrg?.id],
		queryFn: () => api.get<Member[]>(`/api/v1/orgs/${currentOrg!.id}/members`),
		enabled: !!currentOrg,
	});
}

export function useInviteMember() {
	const { currentOrg } = useOrg();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: { email: string; role?: string }) =>
			api.post(`/api/v1/orgs/${currentOrg!.id}/invitations`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["members"] });
		},
	});
}

export function useRemoveMember(memberId: string) {
	const { currentOrg } = useOrg();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => api.delete(`/api/v1/orgs/${currentOrg!.id}/members/${memberId}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["members"] });
		},
	});
}
