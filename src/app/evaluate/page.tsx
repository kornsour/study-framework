import type { Metadata } from "next";
import Link from "next/link";
import { StudyEvaluator } from "@/components/study-evaluator";
import { env } from "@/env";
import { getSession } from "@/lib/auth/session";
import { isAiEnabled } from "@/lib/study-eval/ai";

export const metadata: Metadata = {
	title: "Good Study Framework — Study Evaluator",
	description:
		"Score a scientific study on 7 dimensions of quality: design, causation, size, measurement, statistics, robustness, and applicability.",
};

export default async function EvaluatePage() {
	const session = await getSession();
	return (
		<div className="mx-auto w-full max-w-3xl px-6 py-10">
			<div className="mb-4 flex justify-end text-sm">
				{session?.user ? (
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
			<div className="mt-8">
				<StudyEvaluator aiAvailable={isAiEnabled} aiFreeLimit={env.AI_FREE_EVALS_PER_MONTH} />
			</div>
			<p className="mt-10 border-t border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-zinc-800">
				Scores are computed deterministically from the text and registry metadata (PubMed
				publication types, retraction flags). A score is a structured read, not a peer review — it
				can't see what the paper doesn't say. Inspired by Emily Oster's data methodology.
			</p>
		</div>
	);
}
