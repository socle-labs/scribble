import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { useOrg } from "../org-context";

export interface Recording {
	id: string;
	organizationId: string;
	createdById: string;
	guideId: string | null;
	status: string;
	metadata: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
}

export function useRecordings() {
	const { currentOrg } = useOrg();
	return useQuery({
		queryKey: ["recordings", currentOrg?.id],
		queryFn: () => api.get<Recording[]>(`/api/v1/orgs/${currentOrg!.id}/recordings`),
		enabled: !!currentOrg,
	});
}

export function useRecording(id: string) {
	const { currentOrg } = useOrg();
	return useQuery({
		queryKey: ["recording", id],
		queryFn: () => api.get<Recording>(`/api/v1/orgs/${currentOrg!.id}/recordings/${id}`),
		enabled: !!currentOrg && !!id,
	});
}
