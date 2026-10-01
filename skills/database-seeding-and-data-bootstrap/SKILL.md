---
name: database-seeding-and-data-bootstrap
description: Builds seed data, fixtures, and first-run bootstrap that are idempotent, correctly ordered, and safe to re-run, with explicit guards against running destructively in production. Use when writing or changing seed scripts, test fixtures, factories, reference or lookup data, default plans or settings, the initial admin account, or per-tenant starter data. Use when a fresh environment cannot be set up reproducibly, when seeds fail on foreign keys or duplicate rows, or when deciding whether data belongs in a migration or a seed.
---

# Database Seeding and Data Bootstrap

## Overview

Seed scripts are code that writes to databases, often with truncate or delete steps, and they are routinely run against the wrong environment. A good seed setup gives any developer or CI job the same working data from one command, can be run twice without duplicating or breaking anything, and refuses to wipe data it does not own. This skill separates the kinds of initial data, orders them by dependency, makes them idempotent, and puts explicit safeguards on anything destructive.

**Never assume a seed script is safe for production.** Treat every seed as dangerous until it proves otherwise.

## When to Use

- Adding or changing seed scripts, fixtures, factories, or sample data
- Adding reference data (countries, currencies, plans, permission lists) or default configuration
- Creating the first admin user or system account for a new environment
- Adding starter data for each new tenant or organization
- Seeds fail on reruns, foreign keys, or ordering, or environments drift apart

**When NOT to use:**

- Changing the database schema. That is a migration; for rollout patterns use `deprecation-and-migration`.
- One-off data fixes in an existing environment. Use `database-query-and-script-management`.

## Process

### Step 1: Classify Every Piece of Initial Data

Each dataset has one category, and the category decides where it lives and where it may run.

| Category | Examples | Lives in | Runs in |
|---|---|---|---|
| **Schema-required reference data** | Enum-like lookup rows the code depends on, permission names, status codes | A migration, or an idempotent reference seed run by deploy | Every environment, including production |
| **Initial configuration** | Default plans, feature settings, system accounts | Idempotent bootstrap step, values from config | Every environment, once per environment |
| **Initial admin** | First administrator | Bootstrap command with credentials from environment or a one-time invite | Every environment, only when no admin exists |
| **Per-tenant defaults** | Starter roles, default settings for a new organization | The tenant provisioning code, not a seed script | Whenever a tenant is created |
| **Development seed** | Realistic sample customers, orders, users | Dev seed script or factories | Local and shared dev only |
| **Test fixtures** | Minimal data for one test or suite | The test itself, factories, or fixture files | Test runs only |
| **Demo data** | Curated showcase data | Separate demo seed | Demo environments only |

The migration versus seed rule: data the code cannot run without, and that must exist identically everywhere, goes with the schema in a migration or a reference seed that deploy runs. Everything else is a seed and must never be required by production code paths.

For multi-tenant applications, per-tenant defaults are created by provisioning so new tenants get them too; a seed that loops over existing tenants misses every future one. Tenant rules are in `multi-tenant-architecture`.

### Step 2: Guard the Environment

Every seed that writes more than reference data starts with a guard that fails closed:

```
ALLOWED = the environments this seed is written for, e.g. [development, test]
env = the application's environment setting
if env is missing or env not in ALLOWED: stop with an error naming env and the target database
if the connection target looks like production (host, database name, account): stop
print the target database and environment before writing anything
```

- Destructive steps (truncate, delete, drop, reset) additionally require an explicit confirmation: a flag such as `--reset` or a confirmation variable, never on by default, and never in production. Name the tables they touch.
- Production-capable steps (reference data, initial configuration, initial admin) never delete. They only insert what is missing or update rows they own.
- Credentials for the initial admin come from environment variables or a one-time invite link, never from a committed password. Force a password change or use an invite when a password is unavoidable.

### Step 3: Order by Dependency

1. List the tables the seed writes and their foreign keys.
2. Seed parents before children: reference data, then tenants or organizations, then users and memberships, then business records.
3. Resets go in the reverse order, or use the database's scoped cascading truncate within the allowed environment only.
4. Look up generated IDs by a natural key (slug, code, email) instead of assuming ID values. Hard-coded IDs break when sequences differ.
5. Keep each seed step in its own named unit (file or function) run by one entry point, so order is visible in one place.

### Step 4: Make Every Step Idempotent

Running the seed twice must leave the database in the same state as running it once.

| Technique | Use for |
|---|---|
| Upsert on a natural or unique key (insert-or-update, `ON CONFLICT`, merge) | Reference data and configuration the seed owns |
| Insert only if missing (check by natural key) | Initial admin, defaults that users may later edit |
| Deterministic generation (fixed random seed, fixed clock) | Dev and test data that must be reproducible |
| Reset then insert, inside the allowed environment only | Dev and test databases the seed fully owns |

- Every seeded row has a stable natural key so reruns can find it.
- Do not overwrite values a user or admin may have changed in a real environment. Insert-if-missing is the default for anything editable.
- Wrap each seed step in a transaction so a failure does not leave half a dataset.

### Step 5: Keep Test Data Close to the Test

- Each test creates the data it needs through factories or builders with sensible defaults, overriding only what the test is about.
- Suites do not depend on the development seed or on data left by other tests. Reset between tests with the codebase's mechanism: transactions rolled back per test, truncation of test tables, or a fresh test database.
- Fixture files stay small. A fixture nobody can read is a fixture nobody can maintain.

### Step 6: One Command, Validated

- There is one documented command that brings a fresh environment to a working state: migrate, then reference data and configuration, then the environment's seed.
- After seeding, validate: expected row counts per table, foreign keys resolve, required reference rows exist, the initial admin can sign in, and the app starts.
- Run the whole seed twice in CI or locally and confirm the second run changes nothing.

