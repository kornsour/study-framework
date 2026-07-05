import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customer } from "@/db/schema";
import { getStripe } from "./client";

/**
 * Return the Stripe customer id for a user, creating the Stripe customer (and
 * our local `customer` row) on first use.
 */
export async function getOrCreateStripeCustomer(params: {
	userId: string;
	email: string;
	name?: string | null;
}): Promise<string> {
	const existing = await db
		.select({ stripeCustomerId: customer.stripeCustomerId })
		.from(customer)
		.where(eq(customer.userId, params.userId))
		.limit(1);
	if (existing[0]) return existing[0].stripeCustomerId;

	const stripe = getStripe();
	const created = await stripe.customers.create({
		email: params.email,
		name: params.name ?? undefined,
		metadata: { userId: params.userId },
	});

	await db
		.insert(customer)
		.values({ userId: params.userId, stripeCustomerId: created.id })
		.onConflictDoNothing();

	return created.id;
}
