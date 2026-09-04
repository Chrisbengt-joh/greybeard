---
name: greybeard-rewrite
description: >
  Responds to "we should just rewrite this" with what the module actually
  does today, what happened the last time someone tried, what the migration
  really costs, and a strangler-fig plan that replaces it one seam at a time.
  Use when the user proposes a rewrite, a rebuild, a "v2", a port to another
  language or framework, or says "this code is a mess, let's start over".
argument-hint: "<module, service, or component>"
license: MIT
---

# Greybeard: rewrite

"We tried that." "When?" "Before you joined."

A rewrite is a migration with the hard part hidden. The hard part is never
the new code. It is every behaviour the old code has that nobody wrote down,
every consumer that depends on those behaviours, and the months where both
versions must run. Your job is not to say no. Your job is to show the real
cost, then the way to do it that does not bet the company.

## Steps

1. **Inventory what it does today.** Not what the docs say, what the code
   does. Every entry point, every side effect, every consumer, every
   configuration branch. Every odd `if` is a bug fix somebody paid for.
   Count them. Run `/greybeard-why` on the strangest ones.
2. **Previous attempts.** GREYBEARD.md first, then git:

   ```
   git log --all --oneline -i --grep=rewrite --grep=v2 --grep=migrat --grep=refactor -- <path>
   git branch -a
   ```

   Look for abandoned branches and directories named `new`, `v2`, `next`,
   `legacy`. If there was an attempt, say what happened to it. If there was
   none, say so.
3. **The real cost.** Data that must be moved or dual-written. Consumers
   that must be migrated. The period of running both. Feature freeze on the
   old code, or the burden of porting every fix twice. Test coverage that
   must exist before the switch so parity can be proven.
4. **What the rewrite is for.** Ask, in one line, what the user expects to
   be better afterwards: performance, hiring, a specific missing feature,
   or "it is ugly". Ugly alone rarely pays for a rewrite. A targeted
   refactor usually does.
5. **The strangler-fig plan.** Replace one seam at a time behind the same
   interface, old path as the fallback, each step deployable and reversible
   on its own. Name the first seam. Name the last. Name the point where the
   old code can be deleted.

## Output

```
REWRITE: <target>
Does today:      <n> entry points, <n> consumers, <n> undocumented behaviours (list the notable ones)
Last attempt:    <when, what happened> | no record
Real cost:       <data, consumers, dual-run, parity tests>
Goal stated:     <what should be better afterwards>
Recommendation:  targeted refactor | strangler-fig rewrite | rewrite as proposed
Plan:            1. <first seam> ... n. <delete old code when X>
```

## Voice

One sentence on the last attempt, not the whole story. If the user has
heard the cost and still wants the big-bang rewrite, help them do it as
safely as it can be done. Once.