## Decision Points

- **In Step 1: does production code fail without this data?** Yes → reference data. Put it in a migration or a deploy-run reference seed. No → a seed, which production must never depend on.
- **In Step 1: is the data per tenant?** Yes → it belongs in tenant provisioning, and the seed only calls provisioning for its sample tenants.
- **In Step 2: does the step delete, truncate, or reset?** Yes → it needs an environment allowlist and an explicit flag. If it must also run in production, redesign it as insert-if-missing.
- **In Step 4: may a user edit this row after seeding?** Yes → insert-if-missing. No, and the seed owns it → upsert.
- **In Step 6: did the second run change anything?** Yes → the step is not idempotent. Fix it before merging.

## Framework and Language Adaptation

Use the seeding entry point the framework provides, and apply the rules above inside it:

| Stack | Reference data | Dev seed entry point | Idempotent write | Test data |
|---|---|---|---|---|
| Rails | Data in a migration, or `db/seeds.rb` run by deploy | `bin/rails db:seed` | `find_or_create_by!`, `upsert_all` | factory_bot, fixtures |
| Django | Data migration with `RunPython` | Management command, `loaddata` | `get_or_create`, `update_or_create` | Factory Boy, `TestCase` rollback |
| Laravel | Migration or a seeder class run on deploy | `php artisan db:seed` | `firstOrCreate`, `updateOrCreate`, `upsert` | Model factories, `RefreshDatabase` |
| Prisma | Migration SQL | `prisma db seed` | `upsert` | Per-test builders |
| TypeORM / Sequelize / Knex | Migration | Seed files or a seed runner | `orIgnore`/`upsert`, `findOrCreate`, `onConflict().merge()` | Factories, transaction per test |
| EF Core | `HasData` model seeding (goes into migrations) | `UseSeeding` / `UseAsyncSeeding` or a startup command | Check-then-insert by natural key | Test database or transaction per test |
| Spring / JVM | Flyway or Liquibase migration | Flyway repeatable (`R__`) or Liquibase changesets with a `context` | `MERGE` / upsert in the changeset | Testcontainers, `@Sql`, `@Transactional` tests |
| Go / plain SQL | Migration file | A `cmd/seed` binary | `INSERT ... ON CONFLICT` or `MERGE` | Builders, transaction per test |

- Framework test helpers that truncate or recreate the database (`RefreshDatabase`, `TRUNCATE` hooks, `db:reset`) are destructive steps. The environment guard in Step 2 applies to them.
- Model-level seeding in migrations (`HasData`, data migrations) diffs against earlier values. Changing a seeded value creates a new migration. Keep that path for data that really is reference data.

## Common Mistakes

| Mistake | What happens | Fix |
|---|---|---|
| Faker data with no fixed seed in shared dev or CI | Every run gets different data, so failures can't be reproduced | Fix the random seed and the clock for generated data |
| Inserting explicit IDs into a sequence-backed column (PostgreSQL `serial`/identity, Oracle sequences) | The sequence is not advanced, and the next app insert fails on a duplicate key | Let the database assign IDs, or reset the sequence after the insert |
| Calling application services with side effects from the seed | Seeding sends real emails, webhooks, or billing calls | Disable outbound integrations in the seed environment, or write through a side-effect-free path |
| Seeding users with a real-looking domain | Seeded emails reach real inboxes | Use reserved domains such as `example.com` |
| One transaction around the whole seed on a large dataset | Long locks, and a late failure throws away everything | One transaction per named seed step |
| Reference seed that updates rows by display name | Renaming a label creates a duplicate row | Upsert on a stable code or key, never on a label |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The seed is only for local, nobody will run it in prod" | Scripts get run with the wrong environment variables. A guard costs three lines. |
| "Truncate first, it's simpler than upserts" | Simpler until it runs against shared or production data. Reset only behind an environment guard and a flag. |
| "Hard-code admin / admin123 for convenience" | That password ships to every environment the seed reaches. Use environment credentials or an invite. |
| "Tests can use the dev seed data" | Then tests break when someone edits the seed, and they depend on each other. Tests create their own data. |
| "It fails on rerun, just reset the database" | A seed that can't rerun can't be trusted on an existing environment. Make it idempotent. |
| "Put plans and permissions in the dev seed" | If production code needs them, they are reference data and must exist everywhere. |

## Red Flags

- `TRUNCATE`, `DELETE`, `DROP`, or a reset call with no environment guard
- A seed that decides the environment from a default when the variable is missing
- Committed passwords, API keys, or tokens in seed files
- Hard-coded numeric IDs for foreign keys
- Plain inserts of reference data that duplicate or fail on the second run
- Production code that only works if the development seed was run
- Tests reading data they did not create
- Per-tenant defaults created by a seed instead of by tenant provisioning

## Verification

- [ ] Every dataset is classified, and data production code needs is in a migration or a reference seed that runs everywhere
- [ ] Each writing seed has a fail-closed environment guard; show it refusing an unlisted environment
- [ ] Destructive steps require an explicit flag and are impossible in production
- [ ] Seeds run in dependency order and look up foreign keys by natural key
- [ ] Running the seed twice produces no errors and no duplicate rows; show both runs
- [ ] No secrets are committed; the initial admin's credentials come from the environment or an invite
- [ ] Tests create their own data and pass on a fresh test database

### Exit Criteria

- **Done:** every box above is checked, and the one-command setup works from an empty database, with the output of both the first run and the rerun shown.
- **Blocked:** a dataset's category is unclear (is it reference data or sample data?), or a destructive step is requested for an environment outside the allowlist. Report the question. Do not widen the allowlist to make the seed run.
