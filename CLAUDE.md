# CLAUDE.md

## Project Overview

Next.js (App Router) TypeScript template with Tailwind CSS, Biome, Vitest,
Playwright, and Drizzle ORM. It ships **authentication** (better-auth: Google,
Apple, email/password), **Stripe subscription billing**, a **local-Postgres →
Neon** dev/prod split, and hardened security defaults — so a new app starts with
login, payments, and a database already wired.

## Decisions & Docs

Rationale for foundational choices lives in Architecture Decision Records under
`docs/adr/`. **Read the relevant ADR before changing foundational tooling**, and
add a superseding ADR when you change a decision. Setup guides are in
`docs/setup/`, the CLI cheat-sheet in `docs/cli-reference.md`, the security
posture in `docs/security.md`, and operational runbooks in `docs/maintenance/`.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack) · **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS v4 · **Lint/format**: Biome (not ESLint/Prettier)
- **Unit**: Vitest · **E2E**: Playwright (local only, [ADR-0008](./docs/adr/0008-e2e-local-only.md))
- **ORM**: Drizzle · **DB**: local Postgres in dev, Neon in prod ([ADR-0011](./docs/adr/0011-local-postgres-neon-dual-driver.md))
- **Auth**: better-auth, self-hosted ([ADR-0012](./docs/adr/0012-auth-better-auth.md))
- **Billing**: Stripe, env-flagged ([ADR-0013](./docs/adr/0013-stripe-billing.md))
- **Email**: pluggable (console in dev, AWS SES when `AWS_REGION` is set)
- **Env**: `@t3-oss/env-nextjs` + Zod · **Actions**: next-safe-action · **PM**: pnpm

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # sign-in, sign-up, forgot/reset-password
│   ├── (app)/dashboard/  # protected demo page (requireUser)
│   ├── (legal)/          # terms, privacy, acceptable-use, ai-disclosure, cookies
│   └── api/
│       ├── auth/[...all]/     # better-auth handler
│       └── webhooks/stripe/   # signature-verified Stripe webhook
├── components/           # auth-form, sign-out-button, billing-button,
│                         # site-footer, cookie-banner, ai-disclosure-notice
├── content/legal/        # config.ts — company info + LEGAL_VERSION for the (legal) pages
├── db/                   # schema.ts (auth + billing tables) + dual-driver index.ts
├── lib/
│   ├── auth.ts           # better-auth server instance
│   ├── auth-client.ts    # better-auth React client
│   ├── auth/             # session.ts (getSession/requireUser), password-schema.ts
│   ├── password.ts       # password policy (single source of truth)
│   ├── email/            # pluggable sendEmail()
│   ├── stripe/           # client, actions, customer, webhook mapping
│   ├── study-eval/       # Good Study Framework evaluator (see below)
│   └── safe-action.ts    # actionClient + authActionClient
├── env.ts                # type-safe env
└── proxy.ts              # Next 16 proxy (formerly middleware): auth redirect + CSP
scripts/                  # setup.sh, rename-app.sh, db-local.sh, hooks/
```

## Common Commands

```bash
pnpm bootstrap        # bootstrap a fresh clone (env, secret, local DB, schema)
pnpm preflight        # read-only check: required + optional tooling, .env, DB, browsers
pnpm dev              # dev server (Turbopack)
pnpm build            # production build
pnpm check[:fix]      # Biome lint+format
pnpm test             # unit tests (Vitest)
pnpm e2e[:ui]         # E2E (Playwright, local)
pnpm db:local         # create the local dev database
pnpm db:push          # push schema (dev)
pnpm db:generate      # generate a migration
pnpm db:migrate       # run migrations (prod path)
pnpm db:studio        # Drizzle Studio
```

## Code Style

- Biome only; tabs; line width 100; double quotes; semicolons. Run `pnpm check:fix` before committing.
- A commit is gated by a PreToolUse hook that runs `pnpm check && pnpm test`
  (`.claude/settings.json` → `scripts/hooks/pre-commit-gate.sh`).

## Environment Variables

- Defined + validated in `src/env.ts` (Zod). Add new vars to **both** `src/env.ts`
  and `.env.example`. Import `env` from `@/env`; never read `process.env` directly.
- Only `DATABASE_URL` + `BETTER_AUTH_SECRET` are required; social/email/Stripe
  vars are optional and gate their features. `SKIP_ENV_VALIDATION=1` for CI builds.

## Database

- Schema in `src/db/schema.ts`. `src/db/index.ts` auto-selects the driver from
  `DATABASE_URL` (Neon HTTP for `*.neon.tech`, else `pg`). Same code, both envs.
- `db:push` for prototyping; `db:generate` + `db:migrate` for production. Never
  edit `drizzle/` migrations by hand.

## Auth

- Server instance: `src/lib/auth.ts`. Read the session with `getSession()` /
  `requireUser()` from `src/lib/auth/session.ts` in **every** protected page and
  server action — the `src/proxy.ts` cookie check is only an optimistic redirect.
- Password rules live in `src/lib/password.ts` (one source of truth), enforced on
  the form, in the shared Zod schema, and server-side. Social providers turn on
  when their env vars exist.

## Billing (Stripe)

- Inert until `STRIPE_SECRET_KEY` is set (`isBillingEnabled`). Server actions in
  `src/lib/stripe/actions.ts`; the webhook (`src/app/api/webhooks/stripe/route.ts`)
  is the source of truth for subscription state. **Check entitlement by reading
  the `subscription` table server-side**, never a client value.

## Study Evaluator (Good Study Framework)

- `src/lib/study-eval/` scores a study 0–14 across 7 dimensions (design,
  causation, size, measurement, statistics, robustness, applicability) with an
  override rule: a causal claim scoring 0 on Design and Causation is capped at
  Weak. Public UI at `/evaluate`.
- **Deterministic first**: extractors in `extract/` are pure regex/keyword
  functions — no network, no AI. Fetchers in `fetch/` resolve DOI/PMID via
  PubMed E-utilities (curated publication types + retraction flags) and
  Crossref; both are free, keyless APIs.
- **AI assist is optional** (`ai.ts`, Claude Sonnet): inert until
  `ANTHROPIC_API_KEY` is set. It only reviews dimensions the deterministic pass
  marked `needsReview`, reasons about confounders, and writes the plain-speak
  bottom line. One API call per evaluation; the rubric system prompt is cached.
- When changing scoring logic, keep `score.ts` in sync with the framework doc
  and update `study-eval.test.ts` (end-to-end fixtures for RCT / observational
  / animal abstracts).

## Server Actions

- `next-safe-action`: `actionClient` for public, `authActionClient` (adds
  `ctx.user`) for authenticated. Define with `.schema(zod).action(async ({ parsedInput, ctx }) => …)`.

## Security

- See `docs/security.md`. Drizzle parameterizes queries — never build SQL by
  string concatenation. Baseline headers in `next.config.ts`; nonce CSP in
  `src/proxy.ts`. Run `/security-review` before shipping.

## Legal

- `src/app/(legal)/` (ToS, Privacy, Acceptable Use, AI Disclosure, Cookies) ships
  **unreviewed, AI-drafted starter text** — see `docs/legal.md` (not legal
  advice) before editing or shipping. `src/content/legal/config.ts` is the
  single source for company name/address/governing law and `LEGAL_VERSION`;
  its contact email is currently the owner's personal address as a placeholder
  until this project has a live domain.
- Sign-up requires accepting current-version ToS/Privacy, enforced server-side
  in `src/lib/auth.ts`'s `before` hook — don't relax that to client-only.
- The AI Disclosure page and `<AiDisclosureNotice>` (dropped into `ReportView`
  in `src/components/study-evaluator.tsx`) describe the study evaluator's real
  AI-assist behavior (see "Study Evaluator" above) — keep them in sync if
  `ai.ts`/`quota.ts` change. Consequential-decision uses (employment, credit,
  housing, insurance, healthcare, education) need more than the default
  disclosure — see `docs/legal.md`.

## Provisioning & CLIs

Agents can use these CLIs (see `docs/cli-reference.md`): **vercel** (deploy/env),
**neonctl** (Postgres), **gcloud** (Google OAuth project), **gh** (repo/secrets),
**stripe** (billing). The **`provision-app`** skill orchestrates setting up a new
app's resources end-to-end; **`rename-app`** rebrands a fresh copy. Confirm before
creating billable/public resources.

## Testing

- Unit: `*.test.ts(x)` alongside source or in `src/__tests__/`; `@/*` → `src/*`.
- E2E: `e2e/*.spec.ts`; Playwright auto-starts the dev server (Chromium only).
  Needs a local DB running for auth flows.
