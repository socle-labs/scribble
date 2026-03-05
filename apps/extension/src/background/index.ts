import { finishRecording, uploadEvents } from "../lib/api";
import type { MessageType, RecordingEvent, RecordingState } from "../lib/types";

const state: RecordingState = {
	isRecording: false,
	recordingId: null,
	orgId: null,
	eventBuffer: [],
	eventCount: 0,
};

const BATCH_SIZE = 5;
const BATCH_INTERVAL_MS = 10_000;

let batchTimer: ReturnType<typeof setInterval> | null = null;

async function flushEvents() {
	if (state.eventBuffer.length === 0 || !state.orgId || !state.recordingId) return;

	const events = [...state.eventBuffer];
	state.eventBuffer = [];

	try {
		await uploadEvents(
			state.orgId,
			state.recordingId,
			events as unknown as { eventType: string; timestamp: string; [key: string]: unknown }[],
		);
	} catch (error) {
		console.error("Failed to upload events:", error);
		// Put events back in buffer
		state.eventBuffer.unshift(...events);
	}
}

async function captureScreenshot(_tabId: number): Promise<string | undefined> {
	try {
		const dataUrl = await chrome.tabs.captureVisibleTab({
			format: "png",
			quality: 80,
		});
		// Strip data URL prefix to get base64
		return dataUrl.split(",")[1];
	} catch {
		return undefined;
	}
}

chrome.runtime.onMessage.addListener((message: MessageType, sender, sendResponse) => {
	switch (message.type) {
		case "START_RECORDING": {
			state.isRecording = true;
			state.recordingId = message.recordingId;
			state.orgId = message.orgId;
			state.eventBuffer = [];
			state.eventCount = 0;

			// Inject content script into active tab
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				const tabId = tabs[0]?.id;
				if (tabId) {
					chrome.scripting.executeScript({
						target: { tabId },
						files: ["content.js"],
					});
				}
			});

			// Start batch timer
			batchTimer = setInterval(flushEvents, BATCH_INTERVAL_MS);

			broadcastState();
			sendResponse({ success: true });
			break;
		}

		case "STOP_RECORDING": {
			state.isRecording = false;

			if (batchTimer) {
				clearInterval(batchTimer);
				batchTimer = null;
			}

			// Flush remaining events and finish
			flushEvents().then(() => {
				if (state.orgId && state.recordingId) {
					finishRecording(state.orgId, state.recordingId);
				}
				state.recordingId = null;
				state.orgId = null;
				broadcastState();
			});

			sendResponse({ success: true });
			break;
		}

		case "RECORDING_EVENT": {
			if (!state.isRecording) break;

			const event = message.event;

			// Capture screenshot from the active tab
			if (sender.tab?.id) {
				captureScreenshot(sender.tab.id).then((screenshot) => {
					if (screenshot) {
						event.screenshot = screenshot;
					}
					state.eventBuffer.push(event);
					state.eventCount++;

					if (state.eventBuffer.length >= BATCH_SIZE) {
						flushEvents();
					}

					broadcastState();
				});
			} else {
				state.eventBuffer.push(event);
				state.eventCount++;

				if (state.eventBuffer.length >= BATCH_SIZE) {
					flushEvents();
				}

				broadcastState();
			}
			break;
		}

		case "GET_STATE": {
			sendResponse(state);
			break;
		}
	}

	return true; // Keep message channel open for async response
});

function broadcastState() {
	chrome.runtime
		.sendMessage({
			type: "STATE_UPDATE",
			state: { ...state },
		} satisfies MessageType)
		.catch(() => {});
}
