# ADR-0007: Use next-safe-action for Server Actions

- Status: Accepted
- Date: 2026-06-19

## Context

Raw Next.js Server Actions accept untyped input and have no built-in validation,
input/output typing, or consistent error handling. Each action otherwise
reinvents argument parsing and error shaping.

## Decision

Use [next-safe-action](https://next-safe-action.dev). A shared `actionClient` is
defined in `src/lib/safe-action.ts`; actions are declared as
`actionClient.schema(zodSchema).action(async ({ parsedInput }) => { ... })`.

## Consequences

- Validated, type-safe inputs and a consistent result shape across actions.
- The shared client is the natural place to add cross-cutting middleware later
  (auth, logging, error mapping, metadata) without touching call sites.
- A thin dependency in exchange; teams not using Server Actions can ignore it.
