import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { useOrg } from "../org-context";

export interface GuideExport {
	id: string;
	guideId: string;
	format: string;
	status: string;
	storageKey: string | null;
	downloadUrl?: string;
	createdAt: string;
}

export function useExportGuide(guideId: string) {
	const { currentOrg } = useOrg();
	return useMutation({
		mutationFn: (format: "pdf" | "markdown" | "html") =>
			api.post<GuideExport>(`/api/v1/orgs/${currentOrg!.id}/guides/${guideId}/exports`, {
				format,
			}),
	});
}

export function useExportStatus(guideId: string, exportId: string) {
	const { currentOrg } = useOrg();
	return useQuery({
		queryKey: ["export", exportId],
		queryFn: () =>
			api.get<GuideExport>(`/api/v1/orgs/${currentOrg!.id}/guides/${guideId}/exports/${exportId}`),
		enabled: !!currentOrg && !!exportId,
		refetchInterval: (query) => {
			const data = query.state.data;
			if (data && (data.status === "completed" || data.status === "failed")) return false;
			return 2000;
		},
	});
}
