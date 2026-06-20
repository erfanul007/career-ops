# Phase 5 — Full Dashboard Summary (S5.1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard's client-side aggregation with one read-only backend endpoint `GET /api/dashboard/summary` returning every PRD §14.2 field, adding the two §21 rules not yet implemented (stale applications, search-deadline countdown).

**Architecture:** A new `DashboardService(IAppDbContext db, IClock clock)` queries the context directly and materialize-then-`Adapt`s to the existing entity DTOs (the established service pattern). One endpoint exposes it. The dashboard page becomes a thin consumer; `TodaysActions`/`UpcomingInterviews` become presentational (data via props). Standalone `/follow-up-tasks/due` and `/interviews/upcoming` are untouched.

**Tech Stack:** .NET 10, EF Core 10 (Npgsql + InMemory for tests), Minimal APIs, Mapster, xUnit + FluentAssertions; React 19, Vite, TanStack Query v5, orval, date-fns, shadcn/ui.

## Global Constraints

- Inject `IClock`; never call `DateTime.UtcNow` in app/domain code. `IClock` exposes `DateTime UtcNow` and `DateOnly Today`.
- All times are UTC. `startOfToday = clock.Today.ToDateTime(TimeOnly.MinValue)`.
- No new entities, fields, migrations, or DB changes. Nothing beyond PRD §14.2.
- Reuse existing DTOs (`JobLeadDto`, `ApplicationDto`, `FollowUpTaskDto`, `InterviewDto`) — do not create new entity DTOs.
- Services are `sealed`, primary-constructor DI, registered `AddScoped` in `AddApplication()`.
- Minimal-API endpoints set an explicit `.WithName(operationId)` (D1).
- Generated orval client only — never hand-edit `frontend/src/lib/api/**`.
- Enum integer values are pinned; never reorder/renumber (D5).
- Run `just verify` (backend build + tests, frontend typecheck + build) as the local gate.
- The integration-test environment ("Testing") has **no database** — integration tests cover validation/liveness/OpenAPI only; service logic is unit-tested against EF InMemory.

### Reference values (verbatim — use exactly)

Enums: `ApplicationStatus.Active=0`. `Priority`: Low=0, Medium=1, High=2, Critical=3. `JobLeadStatus`: Discovered=0, Interested=1, Applied=2, Interviewing=3, Offer=4, Rejected=5, Ghosted=6, Withdrawn=7, Archived=8. `ApplicationStage`: Applied=0, RecruiterScreen=1, TechnicalScreen=2, TakeHome=3, SystemDesign=4, HiringManager=5, Final=6, Offer=7, Rejected=8, Ghosted=9, Withdrawn=10. `FollowUpStatus`: Pending=0, Completed=1, Skipped=2. `InterviewStatus.Scheduled=0`.

Include chains (mirror existing services): leads `.Include(l => l.Company)`; applications `.Include(a => a.JobLead).ThenInclude(l => l!.Company).Include(a => a.ResumeVariant)`; interviews `.Include(i => i.Application).ThenInclude(a => a!.JobLead).ThenInclude(l => l!.Company)`. All use materialize-then-`.Adapt<List<TDto>>()`.

Audit stamping (`CareerOpsDbContext.SaveChangesAsync`): on `Added`, both `CreatedAtUtc` and `UpdatedAtUtc = clock.UtcNow`; on `Modified`, `UpdatedAtUtc = clock.UtcNow`. To seed a backdated `UpdatedAtUtc` in tests, save via a context whose clock is in the past, sharing the same InMemory database name.

---

## Task 1: DashboardService + DTOs + unit tests

**Files:**
- Create: `backend/src/CareerOps.Application/Dashboard/DashboardDtos.cs`
- Create: `backend/src/CareerOps.Application/Dashboard/DashboardService.cs`
- Modify: `backend/src/CareerOps.Application/DependencyInjection.cs` (register `DashboardService`)
- Test: `backend/tests/CareerOps.UnitTests/Dashboard/DashboardServiceTests.cs`

**Interfaces:**
- Consumes: `IAppDbContext` (DbSets `Applications`, `JobLeads`, `FollowUpTasks`, `Interviews`, `UserProfiles`), `IClock`; existing DTOs `JobLeadDto`, `ApplicationDto`, `FollowUpTaskDto`, `InterviewDto`.
- Produces: `DashboardSummaryDto`, `StatusCount(JobLeadStatus Status, int Count)`, `StageCount(ApplicationStage Stage, int Count)`, `DeadlineCountdown(DateTime DeadlineUtc, int DaysRemaining)`; `DashboardService.GetSummaryAsync(CancellationToken) : Task<DashboardSummaryDto>`.

- [ ] **Step 1: Create the DTOs**

`backend/src/CareerOps.Application/Dashboard/DashboardDtos.cs`:

