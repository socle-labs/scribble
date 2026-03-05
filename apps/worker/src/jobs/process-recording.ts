import { db, guideSteps, guides, recordingEvents, recordings } from "@scribble/db";
import type { ProcessRecordingJobData } from "@scribble/shared/queues";
import { asc, eq } from "drizzle-orm";

/**
 * Process a recording into a guide.
 * Takes raw recording events, groups meaningful actions,
 * and creates a structured guide with steps.
 */
export async function handleProcessRecording(data: ProcessRecordingJobData) {
	const { recordingId, organizationId } = data;

	try {
		// Fetch all events for this recording
		const events = await db
			.select()
			.from(recordingEvents)
			.where(eq(recordingEvents.recordingId, recordingId))
			.orderBy(asc(recordingEvents.eventIndex));

		if (events.length === 0) {
			await db
				.update(recordings)
				.set({ status: "failed", updatedAt: new Date() })
				.where(eq(recordings.id, recordingId));
			return;
		}

		// Get the recording to find the creator
		const [recording] = await db
			.select()
			.from(recordings)
			.where(eq(recordings.id, recordingId))
			.limit(1);

		if (!recording) return;

		// Create a new guide
		const guideId = crypto.randomUUID();
		const firstEvent = events[0]!;
		const guideTitle = firstEvent.pageTitle ? `How to: ${firstEvent.pageTitle}` : "Recorded Guide";

		await db.insert(guides).values({
			id: guideId,
			organizationId,
			createdById: recording.createdById,
			title: guideTitle,
			status: "draft",
		});

		// Convert events to steps
		// Filter to meaningful actions (clicks, inputs, navigations)
		const meaningfulEvents = events.filter((e) =>
			["click", "type", "navigate", "select"].includes(e.eventType),
		);

		let stepNumber = 1;
		for (const event of meaningfulEvents) {
			let title: string;
			let description: string | null = null;

			switch (event.eventType) {
				case "click":
					title = event.elementText
						? `Click "${event.elementText}"`
						: `Click on ${event.elementSelector ?? "element"}`;
					break;
				case "type":
					title = `Type in ${event.elementSelector ?? "field"}`;
					description = event.inputValue ? `Enter "${event.inputValue}"` : null;
					break;
				case "navigate":
					title = event.pageTitle
						? `Navigate to "${event.pageTitle}"`
						: `Navigate to ${event.pageUrl ?? "page"}`;
					break;
				case "select":
					title = `Select "${event.elementText ?? "option"}"`;
					break;
				default:
					title = `Step ${stepNumber}`;
			}

			await db.insert(guideSteps).values({
				id: crypto.randomUUID(),
				guideId,
				stepNumber,
				title,
				description,
				actionType: event.eventType,
				pageUrl: event.pageUrl,
				pageTitle: event.pageTitle,
				elementSelector: event.elementSelector,
				screenshotStorageKey: event.screenshotStorageKey,
			});

			stepNumber++;
		}

		// Link recording to guide and mark completed
		await db
			.update(recordings)
			.set({ guideId, status: "completed", updatedAt: new Date() })
			.where(eq(recordings.id, recordingId));
	} catch (error) {
		console.error(`Failed to process recording ${recordingId}:`, error);
		await db
			.update(recordings)
			.set({ status: "failed", updatedAt: new Date() })
			.where(eq(recordings.id, recordingId));
		throw error;
	}
}
