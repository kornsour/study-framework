"use server";

import { headers } from "next/headers";
import { z } from "zod/v4";
import { actionClient } from "@/lib/safe-action";
import type { AiAssist } from "./ai";
import { applyAiAssist, isAiEnabled, runAiAssist } from "./ai";
import { parseIdentifier, resolveStudy } from "./fetch/resolve";
import { evaluateStudy } from "./index";
import { commitAiTokens, refundAiSlot, reserveAiSlot } from "./quota";
import type { Evaluation } from "./types";

export type EvaluateResult =
	| {
			ok: true;
			evaluation: Evaluation;
			ai: AiAssist | null;
			aiAvailable: boolean;
			/** Set when AI was requested but withheld (quota/cap); carries a message to show. */
			aiSkipped: { reason: "ip-limit" | "global-cap"; message: string } | null;
			/** Where the study text came from, for display. */
			source: "pasted" | "pubmed" | "crossref";
			resolvedTitle: string | null;
	  }
	| {
			// Expected failures (unresolvable identifier) — returned rather than
			// thrown, since actionClient masks thrown error messages.
			ok: false;
			error: string;
	  };

/** Best-effort client IP from Vercel's forwarding headers; keyed per-visitor for the free tier. */
async function clientIp(): Promise<string> {
	const h = await headers();
	const fwd = h.get("x-forwarded-for");
	return fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

const inputSchema = z.object({
	/** Abstract/full text, or a DOI / PMID / PubMed URL. Auto-detected. */
	// min(5): a bare PMID can be as short as 5 digits.
	input: z.string().min(5, "Paste an abstract or a DOI/PMID.").max(120_000),
	title: z.string().max(500).optional(),
	useAi: z.boolean().default(false),
});

export const evaluateStudyAction = actionClient
	.schema(inputSchema)
	.action(async ({ parsedInput }): Promise<EvaluateResult> => {
		const { input, title, useAi } = parsedInput;

		// Short inputs that parse as an identifier get fetched; anything else is
		// treated as pasted study text.
		let text = input;
		let resolvedTitle = title ?? null;
		let source: "pasted" | "pubmed" | "crossref" = "pasted";
		let metadata: Parameters<typeof evaluateStudy>[0]["metadata"];
		let doi: string | undefined;
		let pmid: string | undefined;

		const looksLikeIdentifier = input.trim().length < 300 && parseIdentifier(input) !== null;
		if (looksLikeIdentifier) {
			const resolved = await resolveStudy(input).catch(() => null);
			if (!resolved) {
				return {
					ok: false as const,
					error:
						"Couldn't fetch that identifier. It may not be indexed in PubMed/Crossref, or the record has no abstract — paste the abstract text instead.",
				};
			}
			text = resolved.text;
			resolvedTitle = resolved.title ?? null;
			source = resolved.source;
			metadata = resolved.metadata;
			doi = resolved.doi;
			pmid = resolved.pmid;
		}

		const evaluation = evaluateStudy({
			title: resolvedTitle ?? undefined,
			text,
			metadata,
			doi,
			pmid,
		});

		let ai: AiAssist | null = null;
		let skipped: { reason: "ip-limit" | "global-cap"; message: string } | null = null;
		let finalEvaluation = evaluation;

		if (useAi && isAiEnabled) {
			const ip = await clientIp();
			const gate = await reserveAiSlot(ip);
			if (!gate.allowed) {
				skipped = { reason: gate.reason, message: gate.message };
			} else {
				// Slot reserved — run AI, then either meter the tokens spent or
				// refund the slot if the call failed (don't charge for our errors).
				const result = await runAiAssist(evaluation, text, resolvedTitle).catch(() => null);
				if (result) {
					ai = result.assist;
					finalEvaluation = applyAiAssist(evaluation, result.assist);
					await commitAiTokens(ip, result.tokens).catch(() => {});
				} else {
					await refundAiSlot(ip).catch(() => {});
				}
			}
		}

		return {
			ok: true as const,
			evaluation: finalEvaluation,
			ai,
			aiAvailable: isAiEnabled,
			aiSkipped: skipped,
			source,
			resolvedTitle,
		};
	});
