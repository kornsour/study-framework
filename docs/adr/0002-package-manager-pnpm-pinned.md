# ADR-0002: Pin the package manager (pnpm 10.x via `packageManager`)

- Status: Accepted
- Date: 2026-06-19

## Context

pnpm is the package manager for this template. An unpinned version caused a
production incident: Dependabot committed a `pnpm-lock.yaml` with a duplicated
`@types/node` mapping key. Per-PR CI ran **pnpm 10**, which tolerates the
malformed key, so the PR went green and merged. Local development ran
**pnpm 11**, which rejects it (`ERR_PNPM_BROKEN_LOCKFILE`) — and so did the
`push` build, turning `main` red and blocking further Dependabot rebases.
(Recovery is documented in [maintenance/pnpm-lockfile.md](../maintenance/pnpm-lockfile.md).)

Separately, pnpm 11 ships a built-in `minimumReleaseAge` cooldown that withholds
just-published versions. It is not set in any config file, so it is invisible
and surprising; it caused confusing transitive-version churn during resolution
and would reject lockfiles that legitimately contain brand-new dependencies —
directly at odds with how Dependabot opens PRs for fresh releases.

## Decision

Pin the package manager with an exact `packageManager` field in `package.json`
(currently `pnpm@10.34.4` plus integrity hash). CI derives pnpm from this field
(`pnpm/action-setup@v6` with no `version:`), so local, CI, and Dependabot all
resolve identically.

Pin to the **10.x** line, not 11.x:

- It is the version CI had already validated every prior merge with.
- It avoids the pnpm 11 `minimumReleaseAge` cooldown described above.
- `lockfileVersion: 9.0` is fully compatible with pnpm 9, 10, and 11.

## Consequences

- One source of truth for the pnpm version; the version-drift class of bug is
  closed.
- Developers should run `corepack enable` once so local pnpm matches the pin.
  Without corepack, a globally-installed pnpm 11 still works (lockfile 9.0 is
  compatible) but may surface the cooldown locally.
- Bumping to pnpm 11 later is a deliberate decision that must account for the
  cooldown (and would warrant a superseding ADR).
