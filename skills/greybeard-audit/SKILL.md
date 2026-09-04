---
name: greybeard-audit
description: >
  Scans a codebase for undocumented fences: hacks, workarounds, sleeps,
  retries, magic numbers, empty catch blocks, disabled lint rules, and
  "do not touch" comments that have no reason on record in GREYBEARD.md.
  Use when the user asks "what should we document", "find the hacks",
  "greybeard audit", "what is scary in this codebase", or when adopting
  greybeard in an existing project.
argument-hint: "[path; defaults to the repository root]"
license: MIT
---

# Greybeard: audit

Every codebase has fences nobody remembers building. Find them while the
people who might remember are still around.

## What to look for

Grep the target, excluding vendored and generated code, for:

- **Confessions**: `hack`, `workaround`, `kludge`, `temporary`, `for now`,
  `don't touch`, `do not remove`, `don't ask`, `no idea why`, `magic`,
  `legacy`, `XXX`, `FIXME`, `HACK`, and `TODO` older than a year by blame
- **Sleeps and delays**: `sleep`, `setTimeout`, `delay`, `Thread.sleep`,
  `time.sleep`, with a literal number and no comment
- **Retries and timeouts**: retry loops, `max_retries`, `timeout=` with a
  literal number and no comment
- **Magic numbers**: literals like `100`, `1000`, `4096`, `86400`, `0.95`
  in conditions or arguments with no name and no comment
- **Swallowed errors**: empty `catch`, `except: pass`, `rescue nil`,
  `_ = err`, `.catch(() => {})`
- **Suppressions**: `noqa`, `eslint-disable`, `@ts-ignore`, `#pragma
  warning disable`, `@SuppressWarnings`, `nolint`
- **Hard-coded environment**: IPs, hostnames, ports, absolute paths, dates
- **Commented-out code** longer than five lines
- **Version pins** in dependency files with a comment-free exact pin or an
  upper bound
- **Feature flags** with no removal date

## Steps

1. Load GREYBEARD.md. Anything already documented there is skipped.
2. Grep for the patterns above. For each hit, run `git blame` on the line:
   date, author, commit message. A commit message with an issue number is
   half the answer already.
3. Rank by risk: how central the file is (number of importers or callers),
   how old the fence is, whether the author is still in the git log
   recently, and how bad the failure would be if the fence were removed.
4. For the top items, propose the GREYBEARD.md entry with what git already
   tells you, and mark the fields that need a human.

## Output

```
AUDIT: <path>  (<n> candidates, <n> already documented, showing top <k>)

1. <file>:<line>  <the fence, one line>
   blame:   <date> <author> "<commit message>"
   risk:    <why this one matters>
   entry:   what: <...>  why: <from commit, or UNKNOWN, ask <author>>  if removed: <...>

2. ...
```

Then one line: which authors to ask about which items, ordered by how
many items they own. End with an offer to write the entries whose reason
is known into GREYBEARD.md.

## Voice

An audit is a list, not a judgement. The fences were built for reasons;
the job is to find the reasons before they leave.
