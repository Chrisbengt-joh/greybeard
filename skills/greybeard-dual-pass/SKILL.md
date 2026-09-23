---
name: greybeard-dual-pass
description: >
  A thinking discipline for decisions: build the strongest case FOR, then
  switch sides completely and attack it with concrete scenarios, then conclude
  with a verdict, a confidence, and the one fact that would change it. Stops
  the agent from deciding first and reasoning afterwards. Use before anything
  irreversible or expensive, for architecture and dependency choices, when the
  user is visibly excited about an idea, when you notice you have only found
  arguments in one direction, before executing your own plan, and when asked
  "what do you think", "is this a good idea", "should we do X or Y". Use inside
  /greybeard-grill, /greybeard-new and /greybeard-rewrite.
argument-hint: "<the decision, plan, or proposal>"
license: MIT
---

# Greybeard: dual pass

The failure this fixes: you decide in the first sentence and spend the rest
justifying it. Two passes, fully separated, then a verdict. Never blended — a
blended pass produces "there are pros and cons", which is nothing anybody can
act on.

## Pass 1 — confirmational

Take the idea seriously and build the strongest version of it. Not a summary of
what the user said: the version an advocate who is good at this would present.

- What problem does it actually solve, and for whom?
- What has to be true for it to be the right call?
- Where has this worked, and what did those places have in common?
- What is the cheapest version that still gets the benefit?

No hedging, no "but", no "however". If you cannot make a real case, say so and
stop — the idea is already dead and pass 2 is wasted effort.

## Pass 2 — adversarial

Switch sides completely. You now want this not to happen, and you have eighteen
months of hindsight the advocate does not.

- Every objection is a scenario and a consequence. "This could be risky" is not
  an objection. "When the retry storm hits during month-end close, the queue
  backs up behind a lock nobody can find" is.
- Attack the assumption pass 1 needed to be true. Not the details — the
  assumption.
- Find the failure that only appears at scale, at 3 a.m., at month-end, or
  after the author has left the team.
- Name the old problem it really is: `/greybeard-seen-this`.
- What does it cost to undo, and who would have to do it?

Do not soften anything here. Softening happens in pass 3.

## Pass 3 — concluding

Weigh; do not average. In order:

1. Is it reversible? A cheap mistake beats a slow decision. If it can be undone
   in a day, stop deliberating and try it.
2. What is the worst realistic outcome, and can we survive it?
3. Does the adversarial pass contain a scenario nobody has an answer to? One
   unanswered scenario outweighs six answered ones.
4. Is there a smaller version that tests the assumption for a fraction of the
   cost?

## Output

```
FOR:      three to six lines, the strongest case
AGAINST:  three to six lines, each a scenario and a consequence
VERDICT:  do it | do the smaller version | not yet | no
          confidence: low | medium | high
          changes if: <the one fact that would flip this>
```

Long form only when asked. The block is the default.

## Discipline

Write pass 1 before you have thought of pass 2's arguments, or pass 1 becomes a
straw man you built to knock down. If pass 2 is shorter than pass 1, you did not
switch sides. If the verdict was obvious before pass 1 started, you performed
the passes rather than ran them — say so, and say why the verdict was
pre-formed.

Cheap variant for small decisions: one line each. Skip it entirely for anything
reversible in an afternoon. Run it in full for anything that is not.

## Voice

The point is not balance. The point is that both cases were made honestly
before one of them won.
