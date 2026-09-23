---
name: greybeard-handover
description: >
  Prepares work to survive the end of a session: what must be written to disk
  before compaction, which of code comments, commits, tickets, HANDOVER.md,
  GREYBEARD.md, the knowledge base and the README each fact belongs in, and a
  handover note that includes the dead ends so the next agent does not repeat
  them. Use when context is filling up, before /compact, at the end of a
  session, when pausing mid-ticket, when handing work to another agent or
  person, and when the user says "write a handover", "summarise where we are",
  "I'll pick this up tomorrow". Use at the start of a resumed session too: read
  the files before trusting a summary.
argument-hint: "[ticket or topic; defaults to the current session]"
license: MIT
---

# Greybeard: handover

Context is not storage. Anything that must survive is on disk *before*
compaction. After compaction it is already gone, and a summary of a summary is
how a project loses the reason for its own decisions.

## Where a fact belongs

Exactly one home each. A fact in two homes disagrees with itself within a
month.

| Fact | Home |
|------|------|
| Why this line looks odd | code comment, `greybeard:` prefix |
| Why this change was made | commit message body |
| State of this piece of work | the ticket |
| What I tried, and where I am right now | `HANDOVER.md` |
| Why this code must not be changed | `GREYBEARD.md` |
| How we do this kind of thing here | `.greybeard/kb/` |
| How to run, deploy, or use the system | `README`, `docs/` |

Moving a fact up the table means deleting it from where it was. Link, never
copy.

## The handover note

`HANDOVER.md` at the repository root, gitignored, overwritten every time. The
last one is the only one anybody wants.

```markdown
# Handover — 2026-03-04 16:40 — PROJ-412 idempotency key

**Goal:** duplicate submits stop producing duplicate charges.
**State:** branch `PROJ-412-idempotency`, last commit 3c1a9f2, tree clean,
suite green except `test_replay` (expected — AC 2 not built yet).

## Done and verified
- Key derived from order id + amount — tests/payments/test_idem.py, passing.

## In flight
- Provider 409 handling. `src/payments/client.py:88`, the `except` is written,
  the mapping to our ConflictError is not. Next edit is that mapping.

## Decisions this session
- Key from order id + amount, not a UUID. Because a retry from a different
  process must produce the same key. Rejected UUID-per-attempt for that reason.

## Dead ends
- Timestamp in the key. Two retries inside the same second collided. Do not
  retry without a monotonic source that survives a process restart.

## Danger zone
- `src/payments/client.py` has a GREYBEARD.md entry (incident #412). The 150 ms
  sleep is untouched and must stay.

## Next action
`pytest tests/payments/test_idem.py::test_conflict` — it is the failing test
for the mapping that is missing.
```

The dead ends section is what pays for the file. Without it the next agent
spends its first hour repeating your last hour, reaches the same wall, and
writes it down for nobody.

**Next action** is a command or an edit. Not "continue with the feature".

## Before compaction, in this order

1. Write anything durable to its real home. Compaction time is not the time to
   discover a fence — it is the time to save the ones you already found.
2. Commit or stash. Never carry a half-edited working tree across a compaction
   boundary; you will not remember which half.
3. Write `HANDOVER.md`.
4. If the session produced decisions someone will later need to find,
   `/greybeard-transcript`.
5. Then compact.

## On resume

Read `HANDOVER.md`, then `git log --oneline -10` and `git status`, then the
ticket. In that order, before answering anything. Trust the files over your
recollection of the files — the files did not go through a summariser.

If `HANDOVER.md` is older than the last commit, it is stale: trust git, and say
so in one line.

## Voice

Write for someone who has your job and none of your memory. That is usually
you, on Monday.
