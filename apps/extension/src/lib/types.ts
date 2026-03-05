export interface RecordingEvent {
	eventType: "click" | "type" | "navigate" | "scroll" | "select";
	timestamp: string;
	pageUrl?: string;
	pageTitle?: string;
	elementSelector?: string;
	elementText?: string;
	inputValue?: string;
	viewport?: { width: number; height: number };
	coordinates?: { x: number; y: number };
	metadata?: Record<string, unknown>;
	screenshot?: string; // base64
}

export interface RecordingState {
	isRecording: boolean;
	recordingId: string | null;
	orgId: string | null;
	eventBuffer: RecordingEvent[];
	eventCount: number;
}

export type MessageType =
	| { type: "START_RECORDING"; orgId: string; recordingId: string }
	| { type: "STOP_RECORDING" }
	| { type: "RECORDING_EVENT"; event: RecordingEvent }
	| { type: "GET_STATE" }
	| { type: "STATE_UPDATE"; state: RecordingState };
