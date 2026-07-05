import { classifyDesign } from "./extract/design";
import { extractClaimLanguage } from "./extract/language";
import { extractMeasurement } from "./extract/measurement";
import { extractPopulation } from "./extract/population";
import { extractRegistration } from "./extract/registration";
import { extractSampleSize } from "./extract/sample-size";
import { extractStatistics } from "./extract/statistics";
import { buildFlags } from "./flags";
import { computeVerdict, scoreDimensions } from "./score";
import type { Evaluation, Extraction, StudyInput } from "./types";

export type { Evaluation, StudyInput } from "./types";

/**
 * Run the full Good Study Framework evaluation deterministically.
 * No network, no AI — pure functions over the provided text and metadata.
 */
export function evaluateStudy(input: StudyInput): Evaluation {
	const title = input.title ?? input.metadata?.title ?? null;
	const text = [title ?? "", input.text].join("\n");
	const retracted = input.metadata?.retracted ?? false;

	const extraction: Extraction = {
		design: classifyDesign(text, input.metadata),
		sampleSize: extractSampleSize(text),
		statistics: extractStatistics(text),
		measurement: extractMeasurement(text),
		registration: extractRegistration(text),
		claim: extractClaimLanguage(input.text, title ?? undefined),
		population: extractPopulation(text),
	};

	const dimensions = scoreDimensions(extraction, text, retracted);
	const { total, verdict, overrideApplied } = computeVerdict(
		dimensions,
		extraction.claim.makesCausalClaim,
	);
	const flags = buildFlags(extraction, dimensions, retracted);

	return {
		input: { title, doi: input.doi ?? null, pmid: input.pmid ?? null },
		extraction,
		dimensions,
		total,
		maxTotal: 14,
		verdict,
		overrideApplied,
		flags,
		reviewCandidates: dimensions.filter((d) => d.needsReview).map((d) => d.key),
		retracted,
	};
}
