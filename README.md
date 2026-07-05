# TypeScript Template

A batteries-included Next.js starter: TypeScript, Tailwind, Drizzle, **auth**
(Google · Apple · email/password), **Stripe billing**, and a **local-Postgres →
Neon** dev/prod split — with security defaults and agent tooling from the start.

## Quick start

```bash
bash scripts/rename-app.sh my-app   # name the project (or use the `rename-app` skill)
pnpm bootstrap                      # .env + secret + local DB + schema
pnpm dev                            # → http://localhost:3000
```

`pnpm bootstrap` needs a local Postgres (`brew install postgresql@17 && brew services
start postgresql@17`). Email/password sign-up works immediately; verification and
reset links print to the dev server console. Add Google/Apple/Stripe/email keys
to `.env` when you want them — each is inert until configured.

## Stack

| Tool | Purpose |
|------|---------|
| [Next.js](https://nextjs.org) | React framework (App Router) |
| [Tailwind CSS](https://tailwindcss.com) | Utility-first CSS |
| [Drizzle ORM](https://orm.drizzle.team) | Type-safe SQL ORM |
| Local Postgres / [Neon](https://neon.tech) | Dev database / serverless Postgres in prod |
| [better-auth](https://better-auth.com) | Self-hosted auth (Google, Apple, email/password) |
| [Stripe](https://stripe.com) | Subscription billing (env-flagged) |
| [Biome](https://biomejs.dev) · [Vitest](https://vitest.dev) · [Playwright](https://playwright.dev) | Lint/format · unit · e2e |

## Scripts

```bash
pnpm bootstrap    # bootstrap a fresh clone
pnpm dev          # dev server
pnpm build        # production build
pnpm check:fix    # lint + format
pnpm test         # unit tests
pnpm e2e          # e2e (local)
pnpm db:local     # create local dev DB
pnpm db:push      # push schema (dev)
pnpm db:generate && pnpm db:migrate   # migrations (prod path)
```

## Documentation

Start with [`docs/setup/getting-started.md`](./docs/setup/getting-started.md).
The _why_ behind the stack is in [ADRs](./docs/adr); provisioning + operations in
[`docs/cli-reference.md`](./docs/cli-reference.md); security in
[`docs/security.md`](./docs/security.md). Agents: see [`CLAUDE.md`](./CLAUDE.md)
and the `provision-app` / `rename-app` skills in `.claude/skills/`.

> Uses pnpm pinned via `packageManager`. Run `corepack enable` once so your local
> pnpm matches the project ([ADR-0002](./docs/adr/0002-package-manager-pnpm-pinned.md)).
