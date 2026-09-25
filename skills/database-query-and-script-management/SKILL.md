---
name: database-query-and-script-management
description: Applies operational SQL data changes safely: preview the affected rows, back them up, apply inside a transaction with a row-count check, default to dry-run, plan the rollback, and keep an audit trail. Use when writing a one-off data correction, cleanup, or backfill, a bulk UPDATE or DELETE on a live or production table, or a repeatable maintenance script, including backfills run in batches to avoid long table locks. Use when removing duplicate records, reviewing a data script before ops runs it, or naming, versioning, and documenting SQL scripts.
---

# Database Query and Script Management

## Overview

The most damaging database incidents are rarely schema changes. They are an `UPDATE` with a missing `WHERE`, a `DELETE` that matched far more rows than expected, or a fix run twice. This skill treats every data-changing script as a small release: scope it, preview it, run it inside a transaction with a checked row count, keep a way back, and leave a record of what ran. Read-only queries get lighter rules, but they still must not hurt the database they read.

**Never run an ambiguous destructive query.** If the exact set of affected rows cannot be stated and previewed, stop.

## When to Use

- Writing a query to investigate data in a shared or production database
- Fixing, correcting, backfilling, merging, or deleting records outside the application
- Writing a script that will run more than once (maintenance, cleanup, re-sync)
- Reviewing someone else's data script before it runs
- Organizing, naming, and documenting a repository's scripts folder

**When NOT to use:**

- Schema changes. Use the codebase's migration tool, and `deprecation-and-migration` for rollout patterns.
- Seed data and first-run bootstrap. Use `database-seeding-and-data-bootstrap`.
- Slow application queries. Use `performance-optimization`.

## Process

### Step 1: Classify the Script

| Type | Rules |
|---|---|
| **Read-only query** | Runs against a replica or read-only connection when one exists. Bounded with a limit or a narrow time range. No locks held longer than needed. |
| **One-time data change** | Full workflow below. Stored in the repository with a ticket reference, even though it runs once. |
| **Repeatable script** | Full workflow below, plus idempotency: running it again is harmless and reports "nothing to do". |
| **Migration-adjacent backfill** | Full workflow below, run by or alongside the migration tool. Where it sits in an expand/contract rollout is covered by `deprecation-and-migration`. |

### Step 2: Scope the Change Before Writing It

Write the scope as plain statements, answered from the data, before any `UPDATE` or `DELETE`:

```
SCOPE
Goal:               [what should be true afterwards]
Target environment: [database and environment name]
Tables touched:     [list]
Row selection:      [exact predicate, in words and SQL]
Expected rows:      [count from the preview query]
Tenant scope:       [tenant IDs, or "global" with justification]
Related rows:       [child rows, caches, search indexes, events affected]
Reversal:           [how to undo]
```

- **Multi-tenant applications:** every data-changing statement on tenant-owned tables includes the tenant predicate, and the preview shows the tenant IDs of the affected rows. A result containing tenants outside the intended scope stops the run. Tenant rules are in `multi-tenant-architecture`.
- If the predicate uses anything other than stable keys, such as names, text matches, or timestamps, list the matched rows and confirm them before continuing.

### Step 3: Write the Script in Preview, Change, Verify Form

Every data-changing script has the same shape, whatever the database or language:

```
-- 1. PREVIEW: the exact rows that will change
SELECT <key columns>, <columns being changed>, <tenant column>
FROM <table> WHERE <predicate>;
SELECT COUNT(*) FROM <table> WHERE <predicate>;       -- compare with Expected rows

-- 2. BACKUP: keep what you are about to change
-- copy the affected rows (all columns) to a backup table or export file with the ticket ID in its name

-- 3. CHANGE, in a transaction, with a guarded row count
BEGIN;
UPDATE / DELETE ... WHERE <same predicate>;          -- the exact predicate from the preview
-- check affected row count == expected; if not, ROLLBACK and stop
-- 4. VERIFY inside the transaction: re-run the preview, check invariants
COMMIT;   -- only after the checks pass
```

