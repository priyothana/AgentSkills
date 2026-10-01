---
name: backend-application-architecture
description: Keeps backend code layered so each request flows through route, handler or controller, service or use case, and repository or data access, with dependencies pointing inward. Use when adding or restructuring a backend endpoint, controller, service, repository, middleware, or background handler in any server stack, including Node.js, TypeScript, Java, Go, Python, and .NET. Use when business logic or database calls are creeping into controllers, when deciding where a transaction that writes to several tables, a validation step, or error translation belongs, or when wiring dependency injection.
---

# Backend Application Architecture

## Overview

Most backend decay comes from putting code in the wrong layer: a controller that runs SQL, a repository that decides business rules, a service that builds HTTP responses. Each shortcut works once and then blocks testing, reuse from jobs or CLIs, and safe change. This skill gives each layer one job, keeps dependencies pointing toward the business logic, and makes the request and response path traceable in any stack.

The external contract of an endpoint (URL shape, status codes, error body, versioning) belongs to `api-and-interface-design`. This skill is about what happens behind that contract.

## When to Use

- Adding an endpoint, command, consumer, or scheduled job to an existing backend
- A controller or handler is growing business rules, queries, or calls to other services
- Deciding where validation, authorization, a transaction, or error mapping belongs
- Introducing or reorganizing services, repositories, or dependency injection
- Reviewing a backend change for layering problems

**When NOT to use:**

- Designing the public API contract. Use `api-and-interface-design`.
- A small script or single-file tool with no layers to protect. Adding layers there is overhead.
- Frontend code. Use the frontend skills.

## Process

### Step 1: Map the Existing Layers Before Adding Code

The codebase's conventions win over any ideal layout. Before writing, find one complete, recent example of a request path and record:

```
LAYER MAP (from <example endpoint>)
Route registration:     [file]      how routes bind to handlers
Middleware:             [files]     auth, tenant, logging, request ID, error handler
Handler/controller:     [file]      what it does and does not do
Service/use case:       [file]      how it receives dependencies
Repository/data access: [file]      ORM, query builder, raw SQL, client
DTOs/schemas:           [files]     request parsing, response shaping
Errors:                 [file]      domain error types and where they become responses
Transactions:           [file]      unit-of-work helper or where begin/commit live
DI/wiring:              [file]      container, constructor injection, module setup, or manual wiring
```

