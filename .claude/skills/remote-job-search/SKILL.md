---
name: remote-job-search
description: Use when finding remote jobs workable from the applicant's base country (default Bangladesh) and saving matches to careerops — triggered by /remotejobsearch or any request for remote / work-from-home / worldwide roles. Complements job-search, which covers visa-sponsored onsite/hybrid roles abroad.
---

# Remote Job Search

Find recent remote roles the applicant can legally hold and get paid for from the **base country**; tier survivors by fit and save them to careerops by priority. Assumes the applicant may legally work from base — search logic, not immigration advice. Be pessimistic — score low, raise only on evidence — but **don't discard close calls; drop only ineligible, scam, unrelated, or low-value posts** (the user triages the rest by priority).

**REQUIRED SUB-SKILLS:** score every survivor with `job-fit-scoring` **Remote mode**; profile from `applicant-profile`. `bd-work-visa-routes` is NOT used — remote has no visa dimension.

## Platform skills (auto-select — user never names platforms)
Load per phase via Skill tool; fan-out subagents get the explicit path (`.claude/skills/<name>/SKILL.md`) in their prompt — they can't auto-discover.
- **Search:** `search-linkedin` (values below) + `search-remote-boards`.
- **Search, secondary:** `search-wellfound` — load when, after §2 hard rejects, LinkedIn + boards leave <5 Track-B survivors, or the user asks for startup/FDE focus. Login-locked and non-essential → skip with `source-locked`, don't force.
- **Enrich:** `search-glassdoor` + open-web `WebSearch`/`WebFetch`.
- **Infra (hard rules):** `browser-session` — preflight, login gate, no-silent-fallback apply to every logged-in step.
- **Deferred — no platform skill yet, don't improvise searches there:** Indeed (ghost cross-check only) · Otta · Bdjobs. Adding one = write a `search-<platform>` skill first.

## Inputs
- `base` — country the applicant works from. **Default Bangladesh**; override only when the user names a different base (e.g. after relocation). Every base-anchored rule below (`location=`, geo, timezone, comp floor, payability) re-derives from it.
- `keywords` — absent → run **both tracks**:
- **Track A (primary):** `C# .NET` (broaden: ASP.NET Core, EF Core, SQL, .NET backend, backend developer)
- **Track B:** `Python FastAPI` · `AI engineer RAG LLM agents` · `Forward Deployed Engineer`

Track A is the preference; Track B is first-class — preference orders the summary, it never filters a Track B match out.

## Process (superpowers + caveman)
- **Clarify before searching** — one `AskUserQuestion` round (concrete options + a recommended default), then proceed. Ask when any predicate holds:
  1. request names a region or relocation without a clear base ("from Europe", "once I move") → resolve the base reading;
  2. given keywords fall outside both tracks **and** outside `applicant-profile`'s stack → confirm intent before spending a run;
  3. request also matches `job-search` (visa/sponsorship/onsite wording or a destination country) → confirm which leg(s) run before doubling cost;
  4. non-Bangladesh base with a borderline comp floor (§2).
  No predicate holds → proceed without asking; absent inputs take their documented defaults silently. No answer available (headless) → recommended default, log the assumption in the run summary.
- `TaskCreate` one task per phase: search · enrich · score · save · summary.
- Fan out one agent per survivor (`superpowers:dispatching-parallel-agents`); each returns a **caveman-compressed** verdict (`caveman:caveman`): `eligibility · legitimacy · pay-signal · glassdoor · apply-link · risks`.

## 1. Search
LinkedIn values: `location=<base>` · `f_WT=2` · `f_TPR=r604800` · `f_E=2,3,4` · `f_JT=F,C,P` · `f_F=it,eng,cnsl` · `f_I=96,4` · `sortBy=R`. Boards: worldwide/base-eligible categories, both tracks.

