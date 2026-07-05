# ADR-0004: Use Biome for linting and formatting

- Status: Accepted
- Date: 2026-06-19

## Context

The conventional setup is ESLint + Prettier: two tools, two configs, two
dependency trees, and recurring conflicts between the linter and formatter.

## Decision

Use [Biome](https://biomejs.dev) as the single linter + formatter. Configured in
`biome.json`: tabs, 100-column width, double quotes, always-semicolons. The
recommended ruleset is enabled (`rules.preset: "recommended"`), with a few
project tweaks (`noUnusedImports`/`noUnusedVariables`/`useExhaustiveDependencies`
as warnings, `noNonNullAssertion` off). `pnpm check` lints + formats; CI runs it.

The `$schema` URL in `biome.json` is pinned to the installed Biome version and
should be bumped together with the dependency (`biome migrate --write` handles
config changes across major versions).

## Consequences

- One fast tool, one config, no ESLint/Prettier conflicts.
- A smaller plugin ecosystem than ESLint; if a rule only ESLint provides becomes
  essential, that is a new decision (superseding ADR).
- Do not add ESLint or Prettier — it would reintroduce the exact split this
  decision removes.
