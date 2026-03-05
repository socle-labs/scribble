const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message);
		this.name = "ApiError";
	}
}

class ApiClient {
	private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
		const url = `${API_BASE}${path}`;
		const response = await fetch(url, {
			method,
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include",
			body: body ? JSON.stringify(body) : undefined,
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: "Request failed" }));
			throw new ApiError(response.status, (error as { error?: string }).error ?? "Request failed");
		}

		return response.json() as Promise<T>;
	}

	get<T>(path: string) {
		return this.request<T>("GET", path);
	}
	post<T>(path: string, body?: unknown) {
		return this.request<T>("POST", path, body);
	}
	put<T>(path: string, body?: unknown) {
		return this.request<T>("PUT", path, body);
	}
	patch<T>(path: string, body?: unknown) {
		return this.request<T>("PATCH", path, body);
	}
	delete<T>(path: string) {
		return this.request<T>("DELETE", path);
	}
}

export const api = new ApiClient();
