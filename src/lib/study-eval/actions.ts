"use server";

import { z } from "zod/v4";
import { actionClient } from "@/lib/safe-action";
import type { AiAssist } from "./ai";
import { applyAiAssist, isAiEnabled, runAiAssist } from "./ai";
import { parseIdentifier, resolveStudy } from "./fetch/resolve";
import { evaluateStudy } from "./index";
import type { Evaluation } from "./types";

export type EvaluateResult =
	| {
			ok: true;
			evaluation: Evaluation;
			ai: AiAssist | null;
			aiAvailable: boolean;
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
		let finalEvaluation = evaluation;
		if (useAi && isAiEnabled) {
			ai = await runAiAssist(evaluation, text, resolvedTitle).catch(() => null);
			if (ai) finalEvaluation = applyAiAssist(evaluation, ai);
		}

		return {
			ok: true as const,
			evaluation: finalEvaluation,
			ai,
			aiAvailable: isAiEnabled,
			source,
			resolvedTitle,
		};
	});
