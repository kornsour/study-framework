import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/env";
import { computeVerdict } from "./score";
import type { DimensionKey, Evaluation } from "./types";

/**
 * Optional AI-assist pass (Claude Sonnet 5). Inert unless ANTHROPIC_API_KEY is
 * set. The deterministic engine always runs first; this pass only does what
 * regex cannot:
 *   1. Confounder reasoning — what third variables could explain the result.
 *   2. Second opinion on the dimensions the deterministic pass flagged as
 *      low-confidence (and only those).
 *   3. The plain-speak bottom line a non-expert can forward to family.
 *
 * Cost controls: one call per evaluation, capped output, the framework rubric
 * in a cached system prompt (prompt caching ≈ 90% off repeat input), and the
 * deterministic scorecard passed in so the model reviews rather than re-derives.
 */

export const isAiEnabled = Boolean(env.ANTHROPIC_API_KEY);

export interface AiAssist {
	bottomLine: string;
	biggestStrength: string;
	biggestWeakness: string;
	/** "yes" | "not yet" | "no" + reason — the framework's behavior question. */
	behaviorAnswer: string;
	likelyConfounders: string[];
	/** Score corrections for dimensions the deterministic pass was unsure about. */
	dimensionReviews: Array<{
		key: DimensionKey;
		suggestedScore: 0 | 1 | 2;
		reasoning: string;
	}>;
}

const OUTPUT_SCHEMA = {
	type: "object" as const,
	properties: {
		bottomLine: {
			type: "string",
			description:
				"2-3 sentences, plain speak, no jargon — what a smart non-expert should take away.",
		},
		biggestStrength: { type: "string" },
		biggestWeakness: { type: "string" },
		behaviorAnswer: {
			type: "string",
			description:
				"Should this change anyone's behavior? Answer 'yes', 'not yet', or 'no', plus one sentence why.",
		},
		likelyConfounders: {
			type: "array",
			items: { type: "string" },
			description:
				"Third variables that could explain the association (empty if the design rules them out).",
		},
		dimensionReviews: {
			type: "array",
			items: {
				type: "object",
				properties: {
					key: {
						type: "string",
						enum: [
							"design",
							"causation",
							"size",
							"measurement",
							"statistics",
							"robustness",
							"applicability",
						],
					},
					suggestedScore: { type: "integer", enum: [0, 1, 2] },
					reasoning: { type: "string" },
				},
				required: ["key", "suggestedScore", "reasoning"],
				additionalProperties: false,
			},
		},
	},
	required: [
		"bottomLine",
		"biggestStrength",
		"biggestWeakness",
		"behaviorAnswer",
		"likelyConfounders",
		"dimensionReviews",
	],
	additionalProperties: false,
};

/**
 * Stable rubric — kept byte-identical across requests so prompt caching hits.
 * Volatile content (the study) goes in the user message, after the cache point.
 */
const SYSTEM_PROMPT = `You are a careful research analyst applying the Good Study Framework, in the skeptical spirit of Emily Oster. The central question is always whether the study shows that X CAUSES Y, or only that X and Y are correlated.

Key principles:
- Randomization is the gold standard; observational studies can only adjust for confounders they measured, and residual confounding is the default explanation for observational findings in nutrition, parenting, and behavior.
- Bigger and more objective is better; self-reported diet, exercise, and screen time are soft measures.
- Always ask for absolute effect sizes, not just relative risk; "doubles the risk" from 1-in-a-million to 2-in-a-million is negligible.
- A single new study rarely overturns a consistent literature; watch for the replication crisis.
- Animal and in-vitro findings are not human findings.

A deterministic scoring engine has already evaluated the study on 7 dimensions (0-2 each): Design, Causation, Size, Measurement, Statistics, Robustness, Applicability. Your job:
1. For each dimension listed as "needs review", judge the correct 0/1/2 score from the study text (only review those - trust the engine on the rest).
2. Identify the most plausible confounders for the claimed relationship.
3. Write the plain-speak outputs (bottom line, strength, weakness, behavior answer).

Be direct. If the evidence is weak, say so plainly. Do not soften a correlation into a cause. If key information is missing, say what would be needed.`;

export async function runAiAssist(
	evaluation: Evaluation,
	studyText: string,
	title: string | null,
): Promise<{ assist: AiAssist; tokens: number } | null> {
	if (!isAiEnabled) return null;

	const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

	const scorecard = evaluation.dimensions
		.map(
			(d) =>
				`- ${d.label}: ${d.score}/2 (confidence: ${d.confidence}${d.needsReview ? ", NEEDS REVIEW" : ""}) — ${d.rationale}`,
		)
		.join("\n");

	const userMessage = [
		`STUDY TITLE: ${title ?? "(not provided)"}`,
		"",
		"STUDY TEXT:",
		studyText.slice(0, 30_000), // abstracts are ~2-3k chars; cap pasted full texts
		"",
		"DETERMINISTIC SCORECARD:",
		scorecard,
		"",
		`Dimensions needing your review: ${evaluation.reviewCandidates.join(", ") || "(none — just write the plain-speak outputs and confounders)"}`,
		`Verdict so far: ${evaluation.verdict} (${evaluation.total}/14)${evaluation.overrideApplied ? " — override applied: causal claim from correlation" : ""}`,
	].join("\n");

	const response = await client.messages.create({
		model: "claude-sonnet-5",
		max_tokens: 4000,
		// effort "medium": this is a review of a pre-computed scorecard, not
		// open-ended reasoning — medium balances judgment quality against cost.
		output_config: {
			effort: "medium",
			format: { type: "json_schema", schema: OUTPUT_SCHEMA },
		},
		system: [
			{
				type: "text",
				text: SYSTEM_PROMPT,
				cache_control: { type: "ephemeral" },
			},
		],
		messages: [{ role: "user", content: userMessage }],
	});

	if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
		return null;
	}
	const textBlock = response.content.find((b) => b.type === "text");
	if (textBlock?.type !== "text") return null;

	// Total tokens processed (input + cache traffic + output) — metered against
	// the global monthly cap in quota.ts.
	const u = response.usage;
	const tokens =
		u.input_tokens +
		u.output_tokens +
		(u.cache_read_input_tokens ?? 0) +
		(u.cache_creation_input_tokens ?? 0);

	try {
		return { assist: JSON.parse(textBlock.text) as AiAssist, tokens };
	} catch {
		return null;
	}
}

/** Merge AI dimension reviews back into the evaluation (only reviewed dims change). */
export function applyAiAssist(evaluation: Evaluation, ai: AiAssist): Evaluation {
	const reviewable = new Set(evaluation.reviewCandidates);
	const dimensions = evaluation.dimensions.map((d) => {
		const review = ai.dimensionReviews.find((r) => r.key === d.key);
		if (!review || !reviewable.has(d.key)) return d;
		return {
			...d,
			score: review.suggestedScore,
			confidence: "medium" as const,
			rationale: `${review.reasoning} (AI-reviewed)`,
			needsReview: false,
		};
	});

	const { total, verdict, overrideApplied } = computeVerdict(
		dimensions,
		evaluation.extraction.claim.makesCausalClaim,
	);

	return { ...evaluation, dimensions, total, verdict, overrideApplied };
}
