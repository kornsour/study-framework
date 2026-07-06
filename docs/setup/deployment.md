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
5. Schema migrations run **automatically** on every Production deploy (see
   [Migrations on deploy](#migrations-on-deploy) below) — no manual step. For an
   out-of-band run you can still do `pnpm db:migrate` locally with the prod
   `DATABASE_URL`.
6. Work through [`../security.md`](../security.md) and run `/security-review`.

## CI

`.github/workflows/ci.yml` runs Biome, `tsc`, Vitest, and `pnpm build` on every
push/PR with `SKIP_ENV_VALIDATION=1` (no DB in CI). E2E runs locally only
([ADR-0008](../adr/0008-e2e-local-only.md)).

## Migrations on deploy

Drizzle migrations are applied automatically as part of the **Production** Vercel
build, so a push to `main` deploys the schema and the code together against the
exact commit being shipped.

- Vercel runs the `vercel-build` script (instead of the default build command)
  when it's present. Ours is:

  ```json
  "vercel-build": "if [ \"$VERCEL_ENV\" = \"production\" ]; then pnpm db:migrate:deploy; fi && next build"
  ```

- The migrate step only runs when `VERCEL_ENV=production` (Vercel sets this during
  Production builds), so **Preview and Development builds never touch the database**.
- `db:migrate:deploy` is `drizzle-kit migrate` with **no** `dotenv` wrapper —
  Vercel injects `DATABASE_URL` straight into the build environment, so no `.env`
  file or extra secret is needed. (The `pnpm db:migrate` script keeps its
  `dotenv -e .env` wrapper for local use.)
- A failed migration exits non-zero and **fails the build**. Vercel's deploys are
  atomic, so a failed build never goes live — worst case is a blocked deploy, not
  a half-migrated production database.

Because migrations run inside the build, `drizzle/` (the SQL files **and**
`meta/_journal.json`) must be committed — never hand-edit them; use
`pnpm db:generate` (see [`../../CLAUDE.md`](../../CLAUDE.md) → Database).