```csharp
using CareerOps.Application.Applications;
using CareerOps.Application.FollowUpTasks;
using CareerOps.Application.Interviews;
using CareerOps.Application.JobLeads;
using CareerOps.Domain.Applications;
using CareerOps.Domain.JobLeads;

namespace CareerOps.Application.Dashboard;

public sealed record StatusCount(JobLeadStatus Status, int Count);

public sealed record StageCount(ApplicationStage Stage, int Count);

public sealed record DeadlineCountdown(DateTime DeadlineUtc, int DaysRemaining);

public sealed record DashboardSummaryDto(
    int ActiveApplicationCount,
    IReadOnlyList<StatusCount> LeadsByStatus,
    IReadOnlyList<StageCount> ApplicationsByStage,
    IReadOnlyList<FollowUpTaskDto> FollowUpsDue,
    IReadOnlyList<FollowUpTaskDto> OverdueFollowUps,
    IReadOnlyList<InterviewDto> UpcomingInterviews,
    IReadOnlyList<JobLeadDto> HighPriorityLeads,
    IReadOnlyList<ApplicationDto> StaleApplications,
    DeadlineCountdown? SearchDeadline);
```

- [ ] **Step 2: Write the failing tests**

`backend/tests/CareerOps.UnitTests/Dashboard/DashboardServiceTests.cs`:

