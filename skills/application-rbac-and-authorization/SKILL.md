---
name: application-rbac-and-authorization
description: Designs and implements application authorization with roles, permissions, resources, and actions, enforced server-side and denied by default. Use when adding role-based access control (RBAC), defining roles or permissions, adding an admin-only action, writing route guards, policies, or permission checks, or deciding who may do what to which resource. Use when a button is hidden in the UI but the API still allows the action, when roles need a hierarchy or inheritance, when combining roles with tenants or organizations, or when testing for privilege escalation.
---

# Application RBAC and Authorization

## Overview

Authentication says who the caller is. Authorization decides what they may do, and it has to be answered the same way everywhere: at the route, in the service, in the data query, and in the UI. Most authorization bugs are not a wrong rule but a missing or duplicated one: a button hidden in the UI while the API accepts the call, or a role check copied into ten handlers with one forgotten. This skill makes the authorization model explicit, puts the decision in one place, enforces it on the server, and proves it with tests per role.

General hardening (authentication, sessions, OWASP controls) belongs to `security-and-hardening`. This skill covers the authorization model and where it is enforced.

## When to Use

- Adding an action, endpoint, page, or button that some users must not be able to use
- Introducing or changing roles, permissions, or an admin area
- Reviewing code where permission checks are scattered, inconsistent, or only in the UI
- Letting users assign roles or invite others, which is where privilege escalation hides
- Combining roles with organizations, workspaces, or tenants

**When NOT to use:**

- Login, password, session, or token handling. Use `security-and-hardening`.
- Tenant resolution and data isolation. Use `multi-tenant-architecture`; this skill covers the roles inside a tenant.

## Process

### Step 1: Find the Existing Authorization Mechanism

Before adding a check, find how the codebase already decides access. Look for:

- A policy module, permission service, or `can(user, action, resource)`-style function
- Middleware, guards, filters, decorators, attributes, or annotations on routes
- A library or external policy engine already in the dependencies
- Role and permission tables, enums, or config files
- UI helpers that show or hide elements by role

Record what exists: where roles and permissions are defined, where checks happen, and which layer is authoritative. Extend that mechanism. Do not add a second one next to it, and do not add a library the codebase does not use. If checks are scattered with no central decision point, say so and propose consolidating in a separate step.

### Step 2: Model Roles, Permissions, Resources, and Actions

Write the model down as a table before coding. Code checks **permissions**, not role names.

| Concept | Meaning | Example |
|---|---|---|
| Resource | A kind of thing being protected | `project`, `invoice`, `member` |
| Action | What is done to it | `read`, `create`, `update`, `delete`, `invite`, `export` |
| Permission | A resource and action pair | `project:delete`, `member:invite` |
| Role | A named bundle of permissions | `viewer`, `editor`, `admin`, `owner` |
| Scope | Where the role applies | global, tenant or organization, project, or a single resource |

```
PERMISSION MATRIX
Permission        viewer  editor  admin  owner
project:read        ✓       ✓       ✓      ✓
project:update              ✓       ✓      ✓
project:delete                      ✓      ✓
member:invite                       ✓      ✓
member:set-role                     ✓*     ✓
billing:manage                             ✓
* only to roles at or below their own
```

- Checking `hasPermission('project:delete')` survives a new role. Checking `role === 'admin'` breaks when `owner` is added.
- **Role hierarchy and inheritance:** if higher roles include lower roles' permissions, compute the effective permission set in one function, from one source of truth. Avoid ad hoc `role >= editor` comparisons spread through the code.
- **Ownership and attribute rules** such as "authors can edit their own drafts" are part of the model. Write them as named policy rules next to the matrix, not as inline conditions.
- Keep admin and platform-operator roles separate. A tenant admin manages one tenant. A platform operator acting across tenants uses a separate, audited path.

### Step 3: Centralize the Decision, Enforce at Every Layer

One decision function, many enforcement points:

```
decide(principal, action, resource, context) → allow | deny(reason)
```

