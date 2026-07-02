---
name: job-search
description: Use when finding, scouting, or sourcing job openings for the applicant and saving matches to careerops — triggered by /jobsearch or any request to search for jobs in a country or abroad. Covers outbound visa-sponsored roles and explicit single-country searches.
---

# Job Search

Find recent, visa-friendly, sub-5-year .NET roles abroad for a Bangladeshi engineer; tier survivors by fit and save them to careerops by priority. Be pessimistic — score low, raise only on evidence — but **don't discard close calls; drop only unrelated or low-value posts** (the user triages the rest by priority).

**REQUIRED SUB-SKILLS:** score every survivor with `job-fit-scoring` (Sponsorship mode); draw country targeting + the visa dimension from `bd-work-visa-routes`.

Remote-from-Bangladesh search → use the `remote-job-search` skill instead (separate policy + scoring mode).

## Platform skills (auto-select — user never names platforms)
Load per phase via Skill tool; fan-out subagents get the explicit path (`.claude/skills/<name>/SKILL.md`) in their prompt — they can't auto-discover.
- **Search:** `search-linkedin` — URL syntax + extraction mechanics there; this skill supplies the values (§1).
- **Enrich:** `search-glassdoor` + open-web `WebSearch`/`WebFetch` (sponsorship history, layoffs/scam, salary floors, Indeed cross-checks).
- **Infra (hard rules):** `browser-session` — preflight before any logged-in step; login gate and **no-silent-fallback** apply verbatim.

## Process (superpowers + caveman)
- **Clarify before searching** — one `AskUserQuestion` round (concrete options + a recommended default), then proceed. Ask when any predicate holds:
  1. country given as a region, not a country ("Europe", "Scandinavia") → offer its Tier-1/Tier-2 members;
  2. request also mentions remote/work-from-home (straddles `remote-job-search`) → confirm which leg(s) run before doubling cost;
  3. keywords outside C#/.NET → confirm intent (this track is .NET-only by design).
  No predicate holds → proceed without asking; absent inputs take their documented defaults silently (no country → Tier-1 sweep; no keywords → `C# .NET`). No answer available (headless) → recommended default, log the assumption in the run summary.
- **Track phases** — `TaskCreate` one generic task per phase (target · search · enrich · score · save · summary); set in_progress/completed as you go.
- **Fan out** — one generic agent per survivor (`superpowers:dispatching-parallel-agents`) for Glassdoor + portal + Indeed + web checks concurrently; each returns a **caveman-compressed** verdict (`caveman:caveman`): `visa-signal · glassdoor · risks · apply-link` — keeps main context lean.

## Inputs
- `country` — explicit destination (e.g. `Germany`). **If absent, sweep the Tier-1 shortlist only** from `bd-work-visa-routes` (Ireland, Germany, Netherlands, Finland, Italy, New Zealand); extend to Tier-2 only when the user asks or Tier-1 runs thin.
- **`Bangladesh` = local mode:** onsite/hybrid in BD for a citizen — skip the no-sponsorship and visa-salary-floor hard rejects (§2) and score with `job-fit-scoring` **Remote mode**, eligibility ≈ local (~90). Remote-from-BD roles → `remote-job-search` instead.
- `keywords` (default `C# .NET`). If a country's results are thin, broaden with the applicant's core stack from `applicant-profile` (e.g. `ASP.NET Core`, `EF Core`, `.NET backend`).

## 1. Search (per target country, via `search-linkedin`)
Values: `location=<COUNTRY>` · `f_TPR=r604800` (≤7d) · `f_E=2,3,4` (Entry/Associate/Mid-Senior) · `f_JT=F` (full-time) · `f_WT=3,1` (hybrid + on-site; remote wanted → `remote-job-search`) · `f_F=it,eng,cnsl` · `f_I=96,4` · `sortBy=R` · `distance=25`. Collect title, company, location, url, posted-date, Easy-Apply flag, full JD per the platform skill's flow.

**Enrich/verify per candidate** (fan-out agents):
- `search-glassdoor` — rating + recent reviews (track record).
- Company portal — real posting, **visa/relocation policy**, direct apply link.
- Indeed — cross-post check via `WebSearch` (single-source ghost post = red flag).
- Web search — "<company> visa sponsorship", recent layoffs/scam/mass-hiring.

## 2. Hard reject filters (fail any ⇒ drop, log reason)
- Posted >7 days ago.
- Not genuinely C#/.NET (keyword-stuffed; real stack is other).
- LinkedIn **Easy Apply** with no direct portal link.
- **No sponsorship / nationality bar**: "must have work authorization", "no sponsorship", "EU/citizens only", clearance — *unless* the country+route in `bd-work-visa-routes` makes self-sponsorship realistic (salary clears the Blue-Card/skilled floor).
- Salary clearly below the country's work-visa floor (`bd-work-visa-routes`) — employer can't sponsor.
- Seniority too high — judge by the JD's stated years + scope, **not the title**: drop only if it requires >5y or is genuinely Lead/Staff/Principal/Architect/Manager scope. A *Senior*-titled role wanting ≤5y with a matching stack stays in — verify YoE + skills before dropping.
- Mandatory advanced local-language fluency ("nice to have" is fine).
- Staffing-mill / spam: mass reposts, vague agency listing, no named company, pay-to-apply.
- Weak company: Glassdoor <3.3 with real volume, no verifiable footprint, recent mass layoffs, scam signals.

## 3. Score survivors
Use `job-fit-scoring` (pessimistic 0–100, profile downplayed to 3–4y junior–mid). Map each score to its save band: **≥75 Critical/High · 60–74 Promising/Medium · 45–59 Marginal/Low · <45 drop**. Save every survivor at/above the floor — don't discard close calls.

## 4. Auto-create scored matches in careerops
For each survivor scoring ≥45:
1. **Dedupe** — `list_jobs(search=<sourceUrl or "title company">)`; skip if present.
2. `create_job`: `title` · `source` (`LinkedIn`|`CompanySite` — whichever `sourceUrl` points at) · `sourceUrl` (prefer portal apply link) · `companyName` · `country` (ISO, e.g. `DE`/`IE`/`BD`) · `city` · `remoteMode` (OnSite/Hybrid/Remote) · `employmentType` `FullTime` · `priority` (band: High/Medium/Low) · `status` `Discovered` · `jobDescription` (trimmed) · `notes` (`score/100 · band · route+visa-signal · why-fits · risks`).

## 5. Run summary (always output)
- **Saved** (by band, High→Low): title · company · country · score · priority · remoteMode · apply-link.
- **Dropped**: title · company · one-line reason (hard-filter fail, or score <45).
Counts: scanned / passed-hard-filters / saved (High/Med/Low). Cap saved at top 10 by score; note overflow rather than dumping.
