# ADR-0009: Set baseline HTTP security headers

- Status: Accepted
- Date: 2026-06-19

## Context

A fresh Next.js app sends no security headers. Several are safe to apply
universally and cost nothing, so the template should ship them by default rather
than leave every project to remember.

## Decision

Apply a baseline set to every response via `headers()` in `next.config.ts`:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-DNS-Prefetch-Control: on`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

A **Content-Security-Policy is intentionally excluded.** A strict CSP needs
per-app tuning (allowed script/style/img origins) and usually a nonce set in
middleware; a wrong policy silently breaks the app. CSP is left for each project
to add once its origins are known.

## Consequences

- Every app inherits clickjacking, MIME-sniffing, referrer-leak, and
  HSTS protections out of the box.
- `X-Frame-Options: DENY` blocks embedding the app in any frame — relax to
  `SAMEORIGIN` (or drop it for a `frame-ancestors` CSP) if embedding is needed.
- HSTS `preload` is aggressive; it only takes effect over HTTPS, but be aware of
  it before serving the domain over plain HTTP.
- Adding CSP later is expected and does not supersede this ADR.
