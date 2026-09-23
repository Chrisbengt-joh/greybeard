---
name: greybeard-bearing
description: >
  Takes a bearing: forces the agent to compare where the work actually is
  against the goal, the spec, the ticket's acceptance criteria and the process
  rules, answering ten fixed questions with a checkable proof of at most 80
  characters each. If the agent has drifted or is stuck, it evaluates the next
  step: does it flip an acceptance criterion, is it a repeat of something that
  already failed, does it follow the process, is it still what the spec says.
  Use when the user says "where are we", "are we on track", "you're going in
  circles", "what are you doing", after the same error twice, after a third
  edit to the same spot, after a long run of turns without a passing test or a
  commit, and before starting anything the ticket does not name.
argument-hint: "[ticket ID; defaults to HANDOVER.md, then the branch name]"
license: MIT
---

# Greybeard: bearing

A navigator does not ask whether the ship feels on course. They take a bearing
and compare it to the chart.

Every question gets an answer and a proof. A proof is **at most 80
characters** and checkable by someone else in under a minute: `path:line`,
`command → result`, a commit hash, an AC number, a spec section. "I believe",
"should", "probably" are not proofs. No proof → the answer is `?`, and `?`
counts as no.

## Read first

From disk, not from memory: the ticket, its spec in `docs/specs/`,
`HANDOVER.md`, `git status`, `git log --oneline -5`, `git diff --stat`. If the
tests have not run this session, run them now. A bearing is taken from
instruments, not recollection.

## The ten questions

Same ten, same order, every time, so two bearings can be compared.

1. **Goal.** What is this work for? — ticket ID or spec line.
2. **Spec.** Does the current change serve the spec, not a non-goal?
   — spec section.
3. **Criterion.** Which AC is the current work moving? — AC number.
4. **Scope.** Are all touched files inside the ticket's Scope?
   — `git diff --stat` against Scope.
5. **Progress.** What verifiably changed since the last bearing or the last
   ten turns? — a commit, or a test that went green.
6. **Loop.** Same error, same spot, same kind of fix, more than twice?
   — the repeated line.
7. **Tests.** A failing test for what is being built, passing ones for what
   is done? — test name → result.
8. **Convention.** Branch and commits follow the ticket convention?
   — branch name, last subject.
9. **Fences.** A `GREYBEARD.md` entry touched, or a new guard with no entry?
   — the entry, or "none in diff".
10. **Next.** What is the next step, and which AC flips if it works?
    — AC number and how you would see it flip.

## Verdict

- **ON COURSE** — 3, 5 and 10 have proofs, 6 is no. Continue. Nothing else
  to say.
- **DRIFTING** — real work, but not on an AC: 3 or 4 fails.
- **STUCK** — 5 has no proof, or 6 is yes.
- **OFF PROCESS** — 7, 8 or 9 fails. Fix the process before the next edit.
- **OFF SPEC** — 2 fails. Stop and ask the human. Code does not overrule a
  spec; `/greybeard-grill` changes the spec, or nothing does.

## Drifting or stuck: test the next step

The proposed next step must pass all four, each with a proof. If it fails one,
it is not taken.

1. **Real value.** If it succeeds, which AC goes from not met to met? "Cleaner",
   "prepares for", "while I'm here" name no AC. That is a new ticket, not this
   one.
2. **Not a repeat.** What is concretely different from the last attempt — new
   information, not new wording? Nothing different means the same failure.
3. **Process.** Is it the smallest step: failing test first, one change, one
   commit?
4. **Spec.** Does the spec still say what you are about to build?

No step passes → stop. Write the bearing into `HANDOVER.md` under Dead ends and
ask the human one question: the one whose answer unblocks. Switching approach
on your own after STUCK requires `/greybeard-dual-pass` on the new approach.

If you can name where the drift began, name the commit. Returning there is
often cheaper than steering from here. A branch or a stash, never a hard reset.

## Output

```
BEARING  PROJ-412  15:10
 1 goal       ok  PROJ-412: no duplicate charge on provider timeout
 2 spec       ok  docs/specs/payment-retries.md §Acceptance criteria
 3 criterion  NO  editing log format — no AC covers it
 4 scope      NO  src/logging/fmt.py not in Scope
 5 progress   NO  last green test 14 turns ago (test_replay)
 6 loop       yes 3rd edit to client.py:88, same KeyError each time
 7 tests      ok  test_conflict → FAIL (expected, AC 2)
 8 convention ok  PROJ-412-idempotency; "PROJ-412: derive key"
 9 fences     ok  none in diff
10 next       ?   —
verdict: STUCK — drifted into logging after three failed tries at AC 2
next:    revert fmt.py; log the 409 body before a 4th try at client.py:88
         flips AC 2 when test_conflict → PASS
```

Proofs over 80 characters are cut to the checkable part, never summarised.

## Voice

The table is the answer. One verdict line, one next line. No apology for
drifting — drift is normal; not noticing is the failure.
