#!/usr/bin/env node
/**
 * Local reimplementation of the shared workflow's "DB migration check" job
 * (kornsour/gh-automation's .github/workflows/ci.yml@main, job
 * `migration-check`, called with `migration-check: true` from this repo's own
 * .github/workflows/ci.yml): does a schema change carry *a* migration file.
 * That job is gated `if: inputs.migration-check && github.event_name ==
 * 'pull_request'` upstream, so — unlike the other CI jobs, which also run on
 * `push` to main — it only ever runs once a PR exists. This script closes
 * that gap: it lets a schema/migration mismatch be caught locally, before a
 * PR is even opened, rather than only after pushing and waiting on CI (which,
 * with the org's Actions minutes exhausted, may not run at all). Also called
 * from `pnpm verify` / the pre-push hook.
 *
 * Deliberately narrow, matching upstream exactly: this only asks whether
 * schema.ts changed and *a* file landed under drizzle/ alongside it — not
 * whether the migration sequence itself is internally coherent (duplicate
 * numbering, timestamps out of order, a broken snapshot chain). CI has no
 * check for that here, so this script doesn't invent one either.
 *
 * The upstream bash, for reference (BASE was the PR's base ref there):
 *
 *   changed="$(git diff --name-only "${BASE}...HEAD")"
 *   if ! grep -qx "src/db/schema.ts" <<<"$changed"; then exit 0; fi
 *   if grep -q "^drizzle/" <<<"$changed"; then exit 0; fi
 *   exit 1
 *
 * There is no PR base locally, so BASE defaults to `origin/main` (override
 * with VERIFY_BASE_REF) — the same "what's ahead of the branch everyone
 * pushes to" question a PR's base ref was answering. If that ref cannot be
 * resolved (a fresh clone that never fetched, or offline), this SKIPS rather
 * than guessing at a diff — same reasoning as the semgrep-absent case: a
 * check that can't see the real answer must say so, not report a false pass.
 *
 *   node scripts/check-schema-migration.mjs
 *   VERIFY_BASE_REF=origin/main node scripts/check-schema-migration.mjs
 *
 * Exit codes (shared convention across verify.sh's checks):
 *   0 = pass, 1 = fail (blocking), 3 = skip (loud, non-blocking).
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA_PATH = "src/db/schema.ts";
const MIGRATIONS_PREFIX = "drizzle/";

/**
 * The pure decision, given the set of files changed relative to the base —
 * no git, no filesystem, so this is what the test file exercises directly.
 * @param {string[]} changedFiles
 * @returns {{ status: "pass" | "fail", message: string }}
 */
export function evaluateSchemaMigration(changedFiles) {
	if (!changedFiles.includes(SCHEMA_PATH)) {
		return { status: "pass", message: `✓ ${SCHEMA_PATH} unchanged — no migration required.` };
	}
	if (changedFiles.some((f) => f.startsWith(MIGRATIONS_PREFIX))) {
		return { status: "pass", message: "✓ schema changed and a drizzle/ migration was added." };
	}
	return {
		status: "fail",
		message:
			`✗ ${SCHEMA_PATH} changed but no drizzle/ migration was added. ` +
			"Run: pnpm db:generate --name <name>",
	};
}

function resolveBaseRef(base) {
	try {
		execFileSync("git", ["rev-parse", "--verify", "-q", base], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

function changedFilesAgainst(base) {
	const out = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], { encoding: "utf8" });
	return out.split("\n").filter(Boolean);
}

function main() {
	const base = process.env.VERIFY_BASE_REF || "origin/main";

	if (!resolveBaseRef(base)) {
		console.log(
			`⚠ SKIPPED — "${base}" does not resolve here, so there is nothing to diff against. ` +
				`Run "git fetch origin" (or set VERIFY_BASE_REF to a ref that exists) for a real answer.`,
		);
		process.exit(3);
	}

	const changed = changedFilesAgainst(base);
	const { status, message } = evaluateSchemaMigration(changed);

	if (status === "pass") {
		console.log(message);
		process.exit(0);
	}
	console.error(message);
	process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main();
}
