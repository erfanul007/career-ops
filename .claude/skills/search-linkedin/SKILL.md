---
name: search-linkedin
description: Use when searching LinkedIn job postings or reading LinkedIn job detail panes — building filtered job-search URLs, extracting posting fields, detecting Easy Apply. Logged-in session required.
---

# Search LinkedIn

**REQUIRED SUB-SKILL:** `browser-session` — run its preflight first; its login-gate and no-silent-fallback rules are hard rules here.

Mechanics only. The calling orchestrator supplies filter **values** (keywords, location, `f_*` choices) and all keep/drop policy.

## URL
```
https://www.linkedin.com/jobs/search/?keywords=<KW>&location=<LOC>&f_TPR=<v>&f_E=<v>&f_JT=<v>&f_WT=<v>&f_F=<v>&f_I=<v>&sortBy=R&distance=25
```

| Param | Syntax |
|---|---|
| `keywords` | URL-encode (`C%23%20.NET`) |
| `f_TPR` | freshness: `r86400` 24h · `r604800` 7d |
| `f_E` | seniority (CSV): 1 Intern · 2 Entry · 3 Associate · 4 Mid-Senior · 5 Director · 6 Exec |
| `f_JT` | type (CSV): F full · P part · C contract · T temp · I intern |
| `f_WT` | workplace (CSV): 1 on-site · 2 remote · 3 hybrid |
| `f_F` | function slugs, e.g. `it,eng,cnsl` |
| `f_I` | industry ids: 96 IT-services · 4 software-dev |
| `sortBy` | R relevance · DD date |
| pagination | `&start=25` per page |

## Flow
`list_pages` → `new_page`(url) → `take_snapshot` → click each result to open its detail pane → snapshot → extract: title · company · location · url · posted-date · Easy-Apply flag · full JD text.

## Quirks
- Logged-out/guest views hide or fuzz post dates → mark `fresh=unknown`, never guess.
- Detail pane with no external apply button = **Easy-Apply-only**; note it (orchestrators typically reject these).
- Prefer top ~50 relevance results; page deeper only if results are thin.
