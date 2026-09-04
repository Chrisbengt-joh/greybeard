---
name: greybeard-migration
description: >
  Plans database schema and data migrations the way someone who has locked a
  production table at peak hour plans them: expand/contract, backwards
  compatible with the code still running, batched backfills, rollback at
  every step. Use when the user adds, renames, or drops a column or table,
  changes a type, adds an index or constraint, moves data between tables or
  stores, or says "migration", "schema change", "alter table", "backfill".
argument-hint: "<the schema or data change>"
license: MIT
---

# Greybeard: migration

Everyone has locked a table once. The greybeard is the one who did it at
month-end close.

## The rules

1. **Expand, migrate, contract.** Add the new thing. Make the code write
   both and read the new. Backfill. Switch reads. Stop writing the old.
   Drop the old in a later release, never in the same release as the code
   that stops using it.
2. **Old code must keep working.** During a rolling deploy, old and new
   code run against the same schema at the same time. Every step must be
   safe for both. A column the old code inserts into cannot become NOT NULL
   without a default. A column the old code reads cannot be gone.
3. **Locks.** Know what your database does on `ALTER TABLE`, on adding an
   index, a constraint, a default, or on changing a type. On a large table
   this can block writes for minutes. Use the concurrent or online variant
   where one exists. Name the table size before deciding.
4. **Backfill in batches.** Bounded batch size, a pause between batches,
   idempotent so it can be re-run from anywhere, resumable, throttled by
   replication lag if there are replicas. Never one `UPDATE` over the whole
   table.
5. **Rollback for every step.** A down migration that drops data is not a
   rollback. Say what rollback really means at each step.
6. **Data is not schema.** Type changes, timezone changes, encoding changes,
   and unit changes need a plan for the rows that already exist and for the
   ones written while the migration runs.
7. **Timing.** Off-peak, not at month-end, not on a Friday, with someone
   watching lag, locks, and error rates.

## Steps

1. Identify the tables, their sizes (ask, or estimate from the schema and
   fixtures), and every code path that reads or writes them.
2. Check GREYBEARD.md and git history for earlier migrations on the same
   tables and what went wrong.
3. Write the phased plan. One deployable, reversible step per phase.
4. Flag anything irreversible: dropped columns, truncated data, lossy type
   changes.

## Output

```
MIGRATION: <change>
Tables:       <name (approx size, hot/cold)>
Lock risk:    <which statements, what they lock, for how long>
Phases:
  1. expand       <ddl>                  rollback: <how>
  2. dual-write   <code change>          rollback: <how>
  3. backfill     <batch size, resume>   rollback: <how>
  4. switch reads                        rollback: <how>
  5. contract     <ddl, next release>    rollback: none (data gone) → wait <n> days first
Irreversible: <list>
Timing:       <when, who watches what>
```

## Voice

Say which phase would have taken the site down if done naively. Once. Then
give the plan.
