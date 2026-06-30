---
description: Find visa-friendly C#/.NET jobs; score and save matches to careerops by priority band.
argument-hint: [country] [keywords]
---

Parse `$ARGUMENTS` as `[country] [keywords]`.
- `country` absent → the **job-search** skill sweeps its outbound visa-friendly shortlist (Tier-1 first). Pass a country (e.g. `Germany`) to target one; `Bangladesh` works for a local search.
- `keywords` absent → `C# .NET`.

Invoke the **job-search** skill. It auto-applies its sub-skills (`bd-work-visa-routes` for targeting + visa, `job-fit-scoring` for pessimistic scoring sourced from `applicant-profile`). Follow it exactly: hard-reject unrelated/low-value posts, downplay profile, then save every scored survivor by band (≥75 High · 60–74 Medium · 45–59 Low; <45 dropped). End with the run summary tables.
