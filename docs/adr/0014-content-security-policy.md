# ADR-0014: Add a nonce-based Content-Security-Policy in middleware

- Status: Accepted
- Date: 2026-07-05

## Context

[ADR-0009](./0009-security-headers.md) shipped baseline security headers but
deliberately **excluded** a Content-Security-Policy, because a strict CSP needs
per-app tuning and usually a nonce set in middleware, and a wrong policy silently
breaks the app. It noted that "adding CSP later is expected and does not
supersede this ADR."

Now that the template ships auth and Stripe, the script/style/frame origins are
known well enough to provide a sensible default CSP, closing the most impactful
remaining gap (XSS mitigation).

## Decision

Add a **nonce-based CSP in `src/proxy.ts`** (Next.js 16's proxy, formerly
"middleware"; per-request nonce that Next stamps onto its own scripts via the
request header):

- **Production:** strict — `script-src 'self' 'nonce-…' 'strict-dynamic'`.
- **Development:** adds `'unsafe-eval'`/`'unsafe-inline'` so Turbopack HMR works.
- Allows Stripe hosts (`js.stripe.com`, `api.stripe.com`, checkout/hooks frames)
  so Stripe.js and hosted checkout function.
- `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`.
- `style-src` keeps `'unsafe-inline'` (framework-injected styles); tighten per
  app if you eliminate inline styles.

The CSP middleware matcher excludes API routes so webhook responses are
untouched.

## Consequences

- Meaningful XSS mitigation by default; social-login redirects (top-level
  navigations) and Stripe flows still work.
- Does **not** supersede ADR-0009 (baseline headers in `next.config.ts` remain);
  it fulfils the CSP follow-up ADR-0009 anticipated.
- Each app should tighten the policy to its real origins (e.g. add analytics,
  drop Stripe if unused) and consider removing `style-src 'unsafe-inline'`.
- Middleware now runs on all page routes; keep it lean.
