---
name: using-agent-skills
description: Discovers and invokes agent skills. Use when starting a session, when you need to decide which skill or workflow applies to the piece of work at hand, or before assigning implementation work, to triage a requirement's cross-cutting concerns and activate only the skills they call for. This is the meta-skill that governs how all other skills are discovered and invoked.
---

# Using Agent Skills

## Overview

Agent Skills is a collection of engineering workflow skills organized by development phase. Each skill encodes a specific process that senior engineers follow. This meta-skill helps you discover and apply the right skill for your current task.

## Skill Discovery

When a task arrives, identify the development phase and apply the corresponding skill:

```
Task arrives
    │
    ├── Don't know what you want yet? ──────→ interview-me
    ├── Have a rough concept, need variants? → idea-refine
    ├── New project/feature/change? ──→ spec-driven-development
    ├── No quality bar written down? ──→ constraint-driven-development
    ├── Have a spec, need tasks? ──────→ planning-and-task-breakdown
    ├── Implementing code? ────────────→ incremental-implementation
    │   │   (run Cross-Cutting Concern Triage first; it decides which branches below apply)
    │   ├── UI work? ─────────────────→ frontend-ui-engineering
    │   ├── API work? ────────────────→ api-and-interface-design
    │   ├── Multi-tenant app? ────────→ multi-tenant-architecture
    │   ├── Backend layering? ────────→ backend-application-architecture
    │   ├── Roles/permissions? ───────→ application-rbac-and-authorization
    │   ├── Seeds/fixtures/bootstrap? → database-seeding-and-data-bootstrap
    │   ├── Translations/locales? ────→ frontend-localization-and-i18n
    │   ├── Pages/URLs/guards? ───────→ frontend-routing-and-navigation
    │   ├── State/effects/cleanup? ───→ frontend-state-and-lifecycle-patterns
    │   ├── Need better context? ─────→ context-engineering
    │   ├── Need doc-verified code? ───→ source-driven-development
    │   └── Stakes high / unfamiliar code? ──→ doubt-driven-development
    ├── Writing/running tests? ────────→ test-driven-development
    │   └── Browser-based? ───────────→ browser-testing-with-devtools
    ├── Something broke? ──────────────→ debugging-and-error-recovery
    ├── Reviewing code? ───────────────→ code-review-and-quality
    │   ├── Too complex? ─────────────→ code-simplification
    │   ├── Security concerns? ───────→ security-and-hardening
    │   └── Performance concerns? ────→ performance-optimization
    ├── Committing/branching? ─────────→ git-workflow-and-versioning
    ├── CI/CD pipeline work? ──────────→ ci-cd-and-automation
    ├── Deprecating/migrating? ────────→ deprecation-and-migration
    ├── Data fix/backfill script? ─────→ database-query-and-script-management
    ├── Writing docs/ADRs? ───────────→ documentation-and-adrs
    ├── Adding logs/metrics/alerts? ───→ observability-and-instrumentation
    └── Deploying/launching? ─────────→ shipping-and-launch
```

## Cross-Cutting Concern Triage

Some concerns cut across the phase skills: tenancy, routing, localization, frontend state, backend layering, authorization, seed data, and data scripts. Missing one breaks the change even when the feature works. Examples include a query that leaks across tenants, an endpoint the UI hides but the API still allows, and a new table that fresh environments never populate. Loading every concern skill "just in case" has the opposite cost: context fills with irrelevant process and the agent over-builds.

For every incoming development requirement, run this triage **before implementation work is planned or assigned**. It is part of `planning-and-task-breakdown` and of `/plan` and `/build`. When there is no plan, as with a one-line fix, run it inline before the first edit.

### The nine questions

Answer each one from evidence: the requirement text plus what the codebase shows. A keyword in the request is not evidence on its own.

