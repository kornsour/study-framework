#!/usr/bin/env bash
#
# Create the local development Postgres database (idempotent).
#
# Assumes a native Homebrew Postgres is installed and running:
#   brew install postgresql@17 && brew services start postgresql@17
#
# The dev DB name defaults to "<package-name>_dev"; override with $DB_NAME.
# On a default Homebrew install your OS user is a superuser over the local
# socket, so no password is needed — the dev DATABASE_URL is therefore:
#   postgresql://<you>@localhost:5432/<db>
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PKG_NAME="$(node -p "require('${ROOT_DIR}/package.json').name" 2>/dev/null || echo app)"
DB_NAME="${DB_NAME:-${PKG_NAME//-/_}_dev}"

if ! command -v createdb >/dev/null 2>&1; then
	echo "❌ Postgres client tools not found. Install with:"
	echo "     brew install postgresql@17 && brew services start postgresql@17"
	exit 1
fi

if psql -lqt 2>/dev/null | cut -d '|' -f 1 | grep -qw "$DB_NAME"; then
	echo "✓ Database '$DB_NAME' already exists."
else
	createdb "$DB_NAME"
	echo "✓ Created database '$DB_NAME'."
fi

echo
echo "Add this to your .env (local development):"
echo "  DATABASE_URL=\"postgresql://${USER}@localhost:5432/${DB_NAME}\""
echo
echo "Then apply the schema with:  pnpm db:push"
