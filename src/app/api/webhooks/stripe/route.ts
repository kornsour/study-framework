import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/db";
import { customer, subscription } from "@/db/schema";
import { env } from "@/env";
import { getStripe } from "@/lib/stripe/client";
import { mapSubscription } from "@/lib/stripe/webhook";

// Stripe signature verification needs the raw body + Node crypto.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
	if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SIGNING_SECRET) {
		// Billing not configured — acknowledge so Stripe doesn't retry forever.
		return NextResponse.json({ received: true, ignored: "billing disabled" });
	}

	const signature = req.headers.get("stripe-signature");
	if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

	const raw = await req.text();
	let event: Stripe.Event;
	try {
		event = await getStripe().webhooks.constructEventAsync(
			raw,
			signature,
			env.STRIPE_WEBHOOK_SIGNING_SECRET,
		);
	} catch (err) {
		const message = err instanceof Error ? err.message : "invalid";
		return NextResponse.json(
			{ error: `Signature verification failed: ${message}` },
			{ status: 400 },
		);
	}

	switch (event.type) {
		case "customer.subscription.created":
		case "customer.subscription.updated":
		case "customer.subscription.deleted": {
			await upsertSubscription(event.data.object);
			break;
		}
		case "checkout.session.completed": {
			const session = event.data.object;
			if (session.mode === "subscription" && session.subscription) {
				const subId =
					typeof session.subscription === "string" ? session.subscription : session.subscription.id;
				const sub = await getStripe().subscriptions.retrieve(subId);
				await upsertSubscription(sub);
			}
			break;
		}
		default:
			// Ignore unhandled event types.
			break;
	}

	return NextResponse.json({ received: true });
}

/** Resolve the local user from the Stripe customer id, then upsert the row. */
async function upsertSubscription(sub: Stripe.Subscription) {
	const row = mapSubscription(sub);
	const owner = await db
		.select({ userId: customer.userId })
		.from(customer)
		.where(eq(customer.stripeCustomerId, row.stripeCustomerId))
		.limit(1);
	const userId = owner[0]?.userId;
	if (!userId) return; // customer not linked yet — nothing to attach the sub to

	await db
		.insert(subscription)
		.values({ ...row, userId, updatedAt: new Date() })
		.onConflictDoUpdate({
			target: subscription.id,
			set: {
				status: row.status,
				priceId: row.priceId,
				currentPeriodEnd: row.currentPeriodEnd,
				cancelAtPeriodEnd: row.cancelAtPeriodEnd,
				updatedAt: new Date(),
			},
		});
}
