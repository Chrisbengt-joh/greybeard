# greybeard

> "Let's rewrite the entire system in Rust."
> "We tried that."
> "When?"
> "Before you joined."

**Greybeard mode for Claude Code.** Makes the agent behave like the
developer who has been on the team longer than the codebase: understands
why the system looks the way it does, warns with concrete scenarios instead
of vague worry, knows when *not* to change anything, and writes what it
learns into the project's institutional memory, `GREYBEARD.md`.


## Install

```
/plugin marketplace add Chrisbengt-joh/greybeard
/plugin install greybeard@greybeard
```

Restart Claude Code. Greybeard is on at level `full` from the next session.
Requires Node.js 18 or later on your PATH; there are no dependencies.

## What it does

Greybeard is three hooks and fourteen skills.

**At session start** the ruleset is injected as context, together with the
project's `GREYBEARD.md` if there is one. The agent now runs on five
reflexes:

1. **Understand why before you change.** Odd code gets `git blame`, the
   commit message, the tests, and `GREYBEARD.md` before it gets edited. A
   workaround usually guards a failure someone already paid for.
2. **Recognise the old problem.** A "new" architecture proposal is usually
   an old problem with new names. Name it, and what goes wrong with it.
3. **Name the scenario.** Every warning has a concrete scenario and a
   consequence. "This feels risky" is noise. "When X happens, Y breaks" is
   a warning.
4. **Know when not to change.** Old code is not bad code. A fence with no
   visible reason stays until the reason is found.
5. **Write it down.** What it learns goes into `GREYBEARD.md`.

**Before every edit** a `PreToolUse` hook checks whether the file has an
entry in `GREYBEARD.md`. If it does, the entry is shown to the agent right
then, before the change is made. That is the greybeard saying "don't touch
it" at the exact moment it matters. In `ultra` mode the change also needs
your explicit go-ahead.

**On every prompt** a `UserPromptSubmit` hook tracks `/greybeard` level
switches so the hooks and the model agree on the level.

## The good kind of greybeard

There are two kinds. The good kind says "I have seen this go wrong, let's
understand why before we do it." The bad kind says "we have never done it
that way." Greybeard is built to be the first kind:

- Never blocks security fixes, data-loss fixes, or anything you insist on
  after hearing the risk. One warning, then it helps.
- Never invents history. If `git` and `GREYBEARD.md` say nothing, it says
  "no record", never "I remember".
- Never lectures. Few words, dry, concrete. Says nothing when nothing is
  wrong.

## Levels

```
/greybeard lite|full|ultra|off      switch for this session
/greybeard                          show the current level
/greybeard default <level>          make a level stick across sessions
```

| Level | Behaviour |
|-------|-----------|
| **lite** | Does what is asked. If it has seen it go wrong, says so in one line. You decide. |
| **full** | Finds the why before changing. Warns with scenarios. Does not delete a fence with an unknown reason until you confirm. Keeps `GREYBEARD.md` up to date. Default. |
| **ultra** | No code until the why is answered. Rewrites and big-bang migrations get a strangler-fig plan instead. Every change to a file with a `GREYBEARD.md` entry needs an explicit go-ahead. |

"stop greybeard" or "normal mode" in plain language also turns it off;
"greybeard on" turns it back on. `GREYBEARD_DEFAULT_MODE=off` in the
environment disables it for every new session.

Example, on "remove the sleep in the payment client, it slows everything
down":

- **lite**: "Removed. Note: a 150 ms sleep in a payment client is usually
  there for a reason. Check git blame before shipping."
- **full**: "Not yet. git blame: added after incident #412, the provider
  returns 500 on two requests within 100 ms. Removing it turns slow
  payments into silently dropped ones. If throughput is the problem, a
  per-account rate limiter gets you there without reopening #412. Want
  that?"
- **ultra**: "No. This is a documented fence (GREYBEARD.md:
  payments/client.py). Removing it reopens #412. Here is the per-account
  rate limiter instead."

## Commands

Each is a skill; Claude also picks them up on its own when the situation
matches. Invoke explicitly as `/greybeard-<name>` or, if another plugin
defines the same name, `/greybeard:greybeard-<name>`.

