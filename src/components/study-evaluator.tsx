"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import type { EvaluateResult } from "@/lib/study-eval/actions";
import { evaluateStudyAction } from "@/lib/study-eval/actions";
import type { AiAssist } from "@/lib/study-eval/ai";
import type { DimensionScore, Evaluation } from "@/lib/study-eval/types";

const VERDICT_STYLES: Record<string, string> = {
	strong: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
	mixed: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
	weak: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
};

const VERDICT_ADVICE: Record<string, string> = {
	strong: "Trustworthy. Reasonable to act on, especially alongside similar findings.",
	mixed: "Suggestive, not settled. Useful signal; look for corroboration before acting.",
	weak: "Treat as a hypothesis at best. Do not change behavior on this alone.",
};

function ScoreDots({ score }: { score: 0 | 1 | 2 }) {
	return (
		<span className="flex gap-1" role="img" aria-label={`${score} of 2`}>
			{[0, 1].map((i) => (
				<span
					key={i}
					className={`h-2.5 w-2.5 rounded-full ${
						i < score ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-700"
					}`}
				/>
			))}
		</span>
	);
}

function DimensionRow({ d }: { d: DimensionScore }) {
	const [open, setOpen] = useState(false);
	return (
		<li className="border-b border-zinc-200 py-3 last:border-b-0 dark:border-zinc-800">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex w-full items-center justify-between gap-3 text-left"
			>
				<span className="flex items-center gap-2 font-medium">
					{d.label}
					{d.needsReview && (
						<span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
							low confidence
						</span>
					)}
				</span>
				<span className="flex items-center gap-3">
					<ScoreDots score={d.score} />
					<span className="text-sm text-zinc-500">{d.score}/2</span>
				</span>
			</button>
			<p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{d.rationale}</p>
			{open && d.evidence.length > 0 && (
				<ul className="mt-2 space-y-1">
					{d.evidence.map((e) => (
						<li
							key={e}
							className="rounded bg-zinc-50 px-2 py-1 font-mono text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
						>
							{e}
						</li>
					))}
				</ul>
			)}
		</li>
	);
}

