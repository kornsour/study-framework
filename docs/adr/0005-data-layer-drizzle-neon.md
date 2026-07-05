# ADR-0005: Use Drizzle ORM with Neon serverless Postgres

- Status: Accepted
- Date: 2026-06-19

## Context

The template needs a typed data layer that works well with serverless/edge
runtimes and Vercel deployments, without the runtime weight or codegen step of a
heavier ORM.

## Decision

Use [Drizzle ORM](https://orm.drizzle.team) over
[Neon](https://neon.tech) serverless Postgres (`@neondatabase/serverless`,
`neon-http` driver).

- Schema lives in `src/db/schema.ts`; the client is `src/db/index.ts`.
- Migrations are generated into `drizzle/` and are never hand-edited.
- `pnpm db:push` for rapid prototyping; `db:generate` + `db:migrate` for
  production.
- `drizzle-kit` reads `DATABASE_URL` via `dotenv-cli`, since it runs outside the
  Next.js runtime and cannot import the validated `@/env` module.

## Consequences

- Fully typed queries with no codegen; SQL stays close and parameterized (no
  injection surface from query building).
- Coupled to Postgres semantics; switching databases is a real migration.
- The HTTP driver suits one-shot serverless requests. Workloads needing sessions
  or transactions over a socket should evaluate Neon's WebSocket/pooled driver —
  a separate decision.