| # | Question | "Yes" when | Activates |
|---|----------|-----------|-----------|
| 1 | Does the application use multi-tenancy? | The code scopes data by a tenant, organization, workspace, or account ID. Signs are tenant-resolving middleware, a tenant column filtered in queries, or a schema or database per tenant | Nothing by itself. It gates question 2 |
| 2 | Does the change cross a tenant boundary? | Q1 is yes **and** the change reads or writes tenant-owned data. That includes adding an endpoint, query, cache key, job, event, upload path, migration, or seed, and moving data between tenants | `multi-tenant-architecture` |
| 3 | Does the change involve frontend routing? | It adds or changes a page, URL, route parameter, URL-held filter, redirect, route guard, or not-found or error route | `frontend-routing-and-navigation` |
| 4 | Does the change involve localization/i18n? | It adds a locale or right-to-left support. Or the app is already localized (an i18n library or locale files exist) and the change adds user-facing text, dates, numbers, or prices | `frontend-localization-and-i18n` |
| 5 | Does the change involve frontend state/lifecycle? | It adds a store, effect, watcher, subscription, timer, socket, data fetch inside a view, or a form with async submit. Or it fixes stale values, races, leaks, or effect loops | `frontend-state-and-lifecycle-patterns` |
| 6 | Does the change involve backend application layering? | It adds or restructures an endpoint, controller, service, repository, middleware, or job handler. Or it must decide where validation, a transaction, or error mapping lives | `backend-application-architecture` |
| 7 | Does the change require RBAC/authorization? | It adds an action, endpoint, or page that some users must not reach, or changes roles, permissions, role assignment, or invites | `application-rbac-and-authorization` |
| 8 | Does the change require seed/bootstrap changes? | A fresh environment needs new data to work, such as reference or lookup rows, default settings, a new permission when permissions are stored as rows, the first admin, or per-tenant starter data. Or the change touches fixtures and factories | `database-seeding-and-data-bootstrap` |
| 9 | Does the change require database/query scripts? | Existing rows in a live environment must be corrected, backfilled, merged, or deleted outside the application's normal code paths, or ops will run a data script | `database-query-and-script-management` |

### Activation rules

1. **Only a "yes" activates a skill.** "No" and "not applicable" activate nothing. A question you have no evidence for is a "no". There is no default set; never activate all eight together because the change "is big."
2. **Question 2 depends on question 1.** In a single-tenant application, question 2 is "no". Do not introduce tenant concepts.
3. **Unknown is not yes.** If the requirement and a look at the code cannot settle a question, list it as an assumption or open question (see Surface Assumptions below). Do not activate the skill speculatively. Tenancy is the most common unknown, and `multi-tenant-architecture` Step 1 shows how to check.
4. **Triage per task, not only per requirement.** A requirement may need RBAC overall while only the task that adds the guarded endpoint carries `application-rbac-and-authorization`. Each task lists only the skills its own change activates.
5. **Concern skills add to the phase skills; they don't replace them.** A task that activates `backend-application-architecture` still runs through `incremental-implementation` and `test-driven-development`.
6. **Re-triage when scope moves.** If the work turns up a new concern mid-task, for example existing rows that need a backfill, add that skill to the task and say so. Do not quietly expand scope, and do not quietly skip the concern.

### Recording the result

Write the triage down before implementation is assigned, in the plan when one exists. Every answer gets a reason, so a reviewer can see why a skill was left out:

```
CROSS-CUTTING TRIAGE: Admins can void an invoice from the invoice page
1 Multi-tenant app:        yes: orgId column, tenantResolver middleware
2 Crosses tenant boundary: yes: new write to tenant-owned invoices → multi-tenant-architecture
3 Frontend routing:        no:  action is a button on the existing /invoices/:id page
4 Localization/i18n:       yes: app uses i18next; new button label and confirm text → frontend-localization-and-i18n
5 Frontend state:          yes: optimistic status update on the invoice view → frontend-state-and-lifecycle-patterns
6 Backend layering:        yes: new POST /invoices/:id/void endpoint → backend-application-architecture
7 RBAC/authorization:      yes: billing admins only → application-rbac-and-authorization
8 Seed/bootstrap:          yes: new "invoice:void" permission must exist in fresh environments → database-seeding-and-data-bootstrap
9 Database/query scripts:  no:  no existing rows change
ACTIVATED: multi-tenant-architecture, frontend-localization-and-i18n, frontend-state-and-lifecycle-patterns,
           backend-application-architecture, application-rbac-and-authorization, database-seeding-and-data-bootstrap
```

