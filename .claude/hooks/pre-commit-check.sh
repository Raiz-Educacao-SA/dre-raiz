#!/bin/bash
# PreToolUse: run only related tests for changed files

if [ -f "package.json" ]; then
  HAS_TEST=$(node -e "const p=require('./package.json'); console.log(p.scripts&&p.scripts.test?'yes':'no')" 2>/dev/null)
  if [ "$HAS_TEST" = "yes" ]; then
    # Get staged files (ts/tsx only — customize for your stack)
    STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR -- '*.ts' '*.tsx' 2>/dev/null | tr '\n' ' ')

    if [ -z "$STAGED_FILES" ]; then
      exit 0
    fi

    # Run only tests related to changed files
    npx jest --bail --findRelatedTests --passWithNoTests --maxWorkers=50% $STAGED_FILES 2>/dev/null
    [ $? -ne 0 ] && echo "BLOQUEADO: Testes relacionados falhando." >&2 && exit 2
  fi
elif [ -f "pytest.ini" ] || [ -f "pyproject.toml" ]; then
  python -m pytest --quiet 2>/dev/null
  [ $? -ne 0 ] && echo "BLOQUEADO: Testes falhando." >&2 && exit 2
fi
exit 0
