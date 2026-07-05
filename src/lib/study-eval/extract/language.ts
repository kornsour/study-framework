import { matchPhrases, splitConclusion } from "../text";
import type { ClaimLanguage } from "../types";

/**
 * Causal verbs — the language of "X causes Y". Weighted heavily when they
 * appear in the title or conclusion, where the claim lives.
 */
const CAUSAL_PHRASES = [
	"causes",
	"caused by",
	"leads to",
	"led to",
	"results in",
	"boosts",
	"boosted",
	"improves",
	"improved",
	"enhances",
	"reduces the risk",
	"reduced the risk",
	"lowers the risk",
	"lowered the risk",
	"increases the risk",
	"increased the risk",
	"raises the risk",
	"cuts the risk",
	"prevents",
	"prevented",
	"protects against",
	"protective effect",
	"the effect of",
	"effects of",
	"due to",
	"because of",
	"drives",
	"triggers",
	"makes you",
	"is responsible for",
] as const;

/** Associational / hedged language — the honest vocabulary of observation. */
const HEDGED_PHRASES = [
	"associated with",
	"association between",
	"linked to",
	"link between",
	"correlated with",
	"correlation between",
	"related to",
	"relationship between",
	"may be",
	"might be",
	"may not be causal",
	"cannot establish causality",
	"cannot establish causation",
	"causality cannot be inferred",
	"causal inference is limited",
	"suggests",
	"suggesting",
	"is predictive of",
	"predicts",
	"tended to",
	"was observed",
	"further research is needed",
	"residual confounding",
] as const;

export function extractClaimLanguage(text: string, title?: string): ClaimLanguage {
	const { conclusion } = splitConclusion(text);
	// The claim concentrates in the title and conclusion; hedges can live anywhere.
	const claimText = `${title ?? ""}. ${conclusion}`;

	const causalPhrases = matchPhrases(claimText, CAUSAL_PHRASES);
	const causalAnywhere = matchPhrases(text, CAUSAL_PHRASES);
	const hedgedPhrases = matchPhrases(`${claimText} ${text}`, HEDGED_PHRASES);

	return {
		causalPhrases: causalPhrases.length > 0 ? causalPhrases : causalAnywhere.slice(0, 3),
		hedgedPhrases,
		// A causal claim means causal verbs where the claim lives (title/conclusion).
		makesCausalClaim: causalPhrases.length > 0,
		hedges: hedgedPhrases.length > 0,
	};
}
