# Agent Personas

Specialist personas that play a single role with a single perspective. Each persona is a Markdown file consumed as a system prompt by your harness (Claude Code, Cursor, Copilot, etc.).

| Persona | Role | Best for |
|---------|------|----------|
| [orchestrator](../agents/orchestrator.md) | Top-level planner & workflow manager | Driving a raw user story or bug report end to end, autonomously — the one persona allowed to dispatch other personas (see below) |
| [requirements-agent](../agents/requirements-agent.md) | Requirements Engineer | Turning an informal request into testable functional/non-functional requirements |
| [product-manager](../agents/product-manager.md) | Product / Project Manager | Acceptance criteria, prioritization, scope tradeoffs |
| [architecture-agent](../agents/architecture-agent.md) | Systems Architect | Component design, interfaces, data-model impact, tradeoffs |
| [backend-developer](../agents/backend-developer.md) | Backend Engineer | Server-side implementation against a design/requirements doc |
| [frontend-developer](../agents/frontend-developer.md) | Frontend Engineer | UI implementation, full state matrix, accessibility defaults |
| [database-agent](../agents/database-agent.md) | Database Engineer | Schema design, migrations, query-pattern review |
| [developer](../agents/developer.md) | General / full-stack Engineer | Small, cross-cutting tasks that don't need a specialist lens |
| [tech-lead](../agents/tech-lead.md) | Team Lead / Tech Lead | Resolving stalled loops and cross-persona disagreements |
| [debugger](../agents/debugger.md) | Root-cause investigator | Reproducing bugs, isolating root cause, handing off a failing test |
| [code-reviewer](../agents/code-reviewer.md) | Senior Staff Engineer | Five-axis review before merge |
| [test-engineer](../agents/test-engineer.md) | QA Engineer | Test strategy, coverage analysis, Prove-It pattern |
| [security-auditor](../agents/security-auditor.md) | Security Engineer | Vulnerability detection, OWASP-style audit |
| [performance-agent](../agents/performance-agent.md) | Performance Engineer | Backend/algorithmic performance, profiling, scalability |
| [web-performance-auditor](../agents/web-performance-auditor.md) | Web Performance Engineer | Core Web Vitals audit, loading/rendering/network analysis |
| [deployment-agent](../agents/deployment-agent.md) | Release Engineer | Final gate verification, rollout/rollback plan, go/no-go |

## How personas relate to skills and commands

Three layers, each with a distinct job:

| Layer | What it is | Example | Composition role |
|-------|-----------|---------|------------------|
| **Skill** | A workflow with steps and exit criteria | `code-review-and-quality` | The *how* — invoked from inside a persona or command |
| **Persona** | A role with a perspective and an output format | `code-reviewer` | The *who* — adopts a viewpoint, produces a report |
| **Command** | A user-facing entry point | `/review`, `/ship` | The *when* — composes personas and skills |

The user (or a slash command) is the orchestrator. **Personas do not call other personas.** Skills are mandatory hops inside a persona's workflow.

## When to use each

### Direct persona invocation
Pick this when you want one perspective on the current change and the user is in the loop.

- "Review this PR" → invoke `code-reviewer` directly
- "Are there security issues in `auth.ts`?" → invoke `security-auditor` directly
- "What tests are missing for the checkout flow?" → invoke `test-engineer` directly
- "Audit Core Web Vitals on the product page" → invoke `web-performance-auditor` directly

### Slash command (single persona behind it)
Pick this when there's a repeatable workflow you'd otherwise re-explain every time.

- `/review` → wraps `code-reviewer` with the project's review skill
- `/test` → wraps `test-engineer` with TDD skill
- `/webperf` → wraps `web-performance-auditor` for performance-focused audits on web apps

### Slash command (orchestrator — fan-out)
Pick this only when **independent** investigations can run in parallel and produce reports that a single agent then merges.

- `/ship` → fans out to `code-reviewer` + `security-auditor` + `test-engineer` in parallel, then synthesizes their reports into a go/no-go decision

