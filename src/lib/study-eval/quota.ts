import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiUsage } from "@/db/schema";
import { env } from "@/env";

/**
 * Abuse controls for the optional AI-assist pass. Two independent limits, both
 * backed by the `ai_usage` table so they survive restarts and work across the
 * serverless fleet:
 *
 *   1. Per-IP monthly free allowance — the visitor-facing "N free per month".
 *      Reserved with an atomic INSERT … ON CONFLICT … RETURNING, so a burst of
 *      concurrent requests from one IP can't race past the limit.
 *   2. Global monthly token cap — the wallet guard. Per-IP limits alone are
 *      defeated by IP rotation, so this hard ceiling on total Claude tokens is
 *      what actually bounds spend. When hit, AI pauses for everyone until the
 *      next month; the deterministic scorecard is unaffected.
 *
 * The deterministic evaluation never depends on any of this — gating only ever
 * withholds the AI section, never the scorecard.
 */

export type AiTier = "anon" | "free" | "pro";

export type AiGate =
	| { allowed: true }
	| { allowed: false; reason: "ip-limit" | "global-cap"; message: string };

/** Who a request's AI quota is charged to, and how much they get this month. */
export interface QuotaSubject {
	bucketKey: string; // "user:<id>" for signed-in, "ip:<addr>" for anonymous
	limit: number;
	tier: AiTier;
}

/**
 * Resolve the quota subject from identity + entitlement:
 *   - signed-in + subscribed → per-account, Pro limit
 *   - signed-in, no sub      → per-account, free limit
 *   - anonymous              → per-IP, free limit
 */
export function resolveQuota(opts: {
	userId: string | null;
	subscribed: boolean;
	ip: string;
}): QuotaSubject {
	if (opts.userId) {
		return {
			bucketKey: `user:${opts.userId}`,
			limit: opts.subscribed ? env.AI_PRO_EVALS_PER_MONTH : env.AI_FREE_EVALS_PER_MONTH,
			tier: opts.subscribed ? "pro" : "free",
		};
	}
	return { bucketKey: `ip:${opts.ip}`, limit: env.AI_FREE_EVALS_PER_MONTH, tier: "anon" };
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
	const suffix =
		subject.tier === "anon" ? " Sign in and upgrade to Pro for more." : " Upgrade to Pro for more.";
	return `You've used your ${n} free AI ${n === 1 ? "analysis" : "analyses"} this month. The full deterministic scorecard below still works; AI assist resets next month.${suffix}`;
}

/**
 * Atomically reserve one AI slot for this IP. Checks the global token cap first
 * (a soft read — a small overshoot under a concurrent burst is acceptable), then
 * increments the IP's monthly count and reads the new value in one statement.
 * If the reservation pushes the IP over its limit, it is refunded before we
 * return so a blocked attempt doesn't burn the visitor's quota.
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
		return { allowed: false, reason: "ip-limit", message: overLimitMessage(subject) };
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
