---
name: search-remote-boards
description: Use when searching remote-only job boards — We Work Remotely, RemoteOK, Remotive, Himalayas — for postings workable from a given country. Public pages, no login.
---

# Search Remote Boards

Public boards — plain `WebFetch`/`WebSearch` by default. Page returns a JS shell → retry via chrome-devtools on a public window: `browser-session` preflight/bootstrap applies, its login gate doesn't (public pages). Board URLs churn — on 404/redesign, adapt via the board's own nav and note the change.

| Board | Search | Eligibility signal |
|---|---|---|
| We Work Remotely | `weworkremotely.com/remote-jobs/search?term=<kw>` · category `remote-back-end-programming-jobs` | per-post region label — capture verbatim ("Anywhere in the World", region lists) |
| RemoteOK | `remoteok.com/remote-<tag>-jobs` (tags `csharp`, `dot-net`, `python`, `ai`) · JSON `remoteok.com/api` | region tag per post |
| Remotive | `remotive.com/remote-jobs/software-dev?query=<kw>` · API `remotive.com/api/remote-jobs?search=<kw>` | per-post Location restriction field |
| Himalayas | `himalayas.app/jobs/countries/<country>` (e.g. `/bangladesh` — pre-filtered eligibility) · `himalayas.app/jobs?search=<kw>` | country-eligibility filter built in |

Per post capture: title · company · url · posted-date · **eligibility scope** (Worldwide / region list / unstated) · comp if shown · apply link.

**Unstated eligibility ≠ worldwide** — mark `eligibility=unknown` and verify on the company's own posting before any save.