### Autonomous orchestration (sequential, with feedback loops)
Pick this when the request is a raw user story or bug report with no persona/command named, and the sub-tasks are dependent and may need to loop (Developer → Review → QA → Developer).

- `/autopilot` (or the request itself, with no command named) → `orchestrator` classifies, plans, and dispatches specialist personas in sequence, routing rejections back to the developer persona until Review and QA both sign off.

`/ship`'s parallel fan-out is the pattern to reach for whenever the sub-tasks are independent; autonomous orchestration is for when they aren't, and a human isn't driving each step. See [references/orchestration-patterns.md](../references/orchestration-patterns.md) for the full pattern catalog and anti-patterns, including exactly what `orchestrator` is exempted from and why.

## Decision matrix

```
Is the work a single perspective on a single artifact?
├── Yes → Direct persona invocation
└── No  → Are the sub-tasks independent (no shared mutable state, no ordering)?
         ├── Yes → Slash command with parallel fan-out (e.g. /ship)
         └── No  → Does a human want to drive each step, or name each persona?
                  ├── Yes → Sequential slash commands run by the user (/spec → /plan → /build → /test → /review)
                  └── No  → Autonomous orchestration (/autopilot / orchestrator persona)
```

## Worked example: valid orchestration

`/ship` is the canonical fan-out orchestrator in this repo:

```
/ship
  ├── (parallel) code-reviewer    → review report
  ├── (parallel) security-auditor → audit report
  └── (parallel) test-engineer    → coverage report
                  ↓
        merge phase (main agent)
                  ↓
        go/no-go decision + rollback plan
```

Why this works:
- Each sub-agent operates on the same diff but produces a **different perspective**
- They have no dependencies on each other → genuine parallelism, real wall-clock savings
- Each runs in a fresh context window → main session stays uncluttered
- The merge step is small and benefits from full context, so it stays in the main agent

## Worked example: invalid orchestration (do not build this)

A `meta-orchestrator` persona whose job is "decide which other persona to call":

```
/work-on-pr → meta-orchestrator
                  ↓ (decides "this needs a review")
              code-reviewer
                  ↓ (returns)
              meta-orchestrator (paraphrases result)
                  ↓
              user
```

Why this fails:
- Pure routing layer with no domain value
- Adds two paraphrasing hops → information loss + 2× token cost
- The user already knows they want a review; let them call `/review` directly
- Replicates work that slash commands and `AGENTS.md` intent-mapping already do

**This is what `orchestrator` would be, minus its mitigations.** The difference isn't that `orchestrator` avoids being a router — it is one, by design. The difference is the guardrails: a persisted state file instead of paraphrasing, a bounded loop limit instead of unbounded routing, and a restored human checkpoint before the irreversible step. See [Autonomous Orchestration: The One Exception](#autonomous-orchestration-the-one-exception) below before building anything that looks like this diagram.

## Rules for personas

