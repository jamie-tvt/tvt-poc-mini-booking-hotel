#!/bin/bash
# docs-lint wrapper for TVT Vibe Builder (Full mode)
# Delegates to docs_lint.py. Requires python3.
#
# Usage:
#   bash docs-lint.sh                # check only
#   bash docs-lint.sh --generate     # regenerate docs/README.md from frontmatter
#   bash docs-lint.sh --root <path>  # run against a different repo root

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v python3 >/dev/null 2>&1; then
    echo "docs-lint: python3 not found in PATH. python3 is required to run this check." >&2
    exit 2
fi

python3 "$SCRIPT_DIR/docs_lint.py" "$@"
