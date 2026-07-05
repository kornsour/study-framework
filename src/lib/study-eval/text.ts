/** Shared text helpers for the extractors. */

/** Lowercase, collapse whitespace, normalize unicode dashes/quotes. */
export function normalize(text: string): string {
	return text
		.replace(/[‐-―]/g, "-")
		.replace(/[‘’]/g, "'")
		.replace(/[“”]/g, '"')
		.replace(/\s+/g, " ")
		.trim();
}

/** Case-insensitive phrase search returning the phrases that matched. */
export function matchPhrases(text: string, phrases: readonly string[]): string[] {
	const lower = normalize(text).toLowerCase();
	return phrases.filter((p) => lower.includes(p.toLowerCase()));
}

/** Match a regex globally and return short context snippets around each hit. */
export function matchSnippets(text: string, pattern: RegExp, contextChars = 60): string[] {
	const normalized = normalize(text);
	const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
	const re = new RegExp(pattern.source, flags);
	const snippets: string[] = [];
	for (const match of normalized.matchAll(re)) {
		const start = Math.max(0, (match.index ?? 0) - contextChars);
		const end = Math.min(normalized.length, (match.index ?? 0) + match[0].length + contextChars);
		const prefix = start > 0 ? "…" : "";
		const suffix = end < normalized.length ? "…" : "";
		snippets.push(`${prefix}${normalized.slice(start, end).trim()}${suffix}`);
		if (snippets.length >= 8) break; // enough evidence; avoid flooding the report
	}
	return snippets;
}

/** Parse a number that may contain thousands separators ("40,000" or "40 000"). */
export function parseCount(raw: string): number | null {
	const cleaned = raw.replace(/[,\s ]/g, "");
	if (!/^\d+$/.test(cleaned)) return null;
	const n = Number.parseInt(cleaned, 10);
	return Number.isSafeInteger(n) ? n : null;
}

/**
 * Best-effort split of an abstract into (rest, conclusion). Structured abstracts
 * label their sections; otherwise the last two sentences stand in for the
 * conclusion, since that is where causal claims concentrate.
 */
export function splitConclusion(text: string): { body: string; conclusion: string } {
	const normalized = normalize(text);
	const m = normalized.match(/(?:conclusions?|interpretation|significance)\s*:?\s*(.+)$/i);
	if (m?.[1]) return { body: normalized.slice(0, m.index), conclusion: m[1] };
	const sentences = normalized.split(/(?<=[.!?])\s+/);
	if (sentences.length <= 2) return { body: "", conclusion: normalized };
	return {
		body: sentences.slice(0, -2).join(" "),
		conclusion: sentences.slice(-2).join(" "),
	};
}
