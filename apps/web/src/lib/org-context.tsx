"use client";

import { useQuery } from "@tanstack/react-query";
import { type ReactNode, createContext, useContext, useEffect, useState } from "react";
import { ApiError, api } from "./api";
import { authClient } from "./auth-client";

interface Org {
	id: string;
	name: string;
	slug: string | null;
	logo: string | null;
	role: string;
}

interface OrgContextValue {
	currentOrg: Org | null;
	setCurrentOrg: (org: Org) => void;
	orgs: Org[];
	isLoading: boolean;
}

const OrgContext = createContext<OrgContextValue>({
	currentOrg: null,
	setCurrentOrg: () => {},
	orgs: [],
	isLoading: true,
});

export function OrgProvider({ children }: { children: ReactNode }) {
	const [currentOrg, setCurrentOrg] = useState<Org | null>(null);
	const [creatingOrg, setCreatingOrg] = useState(false);
	const [createFailed, setCreateFailed] = useState(false);

	const {
		data: orgs = [],
		isLoading,
		isError,
		refetch,
	} = useQuery({
		queryKey: ["orgs"],
		queryFn: () => api.get<Org[]>("/api/v1/orgs"),
		retry: (failureCount, error) => {
			if (error instanceof ApiError && error.status === 401) return false;
			return failureCount < 3;
		},
	});

	// Auto-create an org if user has none (e.g. social login)
	useEffect(() => {
		if (!isLoading && !isError && !createFailed && orgs.length === 0 && !creatingOrg) {
			setCreatingOrg(true);
			authClient.organization
				.create({ name: "My Workspace", slug: `ws-${Date.now()}` })
				.then(() => refetch())
				.catch(() => setCreateFailed(true))
				.finally(() => setCreatingOrg(false));
		}
	}, [isLoading, isError, createFailed, orgs.length, creatingOrg, refetch]);

	useEffect(() => {
		if (orgs.length === 0) return;
		if (!currentOrg) {
			const saved = localStorage.getItem("scribble_org_id");
			const found = orgs.find((o) => o.id === saved);
			setCurrentOrg(found ?? orgs[0]!);
		} else {
			const updated = orgs.find((o) => o.id === currentOrg.id);
			if (updated && (updated.name !== currentOrg.name || updated.slug !== currentOrg.slug)) {
				setCurrentOrg(updated);
			}
		}
	}, [orgs, currentOrg]);

	const handleSetOrg = (org: Org) => {
		setCurrentOrg(org);
		localStorage.setItem("scribble_org_id", org.id);
	};

	return (
		<OrgContext.Provider
			value={{
				currentOrg,
				setCurrentOrg: handleSetOrg,
				orgs,
				isLoading: isLoading || creatingOrg,
			}}
		>
			{children}
		</OrgContext.Provider>
	);
}

export function useOrg() {
	return useContext(OrgContext);
}
