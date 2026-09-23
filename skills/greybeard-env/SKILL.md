---
name: greybeard-env
description: >
  Rules for touching anything outside the working tree: test environments,
  staging, production, shared databases, CI, virtual machines, kubernetes
  clusters. Establishes blast radius before the command runs, keeps an
  environment ledger in .greybeard/environments.md, and enforces read-only
  production, dry runs, explicit scoping and cleanup. Use BEFORE any deploy,
  restart, apply, migrate, seed, reset, ssh, kubectl, docker, terraform or
  psql against something shared, and when the user says "run it against
  staging", "check the cluster", "restart the service", "why does it only fail
  in production". Use when an environment is unfamiliar or undocumented.
argument-hint: "<what you want to run, and where>"
license: MIT
---

# Greybeard: environments

Rule zero: know the blast radius before you press enter. Four questions for
every command that leaves the working tree:

1. What does this touch?
2. Who else is using it right now?
3. What happens if it is wrong?
4. How do I undo it?

No answer to any one of them means you do not run it. You ask.

## The ledger

`.greybeard/environments.md`. If it does not exist, build it from what you can
find — CI config, terraform, kubernetes manifests, README, deploy scripts —
and ask about the rest. Never infer from a hostname which environment you are
in.

```markdown
## staging
- **Is:** kubernetes namespace `app-staging`, cluster `eu-north-1`, one replica
  per service.
- **Real:** production schema, anonymised data, sandbox payment provider. No
  real money, no real PII.
- **Shared with:** everyone. QA runs the regression suite nightly at 02:00.
- **Reset:** `make staging-reset`, twelve minutes, drops all data.
- **Blast radius:** other people's testing. Not customers.
- **Access:** `kubectl --context staging`; credentials in the "eng" vault.
- **Do not:** reset between 01:30 and 03:00.
```

Fields: **Is**, **Real** (money, PII, customers?), **Shared with**, **Reset**,
**Blast radius**, **Access**, **Do not**.

## By class

**Local and ephemeral first.** Reproduce in a container or a disposable
namespace before touching anything shared. If a bug only reproduces in staging,
that is a finding worth writing down, not a licence to debug in staging.

**Shared — staging, CI, dev clusters.** Namespace everything you create by
ticket ID. Check whether a run is in progress before a reset. Everything you
create gets a time to live or a line in the handover; the leaked resource is
always on someone else's invoice.

**Production.** Read-only by default. Reads: logs, metrics, `describe`,
`EXPLAIN`, `--dry-run`. Writes, restarts, scaling, migrations, flag flips:
explicit human go-ahead, in this session, for this command, with the command
quoted back. A go-ahead from an hour ago for a different command is not a
go-ahead for this one. Check `/greybeard-deploy` first, and check what day it
is.

**Data.** Never copy production data down. Never point a local process at a
production database "just to look" — a read query can lock, a client library can
retry a write, and an ORM can run a migration on connect.

## Command discipline

Dry run where one exists: `--dry-run=server`, `terraform plan`, `EXPLAIN`,
`--check`, `-n`. Read the plan; do not skim it. Scope explicitly every time —
context, namespace, label selector, `WHERE` clause — and print the context
before acting rather than trusting that the current one is what you think. No
`--force`, no `-f` on a delete, no `DROP`, no `TRUNCATE` without a go-ahead and
a stated recovery path.

## When an environment is broken

`/greybeard-debug`, but the first question is what changed in the *environment*,
not the code: deploys, config, rotated secrets, node pool, certificates, quota,
disk. Most "it works locally" is one of those seven.

## Leave it as you found it

What you created, delete. What you scaled, restore. What you changed by hand,
either commit it as code or write it into the handover. Undocumented hand
changes are how an environment stops matching its manifests, and that is always
discovered in the middle of an incident.

## Voice

One line before the command: what it touches, and how it is undone. Then run
it. No ceremony for a read.
