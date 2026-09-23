---
name: greybeard-kb
description: >
  Maintains the project's own knowledge base in .greybeard/kb/ — how we build
  things here, house preferences, vendor and environment gotchas, and what the
  domain words actually mean — as short single-claim notes with evidence,
  status and a review date. Complements GREYBEARD.md, which holds fences.
  Search it before answering anything domain-specific. Write to it when the
  user says "note this", "our convention is", "we always do X", "we never do
  Y", when you learn something general that is not tied to one file, and when
  you catch yourself rediscovering something. Also the source material for
  specialist skills.
argument-hint: "[what to record, or a topic to look up]"
license: MIT
---

# Greybeard: knowledge base

The domain knowledge in a model's weights is not yours, is not current, and
cannot be corrected. This is the part you own.

## The distinction

- **`GREYBEARD.md`** — why this code must not change. Bound to files. Loaded
  every session and shown before an edit. Stays small.
- **`.greybeard/kb/`** — how we do things here, and what we know. Read on
  demand. Allowed to grow.

If it stops you making a change, it is a fence: `/greybeard-remember`. If it
tells you *how* to make the change, it is a note: here.

## Layout

```
.greybeard/kb/
  INDEX.md        one line per note, grouped, regenerated not hand-edited
  patterns/       how we build things here
  preferences/    house choices: stack, style, tools, interface
  gotchas/        this environment or vendor behaves unexpectedly
  domain/         what the business words actually mean
  vendors/        third parties: limits, real failure modes, support reality
```

## Note format

One claim per note.

```markdown
---
title: Advisory locks over SELECT FOR UPDATE for job claiming
type: pattern
status: verified          # verified | unverified | disputed | superseded
evidence: commit 9c1f2a3, load test 2026-01-18, incident #503
since: 2026-01-20
review: 2026-07
supersedes: patterns/job-claiming-select-for-update.md
---

**Claim.** Workers claim jobs with `pg_try_advisory_lock`, not row locks.

**Because.** Row locks held across the job body kept a transaction open for the
duration. At 40 workers this pinned the connection pool; incident #503, four
hours of stalled jobs.

**How.** `SELECT pg_try_advisory_lock(hashtext(job_id))`, work outside the
transaction, unlock in a `finally`.

**Does not apply when.** The work is shorter than the lock round trip — under
about 5 ms, row locks are simpler and cheaper.
```

## Rules

- **Evidence, or `unverified`.** A note written from a model's general
  knowledge is `status: unverified` and says so. It becomes `verified` when
  something in *this* repository proves it: a commit, a benchmark, an incident,
  a decision. Never launder a guess into house knowledge.
- One claim per note. Two claims are two notes and a link.
- Under forty lines. Longer is documentation: put it in `docs/` and link to it.
- Every note has a **Does not apply when**. A note without a boundary is a rule,
  and rules get applied where they do not belong.
- Every note has a `review` date. On that date it is confirmed, updated, or
  deleted. A knowledge base nobody prunes becomes one nobody trusts.
- Superseding never deletes. Mark the old note `superseded`; the new one names
  it in `supersedes`. The wrong answer, plus why it was wrong, is worth more
  than the right answer alone.

## Steps

1. **Read before you write.** Search the knowledge base before answering
   anything domain-specific. Assume the answer is there before assuming it is
   not.
2. Decide fence or note.
3. Look for an existing note on the claim. Update it rather than adding a
   second, near-identical one.
4. Write it, with evidence or the `unverified` marker.
5. Regenerate `INDEX.md`.
6. Commit it with the code that motivated it.

## Growing a specialist skill

When one area of `preferences/` has enough in it to change behaviour on every
task in that area, promote it: `skills/greybeard-<area>/SKILL.md`, with a
description that triggers on the area rather than on a command. See
`greybeard-ui` for the shape. The knowledge base is where a specialist skill
comes from; the skill is the knowledge base with a trigger attached.

## Voice

A note is found by a stranger who is mid-task and impatient. Claim first,
evidence second, nuance last or not at all.
