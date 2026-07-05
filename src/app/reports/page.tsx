import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { report } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My reports — Good Study Framework" };

const VERDICT_STYLES: Record<string, string> = {
	strong: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
	mixed: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
	weak: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
	year: "numeric",
	month: "short",
	day: "numeric",
	hour: "numeric",
	minute: "2-digit",
});

export default async function ReportsPage() {
	const user = await requireUser();
	const rows = await db
		.select({
			id: report.id,
			title: report.title,
			verdict: report.verdict,
			total: report.total,
			source: report.source,
			createdAt: report.createdAt,
		})
		.from(report)
		.where(eq(report.userId, user.id))
		.orderBy(desc(report.createdAt));

	return (
		<div className="mx-auto w-full max-w-3xl px-6 py-10">
			<div className="flex items-baseline justify-between gap-4">
				<h1 className="text-3xl font-semibold tracking-tight">My reports</h1>
				<Link href="/evaluate" className="text-sm font-medium underline">
					New evaluation
				</Link>
			</div>

			{rows.length === 0 ? (
				<p className="mt-8 rounded-md bg-zinc-50 p-4 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
					No saved reports yet. Every study you evaluate while signed in is saved here.{" "}
					<Link href="/evaluate" className="underline">
						Evaluate a study
					</Link>
					.
				</p>
			) : (
				<ul className="mt-6 divide-y divide-zinc-200 dark:divide-zinc-800">
					{rows.map((r) => (
						<li key={r.id}>
							<Link
								href={`/reports/${r.id}`}
								className="flex items-center justify-between gap-4 py-3 hover:opacity-80"
							>
								<div className="min-w-0">
									<p className="truncate font-medium">{r.title?.trim() || "Untitled study"}</p>
									<p className="text-xs text-zinc-500">
										{dateFmt.format(r.createdAt)} · {r.source}
									</p>
								</div>
								<span
									className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold uppercase ${VERDICT_STYLES[r.verdict] ?? ""}`}
								>
									{r.verdict} {r.total}/14
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
