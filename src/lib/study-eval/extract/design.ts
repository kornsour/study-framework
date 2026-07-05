import { matchPhrases } from "../text";
import type { DesignClassification, ExternalMetadata, StudyDesign } from "../types";

/**
 * PubMed publication types are curated by NLM indexers — when present they are
 * the most reliable design signal available, ahead of any keyword heuristic.
 * Ordered strongest-first so the best label wins when several are present.
 */
const PUBLICATION_TYPE_MAP: ReadonlyArray<[string, StudyDesign]> = [
	["meta-analysis", "meta-analysis"],
	["systematic review", "systematic-review"],
	["randomized controlled trial", "rct"],
	["pragmatic clinical trial", "rct"],
	["equivalence trial", "rct"],
	["clinical trial, phase iii", "rct"],
	["controlled clinical trial", "rct"],
	["observational study", "cohort"],
	["case reports", "case-report"],
];

/**
 * Keyword heuristics, ordered strongest-design-first. Each entry needs at least
 * one phrase to match. RCT requires explicit randomization language — "trial"
 * alone is not enough (plenty of "open-label trial of..." single-arm studies).
 */
const KEYWORD_RULES: ReadonlyArray<{
	design: StudyDesign;
	phrases: readonly string[];
	confidence: "high" | "medium";
}> = [
	{
		design: "meta-analysis",
		phrases: ["meta-analysis", "meta analysis", "pooled analysis of"],
		confidence: "high",
	},
	{
		design: "systematic-review",
		phrases: ["systematic review"],
		confidence: "high",
	},
	{
		design: "rct",
		phrases: [
			"randomized controlled trial",
			"randomised controlled trial",
			"randomized clinical trial",
			"randomised clinical trial",
			"randomly assigned",
			"randomly allocated",
			"random assignment",
			"randomization",
			"randomisation",
			"were randomized",
			"were randomised",
		],
		confidence: "high",
	},
	{
		design: "natural-experiment",
		phrases: [
			"natural experiment",
			"quasi-experiment",
			"regression discontinuity",
			"difference-in-differences",
			"difference in differences",
			"instrumental variable",
			"lottery",
		],
		confidence: "medium",
	},
	{
		design: "prospective-cohort",
		phrases: ["prospective cohort", "prospectively followed", "followed prospectively"],
		confidence: "high",
	},
	{
		design: "case-control",
		phrases: ["case-control", "case control study"],
		confidence: "high",
	},
	{
		design: "cohort",
		phrases: ["cohort study", "cohort of", "retrospective cohort", "longitudinal study"],
		confidence: "medium",
	},
	{
		design: "cross-sectional",
		phrases: [
			"cross-sectional",
			"cross sectional",
			"survey of",
			"nationally representative survey",
		],
		confidence: "medium",
	},
	{
		design: "case-report",
		phrases: ["case report", "case series", "we report a case"],
		confidence: "high",
	},
	{
		design: "in-vitro",
		phrases: ["in vitro", "cell line", "cell culture", "cultured cells", "petri"],
		confidence: "medium",
	},
	{
		design: "animal",
		phrases: [
			"in mice",
			"in rats",
			"mouse model",
			"rat model",
			"murine",
			"zebrafish",
			"drosophila",
			"c57bl",
			"sprague-dawley",
			"rhesus",
			"in vivo animal",
		],
		confidence: "medium",
	},
];

export function classifyDesign(text: string, metadata?: ExternalMetadata): DesignClassification {
	// 1) Registry metadata wins when it maps to a design we know.
	const pubTypes = (metadata?.publicationTypes ?? []).map((t) => t.toLowerCase());
	for (const [label, design] of PUBLICATION_TYPE_MAP) {
		const hit = pubTypes.find((t) => t.includes(label));
		if (hit) {
			return { design, confidence: "high", source: "publication-types", signals: [hit] };
		}
	}

	// 2) Keyword heuristics over the text, strongest design first.
	for (const rule of KEYWORD_RULES) {
		const hits = matchPhrases(text, rule.phrases);
		if (hits.length > 0) {
			return {
				design: rule.design,
				// Multiple independent phrases firing raises confidence a notch.
				confidence: hits.length > 1 && rule.confidence === "medium" ? "high" : rule.confidence,
				source: "keywords",
				signals: hits,
			};
		}
	}

	return { design: "unknown", confidence: "low", source: "none", signals: [] };
}

/** Where a design sits in the evidence hierarchy, as a scorecard Design score. */
export function designScore(design: StudyDesign): 0 | 1 | 2 {
	switch (design) {
		case "meta-analysis":
		case "systematic-review":
		case "rct":
		case "natural-experiment":
			return 2;
		case "prospective-cohort":
		case "cohort":
		case "case-control":
			return 1;
		default:
			// cross-sectional, case-report, animal, in-vitro, unknown
			return 0;
	}
}
