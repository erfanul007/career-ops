---
name: job-search
description: Use when finding, scouting, or sourcing job openings for the applicant and saving matches to careerops — triggered by /jobsearch or any request to search for jobs in a country or abroad. Covers outbound visa-sponsored roles and explicit single-country searches.
---

# Job Search

Find recent, visa-friendly, sub-5-year .NET roles abroad for a Bangladeshi engineer; keep only critical matches; auto-save them to careerops. Be pessimistic — reject by default, accept on evidence.

**REQUIRED SUB-SKILLS:** score every survivor with `job-fit-scoring`; draw country targeting + the visa dimension from `bd-work-visa-routes`.

## Tooling
**Default: chrome-devtools MCP (`mcp__chrome-devtools__*`) for all browsing and search** — attaches to real Chrome at `:9222`, so LinkedIn/Glassdoor/portals are logged in; flow `list_pages` → `new_page`/`navigate_page` → `take_snapshot`. Fallback if chrome MCP unavailable: try alternates — Docker Brave (`mcp__MCP_DOCKER__brave_web_search`), then `WebSearch`/`WebFetch`.

## Process (superpowers + caveman)
- **Brainstorm only if inputs ambiguous** — country/keywords unclear or conflicting → run `superpowers:brainstorming` first. Explicit args → proceed.
- **Track phases** — `TaskCreate` one generic task per phase (target · search · enrich · score · save · summary); set in_progress/completed as you go.
- **Fan out** — one generic agent per survivor (`superpowers:dispatching-parallel-agents`) for Glassdoor + portal + Indeed + web checks concurrently; each returns a **caveman-compressed** verdict (`caveman:caveman`): `visa-signal · glassdoor · risks · apply-link` — keeps main context lean.

## Inputs
- `country` — explicit destination (e.g. `Germany`). **If absent, sweep the outbound shortlist** from `bd-work-visa-routes` (Tier-1 first: Ireland, Germany, Netherlands, Finland, Italy, New Zealand). `Bangladesh` still works when passed explicitly.
- `keywords` (default `C# .NET`). If a country's results are thin, broaden with the applicant's core stack from `applicant-profile` (e.g. `ASP.NET Core`, `EF Core`, `.NET backend`).

## 1. Search (LinkedIn, logged in via chrome MCP)
Per target country, open (`new_page`) then `take_snapshot`:
```
https://www.linkedin.com/jobs/search/?keywords=<KW>&location=<COUNTRY>&f_TPR=r604800&f_E=2,3,4&f_JT=F&f_WT=3,1&f_F=it,eng,cnsl&f_I=96,4&sortBy=R&distance=25
```
Locked filters: posted ≤7d (`f_TPR=r604800`) · Entry/Associate/Mid-Senior (`f_E=2,3,4`) · Full-time (`f_JT=F`) · Hybrid+On-site (`f_WT=3,1`; add `2` only if remote wanted) · functions IT/Eng/Consulting · industries IT-Services+Software-Dev (`f_I=96,4`) · relevance sort. URL-encode keywords and spaces (`C%23%20.NET`). Collect title, company, location, url, posted-date, Easy-Apply flag; open each detail pane for the full description.

**Enrich/verify per candidate** (fan-out agents, chrome MCP):
- Glassdoor — rating + recent reviews (track record).
- Company portal — real posting, **visa/relocation policy**, direct apply link.
- Indeed — cross-post check (single-source ghost post = red flag).
- Web search — "<company> visa sponsorship", recent layoffs/scam/mass-hiring.

## 2. Hard reject filters (fail any ⇒ drop, log reason)
- Posted >7 days ago.
- Not genuinely C#/.NET (keyword-stuffed; real stack is other).
- LinkedIn **Easy Apply** with no direct portal link.
- **No sponsorship / nationality bar**: "must have work authorization", "no sponsorship", "EU/citizens only", clearance — *unless* the country+route in `bd-work-visa-routes` makes self-sponsorship realistic (salary clears the Blue-Card/skilled floor).
- Salary clearly below the country's work-visa floor (`bd-work-visa-routes`) — employer can't sponsor.
- Seniority too high: requires >5 years, or title Senior/Lead/Staff/Principal/Architect/Manager.
- Mandatory advanced local-language fluency ("nice to have" is fine).
- Staffing-mill / spam: mass reposts, vague agency listing, no named company, pay-to-apply.
- Weak company: Glassdoor <3.3 with real volume, no verifiable footprint, recent mass layoffs, scam signals.

## 3. Score survivors
Use `job-fit-scoring` (pessimistic 0–100, profile downplayed to 3–4y junior–mid). **Critical match = score ≥ 75.** Only these are kept and saved.

## 4. Auto-create critical matches in careerops
For each match (≥75):
1. **Dedupe** — `list_jobs(search=<sourceUrl or "title company">)`; skip if present.
2. `create_job`: `title` · `source` (`LinkedIn`|`Glassdoor`|`Indeed`|`CompanySite`) · `sourceUrl` (prefer portal apply link) · `companyName` · `country` (ISO, e.g. `DE`/`IE`/`BD`) · `city` · `remoteMode` (OnSite/Hybrid/Remote) · `employmentType` `FullTime` · `priority` `High` · `status` `Discovered` · `jobDescription` (trimmed) · `notes` (`score/100 · route+visa-signal · why-fits · risks`).

## 5. Run summary (always output)
- **Saved** (≥75): title · company · country · score · remoteMode · apply-link.
- **Rejected**: title · company · one-line reason.
Counts: scanned / passed-hard-filters / saved. Cap saved at top 10; note overflow rather than dumping.
