import { describe, expect, it } from "vitest";
import type { AiAssist } from "./ai";
import { buildReportDocx, reportFilename } from "./docx";
import { evaluateStudy } from "./index";

const RCT = `In this double-blind, randomized controlled trial, we randomly assigned 4,812 adults aged 45-75 with hypertension to drug X or placebo. The primary outcome, hospitalization for myocardial infarction, was ascertained from medical records. Over a median follow-up of 4.2 years, the absolute risk was 3.1% with drug X vs 4.6% with placebo (hazard ratio 0.67; 95% CI 0.55-0.81). Drug X reduced the risk of myocardial infarction.`;

const AI: AiAssist = {
	bottomLine: "A well-designed trial with a real, modest benefit.",
	biggestStrength: "Randomized, blinded, objective outcome.",
	biggestWeakness: "Only relative risk emphasized.",
	behaviorAnswer: "yes — the design supports acting on it.",
	likelyConfounders: [],
	dimensionReviews: [],
};

/** A .docx is a ZIP; the central directory lists member names in plain bytes. */
function isDocx(buf: Buffer): boolean {
	return buf.length > 0 && buf[0] === 0x50 && buf[1] === 0x4b; // "PK"
}

describe("buildReportDocx", () => {
	it("produces a valid docx zip for a deterministic-only report", async () => {
		const evaluation = evaluateStudy({ text: RCT });
		const buf = await buildReportDocx(evaluation, null, "My RCT");
		expect(isDocx(buf)).toBe(true);
		expect(buf.includes(Buffer.from("word/document.xml"))).toBe(true);
	});

	it("adds content when the AI bottom line is present", async () => {
		const evaluation = evaluateStudy({ text: RCT });
		// docx DEFLATE-compresses document.xml, so the text isn't plaintext in the
		// buffer; the AI report carrying an extra section should be strictly larger.
		const withoutAi = await buildReportDocx(evaluation, null, "My RCT");
		const withAi = await buildReportDocx(evaluation, AI, "My RCT");
		expect(isDocx(withAi)).toBe(true);
		expect(withAi.length).toBeGreaterThan(withoutAi.length);
	});

	it("handles a retracted / override report without throwing", async () => {
		const evaluation = evaluateStudy({
			title: "Screen time causes behavioral problems",
			text: "A cross-sectional survey of 1200 parents; screen time self-reported; screen time causes behavioral problems (odds ratio 2.1).",
			metadata: { retracted: true },
		});
		const buf = await buildReportDocx(evaluation, null, null);
		expect(isDocx(buf)).toBe(true);
	});
});

describe("reportFilename", () => {
	it("slugifies titles and always ends in .docx", () => {
		expect(reportFilename("Drug X & Heart Attacks!")).toBe("drug-x-heart-attacks.docx");
		expect(reportFilename("   ")).toBe("study-evaluation.docx");
		expect(reportFilename(null)).toBe("study-evaluation.docx");
	});
});
