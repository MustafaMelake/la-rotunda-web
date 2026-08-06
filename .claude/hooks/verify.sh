#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Stop-hook verification gate — La Rotunda.
#
# Runs typecheck + lint + tests when the turn actually touched TypeScript, and
# reports failures BACK to the model (exit 2) instead of letting a turn end on
# an unverified "done". Green runs are silent.
#
# Skipped when no .ts/.tsx changed — a question-only turn shouldn't pay for a
# full suite run. Lint IS gated here because this project starts with zero lint
# debt; drop it from the gate only if inherited errors ever start blocking
# unrelated turns.
# -----------------------------------------------------------------------------

set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0

# No TypeScript touched (tracked-modified or untracked) -> nothing to verify.
if [ -z "$(git status --porcelain -- '*.ts' '*.tsx' 2>/dev/null)" ]; then
  exit 0
fi

report=""
failed=0

run_gate() {
  local label="$1"; shift
  local out
  if ! out=$("$@" 2>&1); then
    report="${report}--- ${label} FAILED ---
$(printf '%s' "$out" | tail -40)

"
    failed=1
  fi
}

run_gate "npm run typecheck" npm run typecheck
run_gate "npm run lint"      npm run lint
run_gate "npm test"          npm test

[ "$failed" -eq 0 ] && exit 0

# Exit 2 on a Stop hook = blocking error; stderr is fed back to the model.
printf 'Verification gate failed — do not report this work as complete until it passes:\n\n%s' "$report" >&2
exit 2
