import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { useOrg } from "../org-context";

export interface Folder {
	id: string;
	organizationId: string;
	name: string;
	parentId: string | null;
	createdAt: string;
	updatedAt: string;
}

export function useFolders() {
	const { currentOrg } = useOrg();
	return useQuery({
		queryKey: ["folders", currentOrg?.id],
		queryFn: () => api.get<Folder[]>(`/api/v1/orgs/${currentOrg!.id}/folders`),
		enabled: !!currentOrg,
	});
}

export function useCreateFolder() {
	const { currentOrg } = useOrg();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: { name: string; parentId?: string }) =>
			api.post<Folder>(`/api/v1/orgs/${currentOrg!.id}/folders`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["folders"] });
		},
	});
}

export function useDeleteFolder(id: string) {
	const { currentOrg } = useOrg();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => api.delete(`/api/v1/orgs/${currentOrg!.id}/folders/${id}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["folders"] });
			queryClient.invalidateQueries({ queryKey: ["guides"] });
		},
	});
}
