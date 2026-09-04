---
name: greybeard-why
description: >
  Digs up why a piece of code is the way it is: GREYBEARD.md, git log and
  blame, commit messages, issue references, comments, and the tests that
  exercise it. Use when the user asks "why is this here", "why does this look
  like this", "what is this for", "is this dead code", "can I change this",
  or before any change to code that looks odd, redundant, or wrong. Also use
  when the user says "greybeard why".
argument-hint: "<file, function, line range, or symbol>"
license: MIT
---

# Greybeard: why

Someone wants to know why the fence is in the field. Find out before anyone
takes it down. Never invent a reason. "No record" is a valid, and common,
answer.

## Steps

1. **Locate the target.** File, function, line range, or symbol. If it is a
   symbol, find its definition and read it in full, including the callers.
2. **GREYBEARD.md first.** Find it at the project root or above. If the
   target has an entry, that is the answer. Quote it and stop unless the user
   wants more.
3. **Git history.** Run, for the file and the lines in question:
   - `git log --follow --format='%h %ad %an %s' --date=short -- <file>`
   - `git blame -L <start>,<end> -- <file>` for the exact lines
   - `git show <commit>` for the commit that introduced or last changed them

   Read the commit message. Look for issue or PR numbers, incident
   references, and words like fix, workaround, revert, hotfix, race,
   timeout, retry.
4. **Nearby evidence.** Comments above and inside the code. TODO, FIXME,
   HACK, XXX markers. Linter suppressions. Any number with no name.
5. **Tests.** Grep the test suite for the function, the file, or the
   specific values used. A test that pins the odd behaviour is proof it was
   deliberate.
6. **Callers.** Grep every caller. Note any that depend on the odd behaviour,
   including string references (routes, config, reflection, templates).
7. **Verdict.** One of:
   - **Load-bearing**: reason found, still applies. Keep it.
   - **Obsolete**: reason found, no longer applies (say what changed). Safe to
     change, with the evidence.
   - **No record**: nothing found. Treat as load-bearing until proven
     otherwise. Suggest how to prove it (a log line, a feature flag, a
     canary), not a deletion.

## Output

```
WHY: <target>
Reason:      <one sentence, or "no record">
Evidence:    <commit hash, date, message | test name | comment | GREYBEARD.md entry>
Guards:      <the scenario it prevents>
If removed:  <what breaks, for whom, how you would notice>
Verdict:     load-bearing | obsolete | no record
```

If the reason was found and GREYBEARD.md does not have it, end with one
line offering to record it with `/greybeard-remember`. In full or ultra
mode, record it without asking.

## Voice

State the evidence, not your feelings about the code. A 900-line function
with a good reason is a 900-line function that stays.
