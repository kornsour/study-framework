#!/usr/bin/env bash
#
# Everything this repo's real CI runs against it — Biome, tsc, Vitest, the
# build, the DB migration guard, and lockfile integrity — run locally before
# a push reaches origin, so a push has already passed what CI is about to
# check instead of discovering it there.
#
# WHY THIS EXISTS: the org's GitHub Actions minutes are exhausted for this
# billing cycle — jobs fail in seconds having run zero steps, which is not a
# CI failure to fix, it's CI not running at all. Ported from career-manager /
# indabin (Lurking-Walrus), where the same script exists for the same reason.
# Here it is the ONLY thing actually gating a push until Actions minutes reset.
#
# WHAT GOVERNS THIS REPO'S `main` (verified with `gh api`, not assumed):
# this repo is owned by the user `kornsour` — a personal GitHub account, not
# an organization — so there is no org-wide ruleset like the one that excludes
# career-manager by name from Lurking-Walrus's "PR required" rule (org ruleset
# 20334842). `main` here IS covered by a repository RULESET (the newer
# GitHub feature, distinct from career-manager's/sound-it-out's classic branch
# protection): `gh api repos/kornsour/study-framework/rules/branches/main`
# returns a `pull_request` rule and a `required_status_checks` rule (Biome,
# Type check, Unit tests, Build, DB migration check, lockfile / integrity),
# both sourced from ruleset id 18642485. That ruleset's own `bypass_actors`
# array (`gh api repos/kornsour/study-framework/rulesets/18642485`) is EMPTY.
# Unlike classic branch protection's `enforce_admins` flag, an empty bypass
# list on a Repository ruleset means no one bypasses it — not even the
# repository owner/admin. `kornsour` has `admin` permission here, same as on
# every repo owned by this account, but that permission does not let a direct
# push to `main` through: GitHub itself rejects it, for the operator and any
# agent authenticating as the operator alike. So — unlike career-manager,
# where nothing on GitHub's side can stop an agent from pushing straight to
# main, and unlike sound-it-out's classic protection (enforce_admins: false),
# where the admin bypass is real — this repo's server-side rule already does
# what the branch guard below exists to do.
#
# THE GUARD IS STILL PORTED VERBATIM (per the brief), because it is cheap,
# generic, and fails fast locally instead of waiting on a push round-trip to
# GitHub to be rejected — but it is belt-and-suspenders here, not the last
# line of defense career-manager depends on it being. `git log --merges` on
# main here is essentially all "Merge pull request #N…" (mostly Dependabot),
# confirming the PR-based workflow the ruleset already enforces. As with
# sound-it-out, that means ALLOW_BRANCH_PUSH=1 will be the common case for an
# ordinary feature-branch push here, not the rare exception career-manager's
# own comment describes — see scripts/hooks/pre-push for the same reasoning
# applied there.
#
# What each check below mirrors (see .github/workflows/ci.yml, which calls
# kornsour/gh-automation/.github/workflows/ci.yml@main with
# `migration-check: true`, plus this repo's own .github/workflows/lockfile.yml
# — all read directly, not guessed at; the reusable workflow itself is cloned
# locally at ~/Documents/GitHub/kornsour/gh-automation/.github/workflows/ci.yml):
#
#   CI job                     | Local equivalent
#   -------------------------------------------------------------------------
#   ci / Lint & format (Biome) | pnpm check
#   ci / Type check            | pnpm exec tsc --noEmit
#   ci / Unit tests (Vitest)   | pnpm test
#   ci / Build                 | pnpm build
#     (package.json's `build` script is plain `next build` — no migrations.
#     Production migrations run only via the SEPARATE `vercel-build` script
#     — `if [ "$VERCEL_ENV" = "production" ]; then pnpm db:migrate:deploy;
#     fi && pnpm build` — which Vercel runs automatically instead of `build`
#     because a `vercel-build` script exists, and which is gated on
#     VERCEL_ENV=production besides. verify.sh calls `pnpm build`, never
#     `vercel-build`, so this check cannot migrate a real database no matter
#     what is set in the shell that runs it.)
#   ci / DB migration check    | node scripts/check-schema-migration.mjs
#     (upstream job runs `if: inputs.migration-check && github.event_name ==
#     'pull_request'` — never on a bare push. Reimplemented here so a missing
#     migration is caught before a PR even opens, not only after CI runs it —
#     which, with Actions minutes exhausted, may not happen at all.)
#   lockfile / integrity       | scripts/check-lockfile.sh
#   ci / Security scan         | scripts/check-semgrep.sh — SKIPS loudly if
#   (Semgrep)                    semgrep isn't installed; not a required
#                                 status check on this repo's ruleset, but a
#                                 real CI job (security-scan defaults to true
#                                 and this repo's ci.yml caller doesn't
#                                 override it) — included so verify.sh
#                                 doesn't silently skip something CI actually
#                                 runs.
#
# DELIBERATELY NOT HERE: `check-migration-sequence.mjs` (the extra,
# non-upstream migration-coherence check career-manager and indabin both
# added). Neither this repo's CI nor kornsour/gh-automation's reusable
# workflow runs anything like it, and the brief for this port was explicit:
# don't invent a check CI doesn't run. If migration collisions become a real
# problem here, port it in deliberately, the same way career-manager did.
#
# ALSO NOT HERE: `pnpm build` is included above and IS run — see the safety
# note in the table: it is the plain, non-migrating `next build`, never
# `vercel-build`. No separate guard script (like career-manager's
# scripts/db-deploy.sh) is needed because this repo's `build` script was
# never wired to touch the database in the first place.
#
# EXCLUDED BY DEFAULT: the e2e / Playwright suite. Unlike career-manager
# (which runs e2e from pre-push, but only when the checkout has an isolated
# PORT and DATABASE_URL of its own), this repo has no equivalent
# worktree/branch-per-agent isolation system, and its one `.env` would point
# at real infrastructure (Neon, SES, Better Auth, Anthropic, Stripe). Running
# e2e here by default risks driving a real dev server and a real database.
# Left out; add it back deliberately, with the same isolation guard, if this
# repo grows that capability.
#
# CONCURRENCY: every check below runs independently of the others — no
# shared state. `pnpm build` writes to `.next/`, which nothing else here
# reads or writes; Biome, tsc, vitest, the migration check, the lockfile
# check and semgrep touch no database and no shared filesystem state. So all
# of them are launched at once and this script waits on the slowest one,
# rather than paying every check's time added together.
#
# EXIT-CODE CONVENTION for checks that can legitimately be unavailable
# (schema-migration, semgrep): 0 = pass, 1 = fail (blocking), 3 = skip (loud,
# non-blocking — a missing prerequisite, not a broken repo). Every other
# check has no skip state: any nonzero exit is a failure.
#
# Usage:
#   pnpm verify
#   bash scripts/verify.sh
#
set -uo pipefail   # deliberately NOT -e: one check failing must not stop the rest

