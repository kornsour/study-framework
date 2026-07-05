---
name: provision-app
description: Provision the external resources a new app from this template needs — Neon Postgres, Google/Apple OAuth, Stripe billing, Vercel project + env, and GitHub repo/secrets — using the vercel, neonctl, gcloud, gh, and stripe CLIs. Use when setting up a fresh app, wiring a new environment, or filling in .env for auth/billing/deploy.
---

# Provision a new app

Bring a fresh copy of this template from "runs locally" to "deployed with auth +
billing". Work top-down; each step is independent and safe to skip if that
feature isn't needed yet. **Confirm with the user before creating billable or
public resources** (Vercel projects, Neon projects, Stripe products, domains).

Everything the app reads is validated in `src/env.ts` and documented in
`.env.example`. After each step, put the resulting keys in `.env` (local) and in
Vercel (deployed) — see step 5.

## 0. Local baseline (no external accounts)

```bash
pnpm bootstrap  # creates .env, generates BETTER_AUTH_SECRET, local DB, pushes schema
pnpm dev
```
The app runs with just local Postgres + email/password. Add the services below as needed.

## 1. Database — Neon (preview/prod)

Local dev uses native Postgres (`pnpm bootstrap`). For deployed environments use Neon.
```bash
neonctl auth                                  # one-time browser login
neonctl projects create --name <app>          # note the project id
neonctl connection-string --project-id <id> --database-name neondb
# Optional: a separate branch for preview
neonctl branches create --project-id <id> --name preview
```
Put the pooled connection string in Vercel as `DATABASE_URL` (step 5). The db
client auto-selects the Neon driver from the `*.neon.tech` host — no code change.

## 2. Google sign-in — gcloud + Cloud Console

The OAuth **consent screen** and **credential creation** are Console UI (gcloud
can't fully create OAuth client IDs). Steps:
1. `gcloud projects create <gcp-project>` (or reuse one) and set it active:
   `gcloud config set project <gcp-project>`.
2. In Console → APIs & Services → OAuth consent screen: configure (External),
   add scopes `email`, `profile`, `openid`.
3. Credentials → Create OAuth client ID → Web application. Authorized redirect URI:
   `<APP_URL>/api/auth/callback/google` (add both `http://localhost:3000/...`
   and the production URL).
4. Copy the client id/secret → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and
   set `NEXT_PUBLIC_GOOGLE_ENABLED="1"`.

## 3. Apple sign-in — Apple Developer (paid, manual)

Requires the **Apple Developer Program ($99/yr)**. No CLI; all in the portal:
1. Create an **App ID**, then a **Services ID** (this becomes `APPLE_CLIENT_ID`,
   e.g. `com.example.app.web`). Enable "Sign in with Apple"; add the return URL
   `<APP_URL>/api/auth/callback/apple`.
2. Create a **Sign in with Apple key** (.p8) and note the Key ID + your Team ID.
3. Generate the **client secret JWT** from the .p8 (ES256, `iss`=Team ID,
   `sub`=Services ID, `aud`=`https://appleid.apple.com`). **It expires in ≤6
   months** — set a reminder to rotate. Put it in `APPLE_CLIENT_SECRET` and set
   `NEXT_PUBLIC_APPLE_ENABLED="1"`.

## 4. Billing — Stripe CLI

```bash
brew install stripe/stripe-cli/stripe      # not preinstalled
stripe login
stripe products create --name "<Plan>"
stripe prices create --product <prod_id> --unit-amount 1000 --currency usd \
  --recurring.interval month               # → price_… for NEXT_PUBLIC_STRIPE_PRICE_ID
```
Keys: `STRIPE_SECRET_KEY` (dashboard → API keys, test mode),
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PRICE_ID`.
Local webhook loop (prints the `whsec_…` for `STRIPE_WEBHOOK_SIGNING_SECRET`):
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed   # smoke test
```
In production, add the webhook endpoint `<APP_URL>/api/webhooks/stripe` in the
Stripe dashboard and use its signing secret.

## 5. Deploy — Vercel + GitHub

```bash
gh repo create <owner>/<app> --private --source . --push   # if not already on GitHub
vercel link                                                 # link this dir to a Vercel project
# Push each secret to Vercel (repeat per var, per environment):
vercel env add DATABASE_URL production      # paste the Neon string
vercel env add BETTER_AUTH_SECRET production # use a NEW `openssl rand -base64 32`
# …GOOGLE_*, APPLE_*, STRIPE_*, AWS_REGION, EMAIL_FROM, NEXT_PUBLIC_APP_URL, etc.
vercel deploy --prod
```
Prefer the session's Vercel skills when available: `vercel:env` to sync,
`vercel:deploy` to ship, `vercel:bootstrap` to link + provision Marketplace
integrations (Neon is available as a Vercel Marketplace integration too).

## After provisioning

- Update `.env` locally and mirror to Vercel; never commit `.env`.
- Register real redirect URIs for the production domain.
- Run `/security-review` before shipping and follow `docs/security.md`.
