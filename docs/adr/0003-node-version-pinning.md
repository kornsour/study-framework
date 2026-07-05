# ADR-0003: Pin Node.js 24 LTS via `.nvmrc` and `engines`

- Status: Accepted
- Date: 2026-06-19

## Context

The runtime version was specified in three places that had drifted apart: CI
hardcoded Node 22, local development ran Node 24, and `@types/node` floated on
`^25`. A runtime mismatch between CI and local is a latent source of
"works-on-my-machine" failures.

## Decision

Standardize on **Node 24 LTS** and express it once:

- `.nvmrc` contains `24` (used by `nvm`/`fnm` locally and by
  `actions/setup-node` via `node-version-file`).
- `package.json` `engines.node` is `>=24`.
- CI reads `.nvmrc` rather than hardcoding a version.

`@types/node` is intentionally left on `^25` rather than forced to `^24`:
`@types/pg` pulls in `@types/node@25.x` transitively regardless, so pinning the
direct dependency down would only create a duplicate entry without benefit. The
type defs being one major ahead of the runtime is harmless (they are a
superset).

## Consequences

- CI, local, and tooling agree on the runtime.
- Upgrading Node means editing `.nvmrc` and `engines` in one place each.
- `engines` is advisory (not `engine-strict`), so it warns rather than blocks on
  older Node — enough signal without being heavy-handed for a template.