| Layer | What it enforces | How |
|---|---|---|
| Route / middleware / guard | Coarse gate: authenticated, and holds the permission for this endpoint at all | Declare the required permission on the route using the codebase's guard, decorator, or middleware |
| Service / use case | The authoritative check on the specific resource, including ownership and state rules | Load the resource, call the decision function, raise a not-permitted domain error on deny |
| Repository / query | Restricts lists and searches to what the principal may see | Apply scope filters in the query rather than filtering after loading |
| UI | Hides or disables controls the user cannot use, for clarity only | Read effective permissions from the server; never treat this as enforcement |

- **Deny by default.** A route, action, or resource with no declared rule is denied. New endpoints must declare their permission to become reachable.
- **Least privilege.** New roles and default roles get the minimum set. Adding a permission to a role is a deliberate change reviewed like code.
- **Authorize the object, not only the route.** Having `invoice:read` does not grant reading an invoice in another organization or another user's private record. The service check loads the resource and decides on it.
- Denials return the codebase's forbidden response, or not-found when revealing existence is itself a leak. How errors map to status codes is covered by `api-and-interface-design`.

### Step 4: Prevent Privilege Escalation

Check each of these for any change that touches roles or membership:

- A user can only grant roles and permissions they themselves hold, and can never raise their own role.
- Role, owner, permission, and tenant fields are never accepted from a generic update payload. Use an allowlist of updatable fields, and a dedicated, authorized action for role changes.
- The last owner or admin cannot remove or demote themselves out of existence.
- Invitations and role changes are recorded in an audit log with actor, target, old role, and new role.
- Cached permissions or tokens that carry roles are refreshed or invalidated when roles change. Know how long a revoked permission stays usable.

### Step 5: Roles With Tenants

When the application is multi-tenant, role assignments are scoped to a tenant: a membership is `(user, tenant, role)`, not `(user, role)`. The decision function receives the tenant from the resolved tenant context and looks up the role for that tenant only. Resolving and validating the tenant itself is covered by `multi-tenant-architecture`.

### Step 6: Test the Matrix

Authorization tests are table-driven from the permission matrix:

```
for each role in [anonymous, viewer, editor, admin, owner]:
  for each protected action touched by the change:
    call the SERVER entry point as that role
    assert allowed exactly when the matrix says so
```

Also cover:

- **Object-level:** a user with the permission, acting on a resource they do not own or in another tenant, is refused.
- **Escalation:** an editor trying to set their own role to admin, or an admin granting owner, is refused.
- **Direct API calls:** the action is refused through the API even though the UI hides it.
- **Default deny:** an endpoint with no declared permission is not reachable.

Follow `test-driven-development`: write the denial test first when fixing an authorization bug.

## Decision Points

- **After Step 1: is there a central decision point?** Yes → extend it. No → implement the change using the nearest existing pattern, and propose consolidation as a separate task. Do not refactor authorization inside a feature change.
- **In Step 2: can the rule be expressed as role → permission?** Yes → add it to the matrix. It depends on the record (owner, status, amount) → write a named policy rule. It depends on relationships (shared with, member of a folder) → the model is moving toward relationship-based access. Raise that as a design decision with `documentation-and-adrs` before building.
- **In Step 3: would a denial reveal that the resource exists?** Yes → return not-found. No → return forbidden.
- **In Step 4: does the change let anyone assign roles or edit memberships?** Yes → every escalation check applies, and the change needs a reviewer who owns security.
- **Before merge: is any matrix cell for a touched action untested?** Yes → add the missing case.

## Framework and Language Adaptation

Match these to the mechanism found in Step 1. The table shows where each layer usually lives:

