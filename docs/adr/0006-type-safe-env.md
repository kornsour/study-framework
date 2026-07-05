# ADR-0006: Validate environment variables at the boundary

- Status: Accepted
- Date: 2026-06-19

## Context

`process.env` is untyped and unvalidated. Missing or malformed variables
otherwise surface as confusing runtime errors deep in the app, and there is no
compile-time guard against a client bundle reading a server-only secret.

## Decision

Validate all environment variables in `src/env.ts` using
[`@t3-oss/env-nextjs`](https://env.t3.gg) + Zod.

- Server-only vars go in `server`, client vars in `client` (must be prefixed
  `NEXT_PUBLIC_`); the library enforces that split.
- Import the typed `env` from `@/env` instead of touching `process.env`.
- Every new var is added to both `src/env.ts` and `.env.example`.
- `SKIP_ENV_VALIDATION=1` bypasses validation for DB-less CI builds.

## Consequences

- Invalid configuration fails fast at startup with a clear message, and `env` is
  fully typed.
- Server secrets cannot leak into client bundles by accident.
- A small amount of boilerplate per variable (declaration + `runtimeEnv` entry +
  `.env.example`), accepted as the cost of safety.
