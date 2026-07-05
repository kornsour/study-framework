import type Stripe from "stripe";

export type SubscriptionRow = {
	id: string;
	stripeCustomerId: string;
	status: string;
	priceId: string | null;
	currentPeriodEnd: Date | null;
	cancelAtPeriodEnd: boolean;
};

/**
 * Pure mapping from a Stripe Subscription to our `subscription` table row.
 * Kept side-effect-free so it can be unit-tested without a DB or Stripe.
 *
 * The billing-period timestamp lives on the subscription item in recent API
 * versions and at the top level in older ones — read whichever is present.
 */
export function mapSubscription(sub: Stripe.Subscription): SubscriptionRow {
	const item = sub.items?.data?.[0];
	const periodEndUnix =
		(item as { current_period_end?: number } | undefined)?.current_period_end ??
		(sub as unknown as { current_period_end?: number }).current_period_end ??
		null;
	const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

	return {
		id: sub.id,
		stripeCustomerId: customerId,
		status: sub.status,
		priceId: item?.price?.id ?? null,
		currentPeriodEnd: periodEndUnix ? new Date(periodEndUnix * 1000) : null,
		cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
	};
}