```csharp
using CareerOps.Application.Common;
using CareerOps.Application.Dashboard;
using CareerOps.Domain.Applications;
using CareerOps.Domain.Companies;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Interviews;
using CareerOps.Domain.JobLeads;
using CareerOps.Domain.ResumeVariants;
using CareerOps.Domain.UserProfiles;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using DomainApplication = CareerOps.Domain.Applications.Application;

namespace CareerOps.UnitTests.Dashboard;

public class DashboardServiceTests
{
    private sealed class FixedClock : IClock
    {
        public DateTime UtcNow => new(2026, 6, 21, 12, 0, 0, DateTimeKind.Utc);
        public DateOnly Today => new(2026, 6, 21);
    }

    private sealed class ClockAt(DateTime utcNow) : IClock
    {
        public DateTime UtcNow => utcNow;
        public DateOnly Today => DateOnly.FromDateTime(utcNow);
    }

    private static readonly FixedClock Clock = new();

    // Shared root so two contexts opened on the same database name see each other's data —
    // required for the stale-by-UpdatedAtUtc test, which seeds via a past-clock context.
    private static readonly InMemoryDatabaseRoot Root = new();

    private static CareerOpsDbContext Db(string name, IClock clock) =>
        new(new DbContextOptionsBuilder<CareerOpsDbContext>().UseInMemoryDatabase(name, Root).Options, clock);

    private static string NewName() => $"careerops-{Guid.NewGuid()}";

    private static async Task<(int companyId, int variantId)> SeedRefsAsync(CareerOpsDbContext db)
    {
        var company = new Company { Name = "Equinor" }; db.Companies.Add(company);
        var variant = new ResumeVariant { Name = "Backend .NET", IsDefault = true }; db.ResumeVariants.Add(variant);
        await db.SaveChangesAsync();
        return (company.Id, variant.Id);
    }

    private static async Task<int> AddLeadAsync(CareerOpsDbContext db, int companyId, JobLeadStatus status, Priority priority)
    {
        var lead = new JobLead { CompanyId = companyId, Title = $"Role {status}-{priority}", Status = status, Priority = priority };
        db.JobLeads.Add(lead); await db.SaveChangesAsync();
        return lead.Id;
    }

    private static async Task<int> AddAppAsync(CareerOpsDbContext db, int leadId, int variantId,
        ApplicationStatus status, ApplicationStage stage, DateTime? nextActionAtUtc)
    {
        var app = new DomainApplication
        {
            JobLeadId = leadId, ResumeVariantId = variantId, AppliedAtUtc = Clock.UtcNow,
            CurrentStage = stage, Status = status, NextActionAtUtc = nextActionAtUtc,
        };
        db.Applications.Add(app); await db.SaveChangesAsync();
        return app.Id;
    }

    [Fact]
    public async Task Empty_database_returns_zeroes_and_empty_lists()
    {
        using var db = Db(NewName(), Clock);
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Equal(0, summary.ActiveApplicationCount);
        Assert.Empty(summary.LeadsByStatus);
        Assert.Empty(summary.ApplicationsByStage);
        Assert.Empty(summary.FollowUpsDue);
        Assert.Empty(summary.OverdueFollowUps);
        Assert.Empty(summary.UpcomingInterviews);
        Assert.Empty(summary.HighPriorityLeads);
        Assert.Empty(summary.StaleApplications);
        Assert.Null(summary.SearchDeadline);
    }

    [Fact]
    public async Task ActiveApplicationCount_counts_only_active()
    {
        var name = NewName();
        using var db = Db(name, Clock);
        var (companyId, variantId) = await SeedRefsAsync(db);
        var l1 = await AddLeadAsync(db, companyId, JobLeadStatus.Applied, Priority.Medium);
        var l2 = await AddLeadAsync(db, companyId, JobLeadStatus.Applied, Priority.Medium);
        await AddAppAsync(db, l1, variantId, ApplicationStatus.Active, ApplicationStage.Applied, null);
        await AddAppAsync(db, l2, variantId, ApplicationStatus.Rejected, ApplicationStage.Rejected, null);
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Equal(1, summary.ActiveApplicationCount);
    }

    [Fact]
    public async Task LeadsByStatus_groups_and_counts()
    {
        var name = NewName();
        using var db = Db(name, Clock);
        var (companyId, _) = await SeedRefsAsync(db);
        await AddLeadAsync(db, companyId, JobLeadStatus.Discovered, Priority.Low);
        await AddLeadAsync(db, companyId, JobLeadStatus.Discovered, Priority.Low);
        await AddLeadAsync(db, companyId, JobLeadStatus.Applied, Priority.Low);
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Equal(2, summary.LeadsByStatus.Single(s => s.Status == JobLeadStatus.Discovered).Count);
        Assert.Equal(1, summary.LeadsByStatus.Single(s => s.Status == JobLeadStatus.Applied).Count);
    }

    [Fact]
    public async Task ApplicationsByStage_groups_and_counts()
    {
        var name = NewName();
        using var db = Db(name, Clock);
        var (companyId, variantId) = await SeedRefsAsync(db);
        var l1 = await AddLeadAsync(db, companyId, JobLeadStatus.Applied, Priority.Medium);
        var l2 = await AddLeadAsync(db, companyId, JobLeadStatus.Interviewing, Priority.Medium);
        await AddAppAsync(db, l1, variantId, ApplicationStatus.Active, ApplicationStage.Applied, null);
        await AddAppAsync(db, l2, variantId, ApplicationStatus.Active, ApplicationStage.TechnicalScreen, null);
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Equal(1, summary.ApplicationsByStage.Single(s => s.Stage == ApplicationStage.Applied).Count);
        Assert.Equal(1, summary.ApplicationsByStage.Single(s => s.Stage == ApplicationStage.TechnicalScreen).Count);
    }

    [Fact]
    public async Task FollowUps_partitioned_into_due_today_and_overdue()
    {
        var name = NewName();
        using var db = Db(name, Clock);
        db.FollowUpTasks.AddRange(
            new FollowUpTask { Title = "overdue", DueAtUtc = new DateTime(2026, 6, 20, 9, 0, 0, DateTimeKind.Utc), Status = FollowUpStatus.Pending, Priority = Priority.Medium },
            new FollowUpTask { Title = "today", DueAtUtc = new DateTime(2026, 6, 21, 8, 0, 0, DateTimeKind.Utc), Status = FollowUpStatus.Pending, Priority = Priority.Medium },
            new FollowUpTask { Title = "future", DueAtUtc = new DateTime(2026, 6, 22, 8, 0, 0, DateTimeKind.Utc), Status = FollowUpStatus.Pending, Priority = Priority.Medium },
            new FollowUpTask { Title = "done", DueAtUtc = new DateTime(2026, 6, 21, 8, 0, 0, DateTimeKind.Utc), Status = FollowUpStatus.Completed, Priority = Priority.Medium });
        await db.SaveChangesAsync();
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Equal("today", Assert.Single(summary.FollowUpsDue).Title);
        Assert.Equal("overdue", Assert.Single(summary.OverdueFollowUps).Title);
    }

    [Fact]
    public async Task Upcoming_interviews_within_seven_days()
    {
        var name = NewName();
        using var db = Db(name, Clock);
        var (companyId, variantId) = await SeedRefsAsync(db);
        var leadId = await AddLeadAsync(db, companyId, JobLeadStatus.Interviewing, Priority.Medium);
        var appId = await AddAppAsync(db, leadId, variantId, ApplicationStatus.Active, ApplicationStage.TechnicalScreen, null);
        db.Interviews.AddRange(
            new Interview { ApplicationId = appId, RoundType = InterviewRoundType.Technical, ScheduledAtUtc = Clock.UtcNow.AddDays(3), Status = InterviewStatus.Scheduled },
            new Interview { ApplicationId = appId, RoundType = InterviewRoundType.Technical, ScheduledAtUtc = Clock.UtcNow.AddDays(10), Status = InterviewStatus.Scheduled },
            new Interview { ApplicationId = appId, RoundType = InterviewRoundType.Technical, ScheduledAtUtc = Clock.UtcNow.AddHours(-2), Status = InterviewStatus.Scheduled });
        await db.SaveChangesAsync();
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Single(summary.UpcomingInterviews);
    }

    [Fact]
    public async Task HighPriorityLeads_match_priority_and_status_rule()
    {
        var name = NewName();
        using var db = Db(name, Clock);
        var (companyId, _) = await SeedRefsAsync(db);
        await AddLeadAsync(db, companyId, JobLeadStatus.Discovered, Priority.High);     // in
        await AddLeadAsync(db, companyId, JobLeadStatus.Interested, Priority.Critical); // in
        await AddLeadAsync(db, companyId, JobLeadStatus.Applied, Priority.High);        // out (status)
        await AddLeadAsync(db, companyId, JobLeadStatus.Discovered, Priority.Low);      // out (priority)
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Equal(2, summary.HighPriorityLeads.Count);
    }

    [Fact]
    public async Task Stale_includes_active_with_no_next_action_and_old_update()
    {
        var name = NewName();
        using (var past = Db(name, new ClockAt(Clock.UtcNow.AddDays(-10))))
        {
            var (companyId, variantId) = await SeedRefsAsync(past);
            var leadId = await AddLeadAsync(past, companyId, JobLeadStatus.Applied, Priority.Medium);
            await AddAppAsync(past, leadId, variantId, ApplicationStatus.Active, ApplicationStage.Applied, null);
        }
        using var db = Db(name, Clock);
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Single(summary.StaleApplications);
    }

    [Fact]
    public async Task Stale_includes_active_with_past_next_action()
    {
        var name = NewName();
        using var db = Db(name, Clock);
        var (companyId, variantId) = await SeedRefsAsync(db);
        var leadId = await AddLeadAsync(db, companyId, JobLeadStatus.Applied, Priority.Medium);
        await AddAppAsync(db, leadId, variantId, ApplicationStatus.Active, ApplicationStage.Applied, Clock.UtcNow.AddDays(-1));
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Single(summary.StaleApplications);
    }

    [Fact]
    public async Task Stale_excludes_active_with_future_next_action_and_recent_update()
    {
        var name = NewName();
        using var db = Db(name, Clock);
        var (companyId, variantId) = await SeedRefsAsync(db);
        var leadId = await AddLeadAsync(db, companyId, JobLeadStatus.Applied, Priority.Medium);
        await AddAppAsync(db, leadId, variantId, ApplicationStatus.Active, ApplicationStage.Applied, Clock.UtcNow.AddDays(3));
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Empty(summary.StaleApplications);
    }

    [Fact]
    public async Task Stale_excludes_non_active()
    {
        var name = NewName();
        using (var past = Db(name, new ClockAt(Clock.UtcNow.AddDays(-10))))
        {
            var (companyId, variantId) = await SeedRefsAsync(past);
            var leadId = await AddLeadAsync(past, companyId, JobLeadStatus.Rejected, Priority.Medium);
            await AddAppAsync(past, leadId, variantId, ApplicationStatus.Rejected, ApplicationStage.Rejected, null);
        }
        using var db = Db(name, Clock);
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Empty(summary.StaleApplications);
    }

    [Fact]
    public async Task SearchDeadline_counts_whole_days_remaining()
    {
        var name = NewName();
        using var db = Db(name, Clock);
        db.UserProfiles.Add(new UserProfile { SearchDeadlineUtc = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc) });
        await db.SaveChangesAsync();
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.NotNull(summary.SearchDeadline);
        Assert.Equal(10, summary.SearchDeadline!.DaysRemaining);
    }

    [Fact]
    public async Task SearchDeadline_negative_when_passed()
    {
        var name = NewName();
        using var db = Db(name, Clock);
        db.UserProfiles.Add(new UserProfile { SearchDeadlineUtc = new DateTime(2026, 6, 18, 0, 0, 0, DateTimeKind.Utc) });
        await db.SaveChangesAsync();
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Equal(-3, summary.SearchDeadline!.DaysRemaining);
    }
}
```

