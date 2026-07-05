# Security posture

The one-page summary of how this template defends itself, and the checklist to
run before shipping. Read alongside the ADRs it links.

## What's built in

| Area | Control | Where |
|------|---------|-------|
| SQL injection | Drizzle parameterizes every query. **Never** build SQL by string concatenation; if you must use `sql`, use its tagged-template placeholders, never interpolate user input. | `src/db/` |
| AuthN | better-auth: hashed passwords (scrypt), secure/httpOnly/sameSite session cookies, CSRF protection on auth routes. | `src/lib/auth.ts`, [ADR-0012](./adr/0012-auth-better-auth.md) |
| Password quality | Length ≥ 12 + common-password blocklist (NIST 800-63B), enforced on the form **and** server-side (`before` hook) — client checks can be bypassed. | `src/lib/password.ts`, `src/lib/auth/password-schema.ts` |
| AuthZ | `requireUser()` in every protected page/action; the proxy cookie check is only an optimistic redirect, never the sole gate. | `src/lib/auth/session.ts`, `src/proxy.ts` |
| Brute force | better-auth rate limiter enabled (stricter on auth paths). | `src/lib/auth.ts` |
| Transport / headers | HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`. | `next.config.ts`, [ADR-0009](./adr/0009-security-headers.md) |
| XSS | Nonce-based CSP (strict in prod). | `src/proxy.ts`, [ADR-0014](./adr/0014-content-security-policy.md) |
| Webhooks | Stripe signature verified against the raw body before any DB write. | `src/app/api/webhooks/stripe/route.ts` |
| CSRF (actions) | Server actions are same-origin POSTs; `next-safe-action` validates input with Zod. | `src/lib/safe-action.ts` |
| Secrets | All env vars validated at the boundary; server secrets never reach the client bundle. | `src/env.ts`, [ADR-0006](./adr/0006-type-safe-env.md) |
| Secret leakage | `.gitignore` excludes `.env*` (only `.env.example` is committed). | `.gitignore` |

## Pre-deploy checklist

1. `BETTER_AUTH_SECRET` is a fresh 32-byte random value per environment
   (`openssl rand -base64 32`) — never reuse the dev secret in prod.
2. `NEXT_PUBLIC_APP_URL` is the real HTTPS domain in prod (OAuth redirects and
   email links depend on it).
3. OAuth redirect URIs registered with Google/Apple match `<APP_URL>/api/auth/callback/<provider>`.
4. Stripe webhook endpoint added in the Stripe dashboard with a **production**
   signing secret (test-mode `whsec_` won't verify live events).
5. Email verification is required in production — confirm `AWS_REGION` is set and
   `EMAIL_FROM` is a verified SES identity so users can actually verify.
6. Tighten the CSP in `src/proxy.ts` to your real origins; drop what you don't use.
7. Run the **`/security-review`** skill on the diff before merging.
8. Neon: use a pooled connection string and restrict DB access; rotate on leak.
