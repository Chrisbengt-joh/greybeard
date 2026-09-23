---
name: greybeard-ui
description: >
  House preferences for user interfaces: what to settle before pixels, the five
  states every view needs, non-negotiable accessibility, reusing the existing
  design system instead of starting a second one, destructive actions, form
  behaviour, and interface copy. Use on any interface work — a new screen, a
  component, a form, a dashboard, a redesign — and when the user says "make it
  look better", "add a page for", "the UI is confusing". This is also the
  example specialist skill: copy its shape for your own areas, and source its
  content from .greybeard/kb/preferences/.
argument-hint: "[the screen, component, or interface question]"
license: MIT
---

# Greybeard: interfaces

This is the example of a specialist skill. It encodes one team's preferences for
one area. Copy the shape, replace the content, and keep the content in
`.greybeard/kb/preferences/ui/` so it can be argued with (`/greybeard-kb`). The
positions below are a starting point, not a law.

## Before pixels

What is on this screen, in one sentence. Who is looking at it, and what are they
trying to finish. What is the one thing they do here — that gets the visual
weight, and everything else gets less. A screen with three equally important
things has none.

## Five states, every view

Design all of them or you have designed half a component:

- **Empty.** First use. The most skipped state and the one every new user sees.
- **Loading.** And what happens when it is slower than expected.
- **Error.** What went wrong, and what to do now. Never "something went wrong".
- **Partial.** Some data arrived, some failed. Show what you have, mark what you
  do not.
- **Too much.** Ten thousand rows, a two-hundred-character name, a missing
  avatar, a negative number, a right-to-left string.

## Accessibility, non-negotiable

Every action reachable by keyboard, with visible focus. Labels tied to inputs.
Contrast at least 4.5:1 for text. Colour never the only carrier of meaning.
Reduced motion respected. Touch targets 44px. These are not preferences and are
not traded against aesthetics.

## Use what is there

No new design system, no second component library, no third icon set. Find the
existing component before writing one. If it is ninety per cent right, extend
it — a fork is two components that drift, and in a year nobody knows which one
is current.

## Destructive and irreversible

Confirm with what will actually happen, named: "Delete 43 invoices", not "Are
you sure?". Undo beats confirmation wherever undo is possible. Destructive is
never the default focus and never sits next to the common action.

## Forms

Validate on submit, not on every keystroke — a field that turns red while the
user is still typing is hostile. Errors next to the field, in words that say
what to do. Never clear what the user typed. Say what is required before they
find out by failing.

## Copy

The interface speaks the user's words, not the schema's. No "entity", no
"resource", unless the user says those words. Errors state what happened and the
next action. No exclamation marks; nothing here is exciting.

## Boring wins

A familiar pattern with no personality beats a novel one with plenty. Novelty is
a cost paid by every user, every time. Spend it on the one thing that is
genuinely different about the product, and be boring everywhere else.

## Write it down

Every real preference decision goes to `.greybeard/kb/preferences/ui/`, one
claim per note, with the reason. Otherwise it is relitigated on the next screen,
by someone with a different opinion and equal confidence.

## Voice

Name the rule in three words. "Empty state missing." Not a critique essay, and
not a rewrite of a design somebody already agreed on.
