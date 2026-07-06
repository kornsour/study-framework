import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportView } from "@/components/study-evaluator";
import { db } from "@/db";
import { report } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const user = await requireUser();

	// Scope by userId as well as id — a user can only open their own reports.
	const [row] = await db
		.select()
		.from(report)
		.where(and(eq(report.id, id), eq(report.userId, user.id)));

	if (!row) notFound();

	return (
		<div className="mx-auto w-full max-w-3xl px-6 py-10">
			<div className="mb-6 flex items-baseline justify-between gap-4">
				<Link href="/reports" className="text-sm font-medium underline">
					← My reports
				</Link>
				<span className="text-xs text-zinc-500">
					{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
						row.createdAt,
					)}
				</span>
			</div>
			{row.title?.trim() && (
				<h1 className="mb-4 text-2xl font-semibold tracking-tight">{row.title}</h1>
			)}
			<ReportView evaluation={row.evaluation} ai={row.ai} title={row.title} />
		</div>
	);
}
