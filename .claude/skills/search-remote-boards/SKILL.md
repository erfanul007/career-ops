---
name: search-remote-boards
description: Use when searching remote-only job boards — We Work Remotely, RemoteOK, Himalayas — for postings workable from a given country. Public pages, no login.
---

# Search Remote Boards

Public boards — plain `WebFetch`/`WebSearch` by default. Direct fetch 403s (WWR and RemoteOK both do) → fall back in order: board RSS feed → board JSON API → public reader proxy (`r.jina.ai/<full-url>`) — all public, no login. Last resort: chrome-devtools on a public window (`browser-session` preflight/bootstrap applies, its login gate doesn't). Board URLs churn — on 404/redesign, adapt via the board's own nav and note the change.

| Board | Search | Eligibility signal |
|---|---|---|
| We Work Remotely | `weworkremotely.com/remote-jobs/search?term=<kw>` — 403 direct → category RSS `weworkremotely.com/categories/remote-back-end-programming-jobs.rss` or reader proxy | per-post region label — capture verbatim ("Anywhere in the World", region lists) |
| RemoteOK | JSON API `remoteok.com/api` (proxy on 403) · tag pages `remoteok.com/remote-<tag>-jobs` (tags `csharp`, `dot-net`, `python`, `ai`) | region tag per post |
| Himalayas | **`?search=` is ignored server-side** — use skill slugs `himalayas.app/jobs/<skill-slug>` (`c-net`, `fastapi`, `machine-learning`, `llm`) and country+skill `himalayas.app/jobs/countries/<country>/<skill-slug>` (e.g. `/bangladesh/c-net`). Country filter = built-in eligibility pre-filter — highest-signal board (2026-07 run) | country-eligibility filter built in |

**Removed 2026-07 — Remotive:** public API capped at ~31 jobs and ignores `search`/`category` params; every HTML/RSS surface returns 403. Don't re-add without verifying it works again.

Per post capture: title · company · url · posted-date · **eligibility scope** (Worldwide / region list / unstated) · comp if shown · apply link.

**Unstated eligibility ≠ worldwide** — mark `eligibility=unknown` and verify on the company's own posting before any save.
