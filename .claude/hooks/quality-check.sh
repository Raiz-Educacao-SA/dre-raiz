#!/bin/bash
# =============================================================================
# quality-check.sh — Stop hook: auto-save state + completeness check + TODO scan
# Exit 2 = force Claude to continue working
# Exit 0 = allow stop
# =============================================================================

# --- Auto-Save State (Item 26) ---
# Try multiple known state file locations
STATE_PATHS=(
  ".agents/.context/session-state.json"
  "docs/ai-state/session-state.json"
)

STATE_FILE=""
for p in "${STATE_PATHS[@]}"; do
  if [ -f "$p" ]; then
    STATE_FILE="$p"
    break
  fi
done

if [ -n "$STATE_FILE" ]; then
  # Check if state was updated recently (5 min)
  if command -v stat &>/dev/null; then
    LAST_MODIFIED=$(stat -c %Y "$STATE_FILE" 2>/dev/null || stat -f %m "$STATE_FILE" 2>/dev/null || echo 0)
    NOW=$(date +%s)
    DIFF=$((NOW - LAST_MODIFIED))
    if [ $DIFF -gt 300 ]; then
      echo "hook additional context: session-state.json nao atualizado ha $((DIFF/60))min. Salve o estado antes de encerrar." >&2
    fi
  fi
fi

# --- TODO/FIXME Scan ---
MODIFIED=$(git diff --name-only HEAD 2>/dev/null)
if [ -n "$MODIFIED" ]; then
  TODOS=$(echo "$MODIFIED" | xargs grep -l "TODO\|FIXME\|HACK" 2>/dev/null)
  if [ -n "$TODOS" ]; then
    echo "hook additional context: TODOs/FIXMEs em arquivos modificados: $TODOS" >&2
  fi
fi

# --- Uncommitted Changes Warning ---
UNCOMMITTED=$(git diff --stat HEAD 2>/dev/null | tail -1)
if [ -n "$UNCOMMITTED" ]; then
  echo "hook additional context: Mudancas nao commitadas detectadas: $UNCOMMITTED" >&2
fi

exit 0
