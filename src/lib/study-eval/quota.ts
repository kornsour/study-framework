import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiUsage } from "@/db/schema";
import { env } from "@/env";

/**
 * Abuse controls for the optional AI-assist pass. Two independent limits, both
 * backed by the `ai_usage` table so they survive restarts and work across the
 * serverless fleet:
 *
 *   1. Per-account monthly allowance — the "N per month" a signed-in user gets
 *      (free or Pro). Reserved with an atomic INSERT … ON CONFLICT … RETURNING,
 *      so a burst of concurrent requests from one account can't race past the
 *      limit. AI assist requires sign-in (enforced in actions.ts), so quota is
 *      always charged to a stable account, never a spoofable per-IP bucket.
 *   2. Global monthly token cap — the wallet guard. Per-account limits alone are
 *      softened by throwaway accounts, so this hard ceiling on total Claude
 *      tokens is what actually bounds spend. When hit, AI pauses for everyone
 *      until the next month; the deterministic scorecard is unaffected.
 *
 * The deterministic evaluation never depends on any of this — gating only ever
 * withholds the AI section, never the scorecard.
 */

export type AiTier = "free" | "pro";

export type AiGate =
	| { allowed: true }
	| { allowed: false; reason: "account-limit" | "global-cap"; message: string };

/** Who a request's AI quota is charged to, and how much they get this month. */
export interface QuotaSubject {
	bucketKey: string; // "user:<id>" — AI assist requires a signed-in account
	limit: number;
	tier: AiTier;
}

/**
 * Resolve the quota subject for a signed-in user + entitlement:
 *   - subscribed → per-account, Pro limit
 *   - no sub     → per-account, free limit
 *
 * Anonymous visitors never reach here: AI assist requires sign-in, so there is
 * no per-IP fallback bucket to rotate around.
 */
export function resolveQuota(opts: { userId: string; subscribed: boolean }): QuotaSubject {
	return {
		bucketKey: `user:${opts.userId}`,
		limit: opts.subscribed ? env.AI_PRO_EVALS_PER_MONTH : env.AI_FREE_EVALS_PER_MONTH,
		tier: opts.subscribed ? "pro" : "free",
	};
}

/** UTC calendar month, e.g. "2026-07". Windows reset at month boundaries. */
export function currentPeriod(now: Date = new Date()): string {
	return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

const GLOBAL_KEY = "global";

function overLimitMessage(subject: QuotaSubject): string {
	const n = subject.limit;
	if (subject.tier === "pro") {
		return `You've reached your Pro limit of ${n} AI ${n === 1 ? "analysis" : "analyses"} this month. It resets at the start of next month.`;
	}
	return `You've used your ${n} free AI ${n === 1 ? "analysis" : "analyses"} this month. The full deterministic scorecard below still works; AI assist resets next month. Upgrade to Pro for more.`;
}

/**
 * Atomically reserve one AI slot for this account. Checks the global token cap
 * first (a soft read — a small overshoot under a concurrent burst is acceptable), then
 * increments the account's monthly count and reads the new value in one
 * statement. If the reservation pushes the account over its limit, it is
 * refunded before we return so a blocked attempt doesn't burn the user's quota.
 */
export async function reserveAiSlot(subject: QuotaSubject): Promise<AiGate> {
	const period = currentPeriod();

	const [global] = await db
		.select({ tokens: aiUsage.tokens })
		.from(aiUsage)
		.where(and(eq(aiUsage.bucketKey, GLOBAL_KEY), eq(aiUsage.period, period)));

	if ((global?.tokens ?? 0) >= env.AI_GLOBAL_MONTHLY_TOKEN_CAP) {
		return {
			allowed: false,
			reason: "global-cap",
			message:
				"The site's monthly AI budget has been reached, so AI assist is paused until next month. The full deterministic scorecard below is unaffected.",
		};
	}

	const [row] = await db
		.insert(aiUsage)
		.values({ bucketKey: subject.bucketKey, period, count: 1, tokens: 0 })
		.onConflictDoUpdate({
			target: [aiUsage.bucketKey, aiUsage.period],
			set: { count: sql`${aiUsage.count} + 1`, updatedAt: new Date() },
		})
		.returning({ count: aiUsage.count });

	const used = row?.count ?? Number.POSITIVE_INFINITY;
	if (used > subject.limit) {
		await refundAiSlot(subject.bucketKey); // roll back the reservation we just made
		return { allowed: false, reason: "account-limit", message: overLimitMessage(subject) };
	}

	return { allowed: true };
}

/** Give back a reserved slot (AI call failed, or reservation exceeded the limit). */
export async function refundAiSlot(bucketKey: string): Promise<void> {
	const period = currentPeriod();
	await db
		.update(aiUsage)
		.set({ count: sql`GREATEST(${aiUsage.count} - 1, 0)`, updatedAt: new Date() })
		.where(and(eq(aiUsage.bucketKey, bucketKey), eq(aiUsage.period, period)));
}

/** Record the tokens a successful AI call actually spent, against the subject and the global cap. */
export async function commitAiTokens(bucketKey: string, tokens: number): Promise<void> {
	const period = currentPeriod();
	// Attribute tokens to the subject row (its count was already incremented on reserve).
	await db
		.update(aiUsage)
		.set({ tokens: sql`${aiUsage.tokens} + ${tokens}`, updatedAt: new Date() })
		.where(and(eq(aiUsage.bucketKey, bucketKey), eq(aiUsage.period, period)));
	// Roll the same tokens into the global monthly total.
	await db
		.insert(aiUsage)
		.values({ bucketKey: GLOBAL_KEY, period, count: 1, tokens })
		.onConflictDoUpdate({
			target: [aiUsage.bucketKey, aiUsage.period],
			set: {
				count: sql`${aiUsage.count} + 1`,
				tokens: sql`${aiUsage.tokens} + ${tokens}`,
				updatedAt: new Date(),
			},
		});
}
