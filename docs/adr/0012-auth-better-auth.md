# ADR-0012: Authentication with better-auth (self-hosted)

- Status: Accepted
- Date: 2026-07-05

## Context

The template needs first-class authentication so new apps don't re-solve login
each time: Google + Apple social login, email/password with a strong-password
UX, and it must work against the local-Postgres→Neon setup from
[ADR-0011](./0011-local-postgres-neon-dual-driver.md). Prior apps solved this
three different ways (Clerk, better-auth, Auth.js), causing fragmentation.

Requirements that shaped the choice: users and sessions should live in **our own
database** (so there's no per-MAU vendor cost and no external identity to sync);
we want **code-level control of the password form** (retype/confirm, policy);
and it should run the same locally and in production.

## Decision

Use **better-auth**, self-hosted, storing `user`/`session`/`account`/
`verification` in our Drizzle schema via the Drizzle adapter.

- **Providers:** email/password always on; Google and Apple are spread into
  `socialProviders` only when their env vars are present, so the app boots with
  just `DATABASE_URL` + `BETTER_AUTH_SECRET`. The `NEXT_PUBLIC_*_ENABLED` flags
  gate the buttons in the UI.
- **Password policy:** single source of truth in `src/lib/password.ts`
  (length ≥ 12 + common-password blocklist, per NIST 800-63B; composition rules
  behind a one-line toggle). Enforced in three places: the form, the shared Zod
  schema (`src/lib/auth/password-schema.ts`), and a server-side better-auth
  `before` hook (defense in depth — the client can be bypassed).
- **Sessions:** cookie-based; read server-side with `getSession()`/
  `requireUser()` in `src/lib/auth/session.ts`. `src/proxy.ts` does an
  optimistic cookie redirect only; pages/actions still call `requireUser()`.
- **Rate limiting:** better-auth's limiter is enabled (stricter on auth paths).
- **Email:** verification + password-reset go through the pluggable sender in
  `src/lib/email` (console in dev, AWS SES when `AWS_REGION` is set). Email verification is
  only *required* in production so local dev and e2e stay frictionless.

## Consequences

- No third-party identity provider, no per-user cost; full control of the auth
  UI and password rules.
- The app owns auth tables and their migrations (they ship in the schema).
- Apple sign-in carries real setup cost (Apple Developer Program, a
  client-secret JWT that expires ≤ 6 months) — documented in
  `docs/setup/auth-setup.md`; it stays inert until configured.
- OAuth callbacks run on the Node runtime (better-auth uses Node crypto).
- Supersedes nothing, but establishes the auth layer other features build on
  (e.g. Stripe customers key off `user.id`).
