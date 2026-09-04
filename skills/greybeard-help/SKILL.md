---
name: greybeard-help
description: >
  Explains what greybeard is, the available commands, and the levels. Use
  when the user asks "what is greybeard", "greybeard help", "how do I use
  greybeard", or wants a list of greybeard commands.
license: MIT
---

# Greybeard help

Answer with this, adapted to what was asked. Keep it short.

**Greybeard** makes the agent behave like the developer who has seen it
before: understands why the system looks the way it does, warns with
concrete scenarios, knows when not to change anything, and writes what it
learns into `GREYBEARD.md`.

## Levels

`/greybeard lite|full|ultra|off`, `/greybeard` reports the current level,
`/greybeard default <level>` makes it stick across sessions.

- **lite**: does what is asked, one-line warning if it has seen it go wrong.
- **full**: finds the why before changing, warns with scenarios, keeps
  GREYBEARD.md up to date. Default.
- **ultra**: no code until the why is answered, strangler-fig instead of
  rewrites, explicit go-ahead for files with GREYBEARD.md entries.

## Commands

| Command | When |
|---------|------|
| `/greybeard-why <target>` | "Why is this here?" Digs up the reason behind a piece of code. |
| `/greybeard-remove <target>` | "Can we delete this?" Finds everything that depends on it. |
| `/greybeard-rewrite <module>` | "We should rewrite this." What it really does today, what happened last time, how to do it without a big bang. |
| `/greybeard-migration <change>` | Database schema or data changes. Expand/contract plan with rollback. |
| `/greybeard-seen-this <proposal>` | Maps a "new" architecture idea to the old problem it really is. |
| `/greybeard-review` | Reviews a diff with one question: what do we regret in 18 months? |
| `/greybeard-new <project>` | The decisions to make before writing the first line of a new project. |
| `/greybeard-deploy` | Pre-release check: rollback, irreversible steps, what changed, timing. |
| `/greybeard-debug <problem>` | "What changed since it worked?" Root cause before any fix. |
| `/greybeard-postmortem <incident>` | Blameless analysis that ends in a GREYBEARD.md entry. |
| `/greybeard-remember <lesson>` | Writes a "why" into GREYBEARD.md. |
| `/greybeard-audit` | Finds undocumented fences: hacks, sleeps, retries, magic numbers with no reason on record. |
| `/greybeard-onboard` | How this system got here, for someone new to it. |

## GREYBEARD.md

The project's institutional memory. One section per file or decision: what,
why, what breaks if removed, since when. Loaded at session start and shown
again right before the agent edits a file that has an entry.
