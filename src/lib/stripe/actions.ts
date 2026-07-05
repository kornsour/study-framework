"use server";

import { z } from "zod/v4";
import { env } from "@/env";
import { authActionClient } from "@/lib/safe-action";
import { getStripe, isBillingEnabled } from "./client";
import { getOrCreateStripeCustomer } from "./customer";

const appUrl = env.NEXT_PUBLIC_APP_URL;

/**
 * Start a Stripe Checkout session for a subscription and return its URL.
 * Falls back to NEXT_PUBLIC_STRIPE_PRICE_ID when no price is passed.
 */
export const createCheckoutSession = authActionClient
	.schema(z.object({ priceId: z.string().optional() }))
	.action(async ({ parsedInput, ctx }) => {
		if (!isBillingEnabled) throw new Error("Billing is not configured.");
		const priceId = parsedInput.priceId ?? env.NEXT_PUBLIC_STRIPE_PRICE_ID;
		if (!priceId) throw new Error("No Stripe price configured.");

		const stripe = getStripe();
		const customerId = await getOrCreateStripeCustomer({
			userId: ctx.user.id,
			email: ctx.user.email,
			name: ctx.user.name,
		});

		const session = await stripe.checkout.sessions.create({
			mode: "subscription",
			customer: customerId,
			line_items: [{ price: priceId, quantity: 1 }],
			success_url: `${appUrl}/dashboard?checkout=success`,
			cancel_url: `${appUrl}/dashboard?checkout=cancelled`,
			allow_promotion_codes: true,
		});

		if (!session.url) throw new Error("Stripe did not return a checkout URL.");
		return { url: session.url };
	});

/** Open the Stripe billing portal so the user can manage their subscription. */
export const createBillingPortalSession = authActionClient
	.schema(z.object({}))
	.action(async ({ ctx }) => {
		if (!isBillingEnabled) throw new Error("Billing is not configured.");
		const stripe = getStripe();
		const customerId = await getOrCreateStripeCustomer({
			userId: ctx.user.id,
			email: ctx.user.email,
			name: ctx.user.name,
		});
		const session = await stripe.billingPortal.sessions.create({
			customer: customerId,
			return_url: `${appUrl}/dashboard`,
		});
		return { url: session.url };
	});
