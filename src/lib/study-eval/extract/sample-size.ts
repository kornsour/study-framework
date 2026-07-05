import { normalize, parseCount } from "../text";
import type { SampleSizeExtraction } from "../types";

const NUM = String.raw`\d{1,3}(?:[,  ]\d{3})+|\d+`;

/**
 * Patterns that capture a participant count. Each has a named capture `n`.
 * Kept deliberately conservative: years, percentages, and doses are the main
 * false-positive risks, filtered below.
 */
const PATTERNS: RegExp[] = [
	// n = 1,234  /  N=40 000
	new RegExp(String.raw`\bn\s*=\s*(?<n>${NUM})`, "gi"),
	// 1,234 participants / patients / subjects / adults / women / men / children / infants / individuals
	new RegExp(
		String.raw`\b(?<n>${NUM})\s+(?:participants|patients|subjects|adults|women|men|children|infants|individuals|people|pregnancies|births|respondents|cases|controls|pairs|households)\b`,
		"gi",
	),
	// enrolled/recruited/randomized/included/surveyed/followed 1,234
	new RegExp(
		String.raw`\b(?:enrolled|recruited|randomized|randomised|included|surveyed|followed|analyzed|analysed|assigned)\s+(?:a\s+total\s+of\s+)?(?<n>${NUM})\b`,
		"gi",
	),
	// a total of 1,234
	new RegExp(String.raw`\btotal\s+of\s+(?<n>${NUM})\b`, "gi"),
];

/** Counts that are almost certainly not a sample size. */
function plausible(n: number): boolean {
	// Reject 4-digit numbers that read as years (1900–2099) — a common trap in
	// abstracts ("followed from 1998 to 2012"). Real Ns in that range exist but
	// the ambiguity costs more than it saves; other patterns usually catch them.
	if (n >= 1900 && n <= 2099) return false;
	return n >= 2 && n <= 100_000_000;
}

export function extractSampleSize(text: string): SampleSizeExtraction {
	const normalized = normalize(text);
	const candidates: number[] = [];
	const snippets: string[] = [];

	for (const pattern of PATTERNS) {
		for (const match of normalized.matchAll(pattern)) {
			const n = parseCount(match.groups?.n ?? "");
			if (n !== null && plausible(n)) {
				candidates.push(n);
				if (snippets.length < 6) {
					const start = Math.max(0, (match.index ?? 0) - 40);
					const end = Math.min(normalized.length, (match.index ?? 0) + match[0].length + 40);
					snippets.push(`…${normalized.slice(start, end).trim()}…`);
				}
			}
		}
	}

	if (candidates.length === 0) {
		return { total: null, candidates: [], smallestGroup: null, snippets: [] };
	}

	const sorted = [...new Set(candidates)].sort((a, b) => b - a);
	return {
		// The largest count is the best guess at total N (groups are subsets).
		total: sorted[0] ?? null,
		candidates: sorted,
		// The smallest distinct count approximates the key comparison group —
		// the "50,000-person study resting on 30 cases" check.
		smallestGroup: sorted.length > 1 ? (sorted[sorted.length - 1] ?? null) : null,
		snippets,
	};
}

/** Scorecard Size & power score from extracted counts. */
export function sampleSizeScore(extraction: SampleSizeExtraction): {
	score: 0 | 1 | 2;
	rationale: string;
} {
	const { total, smallestGroup } = extraction;
	if (total === null) {
		return { score: 0, rationale: "No sample size could be found in the text." };
	}
	// A dramatic claim resting on a tiny subgroup scores as small no matter the headline N.
	if (smallestGroup !== null && smallestGroup < 30) {
		return {
			score: total >= 300 ? 1 : 0,
			rationale: `Total N≈${total.toLocaleString()}, but a key group has only ${smallestGroup} — a small study wearing a big coat.`,
		};
	}
	if (total < 100) {
		return { score: 0, rationale: `Small sample (N≈${total.toLocaleString()}) — prone to flukes.` };
	}
	if (total < 1000) {
		return { score: 1, rationale: `Moderate sample (N≈${total.toLocaleString()}).` };
	}
	return { score: 2, rationale: `Large sample (N≈${total.toLocaleString()}).` };
}
