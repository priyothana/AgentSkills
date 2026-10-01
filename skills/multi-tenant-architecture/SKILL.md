---
name: multi-tenant-architecture
description: Keeps every change to a multi-tenant application inside its tenant boundary, whatever the framework, language, or tenancy model. Use when an application serves multiple tenants, organizations, workspaces, or customer accounts from one deployment, and you are adding or changing an endpoint, query, repository, cache, background job, event, file upload, migration, or seed data. Use when identifying or propagating the tenant ID or tenant context, choosing between shared schema, schema-per-tenant, and database-per-tenant isolation, or preventing and testing for cross-tenant data leaks.
---

# Multi-Tenant Architecture

## Overview

In a multi-tenant system one missing filter is a data breach: a query without its tenant predicate, a cache key without the tenant, or a job that runs without tenant context serves one customer's data to another. This skill makes tenancy an explicit, verified property of every change. It never assumes a tenancy model. It detects whether the application is multi-tenant at all, identifies the model actually in use, and then applies the isolation rules for that model at every layer the change touches.

## When to Use

- The application serves several tenants (organizations, workspaces, accounts, stores, schools) from one deployment and you are changing code that reads or writes tenant-owned data
- Adding an endpoint, service method, repository query, cache, job, event consumer, upload path, or config lookup in such an application
- Writing a migration or seed data that must run per tenant or respect tenant boundaries
- Reviewing a change for cross-tenant leakage, or writing tenant isolation tests
- Designing tenancy for a new system, or moving a tenant between isolation models

**When NOT to use:**

- The application is single-tenant. Step 1 confirms this; if so, stop and do not introduce tenant concepts.
- General authentication, input validation, or OWASP hardening. Use `security-and-hardening`; this skill adds only the tenant dimension.
- Roles, permissions, and per-user ownership checks. Use `application-rbac-and-authorization`; this skill covers tenant membership and isolation.

## Process

### Step 1: Determine Whether the Application Is Multi-Tenant

Look for evidence before applying any rule. One strong signal, or two weak ones, means multi-tenant.

| Strong signals | Weak signals |
|---|---|
| A `tenant_id`, `org_id`, `account_id`, or `workspace_id` column on most business tables | A `tenants`, `organizations`, or `accounts` table |
| A tenant resolver: middleware, filter, interceptor, or request hook that sets tenant context | Subdomains or path prefixes per customer in routing config |
| Row-level security policies, a global query filter, or a scoped repository base class | Per-customer config files, feature flags, or plan tiers |
| One schema or one database per customer, with a catalog that maps tenant to connection | Tokens carrying an org or tenant claim |

If there is no evidence, report "single-tenant, no tenancy rules applied" and use the ordinary skills. Do not add a `tenant_id` column speculatively. If the user asks you to make the application multi-tenant, that is a design change: go to `spec-driven-development` and record the chosen model with `documentation-and-adrs` before writing code.

### Step 2: Identify the Actual Tenancy Model

Read the code and schema, not the README. Record what you find in a short tenancy map before changing anything.

| Model | Evidence in the code | Isolation boundary | What a missed rule leaks |
|---|---|---|---|
| **Shared database, shared schema** | Tenant column on tables; queries filter by it; possibly row-level security or a global query filter | The tenant predicate on every query | Any row of any tenant |
| **Shared database, separate schema** | Schema name chosen per request (search path, schema prefix, per-tenant model binding) | The schema selected for the connection | A whole tenant schema, if the schema is not reset between uses |
| **Separate database per tenant** | A tenant catalog maps tenant to connection string; a connection resolver or pool per tenant | The connection chosen for the request | A whole tenant database, if the wrong connection is reused |
| **Hybrid** | Mix of the above: pooled small tenants plus dedicated large ones, shared reference tables plus tenant-owned tables, or a control-plane database plus tenant databases | Differs per table or per tenant tier | Depends on which path the data takes |

The tenancy map answers these questions, each with a file reference:

```
TENANCY MAP
Model: [shared schema | schema per tenant | database per tenant | hybrid: describe]
Identified by: [subdomain | header | path segment | token claim | API key | other]
Resolved in: [file:line of the resolver]
Carried by: [request context | async-local storage | thread-local | explicit parameter | DI scope]
Enforced at data layer by: [RLS policy | global filter | scoped repository | connection routing | manual predicate]
Global (non-tenant) tables/resources: [list]
Known gaps: [code paths that bypass enforcement]
```

