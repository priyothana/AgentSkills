# memory-suggest hook

Proactive "resume with memory?" suggestion for the [memory skill](../skills/memory/SKILL.md). On each user prompt it runs the skill's continuity check (`memory.js suggest`) against the project and personal stores. When the task looks like a continuation of stored work, it adds one line to the context asking the agent to offer **approve / skip / view**.

It never injects memory content. The suggestion carries entry keys only; loading the memories still needs the user's approval.

## Setup

Opt in by copying [`.claude/settings.json.example`](../.claude/settings.json.example) to `.claude/settings.json` (or merging its `hooks` block into your existing file). The plugin does not enable it by default. The block is:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [{ "type": "command", "command": "bash \"${CLAUDE_PROJECT_DIR}/hooks/memory-suggest.sh\"" }]
      }
    ]
  }
}
```

Requires `node`. No other dependencies.

## Behavior

| Situation | Output |
|---|---|
| Task matches stored entries (two or more shared terms, confidence ≥ 0.5) | A `UserPromptSubmit` envelope with the suggestion and matching keys |
| Unrelated task, empty or missing store | Nothing |
| Slash command (prompt starts with `/`) | Nothing — `/memory` handles resume itself |
| `node` missing, malformed input, any error | Nothing, exit 0 — the hook never blocks a prompt |

Without the hook, the skill's own process runs the same check when a task starts; the hook only makes the offer proactive.

## Tests

```bash
bash hooks/memory-suggest-test.sh
```