- **Same predicate everywhere.** Preview, backup, and change use one predicate, written once (a CTE, temp table of IDs, or variable) so they cannot drift apart.
- **Select IDs first for risky changes.** Materialize the target IDs into a temporary table, review them, then change rows by ID only.
- **Row-count guard.** The script compares the affected count with the expected count and aborts on any mismatch. An expected-count parameter is required, not optional.
- **Dry-run by default.** Scripts in a general-purpose language run in dry-run mode unless given an explicit flag such as `--apply`. Dry-run prints the preview and the counts and rolls back.
- **Batches for large changes.** Change large tables in bounded batches with a pause between them, so locks and replication lag stay small. Each batch is its own transaction and the script can resume.
- **Parameterize every value.** Script arguments and values read from files are passed as bound parameters, never concatenated into SQL. The injection rules in `security-and-hardening` apply to scripts too.

### Step 4: Idempotency and Rollback

- Repeatable scripts select only rows that still need the change (`WHERE status = 'old'`), so a second run changes nothing.
- One-time scripts record that they ran, in a script log table or the ticket, and refuse or warn on a second run if a rerun would be harmful.
- The rollback plan is written before the change runs: restore from the backup table, a reversing script, or a point-in-time restore window. "Restore the whole database" is a last resort, not a plan.
- Deletes are the hardest to reverse. Prefer soft delete or archive-then-delete when the data model allows it.

### Step 5: Environment Safeguards and Performance

- The script prints the target host, database, and environment before doing anything, and requires that name as an argument or confirmation for production.
- Run against staging or a recent copy first, and compare counts with production previews.
- Check the predicate uses an index before running it on a large table. Read the query plan; a full scan inside a write transaction holds locks on a busy table. Index and plan analysis is covered by `performance-optimization`.
- Set a statement timeout and a lock timeout for the session so a mistake fails fast instead of blocking the application.
- Production changes need a second person's review of the script and the preview output, following the codebase's change process.

### Step 6: Name, Version, and Document

- Store scripts in the repository's scripts folder with a name that sorts and explains: `YYYY-MM-DD_<ticket>_<short-description>.<ext>`. Repeatable scripts get a stable descriptive name without a date.
- Each script starts with a header:

```
-- Purpose:     <one sentence>
-- Ticket:      <link or ID>
-- Author:      <name>        Reviewer: <name>
-- Type:        read-only | one-time | repeatable | backfill
-- Tenant scope: <tenant IDs or global>
-- Expected rows: <count from preview, and when it was measured>
-- Run:         <exact command, including dry-run and apply flags>
-- Rollback:    <how to undo>
```

- After the run, record the result where the team tracks changes: who ran it, when, where, affected counts, and any deviation. That record is the audit trail.
- Changes to a script after review are reviewed again. The script that runs is the script that was reviewed.

## Decision Points

- **After Step 1: is this really a data script?** It changes table structure → stop and use the migration tool. It creates initial data → use `database-seeding-and-data-bootstrap`.
- **In Step 2: can the affected rows be stated exactly and previewed?** No → **stop**. Do not write the `UPDATE` or `DELETE` until the predicate is exact.
- **In Step 2: does the preview count differ from what the ticket or requester expects?** Yes → stop and resolve the difference with the requester. Never adjust the expected count to match the preview.
- **In Step 3: how many rows?** Small enough to finish well within the lock timeout → one transaction. Otherwise → batches, each its own transaction, resumable.
- **In Step 5: is the target production?** Yes → staging run first, a second reviewer, and an explicit environment confirmation. Missing any of these → do not run.
- **During the run: does the row-count guard fire?** Roll back, stop, and investigate. Do not rerun with a looser guard.

## Framework and Language Adaptation

The workflow is the same in every database. The syntax for its guards differs:

| Need | PostgreSQL | MySQL / MariaDB | SQL Server | Oracle | SQLite |
|---|---|---|---|---|---|
| Affected row count | `GET DIAGNOSTICS n = ROW_COUNT` in a `DO` block, or count the `RETURNING` rows | `ROW_COUNT()` | `@@ROWCOUNT` | `SQL%ROWCOUNT` | `changes()` |
| Back up rows | `CREATE TABLE bak AS SELECT ...` | `CREATE TABLE bak AS SELECT ...` | `SELECT ... INTO bak FROM ...` | `CREATE TABLE bak AS SELECT ...` | `CREATE TABLE bak AS SELECT ...` |
| Upsert | `INSERT ... ON CONFLICT` | `INSERT ... ON DUPLICATE KEY UPDATE` | `MERGE` | `MERGE` | `INSERT ... ON CONFLICT` |
| Lock timeout | `SET LOCAL lock_timeout` | `SET SESSION innodb_lock_wait_timeout` | `SET LOCK_TIMEOUT` | `FOR UPDATE WAIT n`, DDL `ddl_lock_timeout` | `busy_timeout` |
| Statement timeout | `SET LOCAL statement_timeout` | `max_execution_time` (read-only `SELECT` only) | client command timeout | Resource Manager or client timeout | client-side |
| Stop on first error | `psql -v ON_ERROR_STOP=1` | `mysql` stops by default unless `--force` | `SET XACT_ABORT ON` | `WHENEVER SQLERROR EXIT ROLLBACK` | `.bail on` |