For hybrid systems, classify every table or resource the change touches as tenant-owned, global reference data, or control-plane data. Tenant-owned is the default for anything new unless the code shows otherwise.

Match the existing mechanism. If the codebase enforces tenancy through a scoped repository, use it; do not add a parallel manual filter or a second resolver.

### Step 3: Trace Tenant Context From Entry to Storage

Tenant context must flow along one traceable path: **identify, resolve, validate, propagate, enforce**.

1. **Identify.** Take the tenant identifier from one trusted source that the codebase already uses. A signed token claim or a server-side session outranks anything the client can freely set. A header, subdomain, or path segment is acceptable only if it is checked in step 3.
2. **Resolve.** Map the identifier to a tenant record once, at the edge. Reject unknown, suspended, or deleted tenants with a response that does not reveal whether the tenant exists.
3. **Validate membership.** Confirm the authenticated principal belongs to the resolved tenant. A valid user of tenant A who sends tenant B's subdomain or header must be refused. This check is what makes the tenant identifier trustworthy.
4. **Propagate.** Carry the resolved tenant as immutable context through the request: the codebase's request context, async-local or thread-local storage, DI scope, or an explicit parameter. Never re-read the tenant from client input deeper in the stack.
5. **Enforce.** The data layer applies the tenant boundary for the model found in Step 2. Enforcement closest to the data wins: a database policy or a mandatory scoped repository catches the query a developer forgot to filter.

Context must never outlive its unit of work. Clear or scope it at the end of each request, job, or message, especially with pooled threads, reused connections, or a schema search path set on a pooled connection.

### Step 4: Apply Isolation at Every Layer the Change Touches

Walk this list for the change at hand. Each rule states what must be true, independent of framework.

#### API requests
- Every tenant-owned route runs behind the resolver and membership check. List any route that deliberately skips them, such as health checks or tenant signup, explicitly.
- Tenant identity never comes from the request body or an ordinary query parameter unless it is checked against the resolved tenant.
- A resource ID from another tenant returns the same response as a missing resource, usually 404, so tenants cannot probe each other's IDs.

#### Service operations
- Services receive tenant context from the propagated context, not from a caller-supplied argument that could be anything.
- Operations spanning several entities verify all of them belong to the same tenant. Linking tenant A's order to tenant B's customer must fail.
- Bulk and admin operations are scoped per tenant unless they are explicitly platform operations, which need their own authorization.

#### Repository and data access
- Shared schema: every read, update, delete, count, aggregate, join, and subquery on tenant-owned tables includes the tenant predicate. Inserts set the tenant from context, never from input. Unique constraints and indexes on tenant-owned data include the tenant column.
- Schema per tenant: the schema is selected from context for every connection use and reset before the connection returns to the pool.
- Database per tenant: the connection comes from the tenant catalog for the current context. Never cache a connection in a place shared across tenants.
- Raw SQL, reporting queries, search indexes, and ORM escape hatches get the same scrutiny as ORM calls; they are where filters most often go missing.

#### Cache
- Every cache key for tenant-owned data includes the tenant ID, typically as a prefix. Key design for other inputs is covered in `performance-optimization`.
- Tenant-wide invalidation clears only that tenant's keys.

#### Background jobs
- The job payload carries the tenant ID. The worker restores tenant context from it before touching data, and clears it afterwards.
- Scheduled jobs that cover all tenants iterate tenants explicitly, with context set per tenant and errors isolated so one tenant's failure does not stop the rest.

#### Events and messages
- Every tenant-owned event carries the tenant ID in its envelope or metadata.
- Consumers restore tenant context from the event and reject events with a missing tenant.
- Outbound webhooks and integrations are delivered only to the endpoints configured by the owning tenant.

#### File and object storage
- Object keys or paths include the tenant ID as a prefix, or tenants use separate buckets or containers.
- Download, signed-URL, and delete operations verify that the object's tenant matches the current context. A guessable path is not access control.

#### Configuration and feature flags
- Tenant-specific settings, secrets, and flags are looked up by tenant ID from context and fall back to defaults, never to another tenant's values.
- A tenant's credentials for third-party integrations are stored and loaded per tenant.

#### Logging and observability
- Logs and traces carry the tenant ID so incidents can be scoped per tenant.
- Metrics use a tenant ID as a label only when the tenant count is small and bounded; otherwise record it in logs and traces. Label cardinality rules are in `observability-and-instrumentation`.
- Error messages and responses never include another tenant's identifiers or data.

