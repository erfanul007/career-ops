---
name: search-wellfound
description: Use when searching Wellfound (ex-AngelList Talent) for startup job postings or reading Wellfound job details — remote role pages, filter UI, eligibility scope, salary/equity extraction. Login-walled and bot-protected.
---

# Search Wellfound

**REQUIRED SUB-SKILL:** `browser-session` — DataDome bot protection 403s `WebFetch`/raw HTTP; only the persistent chrome session works. Login gate and no-silent-fallback are hard rules here.

Mechanics only — the calling orchestrator supplies keywords and all keep/drop policy.

## Entry points
- **Stable (URL-addressable):** `wellfound.com/role/r/<slug>` = remote-only listings per role/tech (verified: `software-engineer`, `developer`; try `backend-engineer`, `dot-net`, `machine-learning-engineer`). Slug 404 → pick from the related-roles nav on any working role page.
- **SPA search:** `wellfound.com/jobs` — filter state lives in GraphQL calls, **not shareable URL params**. Set keyword + Remote in the left filter rail per session; never cache a constructed `/jobs` URL across sessions.

## Login boundary
Logged-out: role pages + first results page + partial job details render; compensation hidden; wall hits on pagination or after a few detail views. Real search session → log in early via the `browser-session` login gate rather than fighting interstitials.

## Extract per posting
title · company · job URL · salary/equity range · remote-policy line **verbatim** · hiring-regions/"Hiring in" list · visa-sponsorship line · Actively-Hiring badge · recency · full JD text (hidden restrictions live here: timezone bands, "US work authorization").

## Eligibility semantics (misread = wasted saves)
- Unqualified **"Remote" pill defaults to home-country remote (usually US) — NOT worldwide.**
- Counts as eligible only if the posting states worldwide/anywhere, or its region list includes the candidate's country; anything else → `eligibility=unknown`, verify in JD + apply form (a US-work-auth question there is ground truth over any "worldwide" tag).
- Timezone bands (e.g. "UTC-8 to UTC-5") are de facto region bars — compare against the candidate's offset.

## Quirks
- Listings linger for months — weigh Actively-Hiring badge + recency, not presence.
- Startup stacks skew Python/TS/Go: strong source for AI/Python-track roles, thin for .NET — search `C#`, `dotnet`, `.NET` separately (tokenizer splits them).
- Old `angel.co` links redirect here; same site.