| Stack | Route-level gate | Resource-level decision |
|---|---|---|
| Express / Fastify | Middleware or route hook | Policy module called from the service; CASL is common |
| NestJS | Guards with metadata decorators | Policy or ability service injected into the service layer |
| Spring | `SecurityFilterChain` rules, `@PreAuthorize` | `PermissionEvaluator` or a policy bean called from the service |
| ASP.NET Core | `[Authorize(Policy = "...")]`, endpoint policies | `IAuthorizationService.AuthorizeAsync(user, resource, requirement)` with handlers |
| Django / DRF | `permission_required`, `permission_classes` | Object permissions (`has_object_permission`), a policy function |
| Rails | `before_action` filters | Pundit policies or CanCanCan abilities |
| Laravel | Route middleware (`can:`) | Gates and policies (`$this->authorize`) |
| Go | Middleware wrapping handlers | Explicit `authz.Can(ctx, principal, action, resource)` calls in the service |
| Frontend (any) | Route guards for UX | Permissions fetched from the server; never a local role table |

- External policy engines such as OPA, Cedar, Casbin, or OpenFGA/SpiceDB (for relationship-based access) are valid decision points. Use one only if the codebase already does, or if an ADR chose it.
- Framework role annotations (`hasRole('ADMIN')`, `[Authorize(Roles = ...)]`) are role-name checks. Prefer permission or policy names, in line with Step 2.

## Common Mistakes

| Mistake | What happens | Fix |
|---|---|---|
| Checking permission on the ID in the URL, then loading the record by a different ID from the body | The check passes for one record and the write hits another | Load the resource once, authorize it, then act on that same object |
| Authorizing the list endpoint but not the export, bulk, or search endpoint | Data forbidden in the UI is available in a CSV | Put every read path in the matrix, including exports and search |
| Caching "can this user do X" without the resource or tenant in the key | One user's decision is reused for another resource | Include principal, action, resource, and tenant in the cache key, or skip caching |
| Taking roles from a long-lived token as authoritative | A revoked admin keeps admin until the token expires | Keep token lifetimes short, or check roles server-side for sensitive actions |
| Giving new permissions to `admin` by default "so admins aren't blocked" | Permissions grow silently and least privilege erodes | Add each permission to roles deliberately, and review the matrix diff |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The button is hidden for non-admins" | Any client can call the API directly. The UI is not a security boundary. |
| "Just check `role === 'admin'`" | The next role breaks every such check. Check permissions, resolved in one place. |
| "The route middleware already checks the role" | Route checks don't know which record is being touched. Object-level checks belong in the service. |
| "Admins can edit any field on a user" | Including their own role, owner flags, and tenant? Role changes need their own guarded action. |
| "We'll add the permission check after the feature works" | An endpoint without a declared rule should be unreachable. Deny by default makes the check part of working. |
| "Testing every role is overkill" | The matrix is small and the test is a loop. Missing cells are where escalation bugs live. |

## Red Flags

- Authorization decided only in UI code, templates, or client-side route guards
- Role-name string comparisons scattered across handlers
- A new endpoint reachable without any declared permission
- Role, owner, or permission fields accepted in a generic update or create payload
- Lists filtered in memory after loading everything, instead of scoped in the query
- A second authorization mechanism added beside an existing one
- Tests that only exercise the happy path as an admin

## Verification

- [ ] The existing authorization mechanism was identified and extended, not duplicated
- [ ] The permission matrix for every action the change touches is written down, including ownership rules
- [ ] Each protected action is enforced on the server in the service layer, with route-level gating where the codebase uses it
- [ ] Anything without a declared rule is denied; show the default path
- [ ] Role changes and invitations cannot grant more than the actor holds, and are audited
- [ ] Table-driven tests cover every role against every touched action, plus object-level, escalation, and direct-API cases, and pass
- [ ] UI visibility reads permissions from the server and matches the matrix

### Exit Criteria

- **Done:** every box above is checked, the permission matrix diff is in the change description, and the table-driven tests pass through the server entry point.
- **Blocked:** the required rule is relationship-based or policy-engine territory the codebase does not support yet, or no one has decided which roles should hold a new permission. Report the open question with the proposed matrix. Do not guess who should have access.
