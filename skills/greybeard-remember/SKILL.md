---
name: greybeard-remember
description: >
  Writes a "why" into GREYBEARD.md, the project's institutional memory: why
  a piece of code is the way it is, why a decision was made, what breaks if
  it is removed. Use when the user says "remember this", "write that down",
  "note for later", "greybeard remember", when a reason for odd code has
  just been discovered, when an architecture decision is made, or after a
  workaround is shipped.
argument-hint: "<what to remember, or the file/decision it concerns>"
license: MIT
---

# Greybeard: remember

Institutional knowledge is what the greybeard has and the wiki does not.
This file is where it goes so it survives the greybeard.

## The file

`GREYBEARD.md` at the repository root. Create it if it does not exist. It is
loaded at the start of every session and shown again right before a file
with an entry is edited, so entries must be short and specific.

The file is personal: one person's notes for their own agent, not a shared
team document. Shared notes from several people drift into a file nobody owns
and nobody trusts. When you create it in a git repository, add `GREYBEARD.md`
to `.git/info/exclude` in the same step. That file is local and is not
committed itself, so the repo's `.gitignore` and everyone else's clone stay
untouched. Never commit `GREYBEARD.md`; a hook asks before a commit that
would include it.

## Format

One `##` section per file, directory, or decision. Sections whose heading is
a path (contains `/` or a file extension) are matched against files being
edited; other headings are free-form topics.

```markdown
# GREYBEARD.md

Institutional memory. Why things are the way they are. Read before you
change them.

## src/payments/client.py

- **What:** 150 ms sleep between consecutive requests to the provider.
- **Why:** Provider returns HTTP 500 on two requests within 100 ms.
  Incident #412, 2023-04-12, silent payment drops for six hours.
- **If removed:** Payments fail silently under load. The error is swallowed
  by the retry wrapper two layers up.
- **Since:** 2023-04-14, commit 3f2a9c1
- **Revisit when:** Provider confirms rate limiting is fixed on their side.

## Decision: one database, not one per service

- **What:** All services share the primary Postgres.
- **Why:** Three people. Cross-service transactions were the source of two
  outages in 2022 when we tried per-service databases.
- **If changed:** Order creation needs a saga; nobody has time to build one.
- **Since:** 2023-01
- **Revisit when:** Team is above eight people or write load exceeds one
  primary.
```

Fields: **What**, **Why**, **If removed** (or **If changed**), **Since**,
and optionally **Revisit when**. Dates absolute, never "last spring".
Commit hashes and issue numbers when known.

## Steps

1. Find `GREYBEARD.md` by walking up from the current directory. Create it
   at the repository root if missing, with the header shown above.
2. Check for an existing section on the same path or topic. Update it
   rather than adding a duplicate. If the old entry is wrong, replace it
   and note the change in **Since**.
3. Write the entry. If the user gave only a vague reason, ask the one
   question that makes it specific: what fails if this is removed?
4. Verify dates and commit hashes against git where possible. Do not
   invent them; leave a field out rather than guess.
5. Show the entry as written. One line, no ceremony.

## What does not go in

`GREYBEARD.md` stays out of git, but it is not private: it is loaded into
every session, so everything in it ends up in transcripts and in whatever the
agent is sent. And a file that is excluded today can be committed by mistake
tomorrow, where deleting an entry later does not remove it from the history.

- **No secrets.** No credentials, keys, tokens, connection strings, or URLs
  with a password in them. Not even expired ones.
- **No internal topology.** No internal hostnames, private IPs, bucket
  names, or customer names. Reference the ticket or incident by id and let
  the reader with access go and look.
- **What breaks, not how to break it.** "Payments drop silently under load"
  is an entry. Repro steps for an auth bypass are not.
- **A live vulnerability is not a documentation problem.** If the honest
  entry would be "we do not validate this and anyone can post to it", the
  entry is not the risk; the code is. Say so to the user, write a stub that
  points at a private ticket, and leave the detail where access is
  controlled.

If an entry cannot be written without one of these, write the stub and tell
the user what you left out and where it should live instead.

## Voice

An entry is evidence for someone in three years, not a story. Specific
scenario, specific consequence, specific date.