REPO="$(git rev-parse --show-toplevel)"
cd "$REPO"

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

START_ALL=$(date +%s)

# Parallel arrays: NAMES[i] / CMDS[i] / SKIPPABLE[i] describe a check;
# PIDS[i] / STARTS[i] are filled in as each is launched.
NAMES=()
CMDS=()
SKIPPABLE=() # "1" if exit code 3 means "skipped", not "failed"

add_check() {
	NAMES+=("$1")
	CMDS+=("$2")
	SKIPPABLE+=("$3")
}

add_check "biome" "pnpm check" "0"
add_check "typecheck" "pnpm exec tsc --noEmit" "0"
add_check "test" "pnpm test" "0"
add_check "build" "pnpm build" "0"
add_check "schema-migration" "node scripts/check-schema-migration.mjs" "1"
add_check "lockfile" "bash scripts/check-lockfile.sh" "0"
add_check "semgrep" "bash scripts/check-semgrep.sh" "1"

PIDS=()
STARTS=()

echo "Running ${#NAMES[@]} checks concurrently…"
echo

for i in "${!NAMES[@]}"; do
	name="${NAMES[$i]}"
	log="$WORKDIR/$name.log"
	STARTS[$i]=$(date +%s)
	# shellcheck disable=SC2086
	(eval "${CMDS[$i]}") >"$log" 2>&1 &
	PIDS[$i]=$!
done

# ---------------------------------------------------------------------------
# Collect results in launch order (not finish order — deterministic output).
# ---------------------------------------------------------------------------
STATUSES=()   # "pass" | "fail" | "skip"
DURATIONS=()

for i in "${!NAMES[@]}"; do
	wait "${PIDS[$i]}"
	code=$?
	end=$(date +%s)
	DURATIONS[$i]=$((end - STARTS[$i]))

	if [ "$code" -eq 0 ]; then
		STATUSES[$i]="pass"
	elif [ "${SKIPPABLE[$i]}" = "1" ] && [ "$code" -eq 3 ]; then
		STATUSES[$i]="skip"
	else
		STATUSES[$i]="fail"
	fi
done

END_ALL=$(date +%s)
TOTAL=$((END_ALL - START_ALL))

# ---------------------------------------------------------------------------
# Report: someone staring at a red result should not have to read this
# script — every failing check names the exact command to reproduce it alone.
# ---------------------------------------------------------------------------
echo "───────────────────────────────────────────────────────────────────────"
FAILED=0
SKIPPED=0
for i in "${!NAMES[@]}"; do
	name="${NAMES[$i]}"
	status="${STATUSES[$i]}"
	dur="${DURATIONS[$i]}s"
	log="$WORKDIR/$name.log"
	case "$status" in
	pass)
		printf '✓ %-20s %s\n' "$name" "($dur)"
		;;
	skip)
		SKIPPED=$((SKIPPED + 1))
		printf '⚠ %-20s %s — SKIPPED (see log below)\n' "$name" "($dur)"
		sed 's/^/    /' "$log"
		;;
	fail)
		FAILED=$((FAILED + 1))
		printf '✗ %-20s %s — FAILED. Reproduce with: %s\n' "$name" "($dur)" "${CMDS[$i]}"
		echo "  ── last 20 lines of output ──"
		tail -20 "$log" | sed 's/^/    /'
		;;
	esac
done
echo "───────────────────────────────────────────────────────────────────────"

if [ "$FAILED" -gt 0 ]; then
	echo "❌ verify FAILED: ${FAILED} check(s) failed, ${SKIPPED} skipped, total ${TOTAL}s."
	exit 1
fi

if [ "$SKIPPED" -gt 0 ]; then
	echo "✅ verify passed (${SKIPPED} check(s) SKIPPED — not the same as passing; see above), total ${TOTAL}s."
	echo "   Full parity needs: pip install --disable-pip-version-check semgrep==1.172.0"
	exit 0
fi

echo "✅ verify passed: all ${#NAMES[@]} checks, total ${TOTAL}s."
