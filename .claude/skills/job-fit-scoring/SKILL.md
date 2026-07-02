---
name: job-fit-scoring
description: Use when rating or scoring how well a specific job opening matches the applicant — to decide whether a role is worth pursuing or saving. Produces a pessimistic 0–100 fit score with tiered save bands for a Bangladeshi .NET engineer seeking sponsorship abroad or remote work from Bangladesh.
---

# Job Fit Scoring

Score a job 0–100 for a Bangladeshi .NET engineer. **Pessimistic: start low, raise only on explicit evidence.** Reject by default. Two modes, same pessimism, same downplay, same bands:
- **Sponsorship mode** (default) — visa-sponsored roles abroad, via `job-search`.
- **Remote mode** — roles worked remotely from the applicant's **base country**, via `remote-job-search` (base comes from that run's input; default Bangladesh).

**REQUIRED SUB-SKILL (Sponsorship mode only):** take the visa-friendliness anchors from `bd-work-visa-routes` (per-country gates) — don't guess sponsorship odds.

## Downplay the profile
Judge fit as a **3–4 year junior–mid** engineer. Source the real profile from `applicant-profile` (careerops `get_user_profile` is currently empty), then de-weight senior signals. Downplaying widens the match set and improves callback odds. If the role still wants more than a mid engineer, reject.

## Sponsorship mode — dimensions (weights sum to 100)
| Dim | Weight | Raise score only if… |
|---|---|---|
| Tech fit | 30 | C#/.NET core to the role; stack matches profile |
| Seniority fit | 25 | stated YoE ≤5 and JD scope fits 3–4y — judge by years + skills, **not title** (a *Senior*-titled ≤5y role still qualifies) |
| Visa-friendliness | 25 | role/country states sponsorship or relocation, or salary clears the route floor (`bd-work-visa-routes`); company known to sponsor |
| Company quality | 15 | solid Glassdoor + real hiring history |
| Freshness | 5 | posted ≤2d (full); within 7d (partial); `fresh=unknown` → 0 |

### Visa-friendliness anchors (from bd-work-visa-routes)
- **~90** — Tier-1 country, IT on shortage list, no LMT/sponsor-licence, salary clears Blue-Card/skilled floor, English-workable.
- **~50** — sponsorship possible but with salary-threshold friction or employer reluctance.
- **~20** — strict labour-market test, high floor vs role pay, lottery/quota-gated, or explicit nationality bar.

## Remote mode — dimensions (weights sum to 100)
Visa dimension replaced by base-country eligibility & payability; company weight up (bigger scam surface), seniority down. All anchors below re-derive from base.

| Dim | Weight | Raise score only if… |
|---|---|---|
| Tech fit | 30 | role core is C#/.NET/SQL backend (top preference) **or** Python/FastAPI/RAG/AI-agents — incl. Forward-Deployed/AI Engineer roles leaning on the client-facing + AI + backend combo. Preference breaks ties in ordering; it never caps an AI-track score |
| Seniority fit | 20 | stated YoE ≤5 and JD scope fits 3–4y — years + skills, **not title** |
| Base-country eligibility & payability | 25 | anchors below |
| Company legitimacy & quality | 20 | verifiable footprint (site + LinkedIn employees or funding/customers) + Glassdoor-or-equivalent + hiring history; scam-search clean |
| Freshness | 5 | ≤2d full · ≤7d partial · niche remote boards ≤14d partial · `fresh=unknown` → 0 |

### Base-country eligibility & payability anchors
- **~90** — "worldwide" or base explicitly eligible, **and** EOR named (Deel / Remote.com / Oyster) or contractor invoicing workable in base (for Bangladesh: Wise / Payoneer / SWIFT), **and** hours async, near-base, or unstated.
- **~70** — broad region including base, or worldwide-stated with payment rails unstated.
- **~50** — eligibility unstated (verify before applying), or mandated hours crossing base-local midnight (`remote-job-search` §2 penalty tier).
- **~20** — mandated hours mostly in base-local night that slipped past §2, or region list excluding base where a contractor arrangement is merely plausible.

Geo bars, employment locked to a non-base country, and crypto-only pay never reach scoring — hard-rejected upstream in `remote-job-search` §2.

## Bands → save action (both modes)
Map the final score to a save tier; the orchestrator uses the band as the careerops `priority`. **Don't discard close calls — save everything at/above the floor and let the user triage by priority.**

| Score | Band | Action | Priority |
|---|---|---|---|
| ≥ 75 | Critical | save | High |
| 60–74 | Promising | save | Medium |
| 45–59 | Marginal | save | Low |
| < 45 | Weak | drop, log one-line reason | — |

Hard-reject failures (`job-search` §2 / `remote-job-search` §2: wrong stack, language wall, no-sponsorship, geo-ineligible, scam, staffing-mill, etc.) are dropped upstream and never scored. The `< 45` floor only catches genuinely weak roles that slipped past those gates.
