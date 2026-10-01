# Orchestrator State Machine

The state transitions the `orchestrator` persona drives, backing `agents/orchestrator.md` and the `autonomous-orchestration` skill. Read this alongside [routing-table.md](routing-table.md) (which persona owns which stage) and [workflow-state.schema.json](workflow-state.schema.json) (the file this machine writes to).

## States

```
in-progress ──────► blocked-ambiguous ──(clarified)──► in-progress
    │
    ├──(loop limit hit / recurring Critical)──► escalated ──(tech-lead or human decides)──► in-progress
    │
    └──(all required gates pass)──► ready-to-ship ──(deployment-agent GO)──► shipped
```

- **in-progress** — the default state. A stage is currently dispatched or its report is being evaluated.
- **blocked-ambiguous** — classification or a later stage surfaced a genuinely unresolved question. No further dispatch happens until the human or `product-manager`/`requirements-agent` resolves it.
- **escalated** — a loop limit was hit, or a gate keeps failing the same way. `tech-lead` gets the full history; it either makes the call (returns to `in-progress`) or confirms this needs a human.
- **ready-to-ship** — every required gate (Review, QA, and any Security/Performance the classification called for) shows a passing verdict in history.
- **shipped** — `deployment-agent` issued GO and the rollout ran.

## Stage transition rule

A stage advances only when its exit condition (from the frozen `stages[]` plan in `workflow-state.json`) is met, and only after the producing persona's report is appended to `history`. There is no transition that isn't backed by a history entry — that is what makes the autonomous mode auditable instead of a black box, and it's the concrete mitigation for the "paraphrasing hops lose information" risk the original anti-pattern write-up in `references/orchestration-patterns.md` calls out: the full report is preserved at its evidence path, not summarized away.

## Loop policy

- Each stage has its own counter in `loop_counts`, keyed by stage name.
- Default limit: **3** failed loops (REQUEST CHANGES or bug-found verdicts) on the same stage for the same task before escalating.
- **Tighter limit for security**: a Critical `security-auditor` finding that recurs after **1** fix attempt escalates immediately — security regressions don't get the same benefit of the doubt as a style disagreement.
- `tech-lead` may explicitly widen or narrow this limit for a specific task (see `agents/tech-lead.md`), with reasoning recorded in `escalations`.

## Escalation

Escalation means: stop dispatching the same stage again, and route to one of:

1. **`tech-lead`** — for a technical disagreement between persona reports, or a stall that has a plausible technical resolution (e.g. two viable approaches, pick one).
2. **Human** — for anything irreversible or genuinely ambiguous: a scope/priority tradeoff, an infrastructure decision with no clean rollback, or a security/compliance judgment call. `tech-lead` makes this call when consulted; the Orchestrator makes it directly when the ambiguity is caught at classification, before `tech-lead` would even have context to help.

Human-approval policy is configurable per project:

- **Default** (no explicit project policy): request human approval before `deployment-agent` runs, even if all gates passed — the Orchestrator drives everything up to "ready to ship" autonomously, but the final push is a checkpoint by default.
- **Auto-deploy policy** (project explicitly opts in, e.g. via a note in this file or a project-level config the Orchestrator is told to read): `deployment-agent` may issue GO without a human checkpoint, provided every gate's evidence is present. This is an explicit opt-in, not the default, precisely because Anti-pattern C in `references/orchestration-patterns.md` warned that removing human checkpoints costs judgment at the points where it matters most — projects that want full autonomy say so explicitly rather than getting it by default.

## Ambiguity handling

Classification or any stage may return `blocked-ambiguous` instead of a normal verdict. This is not a failure state — it's the correct outcome when:

- Acceptance criteria conflict with each other.
- A bug report has no reproduction steps and `debugger` can't reproduce it.
- Scope spans multiple unrelated features bundled into one request.

The Orchestrator does not guess past this. It surfaces the specific open question(s) and waits.
