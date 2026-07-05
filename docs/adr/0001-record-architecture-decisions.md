# ADR-0001: Record architecture decisions

- Status: Accepted
- Date: 2026-06-19

## Context

This is a long-lived template reused across many projects. Foundational
choices (package manager, ORM, lint tooling, CI shape) carry rationale that is
not obvious from the code alone. Without a record, maintainers re-litigate or
silently reverse decisions — and some of those reversals reintroduce real bugs
(see the pnpm-version drift that corrupted a lockfile,
[ADR-0002](./0002-package-manager-pnpm-pinned.md)).

## Decision

Use Architecture Decision Records, stored in `docs/adr/`, for any decision that
shapes the architecture or is costly to reverse. Follow the lightweight
MADR-style format described in [the ADR index](./README.md). ADRs are immutable
once accepted; changing a decision means adding a superseding ADR.

## Consequences

- The _why_ behind the stack is discoverable and survives context resets.
- Small, reversible choices stay out of ADRs to avoid noise — they live in
  code, `CLAUDE.md`, or `docs/maintenance/`.
- Maintainers must spend a few minutes writing an ADR when making a
  foundational change; this is a deliberate, low cost.
