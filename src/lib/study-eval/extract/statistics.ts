import { matchPhrases, matchSnippets } from "../text";
import type { StatisticsExtraction } from "../types";

const P_VALUE = /\bp\s*[<=>≤≥]\s*0?\.\d+/gi;

const CI_PHRASES = [
	"confidence interval",
	"95% ci",
	"99% ci",
	"credible interval",
	"95%ci",
] as const;

const RELATIVE_PHRASES = [
	"relative risk",
	"risk ratio",
	"odds ratio",
	"hazard ratio",
	"rate ratio",
	"times more likely",
	"times higher",
	"fold increase",
	"fold higher",
	"% higher risk",
	"% lower risk",
	"% increased risk",
	"% reduced risk",
] as const;

// Abbreviated ratio reports: "RR 1.4", "OR = 2.1", "HR, 0.85", "aOR 1.3".
// No /g flag — .test() on a global regex is stateful across calls.
const RELATIVE_ABBREV = /\b(?:a?rr|a?or|a?hr|irr)\s*[=:,]?\s*\d+(?:\.\d+)?/i;

const ABSOLUTE_PHRASES = [
	"absolute risk",
	"risk difference",
	"absolute difference",
	"number needed to treat",
	"per 1,000",
	"per 1000",
	"per 10,000",
	"per 10000",
	"per 100,000",
	"per 100000",
	"percentage points",
	"incidence rate",
	"attributable risk",
] as const;

const EFFECT_SIZE_PHRASES = [
	"effect size",
	"cohen's d",
	"mean difference",
	"standardized mean difference",
	"standardised mean difference",
	"beta coefficient",
	"regression coefficient",
	"eta squared",
	"correlation coefficient",
] as const;

const MULTIPLE_COMPARISON_PHRASES = [
	"post hoc",
	"post-hoc",
	"exploratory analysis",
	"exploratory analyses",
	"secondary analysis of",
	"subgroup analysis",
	"subgroup analyses",
	"multiple outcomes",
	"not adjusted for multiple comparisons",
] as const;

export function extractStatistics(text: string): StatisticsExtraction {
	const pValues = matchSnippets(text, P_VALUE, 0).slice(0, 10);
	return {
		pValues,
		hasConfidenceIntervals: matchPhrases(text, CI_PHRASES).length > 0,
		hasRelativeMeasures:
			matchPhrases(text, RELATIVE_PHRASES).length > 0 || RELATIVE_ABBREV.test(text),
		hasAbsoluteMeasures: matchPhrases(text, ABSOLUTE_PHRASES).length > 0,
		hasEffectSizes: matchPhrases(text, EFFECT_SIZE_PHRASES).length > 0,
		multipleComparisonSignals: matchPhrases(text, MULTIPLE_COMPARISON_PHRASES),
		snippets: matchSnippets(text, P_VALUE).slice(0, 4),
	};
}

/**
 * Scorecard Statistics score.
 * 2 = effect sizes with uncertainty AND absolute framing; 1 = effect reporting
 * but limited uncertainty detail; 0 = p-values or relative risk alone.
 */
export function statisticsScore(
	s: StatisticsExtraction,
	preRegistered: boolean,
): { score: 0 | 1 | 2; rationale: string } {
	const reportsEffects = s.hasEffectSizes || s.hasRelativeMeasures || s.hasAbsoluteMeasures;
	const cherryPicking = s.multipleComparisonSignals.length > 0 && !preRegistered;

	if (s.hasConfidenceIntervals && s.hasAbsoluteMeasures && reportsEffects && !cherryPicking) {
		return {
			score: 2,
			rationale:
				"Reports effect sizes with confidence intervals and absolute measures — the full picture.",
		};
	}
	if (s.hasConfidenceIntervals && reportsEffects) {
		return {
			score: 1,
			rationale: s.hasAbsoluteMeasures
				? "Reports effects and uncertainty, but unplanned analyses temper confidence."
				: "Reports effect sizes with uncertainty, but only in relative terms — absolute risk is missing.",
		};
	}
	if (reportsEffects) {
		return {
			score: 1,
			rationale:
				"Reports effect sizes but with limited uncertainty detail (no confidence intervals found).",
		};
	}
	if (s.pValues.length > 0) {
		return {
			score: 0,
			rationale: "Only p-values found — statistical significance without effect magnitude.",
		};
	}
	return { score: 0, rationale: "No quantitative statistics could be found in the text." };
}
