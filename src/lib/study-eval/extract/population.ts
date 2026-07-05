import { matchPhrases, matchSnippets } from "../text";
import type { PopulationExtraction } from "../types";

const ANIMAL_PHRASES = [
	"in mice",
	"in rats",
	"mouse model",
	"rat model",
	"murine",
	"zebrafish",
	"drosophila",
	"c. elegans",
	"c57bl",
	"sprague-dawley",
	"wistar",
	"rhesus",
	"macaque",
	"in vitro",
	"cell line",
	"cell culture",
	"cultured cells",
	"organoid",
] as const;

/** Phrases that describe who was enrolled — surfaced so the reader can judge fit. */
const POPULATION_PATTERNS: RegExp[] = [
	/\b(?:men|women|adults|children|adolescents|infants|patients|participants)\s+(?:aged|ages)\s+[\d–-]+(?:\s*(?:to|–|-)\s*\d+)?\s*(?:years|yrs|months)?/gi,
	/\baged\s+\d+(?:\s*(?:to|–|-)\s*\d+)?\s*(?:years|yrs|months)\b/gi,
	/\b(?:pregnant women|postmenopausal women|healthy volunteers|healthy adults|older adults|elderly|college students|undergraduate)/gi,
	/\bpatients?\s+with\s+[a-z][a-z\s-]{3,40}?(?=[,.;)]| were| who| and)/gi,
];

const FOLLOW_UP =
	/\b(?:median |mean |average )?follow[- ]?up(?:\s+(?:period|duration|time))?\s*(?:of|was|:)?\s*[\d.]+\s*(?:days|weeks|months|years)\b/gi;

export function extractPopulation(text: string): PopulationExtraction {
	const animalSignals = matchPhrases(text, ANIMAL_PHRASES);
	// Human-study terms that rule out an animal-only interpretation.
	const humanSignals = matchPhrases(text, [
		"participants",
		"patients",
		"volunteers",
		"men and women",
		"pregnant",
		"cohort of adults",
		"human subjects",
	]);

	const populationSnippets: string[] = [];
	for (const pattern of POPULATION_PATTERNS) {
		for (const s of matchSnippets(text, pattern, 0)) {
			if (populationSnippets.length < 5) populationSnippets.push(s);
		}
	}

	const followUp = matchSnippets(text, FOLLOW_UP, 0);

	return {
		// Animal signals with no human enrollment language → treat as preclinical.
		isAnimalOrInVitro: animalSignals.length > 0 && humanSignals.length === 0,
		animalSignals,
		populationSnippets,
		followUpSnippet: followUp[0] ?? null,
	};
}

/** Scorecard Applicability score from what we can see about who was studied. */
export function applicabilityScore(p: PopulationExtraction): {
	score: 0 | 1 | 2;
	rationale: string;
} {
	if (p.isAnimalOrInVitro) {
		return {
			score: 0,
			rationale: `Animal or lab study (${p.animalSignals.slice(0, 2).join(", ")}) — findings do not transfer to humans without human trials.`,
		};
	}
	if (p.populationSnippets.length > 0) {
		return {
			score: 1,
			rationale: `Studied population: ${p.populationSnippets.slice(0, 2).join("; ")}. Whether it generalizes depends on who you care about — judge the fit yourself.`,
		};
	}
	return {
		score: 1,
		rationale: "Who was studied is not clearly described in the text provided.",
	};
}
