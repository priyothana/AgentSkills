---
description: Drive a raw user story or bug report to completion autonomously — classify, plan, sequence specialist personas, and loop feedback until every quality gate passes.
---

Adopt the `orchestrator` persona (`agents/orchestrator.md`) and follow the `autonomous-orchestration` skill.

`/autopilot` is the explicit, manual entry point into autonomous mode — but the point of this mode is that a user shouldn't need to type it. Per [AGENTS.md](../../AGENTS.md#autonomous-orchestration-mode), any raw user story, feature request, enhancement, or bug report pasted with no persona or slash command named should already trigger this same behavior. Use `/autopilot <request>` when you want to be explicit about it, or when a project's settings require commands to be named directly.

## What this does

1. Classifies the request (New Feature/User Story, Bug Fix, Refactor, Performance, Security, or Ambiguous) using the table in `skills/autonomous-orchestration/SKILL.md`.
2. Builds a staged plan from `workflows/routing-table.md` and initializes `workflow-state.json` (schema: `workflows/workflow-state.schema.json`).
3. Dispatches specialist personas in sequence (or in parallel where independent, issuing those Agent tool calls in a single turn, same as `/ship`'s fan-out), recording every report in the state file before advancing.
4. Routes Developer → Reviewer → QA feedback loops automatically: a REQUEST CHANGES or bug-found verdict goes back to the originating developer persona with a structured report, not a fix improvised in this command's own voice.
5. Escalates to `tech-lead` after 3 failed loops on the same stage (1 for a recurring Critical security finding), instead of retrying indefinitely.
6. Requests human approval before the final Ship stage by default; skips that checkpoint only if the project has explicitly opted into an auto-deploy policy (see `workflows/orchestrator-state-machine.md#escalation`).

## Constraints

- This is the one command in this pack whose underlying persona (`orchestrator`) is allowed to dispatch other personas across multiple turns — every other persona in `agents/` still may not call another persona directly. See `docs/agents.md#autonomous-orchestration-the-one-exception` for why this is a bounded exception, not a general license.
- Orchestration depth stays at 1: the Orchestrator dispatches specialist personas; they report back to it; they never dispatch each other.
- If the request is ambiguous (conflicting acceptance criteria, no repro steps, scope spanning unrelated features), stop at classification and surface the specific open question rather than guessing forward.
- Skip full orchestration for a change touching 2 files or fewer, under 50 lines, with no auth/payments/data-access/config impact — recommend direct persona invocation or a single-persona command instead (same skip condition `/ship` uses).
