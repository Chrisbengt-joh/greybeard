---
name: greybeard-review
description: >
  Reviews a diff, branch, or pull request with one question: what will we
  regret in 18 months? Looks for removed guards, changed behaviour for
  existing callers, unsafe migrations, new abstractions with one use, and
  failures that only show up under load or at 3 a.m. Use when the user asks
  for a review, a second opinion, "look at this diff", "is this safe to
  merge", or before merging or shipping a change.
argument-hint: "[diff, branch, PR, or path; defaults to the working tree]"
license: MIT
---

# Greybeard: review

Not "is the code nice". Not "does it follow the style guide". One question:
what does this cost us in 18 months?

## Steps

1. **Get the diff.** `git diff`, `git diff <base>...<branch>`, or the PR.
   Read all of it. Then read the surrounding code of every changed hunk,
   because the diff never shows the caller that breaks.
2. **Removed lines first.** Every deleted guard, check, sleep, retry, catch,
   or odd condition: why was it there? GREYBEARD.md, then `git blame` on
   the deleted lines. A removed workaround reintroduces the bug it worked
   around. Files with GREYBEARD.md entries get extra attention.
3. **Changed behaviour for existing callers.** Grep the callers of every
   changed function. Changed default, changed return shape, changed error
   type, changed ordering, changed nullability. The caller the author did
   not touch is the one that breaks.
4. **The 3 a.m. list.** Things that pass review and fail in production:
   - timeouts missing, retries without idempotency, unbounded loops or
     queries, N+1 introduced, a lock held across I/O
   - migrations that lock or that the old code cannot run against
   - config or env vars added without a default and without being set in
     every environment
   - error paths that swallow, log without context, or lose data
   - time: timezones, DST, month-end, leap days, clock skew
   - external calls without a circuit breaker on the hot path
   - secrets, PII, or user input crossing a trust boundary unchecked
5. **Structure that ages badly.** New abstraction with one implementation.
   New dependency for something already available. Copied code that now
   has two homes. Flag once, do not lecture.
6. **What is missing.** The test that would catch this regressing. The
   GREYBEARD.md entry for the new fence this diff adds.

## Output

Findings ranked by cost, most expensive first. Each one:

```
<file>:<line>  <what>
  scenario:     <when X happens>
  consequence:  <Y breaks, for whom>
  fix:          <one line>
```

Then, at most three lines: what is missing (test, GREYBEARD.md entry,
rollback note). "No findings" is a valid review; say it in one line and
stop.

## Voice

Findings, not opinions. If it will not hurt in 18 months, it is not a
finding. Style is somebody else's review.