- [ ] **Step 3: Run the tests to confirm they fail**

Run: `dotnet test backend/tests/CareerOps.UnitTests/CareerOps.UnitTests.csproj`
Expected: compile error / failure — `DashboardService` does not exist yet.

- [ ] **Step 4: Implement `DashboardService`**

`backend/src/CareerOps.Application/Dashboard/DashboardService.cs`:

```csharp
using CareerOps.Application.Applications;
using CareerOps.Application.Common;
using CareerOps.Application.FollowUpTasks;
using CareerOps.Application.Interviews;
using CareerOps.Application.JobLeads;
using CareerOps.Domain.Applications;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Interviews;
using CareerOps.Domain.JobLeads;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Dashboard;

public sealed class DashboardService(IAppDbContext db, IClock clock)
{
    private static readonly Priority[] HighPriorities = [Priority.High, Priority.Critical];
    private static readonly JobLeadStatus[] ActionableStatuses = [JobLeadStatus.Discovered, JobLeadStatus.Interested];

    public async Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken ct = default)
    {
        var now = clock.UtcNow;
        var startOfToday = clock.Today.ToDateTime(TimeOnly.MinValue);
        var interviewWindowEnd = now.AddDays(7);
        var staleBefore = now.AddDays(-7);

        var activeApplicationCount = await db.Applications
            .CountAsync(a => a.Status == ApplicationStatus.Active, ct);

        var leadsByStatus = (await db.JobLeads
                .GroupBy(l => l.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync(ct))
            .Select(x => new StatusCount(x.Status, x.Count)).ToList();

        var applicationsByStage = (await db.Applications
                .GroupBy(a => a.CurrentStage)
                .Select(g => new { Stage = g.Key, Count = g.Count() })
                .ToListAsync(ct))
            .Select(x => new StageCount(x.Stage, x.Count)).ToList();

        var followUpsDue = (await db.FollowUpTasks
                .Where(t => t.Status == FollowUpStatus.Pending && t.DueAtUtc >= startOfToday && t.DueAtUtc <= now)
                .OrderBy(t => t.DueAtUtc).ToListAsync(ct))
            .Adapt<List<FollowUpTaskDto>>();

        var overdueFollowUps = (await db.FollowUpTasks
                .Where(t => t.Status == FollowUpStatus.Pending && t.DueAtUtc < startOfToday)
                .OrderBy(t => t.DueAtUtc).ToListAsync(ct))
            .Adapt<List<FollowUpTaskDto>>();

        var upcomingInterviews = (await db.Interviews
                .Include(i => i.Application).ThenInclude(a => a!.JobLead).ThenInclude(l => l!.Company)
                .Where(i => i.Status == InterviewStatus.Scheduled && i.ScheduledAtUtc >= now && i.ScheduledAtUtc <= interviewWindowEnd)
                .OrderBy(i => i.ScheduledAtUtc).ToListAsync(ct))
            .Adapt<List<InterviewDto>>();

        var highPriorityLeads = (await db.JobLeads
                .Include(l => l.Company)
                .Where(l => HighPriorities.Contains(l.Priority) && ActionableStatuses.Contains(l.Status))
                .OrderByDescending(l => l.Priority).ThenBy(l => l.Title).ToListAsync(ct))
            .Adapt<List<JobLeadDto>>();

        var staleApplications = (await db.Applications
                .Include(a => a.JobLead).ThenInclude(l => l!.Company).Include(a => a.ResumeVariant)
                .Where(a => a.Status == ApplicationStatus.Active &&
                    ((a.NextActionAtUtc == null && a.UpdatedAtUtc < staleBefore) ||
                     (a.NextActionAtUtc != null && a.NextActionAtUtc < now)))
                .OrderBy(a => a.UpdatedAtUtc).ToListAsync(ct))
            .Adapt<List<ApplicationDto>>();

        var profile = await db.UserProfiles.AsNoTracking().FirstOrDefaultAsync(ct);
        DeadlineCountdown? searchDeadline = profile?.SearchDeadlineUtc is { } deadline
            ? new DeadlineCountdown(deadline, DateOnly.FromDateTime(deadline).DayNumber - clock.Today.DayNumber)
            : null;

        return new DashboardSummaryDto(
            activeApplicationCount, leadsByStatus, applicationsByStage,
            followUpsDue, overdueFollowUps, upcomingInterviews,
            highPriorityLeads, staleApplications, searchDeadline);
    }
}
```

