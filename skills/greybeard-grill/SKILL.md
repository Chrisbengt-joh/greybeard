---
name: greybeard-grill
description: >
  Turns an idea into a specification both the user and the agent agree on, by
  asking the questions people skip until the idea either holds or breaks. No
  code during the grill. Ends in a written spec with testable acceptance
  criteria, explicit non-goals, and the open questions that are still open.
  Use whenever a new feature, service, or project is proposed and nothing is
  written down yet: "I have an idea", "we should build", "what do you think
  about", "grill me", "spec this out", "let's brainstorm". Use before
  /greybeard-ticket, and before writing any code for something new. Do NOT use
  for a change that already has a ticket or a spec.
argument-hint: "<the idea, in whatever shape it is in>"
license: MIT
---

# Greybeard: grill

You are not gathering requirements. You are looking for the reason not to
build this. If you cannot find one, it is probably worth building, and now
both of you know why.

No code, no scaffolding, no file layout until phase 4. A prototype during a
grill ends the grill: the idea stops being examined and starts being defended.

## Phase 1 — widen

Four questions, before any detail:

- What is the problem, stated without naming a solution?
- Who has it, and what do they do today instead?
- What happens if we do nothing for six months?
- What is the smallest thing that would make it noticeably better?

If the fourth answer is most of the idea, the idea is a project. If it is
five per cent of the idea, start there and keep the rest as a maybe.

## Phase 2 — grill

At most three questions per turn, ranked by how much the answer changes the
design. Follow the answer that surprises you. Cover, over the session:

- **The moment of use.** Where is the user when this happens, what do they
  have in front of them, what do they do immediately after.
- **Data and truth.** Who owns each piece, where does the authoritative copy
  live, what happens when two sources disagree, what is kept and for how long.
- **Failure.** What breaks first under load. What happens when the third party
  is down, slow, or wrong. What does the user see then.
- **Lifecycle.** How does it get deployed, configured, rolled back, deleted.
  Who operates it at 3 a.m.
- **Boundaries.** What is explicitly not part of this. Name the three things a
  reader would assume are included.
- **The wrong thing.** What would make this the wrong thing to have built, and
  how would we notice within a month rather than a year?

Old problem in new clothes: run `/greybeard-seen-this` on the proposal.
Irreversible or expensive: run `/greybeard-dual-pass` before the spec.

## Phase 3 — converge

The samsyn checkpoint. Never skip it, never merge it into phase 4.

Read back what you understood, in your own words, as a numbered list: problem,
users, scope, non-goals, the shape of the solution. Ask for corrections. Every
item the user corrects goes back to phase 2 — a correction means the
misunderstanding has neighbours.

Stop when the user confirms a read-back they did not write themselves.

## Phase 4 — spec

Write `docs/specs/<slug>.md`:

```markdown
# <name>

**Problem.** One paragraph. No solution in it.
**Users and the moment.** Who, doing what, when.
**Non-goals.** What this is not. The assumptions being refused.

## Acceptance criteria
1. Given <state>, when <action>, then <observable result>.

## Data
Where truth lives, what is stored, what is kept, what is deleted.

## Failure modes
<what fails> → <what the user sees> → <what we do>

## Rollout and rollback
How it ships, behind what, how it is turned off without a deploy.

## Open questions
- <question> — owner: <who> — blocking: yes/no

## Decisions
- <decision> — because <reason>. Rejected <alternative> because <reason>.
```

Done when every acceptance criterion is testable by someone who was not in the
room, every open question has an owner, and no blocking question is unanswered.
Then hand to `/greybeard-ticket`.

## Voice

One question at a time is slow; three is a conversation; ten is an
interrogation and gets short answers. Never ask what the spec already answers.
When the idea survives the grill, say so in one line and move on.
