---
name: job-search
description: Use when finding, scouting, or sourcing job openings for the applicant and saving matches to careerops — triggered by /jobsearch or any request to search for jobs in a country or abroad. Covers outbound visa-sponsored roles and explicit single-country searches.
---

# Job Search

Find recent, visa-friendly, sub-5-year .NET roles abroad for a Bangladeshi engineer; tier survivors by fit and save them to careerops by priority. Be pessimistic — score low, raise only on evidence — but **don't discard close calls; drop only unrelated or low-value posts** (the user triages the rest by priority).

**REQUIRED SUB-SKILLS:** score every survivor with `job-fit-scoring`; draw country targeting + the visa dimension from `bd-work-visa-routes`.

## Tooling — pick by task
- **Logged-in / JS-heavy browsing** (LinkedIn job search + detail panes, Glassdoor) → **chrome-devtools MCP** (`mcp__chrome-devtools__*`), connect-only to Chrome at `:9222`. Flow: `list_pages` → `new_page`/`navigate_page` → `take_snapshot`.
- **Open-web lookups** (sponsorship history, layoffs/scam, salary floors, Indeed/aggregator cross-checks) → built-in **`WebSearch`** + **`WebFetch`**.
- **`:9222` down** → run the bootstrap; if Chrome still won't bind, do everything via `WebSearch`/`WebFetch` (ATS post-dates often unreadable → mark `fresh=unknown`, verify before saving).

**Bootstrap `:9222` (PowerShell).** Profile **CareerOps** · user-data-dir `C:\Users\LENOVO\.chrome-mcp-debug` · profile-directory `Profile`.
1. **Probe** `Invoke-RestMethod http://127.0.0.1:9222/json/version` → answers? use it.
2. **Down → open** (Chrome auto-creates dir/profile if missing): `Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList '--remote-debugging-port=9222','--user-data-dir=C:\Users\LENOVO\.chrome-mcp-debug','--profile-directory=Profile','--no-first-run','--no-default-browser-check','about:blank'` → re-probe (~1s).
3. **Fresh profile → login:** `navigate_page` to `linkedin.com`; on auth wall, apply the login gate below (cookies then persist on disk).
- Keep the window open (closing drops `:9222`); re-bootstrap each session. A plain `chrome.exe` launch without the dedicated `--user-data-dir` hands off to normal Chrome and never binds the port.

**Login gate (all platforms, every task).** If a step needs a logged-in session (LinkedIn, Glassdoor, any portal) and the page shows an auth wall / login redirect → **stop and ask the user to log in manually** in the CareerOps Chrome window, then resume on confirmation. Never enter credentials or work around the wall. If the locked source is non-essential, skip it and note `source-locked`; if it's required for the task, halt until logged in.

## Process (superpowers + caveman)
- **Brainstorm only if inputs ambiguous** — country/keywords unclear or conflicting → run `superpowers:brainstorming` first. Explicit args → proceed.
- **Track phases** — `TaskCreate` one generic task per phase (target · search · enrich · score · save · summary); set in_progress/completed as you go.
- **Fan out** — one generic agent per survivor (`superpowers:dispatching-parallel-agents`) for Glassdoor + portal + Indeed + web checks concurrently; each returns a **caveman-compressed** verdict (`caveman:caveman`): `visa-signal · glassdoor · risks · apply-link` — keeps main context lean.

## Inputs
- `country` — explicit destination (e.g. `Germany`). **If absent, sweep the outbound shortlist** from `bd-work-visa-routes` (Tier-1 first: Ireland, Germany, Netherlands, Finland, Italy, New Zealand). `Bangladesh` still works when passed explicitly.
- `keywords` (default `C# .NET`). If a country's results are thin, broaden with the applicant's core stack from `applicant-profile` (e.g. `ASP.NET Core`, `EF Core`, `.NET backend`).

## 1. Search (LinkedIn — chrome MCP if `:9222` up, else `WebSearch`/`WebFetch`)
Per target country, open (`new_page`) then `take_snapshot`:
```
https://www.linkedin.com/jobs/search/?keywords=<KW>&location=<COUNTRY>&f_TPR=r604800&f_E=2,3,4&f_JT=F&f_WT=3,1&f_F=it,eng,cnsl&f_I=96,4&sortBy=R&distance=25
```
Locked filters: posted ≤7d (`f_TPR=r604800`) · Entry/Associate/Mid-Senior (`f_E=2,3,4`) · Full-time (`f_JT=F`) · Hybrid+On-site (`f_WT=3,1`; add `2` only if remote wanted) · functions IT/Eng/Consulting · industries IT-Services+Software-Dev (`f_I=96,4`) · relevance sort. URL-encode keywords and spaces (`C%23%20.NET`). Collect title, company, location, url, posted-date, Easy-Apply flag; open each detail pane for the full description.

**Enrich/verify per candidate** (fan-out agents — chrome MCP for Glassdoor/portal, `WebSearch`/`WebFetch` for the rest):
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
- Seniority too high — judge by the JD's stated years + scope, **not the title**: drop only if it requires >5y or is genuinely Lead/Staff/Principal/Architect/Manager scope. A *Senior*-titled role wanting ≤5y with a matching stack stays in — verify YoE + skills before dropping.
- Mandatory advanced local-language fluency ("nice to have" is fine).
- Staffing-mill / spam: mass reposts, vague agency listing, no named company, pay-to-apply.
- Weak company: Glassdoor <3.3 with real volume, no verifiable footprint, recent mass layoffs, scam signals.

## 3. Score survivors
Use `job-fit-scoring` (pessimistic 0–100, profile downplayed to 3–4y junior–mid). Map each score to its save band: **≥75 Critical/High · 60–74 Promising/Medium · 45–59 Marginal/Low · <45 drop**. Save every survivor at/above the floor — don't discard close calls.

## 4. Auto-create scored matches in careerops
For each survivor scoring ≥45:
1. **Dedupe** — `list_jobs(search=<sourceUrl or "title company">)`; skip if present.
2. `create_job`: `title` · `source` (`LinkedIn`|`Glassdoor`|`Indeed`|`CompanySite`) · `sourceUrl` (prefer portal apply link) · `companyName` · `country` (ISO, e.g. `DE`/`IE`/`BD`) · `city` · `remoteMode` (OnSite/Hybrid/Remote) · `employmentType` `FullTime` · `priority` (band: High/Medium/Low) · `status` `Discovered` · `jobDescription` (trimmed) · `notes` (`score/100 · band · route+visa-signal · why-fits · risks`).

## 5. Run summary (always output)
- **Saved** (by band, High→Low): title · company · country · score · priority · remoteMode · apply-link.
- **Dropped**: title · company · one-line reason (hard-filter fail, or score <45).
Counts: scanned / passed-hard-filters / saved (High/Med/Low). Cap saved at top 10 by score; note overflow rather than dumping.
