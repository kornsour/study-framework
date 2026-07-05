import Stripe from "stripe";
import { env } from "@/env";

/**
 * Lazily-instantiated Stripe client. The whole billing feature is inert until
 * STRIPE_SECRET_KEY is set — this module stays importable (and the app keeps
 * building) without any Stripe keys. See docs/adr/0013-stripe-billing.md.
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
	if (!env.STRIPE_SECRET_KEY) {
		throw new Error("Stripe is not configured — set STRIPE_SECRET_KEY to enable billing.");
	}
	if (!_stripe) {
		// apiVersion is omitted so the SDK's pinned default is used — avoids a
		// build break each time the SDK bumps its version literal. Pin it here if
		// your integration needs a specific API version.
		_stripe = new Stripe(env.STRIPE_SECRET_KEY);
	}
	return _stripe;
}

/** Cheap boolean guard for UI / route code to check before offering billing. */
export const isBillingEnabled = Boolean(env.STRIPE_SECRET_KEY);
