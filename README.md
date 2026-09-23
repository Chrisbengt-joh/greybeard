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

Greybeard is five hooks and twenty-five skills.

**At session start** the ruleset is injected as context, together with the
project's `GREYBEARD.md` if there is one. The same hook runs at the start
of every subagent, so delegated work runs on the same reflexes. The agent
now runs on five reflexes:

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

**Before a commit** a second `PreToolUse` hook reads `GREYBEARD.md` and
says what should not be committed: secrets, internal hostnames, or an entry
that describes how to break something rather than what breaks. It speaks
once per version of the file, not once per commit, and only asks for
confirmation when what it found looks like a credential.

**Before a command that cannot be taken back** a third `PreToolUse` hook,
the fence, denies or asks: force pushes, history rewrites, `DROP TABLE`,
`terraform destroy`, mail leaving the machine, and edits to the hooks
themselves. Mail goes through `greybeard-approve` instead, which needs a
code only you can see. It ignores greybeard mode, and PowerShell commands
pass it unclassified for now. See [`SECURITY-NET.md`](SECURITY-NET.md).

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

The level is per session: two Claude Code windows keep their own, so
switching level or turning greybeard off in one leaves the other alone. The
flag lives in `~/.claude/greybeard-modes/`, and files for sessions untouched
for a week are swept at startup.

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
| An idea, before any code | `/greybeard-grill <idea>` asks the questions people skip until the idea holds or breaks. No code; ends in a written spec with testable acceptance criteria and explicit non-goals. |
| Turning a spec into work | `/greybeard-ticket <what>` writes a ticket a stranger can implement: one reversible change, observable acceptance criteria, rollback, and the branch and commit convention. Splits tickets that are too big. |
| "I think it's finished" | `/greybeard-done [ticket]` runs eleven gates, from acceptance criteria checked literally to a test proven to fail without the change. Evidence instead of a claim. |
| "Where are we?" | `/greybeard-bearing [ticket]` compares where the work is against the goal, spec and acceptance criteria with ten fixed questions. For drift, loops, and the same error twice. |
| Session ending, context filling | `/greybeard-handover` puts each fact where it belongs before compaction, and writes a handover note that includes the dead ends. |
| Before a decision you cannot undo | `/greybeard-dual-pass <decision>` builds the strongest case for, attacks it with concrete scenarios, then gives a verdict, a confidence, and the fact that would change it. |
| "What did we decide?" | `/greybeard-transcript` indexes the session as a tree with a verbatim grep anchor on every leaf, including what was rejected and why. |
| "Our convention is…" | `/greybeard-kb [what]` keeps the project's own knowledge base in `.greybeard/kb/`: short single-claim notes with evidence, status and a review date. |
| Anything outside the working tree | `/greybeard-env <what, where>` establishes blast radius before the command runs and keeps an environment ledger in `.greybeard/environments.md`. |
| Several agents on one repo | `/greybeard-relay` sets frozen contracts, one owner per file, and a status board in `.greybeard/relay/`. Also decides whether to parallelise at all. |
| Interface work | `/greybeard-ui` holds house preferences: the five states every view needs, accessibility, reusing the design system. The example specialist skill; copy its shape. |
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

**What does not go in it.** The file is committed, and in a public repo a
commit is permanent: deleting an entry later leaves it in the history, the
clones and the forks. No credentials or keys. No internal hostnames, private
addresses, or customer names — reference a ticket by id and let the reader
with access go and look. Write *what breaks*, not *how to break it*: "payments
drop silently under load" is an entry, repro steps for an auth bypass are not.
If the honest entry would describe an unfixed hole, the entry is not the risk,
the code is — write a stub pointing at a private ticket and fix the code. The
commit hook checks for the obvious cases; it does not replace reading the
entry you just wrote.

Greybeard writes to it when it learns something (`full` and `ultra`), when
you ask (`/greybeard-remember`), after a postmortem, and when a debug
session ends in a workaround someone will later want to remove. Commit it
with the code. See [`examples/GREYBEARD.md`](examples/GREYBEARD.md) for a
fuller example.

## Working with a team

`GREYBEARD.md` is committed, so the knowledge arrives with the clone. A new
dev's first session already knows why the sleep is there.

**Adopting it**

- New project: `/greybeard-new`, then commit a near-empty `GREYBEARD.md` so
  the file exists before anyone needs it.
- Existing codebase: `/greybeard-onboard` for bearings, then
  `/greybeard-audit`. The audit finds candidates, not reasons — it hands the
  people who were there a list to answer. An entry written from a guess is
  worse than no entry.

**The loop**

1. Someone finds out why something is the way it is — from `/greybeard-why`,
   a postmortem, or their own memory.
2. `/greybeard-remember` writes it down.
3. The entry ships in the PR and gets reviewed like code.
4. The next person to touch that file gets it injected by the `PreToolUse`
   guard, before their edit, whether or not they ever read the file.

Step 4 is the one that pays. It works for the dev who joined last month and
was not in the incident channel.

**Shared and not shared**

| | Where | Scope |
|---|---|---|
| The entries | `GREYBEARD.md`, in the repo | The team |
| The level | `~/.claude/greybeard-modes/` | One session, one machine |
| The default level | `GREYBEARD_DEFAULT_MODE`, then `~/.claude/greybeard.json` | One machine |

**Known limits**

- No repo-level default level. A team cannot commit "this repo runs at
  `ultra`"; each dev sets their own, or you set the environment variable in
  whatever bootstraps their shell.
- Above 12 000 characters the session-start injection truncates and points
  at the file. The per-file guard is not truncated, so the warning at the
  moment of the edit keeps working; you lose the ambient context, not the
  net.
- A `GREYBEARD.md` in a subdirectory shadows the root one for files beneath
  it. Nearest file wins; they are not merged. Splitting a large file by
  package is therefore not a way around the 12 000 characters.

## Files

```
.claude-plugin/       plugin and marketplace manifests
hooks/hooks.json      SessionStart, SubagentStart, UserPromptSubmit, PreToolUse x3
hooks/*.js            the hooks; no dependencies, Node 18+
tools/                greybeard-approve, the gate the fence points at
skills/*/SKILL.md     the ruleset and the twenty-five commands
SECURITY-NET.md       what the fence and the gate stop, and what they do not
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
