#!/usr/bin/env bash
#
# Read-only health check: is this machine ready to run/develop this app?
# Unlike setup.sh, this never writes anything — safe to run any time.
#
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; }
bad()  { printf "  \033[31m✗\033[0m %s\n" "$1"; MISSING=1; }
warn() { printf "  \033[33m!\033[0m %s\n" "$1"; }
skip() { printf "  \033[2m–\033[0m %s\n" "$1"; }
say()  { printf "\n\033[1m%s\033[0m\n" "$1"; }
have() { command -v "$1" >/dev/null 2>&1; }

say "1/6 · Runtime"

NODE_REQUIRED="$(cat .nvmrc 2>/dev/null || echo 24)"
if have node; then
	NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
	if [ "$NODE_MAJOR" -ge "$NODE_REQUIRED" ] 2>/dev/null; then
		ok "node $(node -v) (>= $NODE_REQUIRED required)"
	else
		bad "node $(node -v) — need >= $NODE_REQUIRED (see .nvmrc)"
	fi
else
	bad "node not found — need >= $NODE_REQUIRED"
fi

PINNED_PNPM="$(node -p "require('./package.json').packageManager?.split('@')[1]?.split('+')[0] ?? ''" 2>/dev/null)"
if have pnpm; then
	CURRENT_PNPM="$(pnpm --version)"
	if [ -n "$PINNED_PNPM" ] && [ "$CURRENT_PNPM" != "$PINNED_PNPM" ]; then
		warn "pnpm $CURRENT_PNPM active, but package.json pins $PINNED_PNPM — run 'corepack enable' so the pin is used"
	else
		ok "pnpm $CURRENT_PNPM"
	fi
else
	bad "pnpm not found — install via 'corepack enable' (Node ships corepack)"
fi

say "2/6 · Local Postgres"

for c in psql createdb; do
	have "$c" && ok "$c" || bad "$c (required) — brew install postgresql@17"
done
if have pg_isready; then
	if pg_isready >/dev/null 2>&1; then
		ok "Postgres server is accepting connections"
	else
		bad "Postgres server not reachable — brew services start postgresql@17"
	fi
else
	skip "pg_isready not found — can't confirm the server is running"
fi

say "3/6 · Misc required tools"

have openssl && ok "openssl" || bad "openssl (required) — used to generate BETTER_AUTH_SECRET"

say "4/6 · Project environment"

if [ -f .env ]; then
	ok ".env exists"
	if grep -qE '^DATABASE_URL="?postgresql://' .env; then
		ok "DATABASE_URL is set"
	else
		bad "DATABASE_URL missing/empty in .env"
	fi
	if grep -qE '^BETTER_AUTH_SECRET=""?$' .env; then
		bad "BETTER_AUTH_SECRET is empty in .env — run 'pnpm bootstrap' or 'openssl rand -base64 32'"
	elif grep -qE '^BETTER_AUTH_SECRET=.+' .env; then
		ok "BETTER_AUTH_SECRET is set"
	else
		bad "BETTER_AUTH_SECRET missing from .env"
	fi
else
	bad ".env missing — run 'pnpm bootstrap' (copies .env.example)"
fi

if [ -d node_modules ]; then
	ok "dependencies installed"
else
	bad "node_modules missing — run 'pnpm install'"
fi

say "5/6 · Optional: provisioning/deploy CLIs"

for c in vercel neonctl gcloud gh stripe; do
	have "$c" && ok "$c ($($c --version 2>/dev/null | head -n1))" || skip "$c — needed for the 'provision-app' skill / docs/cli-reference.md"
done

say "6/6 · Optional: Playwright (e2e)"

if have pnpm && [ -d node_modules/@playwright/test ]; then
	if pnpm exec playwright install --dry-run chromium 2>/dev/null | grep -qi "browser is already installed\|^$"; then
		ok "Chromium browser installed"
	else
		warn "Chromium browser missing — run 'pnpm exec playwright install chromium'"
	fi
else
	skip "@playwright/test not installed yet — run 'pnpm install' first"
fi

if [ "${MISSING:-0}" = "1" ]; then
	echo
	echo "Some required tools/config are missing — see ✗ above."
	exit 1
fi

echo
echo "All required tooling is in place."