- [ ] **Step 5: Register the service**

In `backend/src/CareerOps.Application/DependencyInjection.cs`, add inside `AddApplication`, after the `InterviewService` registration:

```csharp
        services.AddScoped<DashboardService>();
```

(Add `using CareerOps.Application.Dashboard;` to the using block — keep the usings alphabetically ordered with the rest.)

- [ ] **Step 6: Run the tests to confirm they pass**

Run: `dotnet test backend/tests/CareerOps.UnitTests/CareerOps.UnitTests.csproj`
Expected: PASS — all 13 new tests green, full unit suite green.

- [ ] **Step 7: Commit**

```bash
git add backend/src/CareerOps.Application/Dashboard backend/src/CareerOps.Application/DependencyInjection.cs backend/tests/CareerOps.UnitTests/Dashboard
git commit -m "feat(api): dashboard summary service + DTOs (S5.1)"
```

---

## Task 2: Dashboard endpoint + wiring + OpenAPI test

**Files:**
- Create: `backend/src/CareerOps.Api/Endpoints/DashboardEndpoints.cs`
- Modify: `backend/src/CareerOps.Api/Program.cs` (map the group)
- Test: `backend/tests/CareerOps.IntegrationTests/DashboardEndpointTests.cs`

**Interfaces:**
- Consumes: `DashboardService.GetSummaryAsync` (Task 1).
- Produces: `GET /api/dashboard/summary` (operationId `GetDashboardSummary`) → `Ok<DashboardSummaryDto>`.

- [ ] **Step 1: Write the failing integration test**

`backend/tests/CareerOps.IntegrationTests/DashboardEndpointTests.cs`:

```csharp
using FluentAssertions;

namespace CareerOps.IntegrationTests;

// The "Testing" environment has no database, so this asserts the route is published
// (DB-free) rather than fetching live data. Service logic is covered by DashboardServiceTests.
public class DashboardEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Summary_endpoint_is_published_in_openapi()
    {
        var doc = await _client.GetStringAsync("/openapi/v1.json");
        doc.Should().Contain("/api/dashboard/summary");
    }
}
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `dotnet test backend/tests/CareerOps.IntegrationTests/CareerOps.IntegrationTests.csproj`
Expected: FAIL — the OpenAPI document does not contain `/api/dashboard/summary` yet.

- [ ] **Step 3: Create the endpoint class**

`backend/src/CareerOps.Api/Endpoints/DashboardEndpoints.cs`:

```csharp
using CareerOps.Application.Dashboard;