## 2. Hard rejects (fail any ⇒ drop, log reason)
- **Geo-ineligible:** employment locked to a country/region that doesn't include base — "must reside in <region>" not covering base, eligible-country list without base, W2-only/US-only when base ≠ US, "no international contractors". Region covers base but the clause may mean citizenship/right-to-work rather than residence → keep, add `verify-work-auth` to notes.
- **Timezone:** convert any mandated core-hours window to base-local (offsets in force on the run date, DST included). Test in order: (1) ≥50% of the window inside 23:00–07:00 base-local ⇒ drop; (2) else window crosses midnight ⇒ keep, penalize in scoring; (3) else fine. (base=Bangladesh: a US-Pacific 9–17 mandate lands ≥87% in night year-round ⇒ always drop · US-East varies with DST — run the test, don't assume · EU hours land in BD afternoon/evening ⇒ fine.)
- **Scam battery — any one ⇒ drop:** pay-to-apply / onboarding / equipment / training fee · crypto-only pay · commission-only · messaging-app-only interview (Telegram/WhatsApp) · free-mail contact without company domain · zero verifiable footprint (no site + no LinkedIn page + no third-party trace) · reshipping / typing / data-entry bait · implausible pay against vague requirements.
- **Comp below the base floor** (pro-rate part-time/contract) — not worth it. base=Bangladesh: **$1,500/mo full-time-equivalent**. Other base: floor = clearly below base-market junior-dev pay (gross, converted at current rates) — derive it, state it in the run summary, ask the user if borderline.
- **Stale:** posted >7 days ago (LinkedIn) / >14 days (boards, Wellfound) — a repost doesn't reset the clock.
- **Ghost/evergreen post:** same ad continuously reposted >30 days (date-reset reposts don't refresh it). Single-source with no company-site trace = enrichment red flag, feeds legitimacy score.
- **Stack:** matches neither track (keyword-stuffed; real stack is other).
- **Seniority:** requires >5y or genuinely Lead/Staff/Principal/Manager scope — judge by JD years + scope, **not title**; a *Senior*-titled ≤5y role stays in.
- LinkedIn **Easy Apply** with no direct portal/email apply path.
- **Gig marketplaces** (Upwork, Fiverr, Freelancer et al.) — out of scope entirely.
- **Weak company:** Glassdoor <3.3 with real volume, or zero footprint. Missing Glassdoor alone ≠ fail — require site + LinkedIn employees or funding/customers instead.

## 3. Enrich/verify per candidate (fan-out agents)
- Footprint — site live, LinkedIn employee count, funding/customers.
- `search-glassdoor` verdict.
- Web — "<company> scam", "<company> reviews", recent layoffs.
- Pay rails — EOR named (Deel / Remote.com / Oyster = strong) · contractor invoicing workable from base (for Bangladesh: Wise / Payoneer / SWIFT) · unstated → flag in notes, verify before applying.
- Direct apply link (portal or email).

## 4. Score survivors
`job-fit-scoring` **Remote mode** (pessimistic 0–100, profile downplayed to 3–4y). Bands: **≥75 High · 60–74 Medium · 45–59 Low · <45 drop**. Save everything at/above the floor.

## 5. Auto-create scored matches in careerops (score ≥45)
1. **Dedupe** — `list_jobs(search=<sourceUrl or "title company">)`; also cross-board by company+title.
2. `create_job`: `title` · `source` (`LinkedIn`|`Wellfound`|`CompanySite`|`Other` — boards = `Other`, board name in notes) · `sourceUrl` (direct apply link preferred) · `companyName` · `country` = employer **HQ** ISO · `remoteMode` `Remote` · `employmentType` actual (`FullTime`|`Contract`|`PartTime`|`Freelance`) · `priority` = band · `status` `Discovered` · `jobDescription` trimmed · `notes` = `score/100 · band · track · eligibility (remote-worldwide|remote-EMEA|…) · pay-signal · legit-check · risks`.

## Platform leads (vetted talent platforms)
Also save — once, dedupe makes reruns no-ops — **Arc.dev · Proxify · Lemon.io · Toptal**, each as: `title` `Talent platform — <name>` · `source` `Other` · `sourceUrl` platform homepage · `companyName` platform name · `remoteMode` `Remote` · `employmentType` `Contract` · `priority` `Low` · `status` `Discovered` · `notes` `platform-lead`. Matching platforms, not postings — exempt from scoring and the ≥45 gate. Gig marketplaces never qualify.

## 6. Run summary (always output)
- **Saved** (by band, High→Low): title · company · HQ · score · employmentType · eligibility · apply-link.
- **Dropped**: title · company · one-line reason (hard-filter fail or score <45).
Counts: scanned / passed-hard-filters / saved (H/M/L) / scam-drops. Cap saved at top 10 by score; note overflow rather than dumping.
