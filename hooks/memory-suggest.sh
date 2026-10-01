#!/bin/bash
# agent-skills memory-suggest hook
# On each user prompt, runs the memory skill's cheap continuity check and, when
# the task looks like a continuation of stored work, adds a one-line
# "resume with memory?" suggestion to the context.
#
# It never injects memory content: only entry keys and the approve / skip / view
# question. Loading the memories still needs the user's approval (see the
# memory skill).
#
# Not wired by the plugin. Wire it into a UserPromptSubmit hook to opt in —
# see hooks/MEMORY-SUGGEST.md. It stays silent, and never blocks the prompt,
# when node is missing, the store is empty, or anything goes wrong.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MEMORY_JS="$(dirname "$SCRIPT_DIR")/skills/memory/scripts/memory.js"

command -v node >/dev/null 2>&1 || exit 0
[ -f "$MEMORY_JS" ] || exit 0

MEMORY_JS="$MEMORY_JS" node -e '
  let raw = "";
  process.stdin.on("data", (c) => (raw += c));
  process.stdin.on("end", () => {
    try {
      const input = JSON.parse(raw);
      const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
      // Slash commands route themselves; /memory already handles resume.
      if (!prompt || prompt.startsWith("/")) return;
      if (typeof input.cwd === "string" && input.cwd) process.chdir(input.cwd);
      const { run } = require(process.env.MEMORY_JS);
      const res = run(["suggest", "--task", prompt]);
      if (!res.continuation) return;
      const context =
        "agent-skills memory: " + res.card + "\n" +
        "Ask the user this before doing anything with stored memory. Do not read or load the memory store " +
        "until they approve; on approval, follow the memory skill to build the context pack. " +
        "If they skip, continue the task and do not ask again this session.";
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: context } }) + "\n");
    } catch (_) {
      // A suggestion is optional; never fail the prompt over it.
    }
  });
' 2>/dev/null
exit 0
