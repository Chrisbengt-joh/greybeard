---
name: greybeard-ticket
description: >
  Writes tickets that a stranger can implement and a reviewer can verify: one
  reversible change, observable acceptance criteria, explicit non-scope, named
  risk and rollback, and the git convention that ties branch, commits and pull
  request back to the ticket. Also splits tickets that are too big and rejects
  ones with no testable goal. Use when the user says "write a ticket", "create
  an issue", "break this down", "make a Jira for it", when a spec needs turning
  into work, or when a ticket is vague, unsizeable, or has no acceptance
  criteria. Use before starting work, not during it.
argument-hint: "<what needs doing, or a spec, issue, or ticket to fix>"
license: MIT
---

# Greybeard: ticket

A ticket is a contract with a stranger who will do exactly what it says and
nothing it forgot to say. Write it for that person.

One ticket is one reversible change that can be merged alone and leaves the
system working. Not one file, not one layer, not one sprint.

## Format

```
<ID>: <imperative summary, under 70 characters>

Why:        The scenario that hurts today. One sentence.
Scope:      What changes. Files or areas.
Out of scope: What does not change, especially what a reader would assume does.

Acceptance criteria
  1. Given <state>, when <action>, then <observable result>.
  2. ...

Verify:     The exact command or click path a reviewer runs.
Risk:       What breaks if this is wrong, and who notices first.
Rollback:   How it is undone. "Revert the commit" only when that is true.
Fences:     GREYBEARD.md entries covering anything in Scope.
Refs:       Spec, incident, parent ticket.
```

## Acceptance criteria

Observable from outside the code. If you cannot name the assertion, you do not
understand the ticket yet.

Not criteria: "works correctly", "no regressions", "is clean", "performs well",
"handles errors". Criteria: "a second submit within 30 s returns the first
receipt, no second charge"; "p95 under 400 ms at 50 rps, measured by
`make loadtest`".

Every criterion maps to a test, or to a named manual step in **Verify**.
More than seven criteria means more than one ticket.

## Rejects

Send back, with the question that fixes it:

- "Refactor X" → what fails today because of X, and what will be true after?
- "Improve performance" → which operation, measured how, from what to what?
- "Clean up", "modernise", "tidy" → these are not changes, they are moods.

A ticket whose only justification is that the code is ugly does not get
written. `/greybeard-why` first: ugly code that works is a fence.

## Splitting

Split vertically, into thin slices that each ship and each work. Never by
layer — "the backend part" and "the frontend part" are two tickets that are
both half-done until the second one merges, and the first cannot be rolled back
alone.

Signals to split: more than seven criteria; two deployables; a database
migration plus behaviour that depends on it (that is `/greybeard-migration`
plus a ticket); "and" in the summary.

## Git coupling

Record the convention once in `GREYBEARD.md` under
`## Decision: ticket and commit convention`, so every agent reads it at session
start. The default:

- Branch: `<ID>-<short-slug>`.
- Commit subject: `<ID>: <what changed>`. Body: why, not what. The diff is what.
- Trailers: `Refs: <ID>`, and `Fence: <path>` on any commit touching a file
  with a `GREYBEARD.md` entry.
- Pull request title is the ticket summary; body is the acceptance criteria as
  a checklist, plus **Verify** and **Rollback**.
- The merge closes the ticket. Nobody closes a ticket by hand while a branch is
  open.

`<ID>` is whatever the tracker gives: `PROJ-123`, `#45`, `2026-03-04-a`. The
shape matters less than every agent using the same one.

## Steps

1. Find the source: spec, incident, request. Link it in **Refs**.
2. Check `GREYBEARD.md` for entries covering anything in **Scope**. Any hit
   goes in **Fences** and gets read before the work starts.
3. Draft the ticket.
4. Try to satisfy the acceptance criteria without doing the work. If you can,
   the criteria are wrong. Rewrite them.
5. Size and split.
6. Create it in the tracker, or in `docs/tickets/<ID>.md` if there is none.

## Voice

Short fields. No background section. If the why needs a paragraph, the ticket
needs a spec, and the spec is a link.
