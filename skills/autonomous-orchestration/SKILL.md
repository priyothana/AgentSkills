---
name: autonomous-orchestration
description: Guides the orchestrator persona through classifying a raw user story or bug report, building a staged execution plan across specialist personas, and driving Developer → Reviewer → QA feedback loops to completion with bounded retries and escalation. Use when a request arrives with no persona or slash command named and needs to be classified, planned, and driven end-to-end automatically.
---

# Autonomous Orchestration

## Overview

This skill is the *how* behind the orchestrator persona (the *who*, defined in `agents/orchestrator.md`). It defines the classification table, the living workflow-state file, the loop and escalation rules, and the exit criteria for each stage of the Spec → Plan → Build → Test → Review → Ship lifecycle when no human is manually invoking each step.

This is the one skill in this pack that composes multiple personas across turns. It exists because a single, explicit, depth-1, state-tracked exception is more auditable than every persona informally deciding on its own when to hand off — see [docs/agents.md](../../docs/agents.md#autonomous-orchestration-the-one-exception) for why this doesn't reopen persona-to-persona chaining generally.

## When to Use

- A raw user story, feature request, enhancement, or bug report arrives with no persona or slash command named.
- The user asks for something to be driven "end to end" or "autonomously."
- **Not for:** a single, scoped ask for one perspective ("review this file", "are there security issues here") — that's direct persona invocation. Not for a change small enough that one developer pass and a `/review` covers it — the orchestration overhead isn't worth it below that bar (see the skip condition in Process, step 1).

## Process

1. **Skip-check.** If the change touches 2 files or fewer, is under 50 lines, and doesn't touch auth/payments/data-access/config — skip full orchestration. Recommend direct persona invocation or a single-persona slash command instead. This mirrors `/ship`'s own skip condition; orchestration overhead should scale with blast radius.
2. **Classify** the request against this table:

   | Signal | Classification | First stage |
   |---|---|---|
   | New capability, no existing entry point | New Feature / User Story | `requirements-agent` + `product-manager` |
   | Reported failure, crash, wrong output | Bug Fix | `debugger` |
   | Behavior unchanged, structure changes | Refactor | `architecture-agent` |
   | Explicit latency/throughput/scale complaint | Performance | `performance-agent` or `web-performance-auditor` (see persona choice below) |
   | Explicit vulnerability report or compliance ask | Security | `security-auditor` |
   | Conflicting or missing acceptance criteria/repro steps | Ambiguous | Stop — return to user or `product-manager`/`requirements-agent` |

   See `workflows/routing-table.md` for the full stage-by-stage persona sequence per classification, including which stages can fan out in parallel.
3. **Initialize** `workflow-state.json` (schema: `workflows/workflow-state.schema.json`) with the classification, the planned stage sequence, and an empty history array.
4. **Dispatch** the current stage's persona(s) with a concrete task, its acceptance criteria, and its exit condition, drawn from the previous stage's output.
5. **Append** the persona's report to the history array — stage, owner, verdict, evidence pointer, timestamp — before advancing.
6. **Evaluate the exit condition.** If met, advance per the routing table. If not met (review requests changes, QA finds a bug), route back to the originating developer persona with a structured report, increment that task's loop counter, and re-dispatch the gate that failed.
7. **Enforce the loop limit.** At 3 failed loops on the same task (or any recurring Critical security finding), stop looping and dispatch `tech-lead` to make the call or escalate to the human. Record the escalation in history rather than silently retrying.
8. **Gate before Ship.** `deployment-agent` is only dispatched once Review is LGTM, QA has signed off, and any Security/Performance gates the classification required have passed. Missing evidence blocks Ship regardless of how much time has passed.
9. **Close out** with the final report format from `agents/orchestrator.md`, including a link/path to the completed `workflow-state.json` as the evidence trail.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This is a small fix, I'll skip the state file and just wing the hand-offs" | The state file is the only reason autonomous mode is auditable instead of a black box — skipping it for one task set a precedent for skipping it on the task that actually needs it. |
| "Review found one small nit, I'll just fix it myself instead of a real loop" | Fixes made outside the developer persona's turn skip the re-test/re-review that verifies the fix didn't break something else. Route it back through the loop even for small nits. |
| "We've looped twice, one more try will probably work" | That's exactly the 3rd loop the limit exists for. Escalate on the 3rd, don't extend to a 4th on optimism. |
| "Security/performance gates don't really apply, this is just a small tweak" | The classification table and `architecture-agent`'s risk flags decide this, not a guess made mid-flow. If a gate was flagged, it runs. |
| "I can just deploy, the tests probably pass" | `deployment-agent` verifies evidence, it doesn't assume it. No evidence in the state file means no GO. |

## Red Flags

- A stage transition happens with nothing appended to `workflow-state.json` history.
- The same task has looped through Review/QA more than 3 times with no escalation recorded.
- `deployment-agent` is dispatched before every required gate's evidence exists in history.
- A persona other than `orchestrator` is dispatching another persona directly.
- Ambiguous classification proceeded to Plan anyway instead of stopping for clarification.

## Verification

- [ ] `workflow-state.json` exists for the run and its history covers every stage that executed
- [ ] Every REQUEST CHANGES / bug-found verdict has a matching re-dispatch entry to the same developer persona
- [ ] Loop counters never exceeded 3 without an escalation entry
- [ ] The final report lists which gates passed and points to their evidence in the state file
- [ ] `deployment-agent` was dispatched only after Review + QA (+ Security/Performance where required) show a passing verdict in history
