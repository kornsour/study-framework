import { matchPhrases, matchSnippets } from "../text";
import type { MeasurementExtraction } from "../types";

const SELF_REPORT_PHRASES = [
	"self-reported",
	"self reported",
	"self-report",
	"questionnaire",
	"food frequency",
	"dietary recall",
	"24-hour recall",
	"survey responses",
	"interview",
	"diary",
	"self-rated",
	"self-assessed",
	"parent-reported",
	"parental report",
	"recall of",
] as const;

const OBJECTIVE_PHRASES = [
	"medical records",
	"hospital records",
	"electronic health records",
	"health records",
	"registry",
	"registries",
	"claims data",
	"laboratory",
	"lab values",
	"biomarker",
	"blood samples",
	"serum",
	"plasma",
	"mortality",
	"death records",
	"death certificate",
	"hospitalization",
	"hospitalisation",
	"test scores",
	"accelerometer",
	"actigraphy",
	"blood pressure was measured",
	"measured by trained",
	"objectively measured",
	"imaging",
	"mri",
	"dxa",
	"birth weight",
	"administrative data",
] as const;

export function extractMeasurement(text: string): MeasurementExtraction {
	let blinding: MeasurementExtraction["blinding"] = "unknown";
	let blindingSnippet: string | null = null;

	const doubleBlind = matchSnippets(text, /\b(?:double|triple)[- ]blind(?:ed)?\b/i, 40);
	const singleBlind = matchSnippets(text, /\bsingle[- ]blind(?:ed)?\b/i, 40);
	const assessorBlind = matchSnippets(
		text,
		/\bblind(?:ed)?\s+(?:outcome\s+)?assess(?:or|ment|ors)|assessors?\s+(?:were\s+)?blind(?:ed)?\b/i,
		40,
	);
	const openLabel = matchSnippets(text, /\bopen[- ]label\b|\bunblinded\b/i, 40);

	if (doubleBlind.length > 0) {
		blinding = "double";
		blindingSnippet = doubleBlind[0] ?? null;
	} else if (assessorBlind.length > 0) {
		blinding = "assessor";
		blindingSnippet = assessorBlind[0] ?? null;
	} else if (singleBlind.length > 0) {
		blinding = "single";
		blindingSnippet = singleBlind[0] ?? null;
	} else if (openLabel.length > 0) {
		blinding = "open-label";
		blindingSnippet = openLabel[0] ?? null;
	}

	return {
		selfReportSignals: matchPhrases(text, SELF_REPORT_PHRASES),
		objectiveSignals: matchPhrases(text, OBJECTIVE_PHRASES),
		blinding,
		blindingSnippet,
	};
}

/** Scorecard Measurement score: objective+blinded (2) → mixed (1) → self-reported/unblinded (0). */
export function measurementScore(m: MeasurementExtraction): {
	score: 0 | 1 | 2;
	rationale: string;
} {
	const objective = m.objectiveSignals.length > 0;
	const selfReport = m.selfReportSignals.length > 0;
	const blinded = m.blinding === "double" || m.blinding === "assessor";

	if (objective && !selfReport) {
		if (blinded) {
			return {
				score: 2,
				rationale: `Objective outcomes (${m.objectiveSignals.slice(0, 3).join(", ")}) with blinded assessment.`,
			};
		}
		return {
			score: 1,
			rationale:
				m.blinding === "unknown"
					? `Objective outcomes (${m.objectiveSignals.slice(0, 3).join(", ")}), but blinding is not described.`
					: `Objective outcomes (${m.objectiveSignals.slice(0, 3).join(", ")}), but assessment was ${m.blinding === "open-label" ? "unblinded" : "only single-blind"}.`,
		};
	}
	if (objective && selfReport) {
		return {
			score: 1,
			rationale: "Mix of objective and self-reported measures.",
		};
	}
	if (selfReport) {
		return {
			score: 0,
			rationale: `Key outcomes appear self-reported (${m.selfReportSignals.slice(0, 3).join(", ")}) — prone to recall and social-desirability bias.`,
		};
	}
	return {
		score: 1,
		rationale: "How outcomes were measured is not described in the text provided.",
	};
}
