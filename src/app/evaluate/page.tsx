import type { Metadata } from "next";
import Link from "next/link";
import { BillingButton } from "@/components/billing-button";
import { StudyEvaluator } from "@/components/study-evaluator";
import { env } from "@/env";
import { getSession } from "@/lib/auth/session";
import { isBillingEnabled } from "@/lib/stripe/client";
import { hasActiveSubscription } from "@/lib/stripe/subscription";
import { isAiEnabled } from "@/lib/study-eval/ai";

export const metadata: Metadata = {
	title: "Good Study Framework — Study Evaluator",
	description:
		"Score a scientific study on 7 dimensions of quality: design, causation, size, measurement, statistics, robustness, and applicability.",
};

export default async function EvaluatePage() {
	const session = await getSession();
	const user = session?.user ?? null;
	const subscribed = user ? await hasActiveSubscription(user.id) : false;
	const effectiveLimit = subscribed ? env.AI_PRO_EVALS_PER_MONTH : env.AI_FREE_EVALS_PER_MONTH;

	return (
		<div className="mx-auto w-full max-w-3xl px-6 py-10">
			<div className="mb-4 flex justify-end text-sm">
				{user ? (
					<Link href="/reports" className="font-medium underline">
						My reports
					</Link>
				) : (
					<Link href="/sign-in?next=/evaluate" className="font-medium underline">
						Sign in to save your reports
					</Link>
				)}
			</div>
			<h1 className="text-3xl font-semibold tracking-tight">How good is this study?</h1>
			<p className="mt-2 text-zinc-600 dark:text-zinc-400">
				Paste an abstract — or just a DOI, PMID, or PubMed link — and get a 14-point scorecard built
				on the Good Study Framework. The core question, always:{" "}
				<em>does this show X causes Y, or just that they appear together?</em>
			</p>

			{isBillingEnabled && user && (
				<div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
					<div>
						{subscribed ? (
							<span className="font-medium">
								Pro plan active — {env.AI_PRO_EVALS_PER_MONTH} AI reports/month.
							</span>
						) : (
							<>
								<span className="font-medium">
									Free plan — {env.AI_FREE_EVALS_PER_MONTH} AI reports/month.
								</span>{" "}
								<span className="text-zinc-600 dark:text-zinc-400">
									Upgrade to Pro for {env.AI_PRO_EVALS_PER_MONTH}/month.
								</span>
							</>
						)}
					</div>
					<BillingButton hasSubscription={subscribed} />
				</div>
			)}

			<div className="mt-8">
				<StudyEvaluator aiAvailable={isAiEnabled} aiFreeLimit={effectiveLimit} />
			</div>
			<p className="mt-10 border-t border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-zinc-800">
				Scores are computed deterministically from the text and registry metadata (PubMed
				publication types, retraction flags). A score is a structured read, not a peer review — it
				can't see what the paper doesn't say. Inspired by Emily Oster's data methodology.
			</p>
		</div>
	);
}
