# CareerOps Phase 5 — Full Dashboard Summary (S5.1) — Design

**Date:** 2026-06-21
**Status:** Approved (brainstorming → plan)
**PRD:** D5 / §14.2, §21. Delivery plan: Phase 5, S5.1.

## 1. Goal

Replace the dashboard's client-side aggregation with one read-only backend endpoint,
`GET /api/dashboard/summary`, returning every PRD §14.2 field. Add the two §21 rules not
yet implemented anywhere: **stale applications** and **search-deadline countdown**. The
dashboard page becomes a thin consumer of this single source of truth.

## 2. Architecture

- New `DashboardService(IAppDbContext db, IClock clock)` in `CareerOps.Application/Dashboard/`.
  Queries the context directly and materialize-then-`Adapt`s to existing DTOs (the established
  service pattern — InterviewService/ApplicationService). No service-to-service coupling; the
  §21 predicates live here for the dashboard.
- One endpoint `GET /api/dashboard/summary` → `Ok<DashboardSummaryDto>`, operationId
  `GetDashboardSummary`. Read-only: no input, no validation, no 404 (empty lists when no data).
- Standalone `/api/follow-up-tasks/due` and `/api/interviews/upcoming` are untouched — their
  own pages still use them. The global `MutationCache.onSettled` (D37) refetches the summary on
  any write, preserving the "single thread."

### DTO (reuses existing DTOs — no duplicate entity DTOs)

```csharp
public sealed record DashboardSummaryDto(
    int ActiveApplicationCount,
    IReadOnlyList<StatusCount> LeadsByStatus,
    IReadOnlyList<StageCount> ApplicationsByStage,
    IReadOnlyList<FollowUpTaskDto> FollowUpsDue,        // due today only
    IReadOnlyList<FollowUpTaskDto> OverdueFollowUps,
    IReadOnlyList<InterviewDto> UpcomingInterviews,
    IReadOnlyList<JobLeadDto> HighPriorityLeads,
    IReadOnlyList<ApplicationDto> StaleApplications,
    DeadlineCountdown? SearchDeadline);

public sealed record StatusCount(JobLeadStatus Status, int Count);
public sealed record StageCount(ApplicationStage Stage, int Count);
public sealed record DeadlineCountdown(DateTime DeadlineUtc, int DaysRemaining);
```

## 3. Rules (all via `IClock`; §21)

| Field | Rule |
|---|---|
| ActiveApplicationCount | `Status == Active` |
| LeadsByStatus | group JobLeads by `Status`, count |
| ApplicationsByStage | group Applications by `CurrentStage`, count |
| FollowUpsDue (today) | `Pending AND startOfToday <= DueAtUtc <= now` |
| OverdueFollowUps | `Pending AND DueAtUtc < startOfToday` |
| UpcomingInterviews | `Scheduled AND now <= ScheduledAtUtc <= now+7d` |
| HighPriorityLeads | `Priority in [High,Critical] AND Status in [Discovered,Interested]` |
| StaleApplications | `Active AND ((NextActionAtUtc null AND UpdatedAtUtc < now-7d) OR (NextActionAtUtc < now))` |
| SearchDeadline | from `UserProfile.SearchDeadlineUtc`; `DaysRemaining = day-diff(deadline, today)`; null when unset |

`startOfToday = clock.Today.ToDateTime(TimeOnly.MinValue)` (UTC; the codebase is UTC-throughout).
`DaysRemaining = DateOnly.FromDateTime(deadline).DayNumber - clock.Today.DayNumber`.
Includes mirror existing services exactly: leads `.Include(Company)`; apps
`.Include(JobLead).ThenInclude(Company).Include(ResumeVariant)`; interviews
`.Include(Application).ThenInclude(JobLead).ThenInclude(Company)`.
Count grouping projects to an anonymous type then maps to the record (EF-translation-safe).

## 4. Frontend

- Regenerate orval client → `useGetDashboardSummary`.
- `DashboardPage` consumes **only** the summary. Header chip (D42) next to the title:
  `⏳ N days left` / `⏳ due today` / `⚠ N days over`; hidden when `searchDeadline` is null.
- Stat row: Total leads · High-priority · Active applications, plus **apps-by-stage tiles**
  (non-zero stages only).
- Leads `PipelineBar` (build `Record<number,number>` from `leadsByStatus`).
- High-priority card (from `highPriorityLeads`). **New Stale-applications card** (from
  `staleApplications`).
- `TodaysActions` → presentational `({ due, overdue })`; keeps complete/skip mutations + toast,
  drops its own fetch and manual invalidate (global sync owns it). `UpcomingInterviews` →
  presentational `({ items })`. Both are dashboard-only (verified — imported only by
  `DashboardPage`).
- **D43:** drop the "Recently updated" card — not a §14.2 field and no data in the summary;
  the Stale card takes its grid slot.

## 5. Testing

`DashboardServiceTests` (EF InMemory + `FixedClock`, mirrors `InterviewServiceTests`):
active-count, leads-by-status / apps-by-stage counts, follow-up partition boundary
(overdue vs due-today, exact `startOfToday`), upcoming-interview window, high-priority rule,
stale both branches (null-next-action+old, and past-next-action), deadline positive / zero /
negative / null. Plus one integration test asserting `GET /api/dashboard/summary` → 200 with
the expected JSON shape (empty DB).

## 6. Out of scope

No new entities, migrations, or fields. Nothing beyond PRD §14.2. No charts (Recharts is S8.1).
No changes to the standalone due/upcoming endpoints. No auth/multi-user.

## 7. Decisions (to append to 03-decisions.md)

- **D39** — The dashboard reads a single `GET /api/dashboard/summary`; `TodaysActions` and
  `UpcomingInterviews` become presentational (data via props). Standalone `/due` and
  `/upcoming` endpoints retained for their own pages.
- **D40** — Follow-ups are a non-overlapping partition: overdue = `Due < startOfToday`,
  due-today = `startOfToday <= Due <= now`. Refines the prior dashboard behavior that
  double-listed overdue items in both cards. `startOfToday` computed in UTC via `IClock.Today`.
- **D41** — `LeadsByStatus`/`ApplicationsByStage` returned as typed count lists
  (`{enum, count}`), not enum-keyed dictionaries — orval-friendly and strongly typed.
- **D42** — Search-deadline `DaysRemaining` is a whole-day diff (UTC dates) via `IClock`;
  rendered as a header chip, hidden when `SearchDeadlineUtc` is null.
- **D43** — The "Recently updated" dashboard card is dropped (not a §14.2 field; no summary
  data); replaced by a Stale-applications card.

  *Counterargument (D40):* changing the follow-up split alters the current card behavior, but
  it is an objective correctness fix matching the PRD field names, and "complete and polish the
  dashboard" is this phase's explicit mandate.