The same triage selects very different sets for different requests:

| Requirement | Activated |
|---|---|
| "Backfill the missing currency on orders placed before March" in a single-tenant app | `database-query-and-script-management` |
| "Add a /reports page, keep the date filter in the URL" in an app without i18n | `frontend-routing-and-navigation`, `frontend-state-and-lifecycle-patterns` |
| "Translate the checkout into German" | `frontend-localization-and-i18n` |
| "Refactor the orders controller so the SQL moves into a repository" in a single-tenant app | `backend-application-architecture` |

## Core Operating Behaviors

These behaviors apply at all times, across all skills. They are non-negotiable.

### 1. Surface Assumptions

Before implementing anything non-trivial, explicitly state your assumptions:

```
ASSUMPTIONS I'M MAKING:
1. [assumption about requirements]
2. [assumption about architecture]
3. [assumption about scope]
→ Correct me now or I'll proceed with these.
```

Don't silently fill in ambiguous requirements. The most common failure mode is making wrong assumptions and running with them unchecked. Surface uncertainty early — it's cheaper than rework.

### 2. Manage Confusion Actively

When you encounter inconsistencies, conflicting requirements, or unclear specifications:

1. **STOP.** Do not proceed with a guess.
2. Name the specific confusion.
3. Present the tradeoff or ask the clarifying question.
4. Wait for resolution before continuing.

**Bad:** Silently picking one interpretation and hoping it's right.
**Good:** "I see X in the spec but Y in the existing code. Which takes precedence?"

### 3. Push Back When Warranted

You are not a yes-machine. When an approach has clear problems:

- Point out the issue directly
- Explain the concrete downside (quantify when possible — "this adds ~200ms latency" not "this might be slower")
- Propose an alternative
- Accept the human's decision if they override with full information

Sycophancy is a failure mode. "Of course!" followed by implementing a bad idea helps no one. Honest technical disagreement is more valuable than false agreement.

### 4. Enforce Simplicity

Your natural tendency is to overcomplicate. Actively resist it.

Before finishing any implementation, ask:
- Can this be done in fewer lines?
- Are these abstractions earning their complexity?
- Would a staff engineer look at this and say "why didn't you just..."?

If you build 1000 lines and 100 would suffice, you have failed. Prefer the boring, obvious solution. Cleverness is expensive.

### 5. Maintain Scope Discipline

Touch only what you're asked to touch.

Do NOT:
- Remove comments you don't understand
- "Clean up" code orthogonal to the task
- Refactor adjacent systems as a side effect
- Delete code that seems unused without explicit approval
- Add features not in the spec because they "seem useful"

Your job is surgical precision, not unsolicited renovation.

### 6. Verify, Don't Assume

Every skill includes a verification step. A task is not complete until verification passes. "Seems right" is never sufficient — there must be evidence (passing tests, build output, runtime data).

Per-skill verification is the local check. The project-wide bar that applies to *every* change, regardless of which skill is active, is the Definition of Done: tests pass, no regressions, behavior verified at runtime, docs updated. See `../../references/definition-of-done.md`. It complements each task's acceptance criteria rather than replacing them.

## Failure Modes to Avoid

These are the subtle errors that look like productivity but create problems:

1. Making wrong assumptions without checking
2. Not managing your own confusion — plowing ahead when lost
3. Not surfacing inconsistencies you notice
4. Not presenting tradeoffs on non-obvious decisions
5. Being sycophantic ("Of course!") to approaches with clear problems
6. Overcomplicating code and APIs
7. Modifying code or comments orthogonal to the task
8. Removing things you don't fully understand
9. Building without a spec because "it's obvious"
10. Skipping verification because "it looks right"

## Skill Rules

1. **Check for an applicable skill before starting work.** Skills encode processes that prevent common mistakes.

2. **Skills are workflows, not suggestions.** Follow the steps in order. Don't skip verification steps.

