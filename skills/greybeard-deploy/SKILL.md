---
name: greybeard-deploy
description: >
  Pre-release check from someone who has rolled back at 5 p.m. on a Friday:
  what changed since the last deploy, what cannot be undone, how rollback
  works, what to watch in the first fifteen minutes, and whether now is the
  time. Use when the user is about to deploy, release, ship, merge to main,
  tag a version, or asks "is this safe to deploy", "can we ship this".
argument-hint: "[what is being deployed; defaults to changes since the last tag]"
license: MIT
---

# Greybeard: deploy

The deploy is not the risk. The deploy you cannot undo is the risk.

## Steps

1. **What is going out.** `git log <last-tag-or-deploy>..HEAD --oneline`.
   Read every commit. Group them: features, fixes, migrations, config,
   dependency updates. Dependency updates and migrations get their own
   scrutiny.
2. **The record.** GREYBEARD.md entries about deploys, releases, or the
   touched areas. Previous incidents tied to a release.
3. **Irreversible steps.** Anything a rollback of the code does not undo:
   - database migrations, especially drops and type changes
   - emails, notifications, webhooks, or messages sent to users or partners
   - external side effects: payments, third-party API writes, DNS
   - data transformations, cache flushes, queue purges
   - version bumps of a public API or a client protocol

   Each one gets a line: what it is, and what "undo" would mean.
4. **Rollback.** How, concretely. Which command, who runs it, how long it
   takes, whether it works with the migration already applied. If the
   answer is "redeploy the previous version" then verify the previous
   version runs against the new schema.
5. **Observability.** What to watch for the first fifteen minutes: error
   rate, latency, the specific endpoint or job this change touches, queue
   depth, the log line that would show the new code path working. Who is
   watching.
6. **Timing.** Friday afternoon, the day before a holiday, month-end,
   during a marketing push, when the person who wrote it is on a plane.
   Any of these is a reason to wait, not a rule; say which applies.
7. **Config and secrets.** Every new env var or config key: set in the
   target environment, with the right value. This is the number one cause
   of "works in staging".

## Verdict

- **Go**: rollback is clear, nothing irreversible, or the irreversible
  parts have their own plan.
- **Go with conditions**: name them. "After the backfill finishes", "with
  the flag off", "not before Monday".
- **Wait**: name what has to be true first.

## Output

```
DEPLOY: <what>
Changes:       <n> commits: <features/fixes/migrations/config/deps>
Irreversible:  <list with undo-meaning> | none
Rollback:      <command or steps, duration, works with migration: yes/no>
Watch:         <metrics, log lines, who, for how long>
Timing:        <ok | concern: why>
Config:        <new keys, set where: verified/unverified>
On record:     <GREYBEARD.md entries that apply> | nothing
Verdict:       go | go with: <conditions> | wait for: <what>
```

## Voice

Checklist, not sermon. If it is a go, say go. If a deploy is fine, the
greybeard says one word and goes back to reading.
