---
description: Find high-value, visa-friendly C#/.NET jobs; auto-save critical matches to careerops.
argument-hint: [country] [keywords]
---

Parse `$ARGUMENTS` as `[country] [keywords]`.
- `country` absent → the **job-search** skill sweeps its outbound visa-friendly shortlist (Tier-1 first). Pass a country (e.g. `Germany`) to target one; `Bangladesh` works for a local search.
- `keywords` absent → `C# .NET`.

Invoke the **job-search** skill. It auto-applies its sub-skills (`bd-work-visa-routes` for targeting + visa, `job-fit-scoring` for pessimistic scoring sourced from `applicant-profile`). Follow it exactly: hard reject filters, downplay profile, auto-create only critical (score ≥75) matches in careerops. End with the run summary tables.
