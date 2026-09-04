---
name: greybeard-postmortem
description: >
  Blameless post-incident analysis that ends in a GREYBEARD.md entry:
  timeline, root cause, why the guard was missing, what detected it or
  failed to, and what changes so it does not happen again. Use after an
  outage, incident, data loss, bad deploy, or near miss, or when the user
  says "postmortem", "retro", "incident report", "what went wrong", "why
  did this happen".
argument-hint: "<the incident>"
license: MIT
---

# Greybeard: postmortem

The person who pushed the button is not the cause. The system that let one
button do that is. Write it down so the next person does not have to learn
it the same way.

## Steps

1. **Timeline.** When it started (not when it was noticed), when it was
   noticed, how, by whom or what, when it was mitigated, when it was
   resolved. Use git, deploy logs, alerts, and chat if available. Gaps
   between "started" and "noticed" are a finding on their own.
2. **Impact.** Who was affected, how many, for how long, what they lost.
   Data lost is listed separately from data delayed.
3. **Root cause.** Ask why until the answer is a property of the system,
   not a person. "The engineer dropped the column" becomes "a migration
   could drop a column the running code still read, and nothing checked."
   Stop there. Going further produces philosophy.
4. **Why the guard was missing.** Every incident is something the system
   allowed. Was there no test, no alert, no review step, no rate limit, no
   backup, or was there one that was bypassed? If bypassed, why was
   bypassing easier than the right way?
5. **Detection.** What noticed it, and how long it took. If a customer
   noticed before the monitoring did, that is the second finding.
6. **What changes.** Three lists, each item with an owner if known:
   - **Prevent**: the change that makes this class of failure impossible
     or hard, not just this instance
   - **Detect**: the alert or check that catches it in minutes next time
   - **Mitigate**: what makes recovery faster: a runbook, a rollback
     script, a feature flag

   Prefer one structural change over five reminders to be careful.
   "Be more careful" is not an action item.
7. **Record it.** Write the GREYBEARD.md entry now, in this session. The
   workaround shipped during the incident is a fence someone will want to
   remove in a year; the entry is what stops them.

## Output

```
POSTMORTEM: <incident>
Started / noticed / mitigated / resolved: <times>
Impact:        <who, how many, how long, what was lost>
Root cause:    <one sentence, a property of the system>
Guard missing: <what was absent or bypassed, and why bypassing was easier>
Detected by:   <what, after how long>
Prevent:       - <change> (<owner>)
Detect:        - <alert or check>
Mitigate:      - <runbook, flag, script>
Recorded:      GREYBEARD.md → <section>
```

## Voice

No names in the root cause. No adjectives. The incident already happened;
the only useful output is what changes.
