# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Cursor, Copilot, Antigravity, etc.) when working with code in this repository.

> **Scope:** This file configures agents working on the [`addyosmani/agent-skills`](https://github.com/addyosmani/agent-skills) repository itself. It is not meant to be copied into other projects or into a global agent configuration; the reusable assets are the skills in `skills/`, not this file.

## Repository Overview

A collection of skills for Claude.ai and Claude Code for senior software engineers. Skills are packaged instructions and scripts that extend Claude and your coding agents capabilities.

## OpenCode Integration

OpenCode uses a **skill-driven execution model** powered by the `skill` tool and this repository's `/skills` directory.

### Core Rules

- If a task matches a skill, you MUST invoke it
- Skills are located in `skills/<skill-name>/SKILL.md`
- Never implement directly if a skill applies
- Always follow the skill instructions exactly (do not partially apply them)

### Intent → Skill Mapping

The agent should automatically map user intent to skills:

- Feature / new functionality → `spec-driven-development`, then `incremental-implementation`, `test-driven-development`
- Planning / breakdown → `planning-and-task-breakdown`
- Bug / failure / unexpected behavior → `debugging-and-error-recovery`
- Code review → `code-review-and-quality`
- Refactoring / simplification → `code-simplification`
- API or interface design → `api-and-interface-design`
- UI work → `frontend-ui-engineering`

### Lifecycle Mapping (Implicit Commands)

OpenCode does not support slash commands like `/spec` or `/plan`.

Instead, the agent must internally follow this lifecycle:

- DEFINE → `spec-driven-development`
- PLAN → `planning-and-task-breakdown`
- BUILD → `incremental-implementation` + `test-driven-development`
- VERIFY → `debugging-and-error-recovery`
- REVIEW → `code-review-and-quality`
- SHIP → `shipping-and-launch`

### Execution Model

For every request:

1. Determine if any skill applies (even 1% chance)
2. Invoke the appropriate skill using the `skill` tool
3. Follow the skill workflow strictly
4. Only proceed to implementation after required steps (spec, plan, etc.) are complete

### Anti-Rationalization

The following thoughts are incorrect and must be ignored:

- "This is too small for a skill"
- "I can just quickly implement this"
- "I’ll gather context first"

Correct behavior:

- Always check for and use skills first

This ensures OpenCode behaves similarly to Claude Code with full workflow enforcement.

## Orchestration: Personas, Skills, and Commands

This repo has three composable layers. They have different jobs and should not be confused:

- **Skills** (`skills/<name>/SKILL.md`) — workflows with steps and exit criteria. The *how*. Mandatory hops when an intent matches.
- **Personas** (`agents/<role>.md`) — roles with a perspective and an output format. The *who*.
- **Slash commands** (`.claude/commands/*.md`) — user-facing entry points. The *when*. The orchestration layer.

Composition rule: **the user (or a slash command) is the orchestrator. Personas do not invoke other personas** — with one deliberate, bounded exception: the `orchestrator` persona (see [Autonomous Orchestration Mode](#autonomous-orchestration-mode) below). Every other persona follows the rule as written. A persona may invoke skills.

The multi-persona orchestration patterns this repo endorses are **parallel fan-out with a merge step** (used by `/ship` to run `code-reviewer`, `security-auditor`, and `test-engineer` concurrently and synthesize their reports) and, as of this section, **autonomous sequential orchestration with feedback loops** (used by `/autopilot` and the `orchestrator` persona). Do not build any *other* "router" persona that decides which other persona to call; that job belongs to `orchestrator`, slash commands, and intent mapping — not to a new one-off coordinator.

See [docs/agents.md](docs/agents.md) for the decision matrix and [references/orchestration-patterns.md](references/orchestration-patterns.md) for the full pattern catalog.

**Claude Code interop:** the personas in `agents/` work as Claude Code subagents (auto-discovered from this plugin's `agents/` directory) and as Agent Teams teammates (referenced by name when spawning). Two platform constraints align with our rules: subagents cannot spawn other subagents, and teams cannot nest. Plugin agents silently ignore the `hooks`, `mcpServers`, and `permissionMode` frontmatter fields. The `orchestrator` persona's exception does not defeat this constraint — it works because `orchestrator` runs at the top-level session (or as an Agent Teams lead), never as a leaf subagent that would itself need to spawn subagents.

## Autonomous Orchestration Mode

For a raw user story, feature request, enhancement, or bug report pasted with **no persona or slash command named**, treat it as an implicit `/autopilot` invocation: adopt the `orchestrator` persona and follow the `autonomous-orchestration` skill, rather than waiting for the user to name a persona or command for each step.

- **Classify** the request (New Feature/User Story, Bug Fix, Refactor, Performance, Security, or Ambiguous) using the table in [skills/autonomous-orchestration/SKILL.md](skills/autonomous-orchestration/SKILL.md).
- **Plan and sequence** specialist personas per [workflows/routing-table.md](workflows/routing-table.md), tracking stage, owner, blockers, and history in a `workflow-state.json` (schema: [workflows/workflow-state.schema.json](workflows/workflow-state.schema.json)).
- **Drive the feedback loop automatically**: Developer → `code-reviewer` → `test-engineer`, with a REQUEST CHANGES or bug-found verdict routing back to the originating developer persona, until both sign off. Security/performance gates run wherever the classification or `architecture-agent`'s risk flags call for them.
- **Escalate, don't loop forever**: 3 failed loops on the same stage (1 for a recurring Critical security finding) routes to `tech-lead` instead of another retry.
- **Checkpoint before Ship by default**: request human approval before `deployment-agent` runs, unless the project has explicitly opted into an auto-deploy policy (see [workflows/orchestrator-state-machine.md](workflows/orchestrator-state-machine.md)).
- **Skip this mode** for small, low-blast-radius changes (2 files or fewer, under 50 lines, no auth/payments/data-access/config impact) — use direct persona invocation or a single-persona command instead, same as `/ship`'s own skip condition.

This is the one place in this repo where a persona (`orchestrator`) is allowed to dispatch other personas, and only in the depth-1, state-tracked, loop-bounded way described in [docs/agents.md](docs/agents.md#autonomous-orchestration-the-one-exception). It supersedes Anti-patterns A and C in [references/orchestration-patterns.md](references/orchestration-patterns.md) for this one persona only — every other persona in `agents/` still may not call another persona directly, and still may not build a second "router."

## Creating a New Skill

> **Before you start:** run the pre-flight checks in [CONTRIBUTING.md](CONTRIBUTING.md#before-proposing-a-new-skill), search the catalog, check open PRs (`gh pr list --state open`), confirm the idea fits [docs/skill-anatomy.md](docs/skill-anatomy.md), and justify the gap in your PR description. Most new-skill ideas overlap an existing skill or an open PR; prefer extending an existing skill over adding a near-duplicate. CONTRIBUTING.md is the single source of truth for this workflow.

Skills in this repo are markdown-first: each lives at `skills/<kebab-case-name>/SKILL.md` with YAML frontmatter (`name`, `description`) and follows the section anatomy (Overview, When to Use, Process, Common Rationalizations, Red Flags, Verification). Add a `scripts/` directory only when the skill ships runnable helpers; most skills are markdown only, and there are no per-skill zip packages.

For the full format, naming conventions, frontmatter rules, supporting-file thresholds, and writing principles, see [docs/skill-anatomy.md](docs/skill-anatomy.md), the single source of truth for skill structure. Do not restate that guidance here, link to it.
