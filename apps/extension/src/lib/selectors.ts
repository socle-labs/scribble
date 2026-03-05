/**
 * Generate a stable CSS selector for an element.
 * Prefers data-testid, id, aria-label, then builds a CSS path.
 */
export function getSelector(element: Element): string {
	// Prefer data-testid
	const testId = element.getAttribute("data-testid");
	if (testId) return `[data-testid="${testId}"]`;

	// Prefer id
	if (element.id) return `#${CSS.escape(element.id)}`;

	// Prefer aria-label
	const ariaLabel = element.getAttribute("aria-label");
	if (ariaLabel) return `[aria-label="${ariaLabel}"]`;

	// Build CSS path
	const parts: string[] = [];
	let current: Element | null = element;

	while (current && current !== document.body) {
		let selector = current.tagName.toLowerCase();

		if (current.id) {
			selector = `#${CSS.escape(current.id)}`;
			parts.unshift(selector);
			break;
		}

		const parent: Element | null = current.parentElement;
		if (parent) {
			const tag = current.tagName;
			const siblings = Array.from(parent.children).filter((c: Element) => c.tagName === tag);
			if (siblings.length > 1) {
				const index = siblings.indexOf(current) + 1;
				selector += `:nth-of-type(${index})`;
			}
		}

		parts.unshift(selector);
		current = parent;
	}

	return parts.join(" > ");
}

/**
 * Get the visible text content of an element, truncated.
 */
export function getElementText(element: Element): string {
	const text = (element.textContent ?? "").trim();
	return text.length > 100 ? `${text.slice(0, 100)}...` : text;
}
