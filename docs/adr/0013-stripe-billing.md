# ADR-0013: Stripe subscription billing, feature-flagged by env

- Status: Accepted
- Date: 2026-07-05

## Context

Most apps built from this template will want to charge money, and wiring Stripe
correctly (customer creation, checkout, the billing portal, and — critically —
signature-verified webhooks that keep local state in sync) is fiddly and easy to
get subtly wrong. We want that scaffolding present from day one, but it must not
force every app to have Stripe keys just to build and run.

## Decision

Ship a full **subscription** billing scaffold that is **inert until
`STRIPE_SECRET_KEY` is set**:

- **Client:** `src/lib/stripe/client.ts` instantiates the SDK lazily; importing
  it without keys is safe. `isBillingEnabled` gates UI and routes.
- **Data:** `customer` (user → Stripe customer) and `subscription` (synced from
  Stripe) tables in the Drizzle schema.
- **Actions:** `createCheckoutSession` + `createBillingPortalSession`
  (`next-safe-action`, auth-required) create-or-reuse the Stripe customer and
  return a redirect URL.
- **Webhook:** `src/app/api/webhooks/stripe/route.ts` verifies the Stripe
  signature against the raw body (Node runtime) and upserts subscription state.
  The Stripe→row mapping is a pure function (`mapSubscription`) so it's unit-
  testable without a network or DB.
- **UI:** the dashboard shows an Upgrade / Manage-billing button only when
  billing is enabled.

Subscriptions (not one-off payments) are the default because recurring revenue
is the common SaaS case; one-off `mode: "payment"` checkout is a small variation
on the same action.

## Consequences

- New apps can turn on billing by adding keys + a price id, with no code changes.
- The webhook is the source of truth for subscription state; the DB is a cache of
  Stripe. Never trust client-reported entitlement — read the `subscription` table.
- Webhook routes are excluded from the CSP middleware matcher and pinned to the
  Node runtime so raw-body signature verification works.
- The Stripe API version is intentionally not pinned in code (SDK default) to
  avoid build breaks on SDK bumps; pin it per app if a specific version matters.
