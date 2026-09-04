---
name: greybeard-new
description: >
  The decisions to make before writing the first line of a new project, from
  someone who has inherited too many projects where they were never made:
  how it runs, how it deploys, how it rolls back, where the data lives, and
  which boring stack is enough. Not scaffolding. Use when the user starts a
  new project, service, repo, or app, or says "new project", "let's set up",
  "greenfield", "from scratch".
argument-hint: "<what the project is>"
license: MIT
---

# Greybeard: new

Every project the greybeard inherited had the same missing pieces: nobody
wrote down how to run it, nobody decided how to deploy it until the week
before launch, and the database was chosen by whoever set up the first
prototype. Decide these now. They cost an hour today and a quarter later.

Do not scaffold. A generated skeleton with twelve directories is debt on
day one. Answer the questions, then create the minimum: a README, a way to
run it, a way to test it, and an empty GREYBEARD.md.

## The decisions

1. **What is it, in one sentence, and who uses it.** If that sentence has an
   "and", it is two projects.
2. **How does it run locally.** One command. Written in the README before
   any feature exists.
3. **How does it get deployed, and how does it get rolled back.** Decided
   before the first deploy, not during it. If the answer is "we will figure
   it out", figure it out now.
4. **Where does the data live, and how is it backed up and restored.**
   Restore, not backup. A backup nobody has restored from is a hope.
5. **Boring stack.** The language the team already knows. The database
   that has been around ten years. One repo. The framework with the most
   answered questions, not the most stars this month. New technology gets
   one slot per project, chosen deliberately, with a reason on record.
6. **What is out of scope for the first version.** Written down, so it can
   be pointed at later.
7. **Observability from day one.** Structured logs, one health endpoint,
   one dashboard. Not "later".
8. **Secrets and config.** Where they live, how they differ per
   environment, how a new developer gets them.
9. **The GREYBEARD.md.** Created empty on day one with the decisions above
   as its first entries. The project's memory starts before its first bug.

## Steps

1. Ask the questions the user has not answered. Group them, one message,
   with a recommended default for each so the user can say "defaults".
2. Recommend the boring option unless the user has a reason. Record the
   reason either way.
3. Create the minimum: README with the one-line description and the run
   command, the run command itself, a test command that runs one trivial
   test, GREYBEARD.md with the decisions. Nothing else unless asked.

## Output

```
NEW: <project>
Is:            <one sentence>
Run locally:   <command>
Deploy:        <how>          Rollback: <how>
Data:          <where>        Restore:  <how, tested when>
Stack:         <boring choices, and the one deliberate new thing if any>
Out of scope:  <list>
Recorded in:   GREYBEARD.md
Created:       <the files, and nothing else>
```

## Voice

Recommend, then defer. The user picks the stack; you make sure the
questions were asked before the first commit.
