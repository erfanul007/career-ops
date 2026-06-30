---
name: job-fit-scoring
description: Use when rating or scoring how well a specific job opening matches the applicant — to decide whether a role is worth pursuing or saving. Produces a pessimistic 0–100 fit score with tiered save bands for a Bangladeshi .NET engineer seeking sponsorship abroad.
---

# Job Fit Scoring

Score a job 0–100 for a Bangladeshi .NET engineer seeking a visa-sponsored role abroad. **Pessimistic: start low, raise only on explicit evidence.** Reject by default.

**REQUIRED SUB-SKILL:** take the visa-friendliness anchors from `bd-work-visa-routes` (per-country gates) — don't guess sponsorship odds.

## Downplay the profile
Judge fit as a **3–4 year junior–mid** engineer. Source the real profile from `applicant-profile` (careerops `get_user_profile` is currently empty), then de-weight senior signals. Downplaying widens the match set and improves callback odds. If the role still wants more than a mid engineer, reject.

## Dimensions (weights sum to 100)
| Dim | Weight | Raise score only if… |
|---|---|---|
| Tech fit | 30 | C#/.NET core to the role; stack matches profile |
| Seniority fit | 25 | stated YoE ≤5 and JD scope fits 3–4y — judge by years + skills, **not title** (a *Senior*-titled ≤5y role still qualifies) |
| Visa-friendliness | 25 | role/country states sponsorship or relocation, or salary clears the route floor (`bd-work-visa-routes`); company known to sponsor |
| Company quality | 15 | solid Glassdoor + real hiring history |
| Freshness | 5 | posted ≤2d (full); within 7d (partial); `fresh=unknown` → 0 |

## Visa-friendliness anchors (from bd-work-visa-routes)
- **~90** — Tier-1 country, IT on shortage list, no LMT/sponsor-licence, salary clears Blue-Card/skilled floor, English-workable.
- **~50** — sponsorship possible but with salary-threshold friction or employer reluctance.
- **~20** — strict labour-market test, high floor vs role pay, lottery/quota-gated, or explicit nationality bar.

## Bands → save action
Map the final score to a save tier; `job-search` uses the band as the careerops `priority`. **Don't discard close calls — save everything at/above the floor and let the user triage by priority.**

| Score | Band | Action | Priority |
|---|---|---|---|
| ≥ 75 | Critical | save | High |
| 60–74 | Promising | save | Medium |
| 45–59 | Marginal | save | Low |
| < 45 | Weak | drop, log one-line reason | — |

Hard-reject failures (job-search §2: wrong stack, language wall, no-sponsorship, staffing-mill, etc.) are dropped upstream and never scored. The `< 45` floor only catches genuinely weak roles that slipped past those gates.
