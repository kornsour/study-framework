import type { ExternalMetadata } from "../types";

/** Crossref REST API client (free, no key). Fallback when PubMed doesn't index a DOI. */

const TIMEOUT_MS = 10_000;

interface CrossrefWork {
	title?: string[];
	abstract?: string; // JATS XML fragment
	"container-title"?: string[];
	issued?: { "date-parts"?: number[][] };
	"update-to"?: Array<{ type?: string }>;
	relation?: Record<string, unknown>;
}

export async function fetchCrossref(doi: string): Promise<ExternalMetadata | null> {
	const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
		signal: AbortSignal.timeout(TIMEOUT_MS),
		headers: { "User-Agent": "good-study-framework/1.0 (mailto:noreply@example.com)" },
	});
	if (!res.ok) return null;
	const json = (await res.json()) as { message?: CrossrefWork };
	const work = json.message;
	if (!work) return null;

	return {
		title: work.title?.[0],
		// Crossref abstracts are JATS XML — strip the tags.
		abstract: work.abstract
			?.replace(/<[^>]+>/g, " ")
			.replace(/\s+/g, " ")
			.trim(),
		journal: work["container-title"]?.[0],
		year: work.issued?.["date-parts"]?.[0]?.[0],
	};
}