### Step 5: Tenant-Aware Authorization

Authorization answers two questions, in this order:

1. **Is this principal a member of this tenant?** Checked once at the edge in Step 3. This skill owns this question.
2. **Does the principal's role in this tenant permit this action on this resource?** The role model, permission matrix, and object-level checks are in `application-rbac-and-authorization`. The tenant-specific rule is that the decision takes the tenant from the resolved context in Step 3, never from input, so an admin in tenant A has no rights in tenant B.

Cross-tenant platform operations never reuse the ordinary path with a flag that switches off tenant filtering. The ordinary path always enforces the tenant boundary.

### Step 6: Migrations and Seed Data

The migration strategy follows the model found in Step 2:

| Model | Migration rule |
|---|---|
| Shared schema | One migration for all tenants. New tenant-owned tables get the tenant column, a not-null constraint, and an index that leads with the tenant column. Backfills set the tenant from the parent row, never from a default. |
| Schema per tenant | The migration runs for every tenant schema plus the template used for new tenants. Record which schemas succeeded so a partial run can resume. |
| Database per tenant | The migration runs against every database in the tenant catalog and the provisioning template. Plan for tenants at different versions during rollout. |
| Hybrid | Classify each change as tenant-owned, global, or control-plane, and apply the matching rule to each. |

- A change that must stay compatible across a rollout over many tenants follows `deprecation-and-migration`.
- Seed data classification, including why per-tenant defaults belong in tenant provisioning, is in `database-seeding-and-data-bootstrap`.
- Test and demo seed data creates at least two tenants so isolation tests have something to leak between.

### Step 7: Prove Isolation With Two-Tenant Tests

Every change to tenant-owned behavior gets tests with at least two tenants. The pattern:

```
Arrange: tenant A with record a1, tenant B with record b1
Act:     as a user of tenant A, list, read, update, and delete, including b1's ID
Assert:  A sees a1 only; reading or changing b1 is refused the same way as a missing record;
         b1 is unchanged afterwards
```

Cover the paths the change touched: the API route, a job or consumer running with tenant B's context, a cache that was warmed by tenant A, and a file path from the other tenant. Write the failing cross-tenant test first when fixing a leak, following `test-driven-development`.

Also cover the context edges: a request with no tenant, an unknown tenant, and a user of tenant A presenting tenant B's identifier.

## Decision Points

- **After Step 1: is there evidence of tenancy?** No → stop applying this skill and report "single-tenant". Asked to add tenancy → stop coding and move to `spec-driven-development`.
- **After Step 2: can every touched table or resource be classified?** No → do not guess. Ask whether it is tenant-owned, global, or control-plane, and record the answer in the tenancy map.
- **In Step 3: does the tenant identifier come from client-settable input without a membership check?** Yes → fix that path before building on it. Every later rule depends on a trustworthy tenant.
- **In Step 4: does the change go around the existing enforcement mechanism (raw SQL, a platform job, a bypass flag)?** Yes → apply the tenant boundary to that path by hand, and add a two-tenant test for it.
- **Before merge: did a two-tenant test fail before the fix, or cover the new path?** No → the isolation claim is unproven. Keep working.

## Framework and Language Adaptation

The rules above do not depend on the stack. Only the mechanism that carries and enforces tenant context changes. Use what the codebase already has. This table helps you recognize it:

| Stack | Context carrier | Common data-layer enforcement |
|---|---|---|
| Node.js / TypeScript | `AsyncLocalStorage`, request-scoped DI (NestJS) | ORM client extensions or middleware that inject the predicate, PostgreSQL RLS |
| Java / Kotlin | Request scope, `ThreadLocal` cleared in a `finally` block | Hibernate `@TenantId`, filters, or multi-tenant connection providers |
| .NET | Scoped DI service, `AsyncLocal<T>` | EF Core global query filters (`HasQueryFilter`), per-tenant connection strings |
| Python | `contextvars`, request object (Django, Flask `g`) | Custom managers or query sets, schema-per-tenant packages, RLS |
| Ruby on Rails | `ActiveSupport::CurrentAttributes` | Default scopes or a tenancy gem, schema switching |
| PHP / Laravel | Service container binding, request attribute | Global scopes on models |
| Go | `context.Context` passed explicitly | A repository that requires the tenant as a parameter, RLS |
| Any SQL database | Session variable set per transaction | Row-level security policies (PostgreSQL, SQL Server) |

