#!/usr/bin/env bash
#
# One-shot local bootstrap for a fresh clone of this template.
#   - verifies required + optional CLIs
#   - creates .env from .env.example (if missing)
#   - generates BETTER_AUTH_SECRET
#   - creates the local dev Postgres database and points DATABASE_URL at it
#   - installs deps and pushes the schema
#
# Idempotent: safe to re-run. External services (Neon/Google/Apple/Stripe) are
# NOT provisioned here — see docs/setup/ and the `provision-app` Claude skill.
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

say() { printf "\n\033[1m%s\033[0m\n" "$1"; }
have() { command -v "$1" >/dev/null 2>&1; }

say "1/6 · Checking tooling"
for c in node pnpm psql createdb openssl; do
	if have "$c"; then echo "  ✓ $c"; else echo "  ✗ $c (required)"; MISSING=1; fi
done
for c in vercel neonctl gcloud gh stripe; do
	have "$c" && echo "  ✓ $c (optional)" || echo "  – $c (optional, needed for provisioning)"
done
if [ "${MISSING:-0}" = "1" ]; then
	echo "Install missing required tools and re-run. Postgres: brew install postgresql@17"
	exit 1
fi

say "2/6 · Environment file"
if [ -f .env ]; then
	echo "  ✓ .env already exists (leaving it alone)"
else
	cp .env.example .env
	echo "  ✓ created .env from .env.example"
fi

say "3/6 · Auth secret"
if grep -qE '^BETTER_AUTH_SECRET=""?$' .env; then
	SECRET="$(openssl rand -base64 32)"
	# Portable in-place edit (macOS + Linux).
	node -e 'const fs=require("fs");const p=".env";let t=fs.readFileSync(p,"utf8");t=t.replace(/^BETTER_AUTH_SECRET=.*$/m,`BETTER_AUTH_SECRET="${process.argv[1]}"`);fs.writeFileSync(p,t)' "$SECRET"
	echo "  ✓ generated BETTER_AUTH_SECRET"
else
	echo "  ✓ BETTER_AUTH_SECRET already set"
fi

say "4/6 · Dependencies"
pnpm install
echo "  ✓ dependencies installed"

say "5/6 · Local database"
DB_NAME="${DB_NAME:-$(node -p "require('./package.json').name.replace(/-/g,'_')")_dev}"
if psql -lqt 2>/dev/null | cut -d '|' -f 1 | grep -qw "$DB_NAME"; then
	echo "  ✓ database '$DB_NAME' exists"
else
	createdb "$DB_NAME" && echo "  ✓ created database '$DB_NAME'"
fi
LOCAL_URL="postgresql://${USER}@localhost:5432/${DB_NAME}"
node -e 'const fs=require("fs");const p=".env";let t=fs.readFileSync(p,"utf8");if(/localhost:5432/.test(t)){t=t.replace(/^DATABASE_URL=.*$/m,`DATABASE_URL="${process.argv[1]}"`);fs.writeFileSync(p,t);console.log("  ✓ pointed DATABASE_URL at local db")}else{console.log("  – DATABASE_URL looks non-local; left as-is")}' "$LOCAL_URL"

say "6/6 · Schema"
pnpm db:push && echo "  ✓ schema pushed"

say "Done. Start the app with:  pnpm dev"
echo "Next: add OAuth / Stripe keys to .env — see docs/setup/ or run the 'provision-app' skill."
