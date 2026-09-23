---
name: greybeard-relay
description: >
  Coordination protocol for several agents working on one repository at the
  same time: frozen contracts before parallel work starts, one owner per file,
  a status board in .greybeard/relay/, explicit blocking, and a separate
  integration pass. Also decides whether the work should be parallelised at
  all. Use when work is split across parallel agents, subagents or worktrees,
  when the user says "run these in parallel", "spawn agents", "split this
  between", when two agents might touch the same files, or when one agent is
  waiting on another's output. Do NOT use for single-agent work.
argument-hint: "[the work to split, or 'status']"
license: MIT
---

# Greybeard: relay

Parallel agents lose more time to conflicts than they gain in throughput,
unless the work is genuinely separable. Before splitting anything, three
questions:

- Can each piece be merged on its own and leave the system working?
- Do they touch disjoint files?
- Does one need another's output mid-flight?

Two yeses and a no is a split. Anything else is sequential work that will finish
sooner sequentially. Say so and do not split.

## Contracts before parallelism

Whatever the agents share — types, API shape, schema, event payloads, module
boundaries — is written and committed by *one* agent, first, before anyone else
starts. Then it is frozen.

A contract change mid-flight stops everyone: announced, agreed, re-committed,
and only then does work resume. Parallel work against a moving interface is the
expensive way of producing merge conflicts.

## One owner per file

Not per feature. Per file. The split is drawn on the file tree before work
starts and written down. A file everyone needs — routes, DI container, migration
index, translation catalogue — gets one owner who applies everybody's additions,
or gets an append-only structure so merges are trivial.

## The board

`.greybeard/relay/`, gitignored.

```
BOARD.md          the split: who owns what, contract status, open blocks
agent-<id>.md     one agent's status; only that agent writes it
```

```markdown
# agent-2 — PROJ-412 idempotency key
updated:   2026-03-04 14:22
status:    working | blocked | review | done
owns:      src/payments/client.py, tests/payments/test_idem.py
needs:     type `IdempotencyKey` from agent-1 — have it, commit 3c1a9f2
provides:  make_key(order_id, amount) — landed on relay/proj-412
blocked-by: —
touched outside my files: none
```

You write only your own file. You read all of them before your first edit and
again before claiming done. Silence is not consent, and an out-of-date file is
the same as no file.

## Claim before edit

Check the board. If the file has another owner, stop. Two agents editing one
file at the same time is not a merge conflict — it is two half-correct
implementations that each pass their own tests.

If you need something from a file you do not own, write it under `needs` and
move to your next piece of work. Do not reach across.

## Blocked

Say so in your file within one turn: what you need, from whom. Then pick up
other work of your own. Never wait idle, and never work around a block by
reimplementing the thing you are waiting for — that produces two versions and a
disagreement about which is real.

If A needs B and B needs A, neither guesses. Both stop, and it goes to the
human. A deadlock broken by an agent's guess produces two designs and one
integration nobody can finish.

## Integration

One agent integrates, and it is not one of the agents that wrote the parallel
work. It merges in dependency order, then runs `/greybeard-done` on the combined
result — not on the pieces, which all passed in isolation, which is the point.
Conflicts are resolved by asking the owner, never by keeping the version that
compiles.

## Escalate to the human

Contract changes. Conflicting designs. Any block that survives one round.
Anything touching a `GREYBEARD.md` fence. No exceptions; these are exactly the
decisions that are cheap to make now and expensive to discover later.

## Voice

Status goes in the file, not in prose. If your file is current, you have
communicated. If it is not, you have not, whatever you said in chat.
