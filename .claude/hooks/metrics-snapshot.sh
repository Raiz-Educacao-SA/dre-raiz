#!/bin/bash
# =============================================================================
# metrics-snapshot.sh — PostToolUse (Bash): Capture metrics after git commits
# Item #14: Post-commit metrics snapshot
# Runs only when a git commit was just made.
# =============================================================================

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('tool_input', {}).get('command', ''))
except:
    print('')
" 2>/dev/null || echo "")

# Only trigger on git commit commands
echo "$COMMAND" | grep -q "git commit" || exit 0

# Check if we're in a node project
if [ ! -f "package.json" ]; then
  exit 0
fi

# Capture metrics silently
METRICS_DIR=".agents/.context"
mkdir -p "$METRICS_DIR" 2>/dev/null

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Quick typecheck count (non-blocking, 10s timeout)
TS_ERRORS=$(timeout 10 npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "?")

# Quick lint count
LINT_WARNINGS=$(timeout 10 npx eslint . --max-warnings=9999 --format=compact 2>&1 | grep -c "Warning" || echo "?")

# Append to metrics log
echo "$TIMESTAMP | $COMMIT_HASH | ts_errors=$TS_ERRORS | lint_warnings=$LINT_WARNINGS" >> "$METRICS_DIR/metrics-log.txt" 2>/dev/null

exit 0