export function ReportView({
	evaluation,
	ai,
	title,
	aiSkipped = null,
	aiAvailable = false,
}: {
	evaluation: Evaluation;
	ai: AiAssist | null;
	title: string | null;
	aiSkipped?: { reason: "ip-limit" | "global-cap"; message: string } | null;
	aiAvailable?: boolean;
}) {
	const [downloading, setDownloading] = useState(false);

	async function downloadDocx() {
		setDownloading(true);
		try {
			const res = await fetch("/api/report/export", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title, evaluation, ai }),
			});
			if (!res.ok) return;
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download =
				res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ??
				"study-evaluation.docx";
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
		} finally {
			setDownloading(false);
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-end">
				<button
					type="button"
					onClick={downloadDocx}
					disabled={downloading}
					className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
				>
					{downloading ? "Preparing…" : "Download .docx"}
				</button>
			</div>

			{/* AI withheld (quota / global cap) — deterministic scorecard still shown */}
			{aiSkipped && (
				<div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
					<span className="font-medium">AI assist not applied.</span> {aiSkipped.message}
				</div>
			)}

			{/* Verdict banner */}
			<div className={`rounded-lg p-4 ${VERDICT_STYLES[evaluation.verdict]}`}>
				<div className="flex items-baseline justify-between gap-4">
					<span className="text-lg font-semibold uppercase tracking-wide">
						{evaluation.verdict}
					</span>
					<span className="font-mono text-sm">{evaluation.total}/14</span>
				</div>
				<p className="mt-1 text-sm">{VERDICT_ADVICE[evaluation.verdict]}</p>
				{evaluation.overrideApplied && (
					<p className="mt-2 text-sm font-medium">
						⚠ Override applied: a causal claim built on a correlation caps the verdict at Weak
						regardless of the other scores.
					</p>
				)}
				{evaluation.retracted && (
					<p className="mt-2 text-sm font-bold">
						🛑 THIS PAPER HAS BEEN RETRACTED. Disregard its findings.
					</p>
				)}
			</div>

			{/* AI bottom line */}
			{ai && (
				<div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
					<h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
						Bottom line
					</h3>
					<p className="mt-1">{ai.bottomLine}</p>
					<dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
						<div>
							<dt className="font-medium text-emerald-700 dark:text-emerald-400">
								Biggest strength
							</dt>
							<dd className="text-zinc-600 dark:text-zinc-400">{ai.biggestStrength}</dd>
						</div>
						<div>
							<dt className="font-medium text-red-700 dark:text-red-400">Biggest weakness</dt>
							<dd className="text-zinc-600 dark:text-zinc-400">{ai.biggestWeakness}</dd>
						</div>
					</dl>
					<p className="mt-3 text-sm">
						<span className="font-medium">Should it change anyone's behavior?</span>{" "}
						{ai.behaviorAnswer}
					</p>
					{ai.likelyConfounders.length > 0 && (
						<div className="mt-3 text-sm">
							<span className="font-medium">Plausible confounders:</span>
							<ul className="mt-1 list-inside list-disc text-zinc-600 dark:text-zinc-400">
								{ai.likelyConfounders.map((c) => (
									<li key={c}>{c}</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}

			{/* Scorecard */}
			<div>
				<h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
					Scorecard — click a dimension for evidence
				</h3>
				<ul className="mt-2">
					{evaluation.dimensions.map((d) => (
						<DimensionRow key={d.key} d={d} />
					))}
				</ul>
			</div>

			{/* Flags */}
			{evaluation.flags.length > 0 && (
				<div className="grid gap-4 sm:grid-cols-2">
					<div>
						<h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
							Green flags
						</h3>
						<ul className="mt-2 space-y-1 text-sm">
							{evaluation.flags
								.filter((f) => f.kind === "green")
								.map((f) => (
									<li key={f.message} className="flex gap-2">
										<span aria-hidden>✅</span>
										<span>{f.message}</span>
									</li>
								))}
						</ul>
					</div>
					<div>
						<h3 className="text-sm font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
							Red flags
						</h3>
						<ul className="mt-2 space-y-1 text-sm">
							{evaluation.flags
								.filter((f) => f.kind === "red")
								.map((f) => (
									<li key={f.message} className="flex gap-2">
										<span aria-hidden>🚩</span>
										<span>{f.message}</span>
									</li>
								))}
						</ul>
					</div>
				</div>
			)}

			{/* Review candidates note (when no AI ran) */}
			{!ai && evaluation.reviewCandidates.length > 0 && (
				<p className="rounded-md bg-zinc-50 p-3 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
					The automated checks couldn't confidently score:{" "}
					<span className="font-medium">{evaluation.reviewCandidates.join(", ")}</span>. Read those
					dimensions yourself
					{aiAvailable ? ", or re-run with AI assist enabled." : "."}
				</p>
			)}
		</div>
	);
}

function Results({ result }: { result: Extract<EvaluateResult, { ok: true }> }) {
	return (
		<div className="space-y-4">
			{result.reportId && (
				<p className="text-sm text-emerald-700 dark:text-emerald-400">
					Saved to your history.{" "}
					<a href={`/reports/${result.reportId}`} className="underline">
						View report
					</a>
				</p>
			)}
			<ReportView
				evaluation={result.evaluation}
				ai={result.ai}
				title={result.resolvedTitle}
				aiSkipped={result.aiSkipped}
				aiAvailable={result.aiAvailable}
			/>
		</div>
	);
}

export function StudyEvaluator({
	aiAvailable,
	aiFreeLimit,
}: {
	aiAvailable: boolean;
	aiFreeLimit: number;
}) {
	const [input, setInput] = useState("");
	const [title, setTitle] = useState("");
	const [useAi, setUseAi] = useState(false);

	const { execute, result, isPending } = useAction(evaluateStudyAction);

	return (
		<div className="space-y-6">
			<form
				onSubmit={(e) => {
					e.preventDefault();
					execute({ input, title: title || undefined, useAi });
				}}
				className="space-y-3"
			>
				<div>
					<label htmlFor="study-input" className="block text-sm font-medium">
						Abstract, full text, DOI, PMID, or PubMed link
					</label>
					<textarea
						id="study-input"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						rows={8}
						placeholder={'Paste an abstract… or just "10.1001/jama.2024.12345" or a PubMed URL'}
						className="mt-1 w-full rounded-md border border-zinc-300 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
						required
					/>
				</div>
				<div>
					<label htmlFor="study-title" className="block text-sm font-medium">
						Title{" "}
						<span className="font-normal text-zinc-500">
							(optional — helps detect causal claims in headlines)
						</span>
					</label>
					<input
						id="study-title"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						className="mt-1 w-full rounded-md border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
					/>
				</div>
				<div className="flex items-center justify-between gap-4">
					<label
						className={`flex items-center gap-2 text-sm ${aiAvailable ? "" : "text-zinc-400"}`}
					>
						<input
							type="checkbox"
							checked={useAi}
							onChange={(e) => setUseAi(e.target.checked)}
							disabled={!aiAvailable}
						/>
						AI assist (confounder analysis + plain-speak bottom line)
						{aiAvailable ? ` — ${aiFreeLimit} free / month` : " — set ANTHROPIC_API_KEY to enable"}
					</label>
					<button
						type="submit"
						disabled={isPending}
						className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
					>
						{isPending ? "Evaluating…" : "Evaluate"}
					</button>
				</div>
			</form>

			{(result.serverError ||
				result.validationErrors?.input?._errors?.[0] ||
				(result.data && !result.data.ok)) && (
				<p className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
					{result.data && !result.data.ok
						? result.data.error
						: (result.validationErrors?.input?._errors?.[0] ?? result.serverError)}
				</p>
			)}
			{result.data?.ok && <Results result={result.data} />}
		</div>
	);
}
