---
description: Find remote jobs workable from the applicant's base country (default Bangladesh); score and save matches to careerops by priority band.
argument-hint: [base-country] [keywords]
---

Parse `$ARGUMENTS` as `[base-country] [keywords]` (both optional).
- First token is a country name → it is `base`; otherwise the whole string is `keywords`.
- `base` absent → **Bangladesh**. `keywords` absent → the **remote-job-search** skill runs both of its default tracks.

Invoke the **remote-job-search** skill with `base`. It defines the keyword tracks, selects platforms itself, re-derives its base-anchored rules (location, geo, timezone, comp floor, payability), and applies `job-fit-scoring` **Remote mode** sourced from `applicant-profile`. Follow it exactly: hard-reject per its §2, then save every scored survivor by band (≥75 High · 60–74 Medium · 45–59 Low; <45 dropped). End with the run summary tables.
