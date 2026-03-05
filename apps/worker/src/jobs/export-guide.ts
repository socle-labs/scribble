import { db, exports as exportsTable, guideSteps, guides } from "@scribble/db";
import type { ExportGuideJobData } from "@scribble/shared/queues";
import { asc, eq } from "drizzle-orm";

/**
 * Export a guide to the requested format (markdown, html, pdf).
 */
export async function handleExportGuide(data: ExportGuideJobData) {
	const { exportId, guideId, format } = data;

	try {
		const [guide] = await db.select().from(guides).where(eq(guides.id, guideId)).limit(1);

		if (!guide) {
			await db.update(exportsTable).set({ status: "failed" }).where(eq(exportsTable.id, exportId));
			return;
		}

		const steps = await db
			.select()
			.from(guideSteps)
			.where(eq(guideSteps.guideId, guideId))
			.orderBy(asc(guideSteps.stepNumber));

		let content: string;

		switch (format) {
			case "markdown":
				content = generateMarkdown(guide, steps);
				break;
			case "html":
				content = generateHtml(guide, steps);
				break;
			case "pdf":
				// PDF generation would use Puppeteer/Playwright
				// For now, generate HTML that can be converted
				content = generateHtml(guide, steps);
				break;
			default:
				throw new Error(`Unsupported format: ${format}`);
		}

		const storageKey = `exports/${guideId}/${exportId}.${format === "pdf" ? "html" : format === "markdown" ? "md" : "html"}`;

		// In a full implementation, this would use the storage service
		// For now, we mark it as completed
		await db
			.update(exportsTable)
			.set({ status: "completed", storageKey })
			.where(eq(exportsTable.id, exportId));
	} catch (error) {
		console.error(`Failed to export guide ${guideId}:`, error);
		await db.update(exportsTable).set({ status: "failed" }).where(eq(exportsTable.id, exportId));
		throw error;
	}
}

function generateMarkdown(
	guide: { title: string; description: string | null },
	steps: {
		stepNumber: number;
		title: string;
		description: string | null;
		screenshotUrl: string | null;
	}[],
): string {
	let md = `# ${guide.title}\n\n`;
	if (guide.description) {
		md += `${guide.description}\n\n`;
	}
	md += "---\n\n";

	for (const step of steps) {
		md += `## Step ${step.stepNumber}: ${step.title}\n\n`;
		if (step.description) {
			md += `${step.description}\n\n`;
		}
		if (step.screenshotUrl) {
			md += `![Step ${step.stepNumber}](${step.screenshotUrl})\n\n`;
		}
	}

	md += "\n---\n*Generated with Scribble*\n";
	return md;
}

function generateHtml(
	guide: { title: string; description: string | null },
	steps: {
		stepNumber: number;
		title: string;
		description: string | null;
		screenshotUrl: string | null;
	}[],
): string {
	const stepsHtml = steps
		.map(
			(step) => `
		<div style="margin-bottom: 2rem; padding: 1.5rem; border: 1px solid #e5e7eb; border-radius: 0.75rem;">
			<div style="display: flex; align-items: flex-start; gap: 1rem;">
				<span style="display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; border-radius: 50%; background: #6366f1; color: white; font-weight: bold; font-size: 0.875rem; flex-shrink: 0;">
					${step.stepNumber}
				</span>
				<div>
					<h3 style="margin: 0 0 0.5rem; font-size: 1.125rem;">${step.title}</h3>
					${step.description ? `<p style="color: #6b7280; margin: 0 0 1rem;">${step.description}</p>` : ""}
					${step.screenshotUrl ? `<img src="${step.screenshotUrl}" alt="Step ${step.stepNumber}" style="max-width: 100%; border-radius: 0.5rem; border: 1px solid #e5e7eb;" />` : ""}
				</div>
			</div>
		</div>`,
		)
		.join("\n");

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${guide.title}</title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; color: #111827; }
	</style>
</head>
<body>
	<h1>${guide.title}</h1>
	${guide.description ? `<p style="color: #6b7280; font-size: 1.125rem;">${guide.description}</p>` : ""}
	<hr style="margin: 2rem 0; border: none; border-top: 1px solid #e5e7eb;">
	${stepsHtml}
	<p style="color: #9ca3af; font-size: 0.75rem; margin-top: 2rem; text-align: center;">Generated with Scribble</p>
</body>
</html>`;
}
