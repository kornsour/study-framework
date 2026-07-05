import type Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { mapSubscription } from "./webhook";

function fakeSub(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
	return {
		id: "sub_123",
		customer: "cus_123",
		status: "active",
		cancel_at_period_end: false,
		items: {
			data: [{ price: { id: "price_123" }, current_period_end: 1_700_000_000 }],
		},
		...overrides,
	} as unknown as Stripe.Subscription;
}

describe("mapSubscription", () => {
	it("maps the core fields", () => {
		const row = mapSubscription(fakeSub());
		expect(row).toMatchObject({
			id: "sub_123",
			stripeCustomerId: "cus_123",
			status: "active",
			priceId: "price_123",
			cancelAtPeriodEnd: false,
		});
		expect(row.currentPeriodEnd).toEqual(new Date(1_700_000_000 * 1000));
	});

	it("resolves the customer id when customer is an object", () => {
		const row = mapSubscription(
			fakeSub({ customer: { id: "cus_obj" } as unknown as Stripe.Customer }),
		);
		expect(row.stripeCustomerId).toBe("cus_obj");
	});

	it("tolerates a missing period end", () => {
		const row = mapSubscription(
			fakeSub({ items: { data: [{ price: { id: "price_x" } }] } as Stripe.Subscription["items"] }),
		);
		expect(row.currentPeriodEnd).toBeNull();
		expect(row.priceId).toBe("price_x");
	});
});
