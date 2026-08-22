#!/usr/bin/env bash
#
# Local reimplementation of the "Security scan (Semgrep)" job in the shared
# reusable workflow this repo's CI calls: kornsour/gh-automation's own
# .github/workflows/ci.yml@main (job `security`; see this repo's own
# .github/workflows/ci.yml, and the clone at
# ~/Documents/GitHub/kornsour/gh-automation). Same rulesets, same severity
# gate (ERROR blocks, WARNING/INFO advisory), same pinned version.
#
# NOT a required status check in this repo's branch protection today — but a
# real CI job that runs on every PR regardless (the caller's `security-scan`
# input defaults to true and this repo doesn't override it), so leaving it out
# of verify.sh would be silently skipping something CI actually does.
#
# SKIPS (exit 3), loudly, when semgrep isn't installed, rather than failing —
# blocking every push over a scanner nobody has installed would just teach
# people to bypass the gate — and rather than silently pretending to have run
# it, which is worse than admitting the gap (same reasoning as feed_ingest's
# `unparsed` counter: a suite that quietly covers 7 of 8 checks while claiming
# parity with CI is worse than one that says which one it skipped).
#
# Install for full parity (matches the version CI pins):
#   pip install --disable-pip-version-check semgrep==1.172.0
#
# Usage: check-semgrep.sh
#
set -uo pipefail

SEMGREP_VERSION="1.172.0"

if ! command -v semgrep >/dev/null 2>&1; then
	echo "⚠ SKIPPED — semgrep is not installed on this machine." >&2
	echo "  Install for full CI parity: pip install --disable-pip-version-check semgrep==${SEMGREP_VERSION}" >&2
	exit 3
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
OUT="$WORKDIR/semgrep.json"

# `|| true`: semgrep exits 1 on any finding: the gate below decides what is
# blocking, not semgrep's own exit code. A real crash still surfaces as a
# missing/empty $OUT, which the check right after this one reports.
semgrep scan \
	--config=p/typescript \
	--config=p/react \
	--config=p/secrets \
	--config=p/owasp-top-ten \
	--metrics=off \
	--quiet \
	--json \
	--output="$OUT" \
	--exclude=node_modules \
	--exclude=.next \
	--exclude=dist \
	--exclude=build \
	|| true

if [ ! -s "$OUT" ]; then
	echo "✗ Semgrep produced no output — the scan itself failed." >&2
	exit 1
fi

errors="$(jq '[.results[] | select(.extra.severity == "ERROR")] | length' "$OUT")"
warnings="$(jq '[.results[] | select(.extra.severity == "WARNING")] | length' "$OUT")"
infos="$(jq '[.results[] | select(.extra.severity == "INFO")] | length' "$OUT")"

echo "Semgrep: ${errors} ERROR, ${warnings} WARNING, ${infos} INFO (ERROR blocks; WARNING/INFO advisory)."

if [ "$errors" -gt 0 ]; then
	jq -r '.results[] | select(.extra.severity == "ERROR")
	       | "  ✗ \(.path):\(.start.line) — \(.extra.message | split("\n")[0])"' "$OUT" >&2
	echo "✗ Blocking: ${errors} ERROR-severity finding(s)." >&2
	exit 1
fi

echo "✓ No ERROR-severity findings."
