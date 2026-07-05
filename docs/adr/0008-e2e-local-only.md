# ADR-0008: Run Playwright E2E locally, not in CI

- Status: Accepted
- Date: 2026-06-19

## Context

The template ships Playwright for end-to-end tests (`e2e/`, `playwright.config.ts`).
Running them in CI means downloading browser binaries and booting the dev server
on every push — minutes of wall-clock and flake surface for a starter template
whose E2E suite is minimal.

## Decision

Do not run E2E in CI. CI covers Biome, type-check, Vitest, and build. E2E runs
locally via `pnpm e2e` (or `pnpm e2e:ui`). The CI workflow documents this in a
comment so the omission is clearly intentional, not an oversight.

## Consequences

- Fast, cheap CI focused on correctness signals that gate every change.
- E2E regressions are not caught automatically — run `pnpm e2e` before releasing
  changes to critical flows.
- A project that grows a meaningful E2E suite can add a dedicated (e.g. nightly
  or pre-release) workflow; that is a per-project decision, not a template
  default.
