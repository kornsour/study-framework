import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscription } from "@/db/schema";

/**
 * Subscription statuses that count as an entitled (paying) user. Mirrors the
 * dashboard's check. The webhook (source of truth) keeps this table current.
 */
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

/** True when the user has any active/trialing/past_due subscription row. */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
	const subs = await db
		.select({ status: subscription.status })
		.from(subscription)
		.where(eq(subscription.userId, userId));
	return subs.some((s) => ACTIVE_STATUSES.has(s.status));
}