namespace CareerOps.Api.Endpoints;

public static class DashboardEndpoints
{
    public static RouteGroupBuilder MapDashboard(this RouteGroupBuilder group)
    {
        group.MapGet("/summary", async (DashboardService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.GetSummaryAsync(ct)))
            .WithName("GetDashboardSummary");

        return group;
    }
}
```

(If `TypedResults` does not resolve, add `using Microsoft.AspNetCore.Http;` — but the Web SDK's implicit usings should cover it, as in the other endpoint files.)

- [ ] **Step 4: Map the group in `Program.cs`**

In `backend/src/CareerOps.Api/Program.cs`, immediately after the line:

```csharp
app.MapGroup("/api/interviews").WithTags("Interviews").MapInterviews();
```

add:

```csharp
app.MapGroup("/api/dashboard").WithTags("Dashboard").MapDashboard();
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `dotnet test backend/tests/CareerOps.IntegrationTests/CareerOps.IntegrationTests.csproj`
Expected: PASS.

- [ ] **Step 6: Full backend verify**

Run: `dotnet build backend/CareerOps.slnx && dotnet test`
Expected: build 0 errors; full suite green (prior 90 + 13 unit + 1 integration = 104).

- [ ] **Step 7: Commit**

```bash
git add backend/src/CareerOps.Api/Endpoints/DashboardEndpoints.cs backend/src/CareerOps.Api/Program.cs backend/tests/CareerOps.IntegrationTests/DashboardEndpointTests.cs
git commit -m "feat(api): GET /api/dashboard/summary endpoint (S5.1)"
```

---

## Task 3: Regenerate the orval client (controller-run)

This task runs the live stack and regenerates the typed client; it produces no hand-written code and is gated by typecheck, so it has no separate reviewer. The controller runs it directly.

**Files (generated — do not hand-edit):**
- Create: `frontend/src/lib/api/dashboard/dashboard.ts`, `frontend/src/lib/api/dashboard/dashboard.zod.ts`
- Create: `frontend/src/lib/api/model/dashboardSummaryDto.ts`, `statusCount.ts`, `stageCount.ts`, `deadlineCountdown.ts`
- Modify: `frontend/src/lib/api/model/index.ts` (new re-exports)

- [ ] **Step 1: Bring up the stack with the new endpoint**

Run: `just up`
Expected: postgres + api healthy; migrations applied; API serves `http://localhost:8080`.

- [ ] **Step 2: Confirm the endpoint responds**

Run: `curl -s http://localhost:8080/api/dashboard/summary`
Expected: HTTP 200 with a JSON object containing `activeApplicationCount`, `leadsByStatus`, `applicationsByStage`, `followUpsDue`, `overdueFollowUps`, `upcomingInterviews`, `highPriorityLeads`, `staleApplications`, `searchDeadline`.

- [ ] **Step 3: Regenerate the client**

Run: `just gen-client`
Expected: orval writes `frontend/src/lib/api/dashboard/*` and the new model files; `useGetDashboardSummary` exists.

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: PASS (DashboardPage still uses the old hook at this point — that is fine; the generated code is self-consistent).

- [ ] **Step 5: Commit the generated client**

```bash
git add frontend/src/lib/api
git commit -m "chore(web): regenerate orval client for dashboard summary (S5.1)"
```

---

## Task 4: Dashboard frontend refactor (single summary source)

Rewrite the dashboard to consume only `useGetDashboardSummary`, and convert `TodaysActions`/`UpcomingInterviews` to presentational components. These three files change together (the page passes props the components now require), so they are one task — each must compile only as a set.

**Files:**
- Modify: `frontend/src/features/dashboard/TodaysActions.tsx` (→ presentational `{ due, overdue }`)
- Modify: `frontend/src/features/dashboard/UpcomingInterviews.tsx` (→ presentational `{ items }`)
- Modify: `frontend/src/pages/DashboardPage.tsx` (consume summary; header chip; apps-by-stage tiles; stale card; drop "Recently updated")

**Interfaces:**
- Consumes: `useGetDashboardSummary` from `@/lib/api/dashboard/dashboard` (Task 3) → `{ data?: { data: DashboardSummaryDto } }`. Model fields (camelCase): `activeApplicationCount`, `leadsByStatus: { status, count }[]`, `applicationsByStage: { stage, count }[]`, `followUpsDue: FollowUpTaskDto[]`, `overdueFollowUps: FollowUpTaskDto[]`, `upcomingInterviews: InterviewDto[]`, `highPriorityLeads: JobLeadDto[]`, `staleApplications: ApplicationDto[]`, `searchDeadline: { deadlineUtc, daysRemaining } | null`.
- Produces: presentational `TodaysActions({ due, overdue })` and `UpcomingInterviews({ items })`.

- [ ] **Step 1: Convert `TodaysActions` to presentational**

