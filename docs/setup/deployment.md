# Deployment (Vercel + Neon)

## First deploy

```bash
gh repo create <owner>/<app> --private --source . --push   # if not on GitHub yet
vercel link                                                 # link dir → Vercel project
```

## Environment variables

Set every server + `NEXT_PUBLIC_*` var from `.env.example` in Vercel, per
environment (Production / Preview). Minimum to boot: `DATABASE_URL` (Neon) and a
**fresh** `BETTER_AUTH_SECRET` (never reuse the local one).

```bash
vercel env add DATABASE_URL production
vercel env add BETTER_AUTH_SECRET production      # openssl rand -base64 32
# …GOOGLE_*, APPLE_*, STRIPE_*, AWS_REGION, EMAIL_FROM, NEXT_PUBLIC_APP_URL
vercel env pull .env.local                        # sync down for local parity
```
Or use the session's Vercel skills: `vercel:env` (sync/diff), `vercel:deploy`
(ship), `vercel:bootstrap` (link + Marketplace integrations, incl. Neon).

## Deploy

```bash
vercel deploy            # preview
vercel deploy --prod     # production
```

## Post-deploy checklist

1. `NEXT_PUBLIC_APP_URL` = the real HTTPS domain (OAuth redirects + email links).
2. Register production OAuth redirect URIs (`<APP_URL>/api/auth/callback/<provider>`).
3. Add the Stripe **live** webhook endpoint + signing secret.
4. Confirm `AWS_REGION` + `EMAIL_FROM` are set and `EMAIL_FROM` is a verified SES
   identity/domain in that region (email verification is required in prod).
   Vercel has no IAM role to fall back on, so the AWS SDK's default credential
   chain needs `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` set as env vars too
   (app code has no provider-specific logic either way).
5. Run schema migrations against Neon: `pnpm db:migrate` (with prod `DATABASE_URL`).
6. Work through [`../security.md`](../security.md) and run `/security-review`.

## CI

`.github/workflows/ci.yml` runs Biome, `tsc`, Vitest, and `pnpm build` on every
push/PR with `SKIP_ENV_VALIDATION=1` (no DB in CI). E2E runs locally only
([ADR-0008](../adr/0008-e2e-local-only.md)).
