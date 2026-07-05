import { describe, expect, it } from "vitest";
import { classifyDesign } from "./extract/design";
import { extractClaimLanguage } from "./extract/language";
import { extractMeasurement } from "./extract/measurement";
import { extractPopulation } from "./extract/population";
import { extractRegistration } from "./extract/registration";
import { extractSampleSize } from "./extract/sample-size";
import { extractStatistics } from "./extract/statistics";
import { evaluateStudy } from "./index";

// Condensed real-world-shaped abstracts for end-to-end checks.
const RCT_ABSTRACT = `Background: The effect of drug X on cardiovascular events is unknown.
Methods: In this double-blind, randomized controlled trial, we randomly assigned 4,812 adults aged 45-75 years with hypertension to receive drug X or placebo. The primary outcome was hospitalization for myocardial infarction, ascertained from medical records. The trial was registered (NCT01234567).
Results: Over a median follow-up of 4.2 years, the absolute risk of the primary outcome was 3.1% with drug X vs 4.6% with placebo (hazard ratio 0.67; 95% CI 0.55 to 0.81; risk difference -1.5 percentage points).
Conclusions: Drug X reduced the risk of myocardial infarction, consistent with previous trials of this drug class.`;

const OBSERVATIONAL_CAUSAL_ABSTRACT = `We surveyed 1,200 parents about their children's screen time and behavior. In this cross-sectional study, screen time was self-reported via questionnaire. Children with more than 4 hours of daily screen time had higher odds of behavioral problems (odds ratio 2.1, p < 0.05). Our findings show that screen time causes behavioral problems in children and boosts the risk of attention difficulties.`;

const MOUSE_ABSTRACT = `We investigated the effect of compound Z on tumor growth in mice. C57BL/6 mouse models (n = 24) were treated with compound Z or vehicle control. Tumor volume was reduced by 40% (p = 0.01) in treated animals. These results suggest compound Z may be a promising therapeutic candidate.`;

describe("classifyDesign", () => {
	it("detects RCTs from randomization language", () => {
		const result = classifyDesign(RCT_ABSTRACT);
		expect(result.design).toBe("rct");
		expect(result.confidence).toBe("high");
	});

	it("prefers PubMed publication types over keywords", () => {
		const result = classifyDesign("We describe a study of things.", {
			publicationTypes: ["Journal Article", "Randomized Controlled Trial"],
		});
		expect(result.design).toBe("rct");
		expect(result.source).toBe("publication-types");
	});

	it("detects cross-sectional surveys", () => {
		expect(classifyDesign(OBSERVATIONAL_CAUSAL_ABSTRACT).design).toBe("cross-sectional");
	});

	it("detects meta-analyses ahead of the designs they pool", () => {
		const text =
			"We conducted a meta-analysis of 14 randomized controlled trials of vitamin D supplementation.";
		expect(classifyDesign(text).design).toBe("meta-analysis");
	});

	it("returns unknown when nothing matches", () => {
		expect(classifyDesign("Vague words about health.").design).toBe("unknown");
	});
});

describe("extractSampleSize", () => {
	it("finds n= and participant counts, largest as total", () => {
		const result = extractSampleSize(RCT_ABSTRACT);
		expect(result.total).toBe(4812);
	});

	it("ignores years", () => {
		const result = extractSampleSize("We enrolled 1998 participants starting in 2005.");
		// 1998 is in the year-trap range and rejected; better to miss than misread.
		expect(result.candidates).not.toContain(2005);
	});

	it("returns null when no counts exist", () => {
		expect(extractSampleSize("A study of some people.").total).toBeNull();
	});
});