- **MySQL and Oracle commit implicitly on DDL.** A `CREATE TABLE` backup inside `BEGIN ... ROLLBACK` has already committed the transaction. Create the backup before `BEGIN`.
- **Scripts in a general-purpose language** (Python, Node.js, Go, Ruby, a framework's management or console command) use the driver's transaction API and bound parameters. Read the affected count from the driver's result (`rowcount`, `rowCount`, `RowsAffected()`) and fail on mismatch.
- **ORM bulk operations** (`update_all`, `QuerySet.update()`, `updateMany`, `ExecuteUpdate`) skip model callbacks and validations. Decide whether that is what you want, and still preview the same query set first.

## Common Mistakes

| Mistake | What happens | Fix |
|---|---|---|
| `EXPLAIN ANALYZE` on an `UPDATE` or `DELETE` in PostgreSQL | It executes the statement | Use plain `EXPLAIN`, or wrap it in `BEGIN ... ROLLBACK` |
| `WHERE status <> 'archived'` when the column allows `NULL` | Rows with `NULL` are silently skipped | Handle `NULL` explicitly: `OR status IS NULL` |
| `NOT IN (subquery)` where the subquery can return `NULL` | Matches no rows at all | Use `NOT EXISTS` |
| Batching with `LIMIT ... OFFSET` while changing the rows being paged | Rows are skipped as the result set shifts | Batch by key ranges (keyset): `WHERE id > :last_id ORDER BY id LIMIT n` |
| `UPDATE ... FROM` or a multi-table `UPDATE` with a join that fans out | Rows are updated more than once, or with an arbitrary matching value | Preview the join and check that it returns one row per target key |
| Comparing timestamps without a time zone | The cutoff moves by hours depending on the session time zone | Use explicit UTC literals or `timestamptz` |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It's a quick one-line UPDATE" | One-line updates without a WHERE clause are the classic data-loss incident. Preview first. |
| "I checked the count in my head" | Put the expected count in the script and let it abort on mismatch. |
| "We have backups" | A full restore loses every good write since the backup. Back up the rows you change. |
| "Transactions are overkill for a script" | Without one, a failure halfway leaves the data in a state nobody designed. |
| "It only runs once, no need to commit it to the repo" | Then nobody can review it, rerun it, or explain it later. |
| "The tenant filter isn't needed, IDs are unique" | IDs typed or pasted wrong are exactly what the tenant predicate catches. |

## Red Flags

- `UPDATE` or `DELETE` without a `WHERE` clause, or with a predicate different from the preview's
- A data change run outside a transaction, or committed without checking the affected count
- String concatenation or interpolation building SQL from script arguments
- A script that applies changes by default with no dry-run
- No backup of changed rows and no written rollback
- Data changes on tenant-owned tables with no tenant predicate
- A full table scan inside a write transaction on a large table
- Scripts run from a personal machine with no record of what ran

## Verification

- [ ] The script is classified, and the scope statement is written with the expected row count from a preview
- [ ] Preview, backup, and change share one predicate; the change runs in a transaction with a row-count guard
- [ ] Dry-run is the default and was run; show its output
- [ ] Values are parameterized, and tenant scope is enforced where the application is multi-tenant
- [ ] A rollback path exists and was written before the change
- [ ] The script has a header, a sortable name, and lives in the repository
- [ ] Run results (who, when, where, counts) are recorded

### Exit Criteria

- **Done (prepared):** the script, its dry-run output, and the scope statement are ready for review. An agent without authorization to run it against production stops here.
- **Done (applied):** the reviewed script ran, the post-change verification passed, and the run record exists.
- **Stopped:** the preview was ambiguous, the counts did not match, or a guard fired. Report what was observed and leave the data unchanged.