Stack-specific names for each layer are in [Framework and Language Adaptation](#framework-and-language-adaptation).

If the codebase has no service or repository layer and the change is small, follow the existing pattern and say so. Introduce a new layer only when the change needs it, and do it in its own refactor step before the feature, following `incremental-implementation`.

### Step 2: Put Each Responsibility in Its Layer

The request path:

```
Request
  → Middleware        cross-cutting: auth, tenant, request ID, logging, rate limits
  → Route             binds method + path to one handler
  → Handler           parse + validate input into a DTO, call ONE service method, map result to response
  → Service/use case  business rules, orchestration, authorization decisions, transaction boundary
  → Repository        persistence only: queries, mapping rows to domain objects
  → Database / external service
```

The response path runs back the same way: the repository returns domain objects or plain records, the service returns a result or raises a domain error, the handler maps that to the transport response, and the error middleware maps anything uncaught.

| Layer | Owns | Must not |
|---|---|---|
| Handler/controller | Transport parsing, input validation into a request DTO, calling one service method, response DTO and status code | Contain business rules, run queries, call other services directly, open transactions |
| Service/use case | Business rules, invariants, orchestration of repositories and gateways, domain-level authorization, transaction boundary | Read HTTP objects (request, headers, status codes), build transport responses, contain raw SQL |
| Repository/data access | Queries, persistence, mapping between storage rows and domain objects | Decide business rules, call other repositories' owners' rules, know about HTTP |
| External service gateway | One client per third-party system: auth, timeouts, retries, response validation, mapping to internal types | Leak vendor types into services |
| Domain model | Entities, value objects, rules that belong to the data itself | Depend on the framework, database driver, or transport |

A quick test for any line of code: if it would need to change when the transport changes (HTTP to queue to CLI), it belongs in the handler. If it would change when the storage changes, it belongs in the repository. Everything else is business logic and belongs in the service or domain.

This skill decides where authorization and tenant checks run. What they check is covered by `application-rbac-and-authorization` and `multi-tenant-architecture`.

### Step 3: Keep Dependencies Pointing Inward

- Handlers depend on services. Services depend on repository and gateway **interfaces or narrow types**, not on handlers. Repositories depend on the database client. Nothing inner imports anything outer.
- Services receive their collaborators through the codebase's injection mechanism: a container, constructor parameters, or explicit wiring at startup. They never construct database clients or HTTP clients themselves.
- Do not pass request objects, response objects, or framework contexts into services. Pass plain values or a request DTO, plus any propagated context the codebase uses (caller identity, tenant, cancellation, deadline).
- Repository abstraction is a tool, not a rule. Add an interface when there are two implementations, when services need a test double, or when the codebase already does it everywhere. Do not wrap an ORM in a pass-through repository that adds nothing.
- Circular imports between services mean a missing concept. Extract the shared rule into a third service or the domain model.

### Step 4: Validation, DTOs, and Mapping Boundaries

- **Handler:** parse and validate the shape of external input (types, required fields, formats, lengths) into a request DTO. Where validation sits in the public contract, and the error format it returns, is covered by `api-and-interface-design`.
- **Service:** enforce business invariants that need state or context: "an order can only be cancelled before it ships", "the email is not already taken". These produce domain errors, not transport errors.
- **Database:** constraints (not null, unique, foreign keys) are the last line of defense, not the first.
- Keep three shapes separate when they differ: the request DTO, the domain object, and the response DTO. Never return a storage row or ORM entity directly to the client; it leaks internal fields and couples the contract to the schema.

### Step 5: Errors Travel Up, Get Mapped Once

1. Repositories translate driver errors into a small set of meaningful ones: not found, conflict or duplicate, and everything else as an infrastructure error. They do not swallow errors.
2. Services raise or return **domain errors** named after business outcomes: `OrderAlreadyShipped`, `InsufficientBalance`, `NotPermitted`. Use the codebase's convention, whether exceptions, result types, or error values.
3. **One place** maps domain errors to transport responses: the error middleware, exception handler, or a single mapping function the handlers call. Handlers do not each invent status codes.
4. Unknown errors become a generic server error in the response, with details and a correlation ID in the log. See `observability-and-instrumentation` for the logging side.

### Step 6: Transactions and External Calls

- The **service** owns the transaction boundary, because it knows which writes form one business operation. Use the codebase's unit-of-work, transaction helper, or scoped session, and pass the transaction to repositories rather than letting each repository commit on its own.
- Keep transactions short. Never hold a database transaction open across a network call to another service or third party.
- For "write to our database and notify another system", commit first and then publish, or use the codebase's outbox or event mechanism if it has one. Do not rely on a rollback to undo a remote side effect.
- External calls go through a gateway with explicit timeouts. Their responses are untrusted and validated before use, as `api-and-interface-design` describes.

### Step 7: Test Each Layer at Its Own Seam

- **Service tests** carry the business rules. Use test doubles or an in-memory implementation for repositories and gateways; no HTTP involved.
- **Repository tests** run against a real database or the codebase's test database to prove the queries.
- **Handler or endpoint tests** cover parsing, validation failures, error mapping to status codes, and one happy path through the real wiring.

Follow `test-driven-development` for writing these tests.

## Decision Points

- **After Step 1: does the codebase have the layer this change needs?** Yes → follow it. No, and the change is small → match the existing pattern and say so. No, and the change adds real business rules → introduce the layer in its own refactor commit first.
- **In Step 2: which layer owns this line?** Apply the transport and storage test from Step 2. If a line fails both tests, it belongs in the service or domain.
- **In Step 3: do you need an interface here?** Only with a second implementation, a test double the service tests need, or a codebase convention. Otherwise use the concrete type.
- **In Step 6: does the operation write locally and also call a remote system?** Yes → commit, then call, or use the outbox. Never do both inside one transaction.
- **Before merge: can the new business rule be tested without HTTP?** No → it is in the wrong layer. Move it.

## Framework and Language Adaptation

Stack names differ, the roles do not:

| Role | Node.js / TypeScript | Java / Kotlin | Go | Python | .NET |
|---|---|---|---|---|---|
| Route + handler | router + route handler, controller class | `@RestController` method | `http.Handler`, router handler func | view, router function, resource | controller action, minimal API endpoint |
| Middleware | middleware, interceptor, plugin hook | filter, interceptor | middleware wrapper | middleware, dependency | middleware, filter |
| Service | service class or module functions | `@Service` | package-level service struct | service module or class | service class |
| Repository | repository, DAO, ORM model access | repository, DAO | store/repository struct | repository, DAO, ORM session access | repository, `DbContext` access |
| Transaction | ORM transaction callback, unit-of-work | `@Transactional` on the service method | `db.BeginTx` passed down as a `Tx` or a querier interface | `session.begin()`, `transaction.atomic()` | `DbContext` unit of work, `BeginTransaction` |
| DI | container or explicit construction | container | explicit constructor wiring | framework dependencies or explicit wiring | built-in container |

- **Active-record frameworks** (Rails, Laravel Eloquent, Django models): the model is also the data-access layer. Put business rules that span models in a service or command object, but don't wrap the ORM in a pass-through repository the codebase doesn't use.
- **Annotation-driven transactions** (Spring `@Transactional`) do not apply to self-invocation through the proxy by default. Put the transactional method on the service that callers invoke.
- **Go** has no container by convention. Wire dependencies in `main` or a composition function, and pass `context.Context` as the first parameter through every layer.
- **Serverless and single-function handlers** keep the same layers inside the function. The handler is the only part that knows about the event shape.

## Common Mistakes

| Mistake | What happens | Fix |
|---|---|---|
| Returning an ORM entity with lazy relations from the service | Serialization triggers extra queries, or fails after the session closes | Map to a response DTO inside the transaction or query scope |
| Calling a repository from another service's repository | Data-access rules get duplicated and circular imports appear | Orchestrate from the service that owns the use case |
| Catching every exception in the handler and returning 500 | Domain errors like not-found or conflict become server errors | Let domain errors reach the single error mapper |
| Opening the transaction in middleware for every request | Read requests hold connections, and remote calls end up inside transactions | Open transactions in the service for write use cases only |
| Reusing the request DTO as the persistence model | Adding an API field silently adds a column write, and the reverse | Keep request DTO, domain object, and storage row separate once they differ |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It's one query, a repository is overkill" | Fine in a codebase without repositories. In one that has them, the query in the controller is the one nobody finds when the schema changes. |
| "The controller already has the request, so it's easiest to put the logic there" | Then the job, the CLI, and the next endpoint can't reuse it, and it can only be tested through HTTP. |
| "I'll pass the request object to the service, it needs a few fields" | The service now depends on the transport. Extract the fields into a DTO or parameters. |
| "Each handler can pick its own status codes" | Clients then see different codes for the same failure. Map errors in one place. |
| "Wrap the whole thing in one transaction including the payment call" | A rollback can't undo a charge. Keep remote calls outside the transaction. |
| "Let's add an interface for every class" | Abstractions without a second implementation or a test need are indirection. Add them when they pay. |

## Red Flags

- Handlers or controllers containing SQL, ORM queries, or database clients
- Handlers calling more than one service method or orchestrating several repositories
- Services importing HTTP request/response types, reading headers, or returning status codes
- Repositories containing `if` statements about business rules
- ORM entities or storage rows returned directly as API responses
- Status codes chosen in several places for the same domain error
- A transaction open while calling an external HTTP service
- Services constructing their own database or HTTP clients
- Imports from an inner layer to an outer one, or circular service dependencies

## Verification

- [ ] The layer map for the existing codebase was recorded before changes, and the change follows it
- [ ] The new handler validates input, calls one service method, and maps the result; it contains no queries or business rules
- [ ] Business rules live in the service or domain, and are covered by service-level tests without HTTP
- [ ] Data access goes through the repository or data-access layer the codebase uses
- [ ] Domain errors are mapped to responses in one place; show the mapping for any new error
- [ ] The transaction boundary is in the service and contains no remote calls
- [ ] No inner layer imports an outer layer; show the import list of the changed service
- [ ] The full test suite passes with the repository's own test command

### Exit Criteria

- **Done:** every box above is checked, and the layer map from Step 1 is in the change description, so reviewers can check placement against it.
- **Blocked:** the change needs a new layer or a DI change that affects code outside the feature. Stop after the layer map, propose the refactor as its own step following `incremental-implementation`, and continue once it lands.
