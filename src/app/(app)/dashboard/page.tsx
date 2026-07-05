import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { BillingButton } from "@/components/billing-button";
import { SignOutButton } from "@/components/sign-out-button";
import { db } from "@/db";
import { subscription } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { isBillingEnabled } from "@/lib/stripe/client";

export const metadata: Metadata = { title: "Dashboard" };

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export default async function DashboardPage() {
	const user = await requireUser();

	const subs = isBillingEnabled
		? await db.select().from(subscription).where(eq(subscription.userId, user.id))
		: [];
	const activeSub = subs.find((s) => ACTIVE_STATUSES.has(s.status));

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
				<SignOutButton />
			</div>

			<div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
				<p className="text-sm text-zinc-500">Signed in as</p>
				<p className="text-lg font-medium">{user.name}</p>
				<p className="text-sm text-zinc-500">{user.email}</p>
				{!user.emailVerified && (
					<p className="mt-3 text-xs text-amber-600">
						Your email isn't verified yet — check your inbox (or the dev server console).
					</p>
				)}
			</div>

			{isBillingEnabled && (
				<div className="flex items-center justify-between rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
					<div>
						<p className="text-sm font-medium">Billing</p>
						<p className="text-sm text-zinc-500">
							{activeSub ? `Plan active (${activeSub.status})` : "No active subscription"}
						</p>
					</div>
					<BillingButton hasSubscription={Boolean(activeSub)} />
				</div>
			)}

			<p className="text-sm text-zinc-500">
				This page is protected by <code className="font-mono">requireUser()</code>. Replace it with
				your app.
			</p>
		</div>
	);
}
