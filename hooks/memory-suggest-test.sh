#!/bin/bash
# memory-suggest-test.sh — Tests for the memory-suggest UserPromptSubmit hook
#
# Run: bash hooks/memory-suggest-test.sh

set -euo pipefail

PASS=0 FAIL=0
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

HOOK="$(cd "$(dirname "$0")" && pwd)/memory-suggest.sh"
MEMORY_JS="$(cd "$(dirname "$0")/.." && pwd)/skills/memory/scripts/memory.js"
export MEMORY_HOME="$WORK/home"

check() {
  local name="$1" ok="$2"
  if [ "$ok" = "1" ]; then PASS=$((PASS + 1)); printf '  ok    %s\n' "$name"
  else FAIL=$((FAIL + 1)); printf '  FAIL  %s\n' "$name"; fi
}

payload() { node -e 'process.stdout.write(JSON.stringify({ prompt: process.argv[1], cwd: process.argv[2] }))' "$1" "$2"; }

project="$WORK/project"
mkdir -p "$project"
(cd "$project" && node "$MEMORY_JS" store --key payments-retry-backoff --namespace decisions \
  --value "Retries use SECRETVALUE exponential backoff" --tags payments,retry >/dev/null)

out=$(payload "Continue the payments retry work and fix the double charge" "$project" | bash "$HOOK")
check "emits a UserPromptSubmit envelope for a continuation" \
  "$(printf '%s' "$out" | node -e 'let r="";process.stdin.on("data",c=>r+=c).on("end",()=>{const o=JSON.parse(r).hookSpecificOutput;console.log(o.hookEventName==="UserPromptSubmit"&&o.additionalContext.includes("payments-retry-backoff")&&o.additionalContext.includes("approve / skip / view")?1:0)})')"
check "never includes memory values" "$([[ "$out" != *SECRETVALUE* ]] && echo 1 || echo 0)"

out=$(payload "Add a dark mode toggle to the settings page" "$project" | bash "$HOOK")
check "silent for an unrelated task" "$([ -z "$out" ] && echo 1 || echo 0)"

out=$(payload "/memory resume payments retry" "$project" | bash "$HOOK")
check "silent for slash commands" "$([ -z "$out" ] && echo 1 || echo 0)"

mkdir -p "$WORK/empty"
out=$(payload "Continue the payments retry work" "$WORK/empty" | bash "$HOOK")
check "silent when the store is empty" "$([ -z "$out" ] && echo 1 || echo 0)"

set +e
out=$(printf 'not json' | bash "$HOOK"); status=$?
set -e
check "malformed input exits 0 with no output" "$([ "$status" = "0" ] && [ -z "$out" ] && echo 1 || echo 0)"

printf '\n%d passed, %d failed\n' "$PASS" "$FAIL"
[ "$FAIL" = "0" ]
