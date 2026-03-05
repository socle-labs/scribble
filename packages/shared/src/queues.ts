/**
 * BullMQ queue names and job data types shared between API and Worker.
 */

export const QUEUE_PROCESS_RECORDING = "process-recording";
export const QUEUE_GENERATE_SCREENSHOTS = "generate-screenshots";
export const QUEUE_EXPORT_GUIDE = "export-guide";

export interface ProcessRecordingJobData {
	recordingId: string;
	organizationId: string;
}

export interface GenerateScreenshotsJobData {
	guideId: string;
	stepIds: string[];
}

export interface ExportGuideJobData {
	exportId: string;
	guideId: string;
	format: "pdf" | "markdown" | "html";
}
