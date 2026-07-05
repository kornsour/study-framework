#!/usr/bin/env bash
#
# Claude Code PreToolUse hook: block `git commit` unless lint + unit tests pass.
# Wired in .claude/settings.json. Receives the tool-call JSON on stdin; exits 2
# to block the commit (stderr is shown to the agent), 0 to allow.
#
set -euo pipefail

INPUT="$(cat)"

# Extract the bash command being run (Node is always available in this repo).
CMD="$(printf '%s' "$INPUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write(j.tool_input?.command??"")}catch{process.stdout.write("")}})')"

# Only gate actual commits.
case "$CMD" in
	*"git commit"*) ;;
	*) exit 0 ;;
esac

echo "🔒 Pre-commit gate: running 'pnpm check' and 'pnpm test'…" >&2
if ! pnpm check >&2; then
	echo "❌ Biome check failed — fix with 'pnpm check:fix' before committing." >&2
	exit 2
fi
if ! pnpm test >&2; then
	echo "❌ Unit tests failed — fix before committing." >&2
	exit 2
fi
echo "✅ Pre-commit gate passed." >&2
exit 0
