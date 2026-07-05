# ADR-0010: Unit test with Vitest in a Node environment

- Status: Accepted
- Date: 2026-06-19

## Context

The template needs a fast unit-test runner that understands the TypeScript +
`@/*` path setup. Component (DOM) testing is a heavier commitment (jsdom/happy-dom
environment, Testing Library, render setup) that not every project built on this
template needs.

## Decision

Use [Vitest](https://vitest.dev) configured in `vitest.config.ts`:

- Tests are `src/**/*.test.{ts,tsx}` (also `src/__tests__/`); the `@` alias
  mirrors `tsconfig`.
- Environment is `node` — suited to testing server code, utilities, schemas, and
  actions.
- Coverage uses the v8 provider (`pnpm test:coverage`).

The React component-test plumbing that create-next-app leaves behind
(`@vitejs/plugin-react`, a DOM environment) is **not** included by default,
because no component tests exist and it is unused weight.

## Consequences

- Fast, simple unit tests for the server-side and logic layers.
- Component testing is opt-in per project: add a DOM environment
  (`jsdom`/`happy-dom`), `@vitejs/plugin-react`, and `@testing-library/react`,
  then set `environment: "jsdom"` (or per-file `// @vitest-environment jsdom`).
- E2E coverage of the rendered app is handled separately by Playwright
  ([ADR-0008](./0008-e2e-local-only.md)).
