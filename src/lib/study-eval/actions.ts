"use server";

import { z } from "zod/v4";
import { db } from "@/db";
import { report } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { actionClient } from "@/lib/safe-action";
import { hasActiveSubscription } from "@/lib/stripe/subscription";
import type { AiAssist } from "./ai";
import { applyAiAssist, isAiEnabled, runAiAssist } from "./ai";
import { parseIdentifier, resolveStudy } from "./fetch/resolve";
import { evaluateStudy } from "./index";
import { commitAiTokens, refundAiSlot, reserveAiSlot, resolveQuota } from "./quota";
import type { Evaluation } from "./types";

export type EvaluateResult =
	| {
			ok: true;
			evaluation: Evaluation;
			ai: AiAssist | null;
			aiAvailable: boolean;
			/** Set when AI was requested but withheld (needs sign-in / quota / cap); carries a message to show. */
			aiSkipped: {
				reason: "sign-in-required" | "account-limit" | "global-cap";
				message: string;
			} | null;
			/** Where the study text came from, for display. */
			source: "pasted" | "pubmed" | "crossref";
			resolvedTitle: string | null;
			/** Saved report id when a signed-in user ran this (null for anonymous). */
			reportId: string | null;
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

		// One session lookup drives both AI entitlement and history saving.
		const session = await getSession();
		const user = session?.user ?? null;

		let ai: AiAssist | null = null;
		let skipped: {
			reason: "sign-in-required" | "account-limit" | "global-cap";
			message: string;
		} | null = null;
		let finalEvaluation = evaluation;

		if (useAi && isAiEnabled && !user) {
			// AI assist requires sign-in — this is the abuse boundary. Anonymous
			// visitors get the full deterministic scorecard, just not the AI section.
			// Enforced here server-side; the client gating is only a convenience.
			skipped = {
				reason: "sign-in-required",
				message:
					"Sign in to use AI assist — it's tracked per account so we can keep it free and un-abused. The full deterministic scorecard below is free for everyone.",
			};
		} else if (useAi && isAiEnabled && user) {
			const subscribed = await hasActiveSubscription(user.id);
			const subject = resolveQuota({ userId: user.id, subscribed });
			const gate = await reserveAiSlot(subject);
			if (!gate.allowed) {
				skipped = { reason: gate.reason, message: gate.message };
			} else {
				// Slot reserved — run AI, then either meter the tokens spent or
				// refund the slot if the call failed (don't charge for our errors).
				const result = await runAiAssist(evaluation, text, resolvedTitle).catch(() => null);
				if (result) {
					ai = result.assist;
					finalEvaluation = applyAiAssist(evaluation, result.assist);
					await commitAiTokens(subject.bucketKey, result.tokens).catch(() => {});
				} else {
					await refundAiSlot(subject.bucketKey).catch(() => {});
				}
			}
		}

		// Persist to history for signed-in users (anonymous evals aren't stored).
		let reportId: string | null = null;
		if (user) {
			const id = crypto.randomUUID();
			try {
				await db.insert(report).values({
					id,
					userId: user.id,
					title: resolvedTitle,
					source,
					verdict: finalEvaluation.verdict,
					total: finalEvaluation.total,
					evaluation: finalEvaluation,
					ai,
				});
				reportId = id;
			} catch {
				reportId = null; // saving is best-effort; never fail the evaluation
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
			reportId,
		};
	});
