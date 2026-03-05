const API_BASE = "http://localhost:3000";

export async function createRecording(orgId: string): Promise<{ id: string }> {
	const res = await fetch(`${API_BASE}/api/v1/orgs/${orgId}/recordings`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
	});
	if (!res.ok) throw new Error("Failed to create recording");
	return res.json();
}

export async function uploadEvents(
	orgId: string,
	recordingId: string,
	events: { eventType: string; timestamp: string; [key: string]: unknown }[],
): Promise<void> {
	const res = await fetch(`${API_BASE}/api/v1/orgs/${orgId}/recordings/${recordingId}/events`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify({ events }),
	});
	if (!res.ok) throw new Error("Failed to upload events");
}

export async function finishRecording(orgId: string, recordingId: string): Promise<void> {
	const res = await fetch(`${API_BASE}/api/v1/orgs/${orgId}/recordings/${recordingId}/finish`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
	});
	if (!res.ok) throw new Error("Failed to finish recording");
}
