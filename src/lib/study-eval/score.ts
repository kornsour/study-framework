import { designScore } from "./extract/design";
import { measurementScore } from "./extract/measurement";
import { applicabilityScore } from "./extract/population";
import { sampleSizeScore } from "./extract/sample-size";
import { statisticsScore } from "./extract/statistics";
import { matchPhrases } from "./text";
import type { DimensionScore, Extraction, StudyDesign, Verdict } from "./types";

const CAUSAL_DESIGNS: ReadonlySet<StudyDesign> = new Set([
	"rct",
	"natural-experiment",
	"meta-analysis",
	"systematic-review",
]);

const OBSERVATIONAL_DESIGNS: ReadonlySet<StudyDesign> = new Set([
	"prospective-cohort",
	"cohort",
	"case-control",
	"cross-sectional",
]);

const ADJUSTMENT_PHRASES = [
	"adjusted for",
	"adjusting for",
	"after adjustment",
	"controlled for",
	"controlling for",
	"multivariable",
	"multivariate",
	"covariates",
	"propensity score",
	"fixed effects",
	"sibling comparison",
	"within-family",
] as const;

const NOVELTY_PHRASES = [
	"first study to",
	"first evidence",
	"novel finding",
	"contrary to previous",
	"in contrast to previous",
	"challenges the prevailing",
	"overturns",
] as const;

const CONSISTENCY_PHRASES = [
	"consistent with previous",
	"consistent with prior",
	"in line with previous",
	"in line with prior",
	"replicates",
	"replicated",
	"replicating earlier",
	"confirms previous",
	"corroborates",
	"as in previous studies",
] as const;

/** Dimension 1 — Design: where the study sits in the evidence hierarchy. */
function scoreDesign(e: Extraction): DimensionScore {
	const { design, confidence, signals, source } = e.design;
	const score = designScore(design);
	const labelMap: Record<StudyDesign, string> = {
		"meta-analysis": "meta-analysis",
		"systematic-review": "systematic review",
		rct: "randomized controlled trial",
		"natural-experiment": "natural/quasi-experiment",
		"prospective-cohort": "prospective cohort",
		cohort: "cohort study",
		"case-control": "case-control study",
		"cross-sectional": "cross-sectional/survey",
		"case-report": "case report/series",
		animal: "animal study",
		"in-vitro": "in-vitro/lab study",
		unknown: "unclear design",
	};
	return {
		key: "design",
		label: "Design",
		score,
		confidence,
		rationale:
			design === "unknown"
				? "The study design could not be identified from the text — the single most important fact about a study is missing."
				: `Classified as a ${labelMap[design]}${source === "publication-types" ? " (per PubMed's curated publication type)" : ""}. ${
						score === 2
							? "Randomization or pooled randomized evidence makes groups genuinely comparable."
							: score === 1
								? "Observational with a comparison group: informative, but people chose their own exposure, so confounding remains."
								: "Bottom of the evidence hierarchy: no comparison that can support a causal claim."
					}`,
		evidence: signals,
		needsReview: design === "unknown",
	};
}

/** Dimension 2 — Causation: can the design bear the causal weight of the claim? */
function scoreCausation(e: Extraction, fullText: string): DimensionScore {
	const design = e.design.design;
	const claim = e.claim;
	const adjusted = matchPhrases(fullText, ADJUSTMENT_PHRASES);

	if (CAUSAL_DESIGNS.has(design)) {
		return {
			key: "causation",
			label: "Causation",
			score: 2,
			confidence: e.design.confidence,
			rationale:
				"The design genuinely supports causal interpretation — random (or near-random) assignment breaks the link between the exposure and everything else about a person.",
			evidence: e.design.signals,
			needsReview: false,
		};
	}

	const observational = OBSERVATIONAL_DESIGNS.has(design);
	if (claim.makesCausalClaim && !claim.hedges) {
		return {
			key: "causation",
			label: "Causation",
			score: 0,
			confidence: "medium",
			rationale: `Causal language (${claim.causalPhrases
				.slice(0, 3)
				.map((p) => `"${p}"`)
				.join(
					", ",
				)}) attached to a ${observational ? "study where people chose their own exposure" : "design that cannot demonstrate cause"} — this is correlation dressed up as cause.`,
			evidence: claim.causalPhrases,
			needsReview: false,
		};
	}

	if (observational && adjusted.length > 0) {
		return {
			key: "causation",
			label: "Causation",
			score: 1,
			confidence: "medium",
			rationale: `Observational but thoughtfully adjusted (${adjusted.slice(0, 3).join(", ")})${claim.hedges ? ", and the authors hedge their causal claims appropriately" : ""}. Remember: analysts can only control for what they measure — residual confounding remains the default explanation.`,
			evidence: [...adjusted.slice(0, 3), ...claim.hedgedPhrases.slice(0, 2)],
			needsReview: false,
		};
	}

	if (observational || design === "unknown") {
		return {
			key: "causation",
			label: "Causation",
			score: claim.makesCausalClaim ? 0 : 1,
			confidence: design === "unknown" ? "low" : "medium",
			rationale: claim.makesCausalClaim
				? "A causal claim without either randomization or visible statistical adjustment."
				: "Association only, and the authors present it as such. Confounding is unaddressed as far as the text shows.",
			evidence: claim.makesCausalClaim ? claim.causalPhrases : claim.hedgedPhrases.slice(0, 3),
			needsReview: design === "unknown",
		};
	}

	// case-report / animal / in-vitro
	return {
		key: "causation",
		label: "Causation",
		score: 0,
		confidence: "medium",
		rationale: "No comparison group that could separate cause from coincidence.",
		evidence: [],
		needsReview: false,
	};
}

