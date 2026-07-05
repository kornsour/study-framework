# ADR-0011: Local Postgres in dev, Neon in prod, driver chosen by connection string

- Status: Accepted
- Date: 2026-07-05

## Context

[ADR-0005](./0005-data-layer-drizzle-neon.md) chose Drizzle + Neon and wired the
database client to the Neon serverless HTTP driver (`drizzle-orm/neon-http`).
That driver only speaks Neon's HTTP endpoint, so it cannot talk to a plain local
Postgres. In practice that pushed all development onto a live Neon branch —
requiring the network and a Neon account from the very first `pnpm dev`, and
making offline work and fast local iteration awkward.

We want a local Postgres for development (native Homebrew Postgres is already on
the machine) while keeping Neon's serverless driver for preview/production on
Vercel, without maintaining two code paths in application code.

## Decision

The database client in `src/db/index.ts` selects the Drizzle driver from the
`DATABASE_URL` host at startup:

- host matches `*.neon.tech` → `drizzle-orm/neon-http` over `@neondatabase/serverless`
  (best fit for serverless/edge functions on Vercel).
- any other host (i.e. `localhost`) → `drizzle-orm/node-postgres` over a `pg` Pool.

Both drivers expose the same Drizzle query API, so application code is identical
across environments — only `DATABASE_URL` changes. Local dev uses
`postgresql://<you>@localhost:5432/<app>_dev` (create it with `pnpm db:local`);
preview/production set the Neon URL in Vercel.

## Consequences

- Development works fully offline against local Postgres; no Neon account needed
  to start building.
- Production keeps the serverless HTTP driver's cold-start/edge advantages.
- Two drivers are bundled (`pg` + `@neondatabase/serverless`). The `pg` Pool is
  only instantiated when the URL is non-Neon, so serverless bundles that connect
  to Neon don't open TCP pools.
- The export is type-cast to a single `NodePgDatabase` shape because the two
  driver types don't unify across some overloads; this is cosmetic and keeps
  call sites cleanly typed.
- Does not supersede ADR-0005 (Drizzle + Neon remains the data layer); it refines
  how the client connects.
