# Orchestrator Routing Table

The stage-by-stage persona sequence the `orchestrator` persona (via the `autonomous-orchestration` skill) dispatches for each request classification. This is the concrete mapping behind requirement 3 of autonomous mode: skills are the *how*, personas are the *who*, this table plus the Orchestrator are the *when*.

`∥` marks stages that fan out in parallel (independent, no shared mutable state — same rule `/ship` uses for its fan-out). Everything else is sequential; each stage's output is the next stage's input.

## New Feature / User Story

```
requirements-agent ∥ product-manager
        ↓
  architecture-agent
        ↓
  backend-developer / frontend-developer / database-agent / developer
   (whichever the architecture doc assigns; can run ∥ when the split is genuinely independent)
        ↓
  code-reviewer  ──REQUEST CHANGES──→ back to the developer persona that owns the file
        ↓ LGTM
  test-engineer  ──bug found──→ back to the developer persona that owns the file
        ↓ signed off
  security-auditor (if architecture-agent flagged auth/payments/data-access)
  performance-agent / web-performance-auditor (if architecture-agent flagged a hot path, or classification is also Performance)
        ↓ all required gates pass
  deployment-agent
```

## Bug Fix

```
debugger (reproduce, isolate root cause, write failing test)
        ↓
  backend-developer / frontend-developer / database-agent / developer
   (whichever debugger's report names as the recommended owner)
        ↓
  code-reviewer  ──REQUEST CHANGES──→ back to the developer persona
        ↓ LGTM
  test-engineer  ──bug found or fix incomplete──→ back to debugger to re-isolate, then back to the developer
        ↓ signed off
  security-auditor (if the bug is security-relevant, e.g. an auth bypass)
        ↓ all required gates pass
  deployment-agent
```

## Refactor

```
architecture-agent (confirms the refactor's target shape and blast radius)
        ↓
  backend-developer / frontend-developer / database-agent / developer
        ↓
  code-reviewer  ──REQUEST CHANGES──→ back to the developer persona
        ↓ LGTM
  test-engineer (confirms behavior is unchanged — coverage of the pre-refactor behavior is the acceptance bar)
        ↓ signed off
  performance-agent (refactors that touch a hot path get a performance check even without an explicit performance complaint)
        ↓ all required gates pass
  deployment-agent
```

## Performance

```
performance-agent ∥ web-performance-auditor
   (backend/systemic lens vs. frontend/CWV lens — dispatch whichever applies, both if the request spans both)
        ↓
  database-agent (if a query/index issue was isolated)
        ↓
  backend-developer / frontend-developer / developer (implements the fix)
        ↓
  code-reviewer  ──REQUEST CHANGES──→ back to the developer persona
        ↓ LGTM
  test-engineer
        ↓ signed off
  performance-agent / web-performance-auditor (re-verify the fix against the original measurement)
        ↓ improvement confirmed
  deployment-agent
```

## Security

```
security-auditor (vulnerability/threat-model pass)
        ↓
  backend-developer / frontend-developer / database-agent (implements the fix)
        ↓
  code-reviewer  ──REQUEST CHANGES──→ back to the developer persona
        ↓ LGTM
  security-auditor (re-verify — a recurring Critical finding after one fix attempt escalates to tech-lead immediately, per the tighter loop policy for security)
        ↓ pass
  test-engineer
        ↓ signed off
  deployment-agent
```

## Ambiguous

```
Stop at classification.
        ↓
  requirements-agent / product-manager (clarify), or return to the human directly
        ↓ no automatic advance until the ambiguity is resolved
```

## Escalation, across every path

Any path's loop counter hitting 3 (or a recurring Critical security finding after 1 fix attempt) routes to `tech-lead` instead of another retry. See [orchestrator-state-machine.md](orchestrator-state-machine.md#escalation) for the full policy.