1. A persona is a single role with a single output format. If you find yourself adding a second role, create a second persona.
2. **Personas do not invoke other personas**, except `orchestrator`, whose entire job is bounded, depth-1, state-tracked composition — see [Autonomous Orchestration: The One Exception](#autonomous-orchestration-the-one-exception). Composition for every other persona is the job of slash commands or the user. On Claude Code this is also a hard platform constraint for leaf subagents — *"subagents cannot spawn other subagents"* — so the rule is enforced for you there regardless of what any persona file says.
3. A persona may invoke skills (the *how*).
4. Every persona file ends with a "Composition" block stating where it fits.

## Autonomous Orchestration: The One Exception

`orchestrator` is a deliberate, single exception to Rule 2 above, and to the "do not build a router persona" guidance in [references/orchestration-patterns.md](../references/orchestration-patterns.md). This section states plainly what's being overridden, why, and what stops it from sliding back into the anti-patterns that guidance describes.

**What's overridden:** Anti-pattern A ("Router persona") and Anti-pattern C ("Sequential orchestrator that paraphrases") in `references/orchestration-patterns.md` both describe, close to verbatim, what `orchestrator` does: classify a request, decide which persona handles it, and hand off automatically across the Spec → Plan → Build → Test → Review → Ship lifecycle without the user typing each step. That guidance's reasoning — paraphrasing hops lose context, token cost roughly doubles, and human checkpoints that catch wrong-direction work get skipped — is real and was the original basis for banning this pattern entirely.

**Why the override, and what mitigates each original objection:**

| Original objection | Mitigation in this design |
|---|---|
| Paraphrasing hops lose context | Every stage's full report is preserved at an evidence path in `workflow-state.json`; the Orchestrator's own summaries are for status display, not the record of what happened. |
| Roughly doubles token cost | Accepted as the cost of the mode this persona exists for — projects that don't want it use direct invocation or a single-persona command instead, which remain unchanged and cheaper. |
| Skips human checkpoints that catch wrong-direction work | Ambiguous classification stops immediately rather than proceeding; a human approval checkpoint is requested before the final Ship stage by default; loop limits force escalation to `tech-lead` or a human instead of silent, indefinite retries. See [workflows/orchestrator-state-machine.md](../workflows/orchestrator-state-machine.md). |
| "Personas can't spawn other personas" | `orchestrator` never runs as a leaf subagent spawning further subagents — it runs at the top-level session, or as an Agent Teams lead, exactly where `/ship` already runs its own fan-out. The platform constraint is unaffected; only the *convention* of "no persona holds composition authority" is relaxed, for this one persona. |

**What still doesn't change:** every other persona in `agents/` still may not call another persona directly. Orchestration depth is still capped at 1 — `orchestrator` calls specialist personas; they report back to it; they never call each other or call it. If a specialist's report recommends bringing in another specialist, that recommendation routes back through `orchestrator`, the same way it would route back to the user or a slash command for any other persona. Do not use `orchestrator`'s existence to justify a second router persona, or a persona that calls `orchestrator` itself — both would reopen exactly the anti-patterns this exception was carved narrowly to avoid.

See [AGENTS.md](../AGENTS.md#autonomous-orchestration-mode) for how this mode is triggered, [workflows/README.md](../workflows/README.md) for the state machine and worked examples, and [skills/autonomous-orchestration/SKILL.md](../skills/autonomous-orchestration/SKILL.md) for the mechanics.

## Claude Code interop

The personas in this repo are designed to work as Claude Code subagents and as Agent Teams teammates without modification:

- **As subagents:** auto-discovered when this plugin is enabled (no path config needed). Use the Agent tool with `subagent_type: code-reviewer` (or `security-auditor`, `test-engineer`). `/ship` is the canonical example.
- **As Agent Teams teammates** (experimental, requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`): reference the same persona name when spawning a teammate. The persona's body is **appended to** the teammate's system prompt as additional instructions (not a replacement), so your persona text sits on top of the team-coordination instructions the lead installs (SendMessage, task-list tools, etc.).

Subagents only report results back to the main agent. Agent Teams let teammates message each other directly. Use subagents when reports are enough; use Agent Teams when sub-agents need to challenge each other's findings (e.g. competing-hypothesis debugging). See [references/orchestration-patterns.md](../references/orchestration-patterns.md) for the full mapping.

Plugin agents do not support `hooks`, `mcpServers`, or `permissionMode` frontmatter — those fields are silently ignored. Avoid relying on them when authoring new personas here.

## Adding a new persona

1. Create `agents/<role>.md` with the same frontmatter format used by existing personas.
2. Define the role, scope, output format, and rules.
3. Add a **Composition** block at the bottom (Invoke directly when / Invoke via / Do not invoke from another persona).
4. Add the persona to the table at the top of this file.
5. If the persona enables a new orchestration pattern, document it in `references/orchestration-patterns.md` rather than inventing the pattern in the persona file itself.