/** Dimension 6 — Robustness: replication, consistency, retraction. */
function scoreRobustness(e: Extraction, fullText: string, retracted: boolean): DimensionScore {
	if (retracted) {
		return {
			key: "robustness",
			label: "Robustness",
			score: 0,
			confidence: "high",
			rationale: "This paper has been RETRACTED. Its findings should not be relied on at all.",
			evidence: ["retraction record in registry metadata"],
			needsReview: false,
		};
	}

	const design = e.design.design;
	if (design === "meta-analysis" || design === "systematic-review") {
		return {
			key: "robustness",
			label: "Robustness",
			score: 2,
			confidence: "high",
			rationale:
				"Pools many studies — consistency across a body of work is exactly what this dimension asks for. (Quality still depends on the studies pooled.)",
			evidence: e.design.signals,
			needsReview: false,
		};
	}

	const consistent = matchPhrases(fullText, CONSISTENCY_PHRASES);
	const novel = matchPhrases(fullText, NOVELTY_PHRASES);

	if (consistent.length > 0) {
		return {
			key: "robustness",
			label: "Robustness",
			score: 2,
			confidence: "medium",
			rationale: `The authors situate the finding within consistent prior work (${consistent
				.slice(0, 2)
				.map((p) => `"${p}"`)
				.join(", ")}).`,
			evidence: consistent,
			needsReview: false,
		};
	}
	if (novel.length > 0) {
		return {
			key: "robustness",
			label: "Robustness",
			score: 0,
			confidence: "medium",
			rationale: `Positioned as novel or contradicting prior work (${novel
				.slice(0, 2)
				.map((p) => `"${p}"`)
				.join(
					", ",
				)}) — a single surprising paper rarely overturns a large literature. Wait for replication.`,
			evidence: novel,
			needsReview: false,
		};
	}
	return {
		key: "robustness",
		label: "Robustness",
		score: 1,
		confidence: "low",
		rationale:
			"Nothing in the text places this finding relative to the wider literature. This is the check automation can least verify from one document — search for meta-analyses and replications before leaning on it.",
		evidence: [],
		needsReview: true,
	};
}

export function scoreDimensions(
	e: Extraction,
	fullText: string,
	retracted: boolean,
): DimensionScore[] {
	const size = sampleSizeScore(e.sampleSize);
	const measurement = measurementScore(e.measurement);
	const stats = statisticsScore(e.statistics, e.registration.registered);
	const applicability = applicabilityScore(e.population);

	return [
		scoreDesign(e),
		scoreCausation(e, fullText),
		{
			key: "size",
			label: "Size & power",
			score: size.score,
			confidence: e.sampleSize.total === null ? "low" : "high",
			rationale: size.rationale,
			evidence: e.sampleSize.snippets.slice(0, 3),
			needsReview: e.sampleSize.total === null,
		},
		{
			key: "measurement",
			label: "Measurement",
			score: measurement.score,
			confidence:
				e.measurement.objectiveSignals.length + e.measurement.selfReportSignals.length > 0
					? "medium"
					: "low",
			rationale: measurement.rationale,
			evidence: [
				...e.measurement.objectiveSignals.slice(0, 3),
				...e.measurement.selfReportSignals.slice(0, 3),
				...(e.measurement.blindingSnippet ? [e.measurement.blindingSnippet] : []),
			],
			needsReview:
				e.measurement.objectiveSignals.length + e.measurement.selfReportSignals.length === 0,
		},
		{
			key: "statistics",
			label: "Statistics",
			score: stats.score,
			confidence:
				e.statistics.pValues.length > 0 || e.statistics.hasConfidenceIntervals ? "medium" : "low",
			rationale: stats.rationale,
			evidence: e.statistics.snippets.slice(0, 3),
			needsReview:
				e.statistics.pValues.length === 0 &&
				!e.statistics.hasConfidenceIntervals &&
				!e.statistics.hasRelativeMeasures,
		},
		scoreRobustness(e, fullText, retracted),
		{
			key: "applicability",
			label: "Applicability",
			score: applicability.score,
			confidence: e.population.isAnimalOrInVitro
				? "high"
				: e.population.populationSnippets.length > 0
					? "medium"
					: "low",
			rationale: applicability.rationale,
			evidence: [
				...e.population.populationSnippets.slice(0, 3),
				...(e.population.followUpSnippet ? [e.population.followUpSnippet] : []),
			],
			needsReview: !e.population.isAnimalOrInVitro && e.population.populationSnippets.length === 0,
		},
	];
}

export function computeVerdict(
	dimensions: DimensionScore[],
	makesCausalClaim: boolean,
): {
	total: number;
	verdict: Verdict;
	overrideApplied: boolean;
} {
	const total = dimensions.reduce((sum, d) => sum + d.score, 0);
	const design = dimensions.find((d) => d.key === "design");
	const causation = dimensions.find((d) => d.key === "causation");

	let verdict: Verdict;
	if (total >= 11) verdict = "strong";
	else if (total >= 7) verdict = "mixed";
	else verdict = "weak";

	// Override rule: a causal claim that scores 0 on both Design and Causation
	// caps the whole study at Weak regardless of the other dimensions.
	const overrideApplied =
		verdict !== "weak" && makesCausalClaim && design?.score === 0 && causation?.score === 0;
	if (overrideApplied) verdict = "weak";

	return { total, verdict, overrideApplied };
}