Replace the entire contents of `frontend/src/features/dashboard/TodaysActions.tsx`:

```tsx
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCompleteFollowUpTask, useSkipFollowUpTask } from "@/lib/api/follow-up-tasks/follow-up-tasks";
import type { FollowUpTaskDto } from "@/lib/api/model";

export function TodaysActions({ due, overdue }: { due: FollowUpTaskDto[]; overdue: FollowUpTaskDto[] }) {
  const complete = useCompleteFollowUpTask();
  const skip = useSkipFollowUpTask();

  // No manual invalidation — the global MutationCache.onSettled rule (D37) refetches the summary.
  const act = async (fn: Promise<unknown>, msg: string) => {
    await fn;
    toast.success(msg);
  };

  const Row = (t: FollowUpTaskDto) => (
    <div key={String(t.id)} className="flex items-center justify-between gap-2 border-b py-2 last:border-0">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{t.title}</div>
        <div className="text-xs text-muted-foreground">{format(new Date(t.dueAtUtc), "dd.MM.yyyy")}</div>
      </div>
      <div className="shrink-0">
        <Button variant="ghost" size="sm" onClick={() => act(complete.mutateAsync({ id: Number(t.id) }), "Done")}>Done</Button>
        <Button variant="ghost" size="sm" onClick={() => act(skip.mutateAsync({ id: Number(t.id) }), "Skipped")}>Skip</Button>
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Today's actions</CardTitle></CardHeader>
        <CardContent>
          {due.length === 0
            ? <p className="text-sm text-muted-foreground">Nothing due.</p>
            : due.map(Row)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Overdue</CardTitle></CardHeader>
        <CardContent>
          {overdue.length === 0
            ? <p className="text-sm text-muted-foreground">Nothing overdue.</p>
            : overdue.map(Row)}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Convert `UpcomingInterviews` to presentational**

Replace the entire contents of `frontend/src/features/dashboard/UpcomingInterviews.tsx`:

```tsx
import { Link } from "react-router";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InterviewDto } from "@/lib/api/model";
import { interviewRoundType, enumLabel } from "@/lib/enums";

