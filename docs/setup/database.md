# Database

Local development uses native Postgres; preview/production use Neon. The same
code runs against both — `src/db/index.ts` picks the driver from the
`DATABASE_URL` host (`*.neon.tech` → Neon HTTP driver, else `pg`). See
[ADR-0011](../adr/0011-local-postgres-neon-dual-driver.md).

## Local (native Postgres)

```bash
brew install postgresql@17 && brew services start postgresql@17
pnpm db:local          # creates <app>_dev and prints the DATABASE_URL
```
Local URL (Homebrew socket auth, no password):
`postgresql://<you>@localhost:5432/<app>_dev`

## Neon (deployed)

```bash
neonctl auth
neonctl projects create --name <app>
neonctl connection-string --project-id <id> --database-name neondb
```
Set that pooled string as `DATABASE_URL` in Vercel (per environment). A separate
Neon **branch** per environment (e.g. `preview`) keeps data isolated.

## Schema & migrations

- Edit `src/db/schema.ts`.
- **Dev / prototyping:** `pnpm db:push` (applies directly, no migration file).
- **Production path:** `pnpm db:generate` (writes SQL to `drizzle/`) then
  `pnpm db:migrate`. Never hand-edit files in `drizzle/`.
- Inspect data: `pnpm db:studio`.

The template ships auth tables (`user`, `session`, `account`, `verification`) and
billing tables (`customer`, `subscription`). Push or migrate before first run.
