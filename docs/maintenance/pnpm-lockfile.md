# Maintaining the pnpm lockfile

Operational runbook for `pnpm-lock.yaml` health. For the _why_ behind the pinned
pnpm version, see [ADR-0002](../adr/0002-package-manager-pnpm-pinned.md).

## Ground rules

- The package manager is pinned in `package.json` `packageManager`. Run
  `corepack enable` once so your local pnpm matches it. Version drift between
  local and CI is what caused the incident below.
- `lockfileVersion` is `9.0` (compatible with pnpm 9/10/11). Do not downgrade it.
- Always commit `package.json` and `pnpm-lock.yaml` together.

## Incident: corrupted lockfile from a Dependabot merge (2026-06-19)

**Symptom.** `main` went red on every CI job with:

```
ERR_PNPM_BROKEN_LOCKFILE  The lockfile ... is broken: duplicated mapping key
```

Dependabot also commented "can't parse your pnpm-lock.yaml" and could not rebase
its other open PRs.

**Cause.** The squash-merge of a `@types/node` bump committed a lockfile where
the `@types/node@<ver>` key was duplicated (4× in `packages:`, 2× in
`snapshots:`). Per-PR CI ran pnpm 10, which tolerates the duplicate key, so the
PR passed; pnpm 11 (local) and the `push` build reject it.

**Fix (surgical, preferred).**

1. Find keys that appear more than the expected twice (once in `packages:`, once
   in `snapshots:`):
   ```bash
   grep -nE "^  '" pnpm-lock.yaml | sed -E "s/^[0-9]+:  //" | sort | uniq -c | awk '$1 > 2'
   ```
2. Remove the duplicate blocks, keeping one `packages:` entry and the
   non-optional `snapshots:` entry (compare against a clean regeneration to pick
   the right snapshot variant).
3. Verify before committing:
   ```bash
   pnpm install --frozen-lockfile   # parses + matches package.json
   pnpm check && pnpm exec tsc --noEmit && pnpm test && pnpm build
   ```

Prefer the surgical fix over a full `pnpm install` regeneration — a full regen
can pull unrelated transitive version bumps into the diff.

## When Dependabot can't rebase a lockfile

If `main`'s lockfile is broken, Dependabot cannot parse it and will not update
any PR. Fix `main` first (above), then comment `@dependabot recreate` on each
stuck PR so it regenerates against the healthy base.

## Note on pnpm 11's release-age cooldown

pnpm 11 enforces a built-in `minimumReleaseAge` cooldown that withholds
just-published versions and can reject otherwise-valid lockfiles. This is a
reason the template stays on pnpm 10.x — see ADR-0002 before considering an
upgrade.