export function UpcomingInterviews({ items }: { items: InterviewDto[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Upcoming interviews</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0
          ? <p className="text-sm text-muted-foreground">None in the next 7 days.</p>
          : items.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-2">
              <Link to="/interviews" className="min-w-0 truncate font-medium hover:underline">
                {i.companyName} · {enumLabel(interviewRoundType, i.roundType)}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(i.scheduledAtUtc), { addSuffix: true })}
              </span>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Rewrite `DashboardPage`**

Replace the entire contents of `frontend/src/pages/DashboardPage.tsx`:

```tsx
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useGetDashboardSummary } from "@/lib/api/dashboard/dashboard";
import { PipelineBar } from "@/features/dashboard/PipelineBar";
import { TodaysActions } from "@/features/dashboard/TodaysActions";
import { UpcomingInterviews } from "@/features/dashboard/UpcomingInterviews";
import { applicationStage, enumLabel } from "@/lib/enums";

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-normal text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-3xl font-semibold">{value}</CardContent>
    </Card>
  );
}

function DeadlineChip({ daysRemaining }: { daysRemaining: number }) {
  const label =
    daysRemaining > 0 ? `⏳ ${daysRemaining} days left`
    : daysRemaining === 0 ? "⏳ due today"
    : `⚠ ${Math.abs(daysRemaining)} days over`;
  const tone = daysRemaining < 0 ? "bg-red-100 text-red-700" : "bg-sky-100 text-sky-700";
  return <Badge variant="secondary" className={`border-transparent ${tone}`}>{label}</Badge>;
}

export default function DashboardPage() {
  const { data, isLoading } = useGetDashboardSummary();
  const summary = data?.data;

  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
      </div>
    );
  }

  const leadCounts = summary.leadsByStatus.reduce<Record<number, number>>(
    (a, c) => { a[c.status] = c.count; return a; }, {});
  const totalLeads = summary.leadsByStatus.reduce((sum, c) => sum + c.count, 0);
  const stageTiles = summary.applicationsByStage.filter((s) => s.count > 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        {summary.searchDeadline && <DeadlineChip daysRemaining={summary.searchDeadline.daysRemaining} />}
      </div>

      <TodaysActions due={summary.followUpsDue} overdue={summary.overdueFollowUps} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat title="Total leads" value={totalLeads} />
        <Stat title="High-priority" value={summary.highPriorityLeads.length} />
        <Stat title="Active applications" value={summary.activeApplicationCount} />
        <Stat title="Interviewing" value={leadCounts[3] ?? 0} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Lead pipeline</CardTitle></CardHeader>
        <CardContent><PipelineBar counts={leadCounts} total={totalLeads} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Applications by stage</CardTitle></CardHeader>
        <CardContent>
          {stageTiles.length === 0
            ? <p className="text-sm text-muted-foreground">No applications yet.</p>
            : (
              <div className="flex flex-wrap gap-2">
                {stageTiles.map((s) => (
                  <span key={s.stage} className="rounded-md bg-muted px-3 py-1 text-sm">
                    {enumLabel(applicationStage, s.stage)} <span className="font-semibold">{s.count}</span>
                  </span>
                ))}
              </div>
            )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">High-priority to action</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {summary.highPriorityLeads.length === 0
              ? <p className="text-muted-foreground">Nothing awaiting action.</p>
              : summary.highPriorityLeads.map((l) => (
                <div key={l.id} className="flex items-center justify-between">
                  <Link to="/job-leads" className="min-w-0 truncate font-medium hover:underline">{l.title}</Link>
                  <span className="shrink-0 text-sm text-muted-foreground">{l.companyName}</span>
                </div>
              ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Stale applications</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {summary.staleApplications.length === 0
              ? <p className="text-muted-foreground">Nothing stale.</p>
              : summary.staleApplications.map((a) => (
                <div key={a.id} className="flex items-center justify-between">
                  <Link to="/applications" className="min-w-0 truncate font-medium hover:underline">{a.jobTitle}</Link>
                  <span className="shrink-0 text-sm text-muted-foreground">{a.companyName}</span>
                </div>
              ))}
          </CardContent>
        </Card>
        <UpcomingInterviews items={summary.upcomingInterviews} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck and build**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: PASS, no type errors. (If the orval id type is `number | string`, the existing `Number()`/`String()` coercions already cover it; `s.status`/`s.stage`/`l.id`/`a.id` are used as React keys and numeric map indexes, which accept both.)

- [ ] **Step 5: Manual smoke (optional but recommended)**

With the stack up (`just up`) and frontend running (`just web`), open the dashboard: confirm the cards render from the single summary call, completing a follow-up updates the lists, and (if a `SearchDeadlineUtc` is set in Settings) the header chip shows.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx frontend/src/features/dashboard/TodaysActions.tsx frontend/src/features/dashboard/UpcomingInterviews.tsx
git commit -m "feat(web): dashboard consumes single summary endpoint (S5.1, D39-D43)"
```

---

## Task 5: Documentation

**Files:**
- Modify: `docs/knowledge-base/03-decisions.md` (append D39–D43)
- Modify: `docs/knowledge-base/02-delivery-plan.md` (Phase 5 delivered note)

- [ ] **Step 1: Append decisions D39–D43**

Append to `docs/knowledge-base/03-decisions.md`, matching the existing dated-entry format. Copy the decision text verbatim from the spec at `docs/superpowers/specs/2026-06-21-careerops-phase-5-dashboard-summary-design.md` §7:

- **D39** — Dashboard reads a single `GET /api/dashboard/summary`; `TodaysActions`/`UpcomingInterviews` are presentational (props). Standalone `/follow-up-tasks/due` and `/interviews/upcoming` retained for their own pages.
- **D40** — Follow-ups are a non-overlapping partition: overdue = `Pending AND Due < startOfToday`; due-today = `Pending AND startOfToday <= Due <= now`. `startOfToday` is UTC via `IClock.Today`. Refines the prior dashboard behavior that double-listed overdue.
- **D41** — `LeadsByStatus`/`ApplicationsByStage` returned as typed count lists (`{enum, count}`), not enum-keyed dictionaries (orval-friendly).
- **D42** — Search-deadline `DaysRemaining` is a whole-day diff (UTC dates) via `IClock`; rendered as a header chip; hidden when `SearchDeadlineUtc` null.
- **D43** — "Recently updated" dashboard card dropped (not a §14.2 field; no summary data); replaced by a Stale-applications card.
- Note: the dashboard endpoint has no DB-backed integration test because the Testing environment runs without a database (existing convention); `DashboardServiceTests` covers the logic, and an OpenAPI-presence integration test covers wiring.

- [ ] **Step 2: Update the delivery plan**

In `docs/knowledge-base/02-delivery-plan.md`, under `## Phase 5 — Dashboard completion` / `### S5.1`, add a dated delivered note:

```markdown
- **Note (2026-06-21):** S5.1 delivered — `GET /api/dashboard/summary`, stale-application + search-deadline rules, dashboard consumes the single summary. Decisions D39–D43 logged.
```

- [ ] **Step 3: Commit**

```bash
git add docs/knowledge-base/03-decisions.md docs/knowledge-base/02-delivery-plan.md
git commit -m "docs: log D39-D43 and S5.1 delivered (Phase 5)"
```

---

## Final verification (after all tasks)

Run: `just verify`
Expected: backend build 0 errors; full test suite green (90 prior + 13 unit + 1 integration = 104); frontend typecheck + build clean.

## Suggested models (subagent-driven execution)

- Task 1 — sonnet (multi-file, EF/test-design judgment).
- Task 2 — sonnet (endpoint + wiring + OpenAPI test, small but integration-touching).
- Task 3 — controller-run, no subagent (live stack + generated code, typecheck-gated).
- Task 4 — sonnet (multi-file frontend refactor with prop threading).
- Task 5 — haiku (docs transcription).
- Final whole-branch review — opus.
