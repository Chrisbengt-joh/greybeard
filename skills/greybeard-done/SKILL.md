---
name: greybeard-done
description: >
  The protocol for when the agent believes a ticket is finished. Eleven gates:
  acceptance criteria checked literally, self-review of the diff, a test proven
  to fail without the change, coverage of the changed lines, the full suite run
  for real, integration across boundaries, backward compatibility, fences
  recorded in GREYBEARD.md, documentation in the right place, commit and pull
  request, ticket update. Produces evidence instead of a claim. Use ALWAYS
  before saying "done", "finished", "implemented", "ready for review", "that
  should work", before opening a pull request, and before moving a ticket.
argument-hint: "[ticket ID or branch; defaults to the current branch]"
license: MIT
---

# Greybeard: done

"Done" is a claim. A claim needs evidence. You do not say done — you produce
the evidence and let it say done for you.

Gates run in order. Stop at the first failure, fix it, restart from gate 1.
The early gates are cheap and the late ones are not; that is why they are in
this order.

## The gates

1. **Reread the ticket.** Each acceptance criterion, literally, one at a time.
   For each: how it is satisfied, and where. Anything you interpreted
   generously is not satisfied. Anything the ticket said was out of scope and
   you did anyway is a finding, not a bonus.
2. **Review your own diff.** `/greybeard-review` on it. Removed lines first.
   You are worse at reviewing your own work than anyone else's, so read it
   twice: once for what it does, once for what it stopped doing.
3. **The failing test.** For every behaviour change there is a test that fails
   without the change. Prove it: revert the source change, run the test, watch
   it fail, restore. A test that passes both ways tests nothing and you wrote
   it for the coverage number.
4. **Coverage of the change.** Coverage on the lines you changed, not the
   repository percentage, which is theatre. Every uncovered changed line gets a
   test or a named reason. Error paths count double — those are the ones that
   run at 3 a.m.
5. **Run everything.** Full suite, lint, typecheck, build. Locally, to
   completion, watched. Never report a result you did not see. If something was
   already failing before your branch, say so and name the commit; do not
   quietly inherit it and do not quietly fix it in this ticket.
6. **Integration.** If the change crosses a boundary — process, service,
   schema, queue, external API, file system — unit tests do not cover it. Run
   the real path (`/greybeard-env`). If you cannot, name exactly what is
   unverified. Unverified is not rounded up to done.
7. **Backward compatibility.** Old rows, old clients, in-flight messages, and a
   rollback to the previous version running against the new state. If the
   previous version cannot run against it, this is not a change, it is a
   migration: `/greybeard-migration`.
8. **Fences.** Did you delete a guard, sleep, retry, or odd condition? Gate 2
   should have caught it; check again. Did you add one? A new fence gets a
   `GREYBEARD.md` entry now, via `/greybeard-remember`. Later means never.
9. **Documentation, in order.** `/greybeard-handover` has the table of where a
   fact belongs. Update only what actually changed. A README paragraph that
   describes last month's behaviour is worse than no paragraph.
10. **Commit and pull request.** Convention from `/greybeard-ticket`. Pull
    request body: acceptance criteria as a checklist with evidence per line,
    **Verify**, **Rollback**, what you would look at first if you were
    reviewing, and what is not covered.
11. **Update the ticket.** What changed, what was deliberately left out and
    why, what is unverified, how to verify by hand, any follow-up tickets you
    created. Move it to review. You do not close your own ticket.

## Output

```
DONE CHECK: PROJ-412
  AC 1  duplicate submit returns first receipt
        ok — tests/payments/test_idem.py::test_replay
  AC 2  409 from provider surfaces as conflict
        not met — no handler on the retry path
  suite       124 passed, 0 failed  (npm test, 41 s)
  lint/types  clean
  uncovered   src/payments/client.py:88-91 — provider 409 branch
  unverified  queue redelivery — no staging broker available
  fences      added 150 ms backoff → GREYBEARD.md entry written
verdict: not done — AC 2, and the uncovered branch is AC 2's branch.
```

If everything passes, the block is six lines and there is nothing else to say.

## Never

Report green without running it. Say "should work". Skip a gate because the
change is one line — one-line changes are where guards get deleted. Call
something done when a gate is unverified: say unverified, and say what would
verify it.

## Voice

The evidence is the message. No summary of how hard it was, no list of what you
did — the diff is the list. Verdict last, one line.
