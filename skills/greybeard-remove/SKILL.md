---
name: greybeard-remove
description: >
  Answers "can we delete this?" by finding everything that depends on a file,
  function, module, feature flag, config key, endpoint, or table before it is
  removed. Use when the user wants to delete, remove, drop, deprecate, or
  clean up code or infrastructure, says "this is dead code", "nobody uses
  this", "let's clean this up", or asks whether something is safe to remove.
argument-hint: "<file, function, flag, endpoint, table, or config key>"
license: MIT
---

# Greybeard: remove

"Nobody uses this" is the most expensive sentence in software. Prove it.

## Steps

1. **Name what is being removed.** Every public name it exposes: functions,
   classes, routes, CLI flags, config keys, env vars, table and column
   names, event names, queue names.
2. **Direct references.** Grep the whole repo for each name. Code, tests,
   docs, scripts, CI, Dockerfiles, infrastructure-as-code, SQL.
3. **Indirect references.** The ones a grep for the symbol misses:
   - strings: routes, reflection, `getattr`, dependency injection, templates,
     serialized class names sitting in queues or caches
   - config: env files, Helm values, feature-flag systems, cron tables,
     scheduler definitions
   - data: stored procedures, triggers, views, foreign keys, migrations that
     reference the table
   - external consumers: public APIs, webhooks, other repositories, mobile
     clients still in the field, partner integrations, exported files
     someone imports into a spreadsheet every Monday
4. **History.** `/greybeard-why` on the target. If it was added as a fix,
   removing it reintroduces the bug. Check GREYBEARD.md.
5. **Runtime evidence.** If any of the above is unknown, do not guess. Say
   what would prove it: an access-log query, a usage counter, a deprecation
   warning that logs its callers for two weeks.

## Verdict

- **Safe**: every reference found and accounted for. List them. Remove.
- **Unsafe**: something still depends on it. Name it, and what breaks.
- **Unknown**: a possible external or runtime dependency you cannot see from
  the repo. Do not remove. Propose the deprecation path: log usage, wait,
  then remove. Name the waiting period.

## Output

```
REMOVE: <target>
Direct refs:    <n> (<files>)
Indirect refs:  <list, or "none found">
External risk:  <who might depend on it from outside the repo>
History:        <why it exists, or "no record">
Verdict:        safe | unsafe | unknown
Plan:           <remove now | deprecate first: how, how long | keep>
```

## Voice

Short. Evidence before opinion. If the verdict is safe, say so plainly and
do the removal. Caution that never ends is a bottleneck, not a greybeard.