3. **Multiple skills can apply.** A feature implementation might involve `idea-refine` → `spec-driven-development` → `planning-and-task-breakdown` → `incremental-implementation` → `test-driven-development` → `code-review-and-quality` → `code-simplification` → `shipping-and-launch` in sequence.

4. **When in doubt, start with a spec.** If the task is non-trivial and there's no spec, begin with `spec-driven-development`.

5. **Triage cross-cutting concerns before assigning implementation work.** Run the nine questions in [Cross-Cutting Concern Triage](#cross-cutting-concern-triage) and activate only the concern skills that come back "yes".

## Lifecycle Sequence

For a complete feature, the typical skill sequence is:

```
1.  interview-me                → Extract what the user actually wants
2.  idea-refine                 → Refine vague ideas
3.  spec-driven-development     → Define what we're building
4.  planning-and-task-breakdown → Break into verifiable chunks
5.  context-engineering         → Load the right context
6.  source-driven-development   → Verify against official docs
7.  incremental-implementation  → Build slice by slice
8.  observability-and-instrumentation → Instrument as you build (runs parallel with 7-9, not after)
9.  doubt-driven-development    → Cross-examine non-trivial decisions in-flight
10. test-driven-development     → Prove each slice works
11. code-review-and-quality     → Review before merge
12. code-simplification         → Reduce unnecessary complexity while preserving behavior
13. git-workflow-and-versioning → Clean commit history
14. documentation-and-adrs      → Document decisions
15. deprecation-and-migration   → Retire old systems and move users safely when needed
16. shipping-and-launch         → Deploy safely
```

Not every task needs every skill. A bug fix might only need: `debugging-and-error-recovery` → `test-driven-development` → `code-review-and-quality`.

## Quick Reference

| Phase | Skill | One-Line Summary |
|-------|-------|-----------------|
| Define | interview-me | Surface what the user actually wants before any plan, spec, or code exists |
| Define | idea-refine | Refine ideas through structured divergent and convergent thinking |
| Define | spec-driven-development | Requirements and acceptance criteria before code |
| Plan | planning-and-task-breakdown | Decompose into small, verifiable tasks |
| Build | incremental-implementation | Thin vertical slices, test each before expanding |
| Build | source-driven-development | Verify against official docs before implementing |
| Build | doubt-driven-development | Adversarial fresh-context review of every non-trivial decision |
| Build | context-engineering | Right context at the right time |
| Build | frontend-ui-engineering | Production-quality UI with accessibility |
| Build | api-and-interface-design | Stable interfaces with clear contracts |
| Build | multi-tenant-architecture | Tenant context and isolation at every layer |
| Build | backend-application-architecture | Layered request flow with inward dependencies |
| Build | application-rbac-and-authorization | Server-enforced permissions, deny by default |
| Build | database-seeding-and-data-bootstrap | Idempotent, environment-guarded seed data |
| Build | frontend-localization-and-i18n | Translations, locale formatting, RTL |
| Build | frontend-routing-and-navigation | Deep-linkable routes, guards, 404 and error routes |
| Build | frontend-state-and-lifecycle-patterns | State ownership, effects, cleanup, stale-response safety |
| Verify | test-driven-development | Failing test first, then make it pass |
| Verify | browser-testing-with-devtools | Chrome DevTools MCP for runtime verification |
| Verify | debugging-and-error-recovery | Reproduce → localize → fix → guard |
| Review | code-review-and-quality | Five-axis review with quality gates |
| Review | code-simplification | Preserve behavior while reducing unnecessary complexity |
| Review | security-and-hardening | OWASP prevention, input validation, least privilege |
| Review | performance-optimization | Measure first, optimize only what matters |
| Ship | git-workflow-and-versioning | Atomic commits, clean history |
| Ship | ci-cd-and-automation | Automated quality gates on every change |
| Ship | deprecation-and-migration | Remove old systems and migrate users safely |
| Ship | database-query-and-script-management | Previewed, transactional, reversible data changes |
| Ship | documentation-and-adrs | Document the why, not just the what |
| Ship | observability-and-instrumentation | Structured logs, RED metrics, traces, symptom-based alerts |
| Ship | shipping-and-launch | Pre-launch checklist, monitoring, rollback plan |
