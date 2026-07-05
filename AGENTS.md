# AGENTS.md

This project's agent guidance lives in [`CLAUDE.md`](./CLAUDE.md) — read it first.
It covers the stack, project structure, commands, auth, billing, database, and
security conventions.

Quick pointers for any coding agent (Claude Code, Codex, Cursor, …):

- **Setup:** `pnpm bootstrap` (needs local Postgres). See `docs/setup/getting-started.md`.
- **Before committing:** `pnpm check:fix && pnpm test`. A commit hook enforces this.
- **Env:** add new vars to both `src/env.ts` and `.env.example`; import `env` from
  `@/env`, never `process.env`.
- **Auth:** gate protected code with `requireUser()` (`src/lib/auth/session.ts`),
  not the middleware alone.
- **DB:** edit `src/db/schema.ts`; `pnpm db:push` (dev) / `db:generate`+`db:migrate`
  (prod). Never hand-edit `drizzle/`.
- **Foundational changes:** read the relevant ADR in `docs/adr/` first; add a
  superseding ADR when you change a decision.
- **Provisioning:** use the CLIs in `docs/cli-reference.md`; the `provision-app`
  skill orchestrates them.
- **Security:** `docs/security.md`; run `/security-review` before shipping.
