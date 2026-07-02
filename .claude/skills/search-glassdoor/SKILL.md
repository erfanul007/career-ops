---
name: search-glassdoor
description: Use when vetting a company on Glassdoor — overall rating, review volume and recency, salary sanity — typically while enriching a job candidate before scoring.
---

# Search Glassdoor

**REQUIRED SUB-SKILL:** `browser-session` (Glassdoor walls most content behind login).

Flow: glassdoor.com → search company → **Reviews** tab → capture: overall rating · review count · last-12-months tone (pay delays, layoffs, management) → **Salaries** tab only if pay sanity is in question.

Verdict format (compact, for fan-out agents):
`rating x.x/5 (N reviews) · recent: <one line> · flags: <none | list>`

Signal strength: <20 reviews = weak signal — say so. No Glassdoor page ≠ red flag by itself — return `no-glassdoor` and let the orchestrator weigh other footprint (site, LinkedIn employees, funding/customers).
