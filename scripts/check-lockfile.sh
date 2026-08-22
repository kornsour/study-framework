#!/usr/bin/env bash
#
# CI guard: fails if pnpm-lock.yaml contains duplicate mapping keys — a
# recurring Dependabot corruption, documented in docs/LOCAL-VERIFICATION.md.
# CI on pnpm 10 tolerates duplicate YAML keys, so `pnpm install --frozen-lockfile`
# passes while Dependabot's stricter parser (and pnpm 11) reject the file and
# turn main red. This check closes that gap so it can gate every PR — especially
# auto-merged Dependabot ones, where no human is watching.
#
# Usage: check-lockfile.sh [path-to-lockfile]   (defaults to pnpm-lock.yaml)
#
set -euo pipefail

LOCKFILE="${1:-pnpm-lock.yaml}"

if [ ! -f "$LOCKFILE" ]; then
	echo "❌ $LOCKFILE not found" >&2
	exit 1
fi

# Preferred: a strict YAML parse that rejects duplicate keys at every nesting
# level (PyYAML ships on GitHub-hosted ubuntu runners). construct_mapping is
# invoked for every mapping node during load, so this catches nested duplicates
# inside packages:/snapshots:, which is exactly where the corruption lands.
if command -v python3 >/dev/null 2>&1 && python3 -c "import yaml" 2>/dev/null; then
	python3 - "$LOCKFILE" <<'PY'
import sys
import yaml


class DupChecker(yaml.SafeLoader):
    pass


_orig = DupChecker.construct_mapping


def construct_mapping(self, node, deep=False):
    seen = set()
    for key_node, _ in node.value:
        key = self.construct_object(key_node, deep=deep)
        if key in seen:
            print(f"❌ duplicate key in {sys.argv[1]}: {key!r}", file=sys.stderr)
            sys.exit(1)
        seen.add(key)
    return _orig(self, node, deep=deep)


DupChecker.construct_mapping = construct_mapping

with open(sys.argv[1]) as f:
    yaml.load(f, Loader=DupChecker)
print(f"✓ {sys.argv[1]}: no duplicate keys")
PY
	exit 0
fi

# Fallback (no PyYAML): the proven heuristic from the runbook. Package entries
# appear once under packages: and once under snapshots:; anything appearing more
# than twice is a duplicate. Matches 2-space-indented quoted keys.
echo "⚠ PyYAML unavailable — using grep-based fallback duplicate check" >&2
dupes="$(grep -nE "^  '" "$LOCKFILE" | sed -E "s/^[0-9]+:  //" | sort | uniq -c | awk '$1 > 2 {print}')"
if [ -n "$dupes" ]; then
	echo "❌ duplicate package keys in $LOCKFILE (count > 2):" >&2
	echo "$dupes" >&2
	exit 1
fi
echo "✓ $LOCKFILE: no duplicate package keys (fallback check)"
