/**
 * Core types for the Good Study Framework evaluator.
 *
 * The pipeline is: raw study text (+ optional registry metadata) → deterministic
 * extraction → 7-dimension scorecard (0–2 each, max 14) → verdict band.
 * Every dimension carries a confidence level; low-confidence dimensions are the
 * only candidates for the optional AI assist pass.
 */

export type StudyDesign =
	| "meta-analysis"
	| "systematic-review"
	| "rct"
	| "natural-experiment"
	| "prospective-cohort"
	| "cohort"
	| "case-control"
	| "cross-sectional"
	| "case-report"
	| "animal"
	| "in-vitro"
	| "unknown";

export type Confidence = "high" | "medium" | "low";

export interface StudyInput {
	/** Title if available — causal language in titles is weighted heavily. */
	title?: string;
	/** Abstract or full text. The more text, the better the extraction. */
	text: string;
	doi?: string;
	pmid?: string;
	/** Metadata from PubMed/Crossref, when the study was fetched by identifier. */
	metadata?: ExternalMetadata;
}

export interface ExternalMetadata {
	/** PubMed publication types — curated design labels (e.g. "Randomized Controlled Trial"). */
	publicationTypes?: string[];
	meshTerms?: string[];
	journal?: string;
	year?: number;
	/** From Crossref update-to records or PubMed retraction notices. */
	retracted?: boolean;
	title?: string;
	abstract?: string;
}

export interface DesignClassification {
	design: StudyDesign;
	confidence: Confidence;
	/** Where the classification came from: registry metadata beats keywords. */
	source: "publication-types" | "keywords" | "none";
	/** Matched phrases that drove the classification. */
	signals: string[];
}

export interface SampleSizeExtraction {
	/** Best estimate of total N, if any number was found. */
	total: number | null;
	/** All candidate group/cohort sizes found, largest first. */
	candidates: number[];
	/** Smallest explicit comparison-group size found (the "30 cases in a big coat" check). */
	smallestGroup: number | null;
	snippets: string[];
}

export interface StatisticsExtraction {
	pValues: string[];
	hasConfidenceIntervals: boolean;
	hasRelativeMeasures: boolean;
	hasAbsoluteMeasures: boolean;
	hasEffectSizes: boolean;
	/** Signs of unplanned analyses: post-hoc, exploratory, subgroup emphasis. */
	multipleComparisonSignals: string[];
	snippets: string[];
}

export interface MeasurementExtraction {
	selfReportSignals: string[];
	objectiveSignals: string[];
	blinding: "double" | "single" | "assessor" | "open-label" | "unknown";
	blindingSnippet: string | null;
}

export interface RegistrationExtraction {
	registered: boolean;
	identifiers: string[];
	dataSharingSignals: string[];
}

export interface ClaimLanguage {
	/** Causal verbs found in title/conclusions ("causes", "boosts", "reduces"...). */
	causalPhrases: string[];
	/** Hedged/associational phrases ("associated with", "may", "linked to"...). */
	hedgedPhrases: string[];
	/** True when the study asserts causation (causal phrases present, esp. in title). */
	makesCausalClaim: boolean;
	/** True when the authors themselves hedge. */
	hedges: boolean;
}

export interface PopulationExtraction {
	isAnimalOrInVitro: boolean;
	animalSignals: string[];
	populationSnippets: string[];
	followUpSnippet: string | null;
}

export interface Extraction {
	design: DesignClassification;
	sampleSize: SampleSizeExtraction;
	statistics: StatisticsExtraction;
	measurement: MeasurementExtraction;
	registration: RegistrationExtraction;
	claim: ClaimLanguage;
	population: PopulationExtraction;
}

export type DimensionKey =
	| "design"
	| "causation"
	| "size"
	| "measurement"
	| "statistics"
	| "robustness"
	| "applicability";

export interface DimensionScore {
	key: DimensionKey;
	label: string;
	score: 0 | 1 | 2;
	confidence: Confidence;
	/** Plain-speak explanation of why this score was given. */
	rationale: string;
	/** Verbatim snippets from the study that support the score. */
	evidence: string[];
	/** True when the deterministic signals were too thin to be sure — the AI/human review candidates. */
	needsReview: boolean;
}

export type Verdict = "strong" | "mixed" | "weak";

export interface Flag {
	kind: "green" | "red";
	message: string;
}

export interface Evaluation {
	input: { title: string | null; doi: string | null; pmid: string | null };
	extraction: Extraction;
	dimensions: DimensionScore[];
	total: number;
	maxTotal: 14;
	verdict: Verdict;
	/** True when the causal-claim-from-correlation override capped the verdict at Weak. */
	overrideApplied: boolean;
	flags: Flag[];
	/** Dimensions with low confidence — what an AI assist pass (or a human) should double-check. */
	reviewCandidates: DimensionKey[];
	retracted: boolean;
}
