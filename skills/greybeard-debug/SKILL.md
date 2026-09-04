---
name: greybeard-debug
description: >
  Debugs the way someone who has been paged a thousand times debugs: first
  asks what changed since it last worked, reproduces before touching
  anything, checks the boring causes, bisects, and proves the root cause
  before proposing a fix. Use when something is broken, failing, flaky,
  slow, or "worked yesterday", when the user pastes an error or stack
  trace, or says "debug", "why is this failing", "it does not work".
argument-hint: "<the problem, error, or symptom>"
license: MIT
---

# Greybeard: debug

Nothing breaks by itself. Something changed. Find that first.

## Steps

1. **What changed since it worked.** Before reading a single line of the
   failing code:
   - code: `git log --since=<last known good> --oneline`, including
     dependency lock files
   - deploys and config: what went out, which env vars or flags changed
   - infrastructure: certificates, DNS, disk, memory, a rotated key, an
     upgraded runtime, a new node in the cluster
   - data: a record with a shape nobody expected, a table that crossed a
     size threshold, a customer with a name containing an apostrophe
   - time: a certificate expired, DST changed, it is the first of the
     month, a leap day, a timestamp overflowed, a clock drifted
   - the outside world: the third party changed its API, a rate limit was
     lowered, a partner started sending twice as much

   If nothing changed, look harder. Something changed.
2. **Reproduce.** Make it fail on demand before changing anything. If it
   cannot be reproduced, the fix cannot be verified, and "it seems to work
   now" is not a fix. For a flaky failure, run it in a loop and count.
3. **Read the actual error.** The full stack trace, the first error in the
   log rather than the last, the exit code, the response body. Not the
   summary someone typed in the ticket.
4. **Boring causes first.** Disk full. Out of memory. Wrong environment.
   Permissions. A typo in an env var name. A cache serving the old value.
   Two instances running when one was expected. Off by one. Timezone. These
   are most bugs. Check them before the clever theory.
5. **Bisect.** Halve the problem. `git bisect` over commits, binary search
   over input data, comment out half the pipeline. Each step should cut
   the candidates in half. Do not read code linearly hoping to spot it.
6. **Prove it.** A root cause is proven when you can make the failure
   appear and disappear by changing only that one thing. Until then it is
   a theory, and theories are not shipped.
7. **Fix at the root.** Grep every caller of the thing you are fixing. One
   fix in the shared place, not one per symptom. Then leave the check that
   would have caught it: a test, an assertion, a log line, an alert.
8. **Record it.** If this can happen again, or if the fix is a workaround
   someone will later want to remove, write it into GREYBEARD.md now,
   while the reason is fresh.

## Output

```
DEBUG: <symptom>
Changed:      <what changed since it worked, with evidence> | nothing found yet
Reproduced:   <how, reliably: yes/no>
Root cause:   <one sentence> | theory: <one sentence>, unproven
Proof:        <what makes it fail and pass on demand>
Fix:          <where, and why there>
Guard:        <test / assert / alert left behind>
Recorded:     GREYBEARD.md <entry> | not needed
```

## Rules

No fix without a proven cause. No "try this and see". No changing three
things at once. If you are guessing, say "guess", and say what would turn
it into proof.

## Voice

Calm. The system has been broken before and will be again. Evidence, then
the fix, then the guard.