describe("extractStatistics", () => {
	it("finds p-values, CIs, and absolute measures in the RCT", () => {
		const s = extractStatistics(RCT_ABSTRACT);
		expect(s.hasConfidenceIntervals).toBe(true);
		expect(s.hasAbsoluteMeasures).toBe(true);
		expect(s.hasRelativeMeasures).toBe(true);
	});

	it("flags relative-only reporting", () => {
		const s = extractStatistics(OBSERVATIONAL_CAUSAL_ABSTRACT);
		expect(s.hasRelativeMeasures).toBe(true);
		expect(s.hasAbsoluteMeasures).toBe(false);
	});
});

describe("extractMeasurement", () => {
	it("detects double-blinding and objective outcomes", () => {
		const m = extractMeasurement(RCT_ABSTRACT);
		expect(m.blinding).toBe("double");
		expect(m.objectiveSignals.length).toBeGreaterThan(0);
	});

	it("detects self-report", () => {
		const m = extractMeasurement(OBSERVATIONAL_CAUSAL_ABSTRACT);
		expect(m.selfReportSignals.length).toBeGreaterThan(0);
	});
});

describe("extractRegistration", () => {
	it("finds NCT identifiers", () => {
		const r = extractRegistration(RCT_ABSTRACT);
		expect(r.registered).toBe(true);
		expect(r.identifiers.some((i) => i.toUpperCase().includes("NCT01234567"))).toBe(true);
	});

	it("reports unregistered studies", () => {
		expect(extractRegistration(OBSERVATIONAL_CAUSAL_ABSTRACT).registered).toBe(false);
	});
});

describe("extractClaimLanguage", () => {
	it("flags causal language in conclusions", () => {
		const c = extractClaimLanguage(OBSERVATIONAL_CAUSAL_ABSTRACT);
		expect(c.makesCausalClaim).toBe(true);
	});

	it("does not flag hedged association language", () => {
		const c = extractClaimLanguage(
			"Coffee consumption was associated with lower mortality. This may not be causal.",
		);
		expect(c.makesCausalClaim).toBe(false);
		expect(c.hedges).toBe(true);
	});
});

describe("extractPopulation", () => {
	it("flags animal studies", () => {
		expect(extractPopulation(MOUSE_ABSTRACT).isAnimalOrInVitro).toBe(true);
	});

	it("does not flag human trials mentioning labs", () => {
		expect(extractPopulation(RCT_ABSTRACT).isAnimalOrInVitro).toBe(false);
	});
});

describe("evaluateStudy end-to-end", () => {
	it("rates a well-reported RCT as strong", () => {
		const result = evaluateStudy({ text: RCT_ABSTRACT });
		expect(result.verdict).toBe("strong");
		expect(result.total).toBeGreaterThanOrEqual(11);
		expect(result.overrideApplied).toBe(false);
	});

	it("applies the override to a causal claim from a correlation", () => {
		const result = evaluateStudy({
			title: "Screen time causes behavioral problems in children",
			text: OBSERVATIONAL_CAUSAL_ABSTRACT,
		});
		expect(result.verdict).toBe("weak");
		const design = result.dimensions.find((d) => d.key === "design");
		const causation = result.dimensions.find((d) => d.key === "causation");
		expect(design?.score).toBe(0);
		expect(causation?.score).toBe(0);
	});

	it("scores an animal study low on applicability", () => {
		const result = evaluateStudy({ text: MOUSE_ABSTRACT });
		const applicability = result.dimensions.find((d) => d.key === "applicability");
		expect(applicability?.score).toBe(0);
		expect(result.verdict).toBe("weak");
	});

	it("caps a retracted paper's robustness at 0", () => {
		const result = evaluateStudy({
			text: RCT_ABSTRACT,
			metadata: { retracted: true },
		});
		expect(result.retracted).toBe(true);
		const robustness = result.dimensions.find((d) => d.key === "robustness");
		expect(robustness?.score).toBe(0);
	});

	it("surfaces review candidates when signals are thin", () => {
		const result = evaluateStudy({
			text: "A brief and vague description of a health finding with few details, n = 50.",
		});
		expect(result.reviewCandidates.length).toBeGreaterThan(0);
	});
});
