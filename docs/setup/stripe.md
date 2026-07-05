# Stripe billing

A full subscription scaffold ships in the template but stays **inert until
`STRIPE_SECRET_KEY` is set** — see [ADR-0013](../adr/0013-stripe-billing.md). When
enabled, the dashboard shows an Upgrade / Manage-billing button and the webhook
keeps the local `subscription` table in sync.

## 1. Install the CLI

```bash
brew install stripe/stripe-cli/stripe    # not preinstalled
stripe login
```

## 2. Create a product + price

```bash
stripe products create --name "Pro"
stripe prices create --product <prod_id> --unit-amount 1000 --currency usd \
  --recurring.interval month
# → copy the price_… id
```

## 3. Keys in `.env`

```
STRIPE_SECRET_KEY="sk_test_…"                      # dashboard → API keys (test)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_…"
NEXT_PUBLIC_STRIPE_PRICE_ID="price_…"
```

## 4. Local webhooks

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# copy the printed whsec_… into .env:
#   STRIPE_WEBHOOK_SIGNING_SECRET="whsec_…"
stripe trigger checkout.session.completed          # smoke test → a subscription row
```

## 5. Production

Add a webhook endpoint `<APP_URL>/api/webhooks/stripe` in the Stripe dashboard,
subscribe to `checkout.session.completed` and `customer.subscription.*`, and use
its **live** signing secret. Set all `STRIPE_*` + `NEXT_PUBLIC_STRIPE_*` in Vercel.

## How it fits together

- `src/lib/stripe/actions.ts` — `createCheckoutSession` / `createBillingPortalSession`
  (auth-required server actions) create-or-reuse the Stripe customer and redirect.
- `src/app/api/webhooks/stripe/route.ts` — verifies the signature and upserts
  subscription state (the DB is a cache of Stripe; treat Stripe as source of truth).
- Entitlement checks should read the `subscription` table server-side, never a
  client-reported value.
