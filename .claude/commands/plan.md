---
description: Break work into small verifiable tasks with acceptance criteria and dependency ordering
---

Invoke the agent-skills:planning-and-task-breakdown skill.

Read the existing spec (SPEC.md or equivalent) and the relevant codebase sections. Then:

1. Enter plan mode — read only, no code changes
2. Run the cross-cutting concern triage from the agent-skills:using-agent-skills skill: answer all nine questions (tenancy, tenant boundary, frontend routing, localization, frontend state, backend layering, RBAC, seed/bootstrap, data scripts) with evidence, and record them in the plan's Cross-Cutting Concerns section. Activate only the skills answered "yes" — never all eight by default
3. Identify the dependency graph between components
4. Slice work vertically (one complete path per task, not horizontal layers)
5. Write tasks with acceptance criteria, verification steps, and a Skills field listing only the activated skills that task's own change needs
6. Add checkpoints between phases
7. Present the plan for human review

Save the plan to tasks/plan.md and task list to tasks/todo.md.

If tasks/plan.md or tasks/todo.md already exists with unchecked tasks for different work, stop and ask before writing — never silently overwrite an incomplete plan.
