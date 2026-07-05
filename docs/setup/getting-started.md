# Getting started

From a fresh copy of the template to a running app in a few minutes.

## Prerequisites

- Node ≥ 24 and pnpm (`corepack enable` so the pinned pnpm is used — [ADR-0002](../adr/0002-package-manager-pnpm-pinned.md))
- Native Postgres for local dev: `brew install postgresql@17 && brew services start postgresql@17`
- Optional CLIs for provisioning/deploy: `vercel`, `neonctl`, `gcloud`, `gh`, `stripe`
  (see [cli-reference.md](../cli-reference.md))

Run `pnpm preflight` any time to check what's installed and what's missing — it's
read-only, so it's safe to run before `pnpm bootstrap` or whenever something feels off.

## 1. Name the project

```bash
bash scripts/rename-app.sh my-app     # or use the `rename-app` skill
```

## 2. Bootstrap

```bash
pnpm bootstrap     # .env + BETTER_AUTH_SECRET + local DB + schema push
pnpm dev
```

`pnpm bootstrap` is idempotent. It creates `.env`, generates `BETTER_AUTH_SECRET`,
creates the `my_app_dev` local database, points `DATABASE_URL` at it, installs
deps, and runs `pnpm db:push`.

Open http://localhost:3000 — sign up with email/password works immediately.
Verification/reset emails are printed to the dev server console (no email
provider needed locally).

## 3. Turn on more features (optional)

Each is inert until configured; add keys to `.env`:

- **Google / Apple login** → [auth-setup.md](./auth-setup.md)
- **Stripe billing** → [stripe.md](./stripe.md)
- **Real email** → set `AWS_REGION` + `EMAIL_FROM` (verified SES identity)
- **Neon (deployed DB)** → [database.md](./database.md)
- **Deploy** → [deployment.md](./deployment.md)

The `provision-app` Claude skill walks an agent through all of these with the CLIs.

## Everyday commands

```bash
pnpm dev            # dev server (Turbopack)
pnpm check:fix      # lint + format
pnpm test           # unit tests
pnpm e2e            # Playwright e2e (local)
pnpm db:push        # push schema (dev)
pnpm db:generate && pnpm db:migrate   # migrations (prod path)
pnpm db:studio      # Drizzle Studio
```