- Async runtimes lose ambient context across thread pools, queues, and fire-and-forget tasks. Pass the tenant explicitly at those boundaries.
- Global query filters and default scopes usually have an "ignore filters" escape hatch. Search for it. Every use needs a platform-level justification.
- Row-level security keyed on a session variable only works if the variable is set inside the same transaction and connection, and reset before the connection goes back to the pool.

## Common Mistakes

| Mistake | What happens | Fix |
|---|---|---|
| Setting the tenant session variable or search path outside the transaction on a pooled connection | The next request that borrows the connection runs as the previous tenant | Set it per transaction (`SET LOCAL` or equivalent) and reset on release |
| Filtering the parent query but not the joined or eager-loaded children | Children from other tenants appear in nested results | Enforce at the data layer, or filter every joined tenant-owned table |
| Unique index on `email` alone in a shared schema | Tenant B cannot create a user that tenant A already has, which also reveals that the value exists | Make the constraint `(tenant_id, email)` |
| Returning 403 for another tenant's resource ID | Tells tenant A that the ID exists in some other tenant | Return the same not-found response as a missing record |
| Letting the job scheduler run "all tenants" in one context | One tenant's data or failure spills into the next | Loop over tenants, setting and clearing context each time |
| Testing with two tenants that share a user | The membership check passes by accident | Use separate users per tenant, plus one cross-tenant attempt |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The ID is a UUID, nobody can guess it" | IDs leak through URLs, logs, exports, and support tickets. Unguessable is not authorized. |
| "The frontend only shows this tenant's records" | The API is the boundary. Any client can call it with any ID. |
| "This is an internal job, it doesn't need tenant context" | Jobs are where context is most often lost. A job that touches tenant data without context touches every tenant's data. |
| "The ORM global filter covers it" | Raw SQL, aggregates, background workers, and filter-bypass options don't go through it. Check the actual query path. |
| "We only have one big customer right now" | If the schema is multi-tenant, the second tenant inherits every missing filter. Isolation bugs are found by customers. |
| "Adding tenant_id to the cache key is premature" | A cache without the tenant in its key serves one tenant's data to another the first time two tenants share a key. |
| "I'll add a single-tenant test; two tenants is overkill" | A test with one tenant cannot fail on a leak. The second tenant is the whole point. |
| "I'll make it tenant-aware just in case" | In a single-tenant app, speculative tenancy is dead complexity. Step 1 decides. |

## Red Flags

- A query, update, or delete on a tenant-owned table with no tenant predicate and no enforcing policy or scoped repository
- The tenant ID read from the request body, a query parameter, or a client header without a membership check
- A new tenant resolver, context holder, or filter mechanism when the codebase already has one
- Cache keys, object paths, or queue payloads without the tenant ID
- A worker or consumer that queries data before restoring tenant context
- Tenant context stored in a static, global, or pooled resource without being cleared
- A unique constraint on tenant-owned data that does not include the tenant column
- A migration that runs only against the default schema or database in a per-tenant model
- A "super admin" flag that disables tenant filtering on ordinary code paths
- Tests that create only one tenant

## Verification

After a change to a multi-tenant application:

- [ ] Step 1 recorded whether the application is multi-tenant, with the evidence
- [ ] The tenancy map names the model, resolver, context carrier, and data-layer enforcement, with file references
- [ ] Every new or changed data access on tenant-owned data is enforced by the existing mechanism; show the query, filter, or policy
- [ ] Tenant identity comes from the trusted source and is checked against the principal's membership
- [ ] Every cache key, job payload, event, object path, and config lookup the change touches carries the tenant
- [ ] Migrations and seed data follow the rule for the identified model and were run or dry-run against more than one tenant where the model has more than one schema or database
- [ ] Two-tenant tests exist for the touched paths, including a cross-tenant ID; show them passing, and for a leak fix, show the test failing first
- [ ] The full test suite passes with the repository's own test command

### Exit Criteria

- **Done:** every box above is checked with evidence (file references, the query or policy, test output), and the tenancy map is in the change description.
- **Done, not applicable:** Step 1 found no tenancy. Report the evidence you checked and stop.
- **Blocked:** a touched resource cannot be classified, or the only tenant source is untrusted client input. Report the gap and the fix it needs. Do not ship around it.
