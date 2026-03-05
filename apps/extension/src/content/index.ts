import { getElementText, getSelector } from "../lib/selectors";
import type { MessageType, RecordingEvent } from "../lib/types";

function sendEvent(event: RecordingEvent) {
	chrome.runtime.sendMessage({
		type: "RECORDING_EVENT",
		event,
	} satisfies MessageType);
}

function createBaseEvent(eventType: RecordingEvent["eventType"]): RecordingEvent {
	return {
		eventType,
		timestamp: new Date().toISOString(),
		pageUrl: window.location.href,
		pageTitle: document.title,
		viewport: {
			width: window.innerWidth,
			height: window.innerHeight,
		},
	};
}

// Track clicks
document.addEventListener(
	"click",
	(e) => {
		const target = e.target as Element;
		if (!target) return;

		const event = createBaseEvent("click");
		event.elementSelector = getSelector(target);
		event.elementText = getElementText(target);
		event.coordinates = { x: e.clientX, y: e.clientY };

		sendEvent(event);
	},
	true,
);

// Track input changes (debounced)
const inputTimers = new Map<Element, ReturnType<typeof setTimeout>>();

document.addEventListener(
	"input",
	(e) => {
		const target = e.target as HTMLInputElement | HTMLTextAreaElement;
		if (!target) return;

		// Clear previous timer for this element
		const existing = inputTimers.get(target);
		if (existing) clearTimeout(existing);

		// Debounce — wait for user to stop typing
		const timer = setTimeout(() => {
			const event = createBaseEvent("type");
			event.elementSelector = getSelector(target);

			// Redact sensitive fields
			const inputType = target.type?.toLowerCase();
			const isSensitive = ["password", "secret", "token", "credit", "ssn"].some(
				(word) =>
					inputType?.includes(word) ||
					target.name?.toLowerCase().includes(word) ||
					target.id?.toLowerCase().includes(word),
			);

			event.inputValue = isSensitive ? "[redacted]" : target.value;
			event.elementText =
				target.labels?.[0]?.textContent?.trim() ?? target.placeholder ?? target.name;

			sendEvent(event);
			inputTimers.delete(target);
		}, 500);

		inputTimers.set(target, timer);
	},
	true,
);

// Track select changes
document.addEventListener(
	"change",
	(e) => {
		const target = e.target as HTMLSelectElement;
		if (target.tagName !== "SELECT") return;

		const event = createBaseEvent("select");
		event.elementSelector = getSelector(target);
		event.elementText = target.selectedOptions[0]?.textContent?.trim();
		event.inputValue = target.value;

		sendEvent(event);
	},
	true,
);

// Track navigation (URL changes)
let lastUrl = window.location.href;

const observer = new MutationObserver(() => {
	if (window.location.href !== lastUrl) {
		lastUrl = window.location.href;

		const event = createBaseEvent("navigate");
		sendEvent(event);
	}
});

observer.observe(document.body, { childList: true, subtree: true });

// Also listen for popstate (back/forward)
window.addEventListener("popstate", () => {
	if (window.location.href !== lastUrl) {
		lastUrl = window.location.href;

		const event = createBaseEvent("navigate");
		sendEvent(event);
	}
});

console.log("Scribble content script loaded — recording events");
