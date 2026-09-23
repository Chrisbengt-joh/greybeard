---
name: greybeard-transcript
description: >
  Summarises a chat session as a structured tree, where every leaf carries a
  verbatim grep anchor from the transcript, so another agent can find the exact
  place a decision was made instead of reading the whole session. Records what
  was rejected and why, not only what was built. Use at the end of a long
  session, before compaction or handover, when the user says "summarise this
  session", "index this chat", "what did we decide", and whenever a session
  produced decisions that another agent or another week will need the
  background for. Not a report — an index.
argument-hint: "[topic or ticket; defaults to the whole session]"
license: MIT
---

# Greybeard: transcript

A transcript is long and unsearchable unless you already know the words. This
produces the words: a tree of what happened, where each leaf carries a string
that occurs verbatim in the transcript. Another agent greps the anchor and lands
on the exact turn.

## Steps

1. Walk the session start to end. Do not summarise as you go. First list every
   point where something *changed*: a decision, a rejection, a discovery, an
   artifact, a failure.
2. Group into phases, chronological. A phase is a stretch with one purpose.
   Three to seven of them; more means you are listing turns, not phases.
3. For each leaf, find an **anchor**: a distinctive string that actually
   occurred in the session, three to eight words, verbatim, unique. Your
   paraphrase is not an anchor — it will not be in the transcript. If nothing is
   unique, use two anchors.
4. Type each leaf: `decision`, `rejected`, `found`, `built`, `broke`, `open`.
5. Rejections and dead ends are mandatory. They are the part nobody records and
   the part everybody later needs.
6. Verify: pick three anchors and confirm each would find its turn.

## Output

`.greybeard/sessions/<YYYY-MM-DD>-<slug>.md`

```
# Session tree — 2026-03-04 — payment retries (PROJ-412)

goal:    stop duplicate charges when the provider times out
result:  idempotency key shipped; queue rewrite rejected
files:   src/payments/client.py, tests/payments/test_idem.py
tickets: PROJ-412, PROJ-419 (created)

## 1. What "duplicate" actually means
- found      the provider retries internally, so ours is the second retry
             → grep: "retries internally before"
- decision   scope is charge creation only, refunds excluded
             → grep: "refunds are out of scope"

## 2. Options
- rejected   move charges onto the queue — four weeks, needs a saga
             → grep: "would need a saga"
- decision   key derived from order id and amount
             → grep: "derived from the order id"

## 3. Building
- built      key generation and the provider header
             → grep: "Idempotency-Key header"
- broke      timestamp in the key collided on same-second retries
             → grep: "collided inside the same second"

## 4. Open
- open       no test for the provider returning 409 on a reused key
             → grep: "409 on a reused key"
```

## Rules

One line per leaf, one anchor per line, and the anchor does the explaining. No
prose paragraphs: this is a table of contents, not a report. Nothing durable
lives here — a decision that must survive goes to `GREYBEARD.md`, the ticket, or
the knowledge base, and the tree only points at where it was made.

Header lines (`goal`, `result`, `files`, `tickets`) are what makes the file
findable at all. Fill them in before the tree.

## Voice

You are writing a table of contents for a book nobody wants to read, so that
nobody has to.
