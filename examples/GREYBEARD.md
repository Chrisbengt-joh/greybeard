# GREYBEARD.md

Institutional memory. Why things are the way they are. Read before you
change them.

Sections whose heading is a path are shown to the agent right before it
edits a matching file. Other headings are free-form topics. Keep entries
short, specific, and dated.

## src/payments/client.py

- **What:** 150 ms sleep between consecutive requests to the provider.
- **Why:** Provider returns HTTP 500 on two requests within 100 ms.
  Incident #412, 2023-04-12, silent payment drops for six hours.
- **If removed:** Payments fail silently under load. The error is swallowed
  by the retry wrapper two layers up, so nothing alerts.
- **Since:** 2023-04-14, commit 3f2a9c1
- **Revisit when:** Provider confirms rate limiting is fixed on their side.

## src/reports/monthly.py

- **What:** Runs the export twice and keeps the second result.
- **Why:** The first run warms a cache in the reporting database that is
  otherwise cold on the first of the month. Without it the export times out
  at 30 minutes. Nobody has found which query is slow. Ticket #877.
- **If removed:** Month-end export fails on the first attempt, finance
  escalates by 09:00.
- **Since:** 2022-11
- **Revisit when:** Someone has a free day and a query profiler.

## infra/k8s/api-deployment.yaml

- **What:** `maxSurge: 0`, one pod replaced at a time.
- **Why:** The API holds a connection pool of 40 to a database that allows
  100 connections. Two extra pods during a rollout exhausted the limit and
  took the site down. 2024-02-08.
- **If changed:** Rollouts exhaust database connections. Raise the database
  limit first, then this.
- **Since:** 2024-02-09

## Decision: one database, not one per service

- **What:** All services share the primary Postgres.
- **Why:** Three people. Cross-service transactions caused two outages in
  2022 when per-service databases were tried.
- **If changed:** Order creation needs a saga; nobody has time to build one.
- **Since:** 2023-01
- **Revisit when:** Team is above eight people or write load exceeds one
  primary.

## Decision: no rewrite of the billing module

- **What:** Billing stays on the 2016 code.
- **Why:** Rewrite attempted 2019-03 to 2019-09. Abandoned at 70 % parity;
  the remaining 30 % was undocumented tax edge cases per country. Two of the
  three people on it left. Branch `billing-v2` kept for reference.
- **If changed:** Same edge cases, now with nobody who remembers them. Use
  the strangler fig: one country at a time, behind the same interface.
- **Since:** 2019-10
