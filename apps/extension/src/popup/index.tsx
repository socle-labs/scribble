import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createRecording } from "../lib/api";
import type { MessageType, RecordingState } from "../lib/types";

function Popup() {
	const [state, setState] = useState<RecordingState>({
		isRecording: false,
		recordingId: null,
		orgId: null,
		eventBuffer: [],
		eventCount: 0,
	});
	const [loading, setLoading] = useState(false);
	const [orgId, setOrgId] = useState("");

	useEffect(() => {
		// Get initial state
		chrome.runtime.sendMessage({ type: "GET_STATE" } satisfies MessageType, (response) => {
			if (response) setState(response);
		});

		// Listen for state updates
		const listener = (message: MessageType) => {
			if (message.type === "STATE_UPDATE") {
				setState(message.state);
			}
		};
		chrome.runtime.onMessage.addListener(listener);
		return () => chrome.runtime.onMessage.removeListener(listener);
	}, []);

	// Load saved orgId
	useEffect(() => {
		chrome.storage.local.get(["orgId"], (result) => {
			if (result.orgId) setOrgId(result.orgId);
		});
	}, []);

	const handleStart = async () => {
		if (!orgId) return;
		setLoading(true);
		try {
			const recording = await createRecording(orgId);
			chrome.storage.local.set({ orgId });
			chrome.runtime.sendMessage({
				type: "START_RECORDING",
				orgId,
				recordingId: recording.id,
			} satisfies MessageType);
		} catch (error) {
			console.error("Failed to start recording:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleStop = () => {
		chrome.runtime.sendMessage({ type: "STOP_RECORDING" } satisfies MessageType);
	};

	return (
		<div style={{ width: 320, padding: 16, fontFamily: "system-ui, sans-serif" }}>
			<h1 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>Scribble</h1>

			{state.isRecording ? (
				<div>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 8,
							marginBottom: 16,
							padding: 12,
							background: "#fef2f2",
							borderRadius: 8,
							border: "1px solid #fecaca",
						}}
					>
						<div
							style={{
								width: 12,
								height: 12,
								borderRadius: "50%",
								background: "#ef4444",
								animation: "pulse 2s infinite",
							}}
						/>
						<span style={{ fontWeight: 500, color: "#dc2626" }}>Recording...</span>
					</div>
					<p style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>
						{state.eventCount} events captured
					</p>
					<button
						type="button"
						onClick={handleStop}
						style={{
							width: "100%",
							padding: "10px 16px",
							background: "#ef4444",
							color: "white",
							border: "none",
							borderRadius: 8,
							cursor: "pointer",
							fontWeight: 500,
							fontSize: 14,
						}}
					>
						Stop Recording
					</button>
				</div>
			) : (
				<div>
					<div style={{ marginBottom: 16 }}>
						<label
							htmlFor="org-id"
							style={{
								display: "block",
								fontSize: 12,
								fontWeight: 500,
								color: "#374151",
								marginBottom: 4,
							}}
						>
							Organization ID
						</label>
						<input
							id="org-id"
							type="text"
							value={orgId}
							onChange={(e) => setOrgId(e.target.value)}
							placeholder="Enter your org ID"
							style={{
								width: "100%",
								padding: "8px 12px",
								border: "1px solid #d1d5db",
								borderRadius: 6,
								fontSize: 14,
								boxSizing: "border-box",
							}}
						/>
					</div>
					<button
						type="button"
						onClick={handleStart}
						disabled={loading || !orgId}
						style={{
							width: "100%",
							padding: "10px 16px",
							background: loading || !orgId ? "#9ca3af" : "#6366f1",
							color: "white",
							border: "none",
							borderRadius: 8,
							cursor: loading || !orgId ? "not-allowed" : "pointer",
							fontWeight: 500,
							fontSize: 14,
						}}
					>
						{loading ? "Starting..." : "Start Recording"}
					</button>
				</div>
			)}

			<style>{`
				@keyframes pulse {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.5; }
				}
			`}</style>
		</div>
	);
}

const root = createRoot(document.getElementById("root")!);
root.render(<Popup />);
