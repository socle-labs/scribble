import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { useOrg } from "../org-context";

export interface GuideStep {
	id: string;
	guideId: string;
	stepNumber: number;
	title: string;
	description: string | null;
	screenshotUrl: string | null;
	screenshotStorageKey: string | null;
	elementSelector: string | null;
	actionType: string;
	pageUrl: string | null;
	pageTitle: string | null;
	annotations: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
}

export interface Guide {
	id: string;
	organizationId: string;
	createdById: string;
	title: string;
	description: string | null;
	status: string;
	slug: string | null;
	folderId: string | null;
	isPublic: boolean;
	allowEmbed: boolean;
	viewCount: number;
	createdAt: string;
	updatedAt: string;
	steps?: GuideStep[];
}

interface CreateGuideInput {
	title: string;
	description?: string;
	folderId?: string;
}

interface UpdateGuideInput {
	title?: string;
	description?: string;
	status?: "draft" | "published" | "archived";
	folderId?: string | null;
	isPublic?: boolean;
	allowEmbed?: boolean;
}

export function useGuides() {
	const { currentOrg } = useOrg();
	return useQuery({
		queryKey: ["guides", currentOrg?.id],
		queryFn: () => api.get<Guide[]>(`/api/v1/orgs/${currentOrg!.id}/guides`),
		enabled: !!currentOrg,
	});
}

export function useGuide(id: string) {
	const { currentOrg } = useOrg();
	return useQuery({
		queryKey: ["guide", id],
		queryFn: () =>
			api.get<Guide & { steps: GuideStep[] }>(`/api/v1/orgs/${currentOrg!.id}/guides/${id}`),
		enabled: !!currentOrg && !!id,
	});
}

export function useCreateGuide() {
	const { currentOrg } = useOrg();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateGuideInput) =>
			api.post<Guide>(`/api/v1/orgs/${currentOrg!.id}/guides`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["guides"] });
		},
	});
}

export function useUpdateGuide(id: string) {
	const { currentOrg } = useOrg();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: UpdateGuideInput) =>
			api.patch<Guide>(`/api/v1/orgs/${currentOrg!.id}/guides/${id}`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["guides"] });
			queryClient.invalidateQueries({ queryKey: ["guide", id] });
		},
	});
}

export function useDeleteGuide(id: string) {
	const { currentOrg } = useOrg();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => api.delete(`/api/v1/orgs/${currentOrg!.id}/guides/${id}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["guides"] });
		},
	});
}