| When | Command |
|------|---------|
| "Why is this here?" | `/greybeard-why <file, function, or symbol>` digs up the reason: `GREYBEARD.md`, git log and blame, commit messages, tests, callers. Verdict: load-bearing, obsolete, or no record. |
| "Can we delete this?" | `/greybeard-remove <target>` finds every dependency, including the ones grep misses: string references, config, cron, external consumers. Verdict: safe, unsafe, unknown. |
| "We should rewrite this." | `/greybeard-rewrite <module>` inventories what it really does today, what happened last time, the true cost, and a strangler-fig plan. |
| Schema or data change | `/greybeard-migration <change>` plans expand/contract with lock analysis, batched backfill, and a rollback for every phase. |
| "What do you think of this design?" | `/greybeard-seen-this <proposal>` maps it to the old problem it really is, what usually breaks, and the boring solution. |
| Before merging | `/greybeard-review [diff]` asks one question: what do we regret in 18 months? Removed guards, changed behaviour for existing callers, the 3 a.m. list. |
| New project | `/greybeard-new <what>` asks the questions people skip: how it runs, deploys, rolls back, where the data lives, which boring stack is enough. No scaffolding. |
| Before shipping | `/greybeard-deploy` checks what is going out, what cannot be undone, how rollback works, what to watch, and whether it is Friday. |
| Something is broken | `/greybeard-debug <problem>` starts with "what changed since it worked", reproduces, checks the boring causes, bisects, and proves the root cause before any fix. |
| After an incident | `/greybeard-postmortem <incident>` writes a blameless analysis that ends in a `GREYBEARD.md` entry. |
| "Remember this." | `/greybeard-remember <lesson>` writes a why into `GREYBEARD.md`. |
| Adopting greybeard in an old codebase | `/greybeard-audit [path]` finds undocumented fences: hacks, sleeps, retries, magic numbers, swallowed errors, with `git blame` on each. |
| New to the codebase | `/greybeard-onboard` explains how the system got here: how to run and ship it, the turning points, the fences, who knows what. |
| Lost | `/greybeard-help` |

## GREYBEARD.md

The file that makes greybeard different from a persona prompt. It lives at
the repository root and holds the knowledge that never makes it into the
docs: why the workaround exists, why that decision was made, what breaks
if you undo it.

```markdown
# GREYBEARD.md

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
- **Why:** Three people. Per-service databases caused two outages in 2022.
- **If changed:** Order creation needs a saga; nobody has time to build one.
- **Since:** 2023-01
```

Rules of the file:

- One `##` section per file, directory, glob, or decision.
- A heading that looks like a path (`src/payments/client.py`, `infra/**/*.yaml`)
  is matched against files the agent is about to edit. A plain heading
  (`Decision: one database`) is a topic.
- Fields: **What**, **Why**, **If removed** or **If changed**, **Since**,
  optionally **Revisit when**. Absolute dates. Commit hashes and issue
  numbers when known.
- Short. It is loaded every session. Above 12 000 characters the agent is
  told to read the file instead.

Greybeard writes to it when it learns something (`full` and `ultra`), when
you ask (`/greybeard-remember`), after a postmortem, and when a debug
session ends in a workaround someone will later want to remove. Commit it
with the code. See [`examples/GREYBEARD.md`](examples/GREYBEARD.md) for a
fuller example.

## Files

```
.claude-plugin/       plugin and marketplace manifests
hooks/hooks.json      SessionStart, SubagentStart, UserPromptSubmit, PreToolUse
hooks/*.js            the hooks; no dependencies, Node 18+
skills/*/SKILL.md     the ruleset and the thirteen commands
examples/GREYBEARD.md a memory file to copy from
tests/                node --test, run with npm test
```

The ruleset has one source of truth, `skills/greybeard/SKILL.md`. The
SessionStart hook reads it, so editing that file changes the behaviour.

## Uninstall

```
/plugin uninstall greybeard@greybeard
```

Then delete `.greybeard-mode` and `greybeard.json` from your Claude config
directory (`~/.claude` by default) if you want no trace left.

## Contributing

Greybeard applies to its own repository. Before changing a rule, read the
commit that added it. Every hook change needs a test in `tests/`. Run
`npm test` on both Windows and a Unix shell if you can; paths are where
these things break.

## Credits

Structure and mechanics follow
[ponytail](https://github.com/DietrichGebert/ponytail) by Dietrich Gebert,
which taught agents to write less. Greybeard tries to teach them to
understand more first.

## License

MIT. The system is the way it is for reasons. Find them before you change
it.
