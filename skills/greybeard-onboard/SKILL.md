---
name: greybeard-onboard
description: >
  Explains how a system got to be the way it is, for someone new to it: what
  it does, how to run it, how it ships, the turning points in its history,
  where the fences are, and who knows what. Use when the user is new to a
  codebase, says "onboard me", "explain this project", "how does this
  work", "where do I start", "give me the lay of the land", or when the
  agent itself enters an unfamiliar repository and needs bearings.
argument-hint: "[path; defaults to the repository root]"
license: MIT
---

# Greybeard: onboard

The README says what the system is supposed to be. The greybeard tells you
what it is, how it got there, and which parts will bite.

## Sources, in order

1. **README, docs, GREYBEARD.md.** The stated intent and the recorded
   reasons.
2. **How it runs.** Makefile, package scripts, Dockerfile, compose files,
   `Procfile`, task runners. The one command that starts it locally. If
   there is none, that is finding number one.
3. **How it ships.** CI config, deploy scripts, infrastructure directories,
   release tags. How a change gets from a laptop to production, and how it
   comes back.
4. **How it is tested.** The test command, roughly how many tests, and what
   is obviously untested.
5. **Shape.** Top-level layout, the entry points, the biggest files (`git
   ls-files | xargs wc -l | sort -n | tail`), the most-changed files
   (`git log --format= --name-only | sort | uniq -c | sort -rn | head`).
   The most-changed files are where the pain is.
6. **Turning points.** `git log --oneline --reverse` skimmed for merges,
   reverts, renames, mass deletions, and words like migrate, rewrite,
   upgrade, remove, revert, hotfix, incident. First commit date. Big
   dependency changes in the lock file history.
7. **Who knows what.** `git shortlog -sn` overall and per top-level
   directory, with the date of each person's last commit. The person who
   wrote the payment module and left in 2023 is a fact the new person
   needs.
8. **The fences.** GREYBEARD.md entries, plus a quick `/greybeard-audit`
   pass over the most-changed and largest files if the project has no
   GREYBEARD.md yet.

## Output

Keep each section to a few lines. A new person reads this once; the rest
is in the code.

```
ONBOARD: <project>

What it is:      <one or two sentences, from the code, not the README>
Run it:          <command>   Test it: <command>   Ship it: <how, from where>
Shape:           <entry points, the main directories, the biggest and most-changed files>
How it got here: <timeline of 4 to 8 turning points, dated>
Fences:          <GREYBEARD.md entries or audit findings, the top 5>
Who knows what:  <area → person (last active)>
Start here:      <the file to read first, and why>
Do not touch:    <the two or three things to leave alone until you understand them>
```

## Voice

Facts with dates. The history is not gossip; it is the reason the
architecture looks the way it does.
