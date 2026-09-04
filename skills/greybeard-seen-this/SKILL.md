---
name: greybeard-seen-this
description: >
  Maps a "new" architecture or design proposal to the old problem it really
  is, what usually goes wrong with it, and the boring solution that works.
  Use when the user proposes a new architecture, pattern, service split,
  data flow, caching layer, queue, event system, or framework, or asks "is
  this a good idea", "what do you think of this design", "has anyone done
  this before".
argument-hint: "<the proposal>"
license: MIT
---

# Greybeard: seen this

"That is the same problem we had with the monolith, just with Kafka this
time."

New names, old problems. Your job is to name the old problem, say what
usually goes wrong, say what usually works, and then say what is genuinely
different this time, because sometimes something is.

## Steps

1. **Strip the names.** Remove the product and framework names from the
   proposal and describe the data flow in plain words: who writes what,
   where, who reads it, when, and what happens when a step fails.
2. **Match it.** Find the classic problem underneath. The usual suspects:

   | Looks like | Is really | Usually breaks when | Boring solution |
   |------------|-----------|---------------------|-----------------|
   | Write to DB and publish an event | Dual write | Process dies between the two; consumers see an event with no row, or a row with no event | Outbox table, or change-data-capture |
   | Cache in front of X | Cache invalidation | Stale reads after a write nobody routed through the cache | Short TTL, cache keys derived from the data version, or no cache until measured |
   | Call A, then B, then C, roll back on failure | Distributed transaction | B succeeds, C fails, A cannot be undone | Saga with compensations and idempotent steps, or one database |
   | Split the monolith into services | Distributed monolith | Every request fans out to five services and the slowest one sets the latency; a deploy needs all five | Split along team and data ownership, or keep the monolith and modularise |
   | Use the queue as the source of truth | Queue as a database | Someone needs to query it, replay it, or fix one message | A database, with the queue for delivery only |
   | Event sourcing | Rebuilding state from events | Schema of old events changes; replay takes hours; nobody can answer "what is the balance" without a projection | Snapshots and projections from day one, or plain CRUD with an audit log |
   | Two services share a table | Shared database | One team migrates the schema and the other pages at 3 a.m. | One owner, others go through its API |
   | Make it configurable | Inner platform | The config becomes a worse programming language with no tests | Hard-code, change the code when it changes |
   | Plugin architecture with one plugin | Speculative generality | Second plugin never comes; first one is harder to change through the interface | Direct call; extract the interface at the second plugin |
   | Retry on failure | Retry without idempotency | The payment goes through twice | Idempotency key, then retry |
   | Add multi-tenancy later | Retrofit tenancy | Every query, index, cache key, and background job needs a tenant id it does not have | Tenant id on every row from day one, or accept one deployment per tenant |
   | Store money as float | Float money | Cents disappear; the ledger does not balance | Integer minor units or decimal |
   | Our own auth / crypto / scheduler / ORM | Rebuilding a solved problem | Edge cases the incumbent solved a decade ago | The incumbent |
   | Big-bang cutover | Migration without a fallback | Cutover night finds the case nobody tested; there is no way back | Dual-run, strangler fig, feature flag |
   | Feature flags for everything | Flags never removed | 200 flags, nobody knows which combinations are live | A removal date on every flag |
   | Eventual consistency in the UI | Read-your-own-writes | User saves, refreshes, sees the old value, saves again | Read from the primary after a write, or show the write optimistically |
   | Microservice per entity | Nano-services | 40 deploys to change one field | Services around capabilities, not tables |

   If it matches none of these, say so. Do not force a match.
3. **What is different this time.** Sometimes the constraint that made it
   fail no longer exists. Say what would have to be true for this proposal
   to be the exception, and whether it is.
4. **Check the record.** GREYBEARD.md and git for the same idea in this
   codebase before.

## Output

```
SEEN THIS: <proposal in plain words>
Is really:       <classic problem>
Usually breaks:  <scenario> → <consequence>
Boring solution: <what usually works>
Different here:  <what would make this the exception, and whether it is> | nothing
On record:       <previous attempt in this codebase> | no record
Verdict:         go | go with <change> | do the boring thing
```

## Voice

Name the problem, not the person. Someone proposing dual writes is not
wrong to want the event; they just have not been paged for it yet.
