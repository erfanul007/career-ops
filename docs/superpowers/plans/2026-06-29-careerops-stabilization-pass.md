# CareerOps V2 Stabilization Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the high-ROI consistency and integrity gaps left after the Domain V2 refactor — stale MCP docs, fragile card click/drag, unsafe frontend casts, a missing validator, follow-up relation integrity, delete cleanup, and company normalization — without changing the V2 architecture.

**Architecture:** No structural change. Backend stays Clean Architecture + tactical DDD (services, no repositories/MediatR). Frontend stays React + orval-generated TanStack Query client. All edits are additive or in-place hardening of existing slices. MCP stays workflow-oriented over the Job aggregate.

**Tech Stack:** .NET 10 Minimal APIs, EF Core (Postgres; EF InMemory in unit tests), FluentValidation, xUnit + FluentAssertions, ModelContextProtocol.AspNetCore; React 19 + TypeScript, TanStack Query v5, orval v8, @dnd-kit, Vite.

## Global Constraints

These apply to **every** task. Copied verbatim from `CLAUDE.md` / knowledge base, plus this pass's working rules:

- **Do not commit.** Each task ends by self-validating, showing the changed files + validation output, and **waiting for review**. No `git add`/`git commit`/`git push` anywhere in this plan.
- Inject `IClock`; never call `DateTime.UtcNow` directly in app/domain code. In tests, prefer the injected `clock.UtcNow`, or rely on `CareerOpsDbContext`'s audit auto-stamping (it stamps `AuditableEntity.CreatedAtUtc`/`UpdatedAtUtc` from the injected clock on `SaveChangesAsync`) — never `DateTime.UtcNow`.
- Never reorder or renumber an existing enum member's integer value. (No enum edits in this plan.)
- No new infrastructure (no auth, RabbitMQ/Redis/Kubernetes, vector DB, file upload). No new NuGet/npm dependencies.
- Use the dotnet CLI / npm — do not hand-author `.csproj`/`package.json`/`.sln` (D19). No project/package changes are needed here.
- Clean code: KISS/YAGNI, no dead/commented-out code, comment the non-obvious *why* only.
- **No silent decisions:** the README rewrite reverses D49's "44 tools / full REST parity" claim, so it MUST be accompanied by a new dated decision entry (D53) — never edit a locked decision in place.
- Include tests with non-trivial changes. Every change must keep `just verify` green (`dotnet build` + `dotnet test` + frontend `tsc -b` + `vite build`).
- MCP tool names are snake_case; enum I/O uses string names.
- Scope is items 1–9 of the assessment. **Item 10 (UI transition warnings) is explicitly out of scope.** Do not add a backend state machine; do not move `FitScore`/resume fields to `JobProperty`; do not refactor `JobTransition`/`JobProperty` auditing; do not expand MCP toward REST parity; do not add `delete_company` to MCP; do not change `UserProfileService.GetAsync`.

**Useful commands:**
- Run one backend test class: `dotnet test backend/CareerOps.slnx --filter "FullyQualifiedName~<ClassName>"`
- Run all backend tests: `dotnet test backend/CareerOps.slnx`
- Frontend gates: `npm --prefix frontend run typecheck` then `npm --prefix frontend run build` then `npm --prefix frontend run lint`
- Full gate: `just verify`

---

## File Structure

**Backend — modify:**
- `backend/src/CareerOps.Application/Jobs/JobRequestValidators.cs` — add `UpdateActivityRequestValidator` (Task 1).
- `backend/src/CareerOps.Application/FollowUpTasks/FollowUpTaskService.cs` — activity-belongs-to-job validation (Task 2).
- `backend/src/CareerOps.Presentation/Endpoints/JobEndpoints.cs` — map `ArgumentException`→400 on job-scoped follow-up create (Task 2).
- `backend/src/CareerOps.Presentation/Endpoints/FollowUpTaskEndpoints.cs` — map `ArgumentException`→400 on follow-up update (Task 2); add `DELETE /{id}` (Task 5).
- `backend/src/CareerOps.Application/Companies/CompanyService.cs` — consistent name normalization (Task 3).
- `backend/src/CareerOps.Presentation/Mcp/FollowUpTools.cs` — `delete_follow_up` tool (Task 5).
- `backend/src/CareerOps.Presentation/Mcp/JobTools.cs` — `delete_job_activity` tool (Task 6).
- `backend/src/CareerOps.Presentation/Mcp/README.md` — full V2 rewrite (Task 9).
- `docs/knowledge-base/03-decisions.md` — append D53 (Task 9).

**Backend — modify (tests):**
- `backend/tests/CareerOps.UnitTests/FollowUpTasks/FollowUpTaskServiceTests.cs` — relation + delete tests (Tasks 2, 5).
- `backend/tests/CareerOps.UnitTests/Companies/CompanyServiceTests.cs` — normalization tests (Task 3).
- `backend/tests/CareerOps.IntegrationTests/JobEndpointTests.cs` — update-activity validation test (Task 1).
- `backend/tests/CareerOps.IntegrationTests/FollowUpTaskEndpointTests.cs` — follow-up relation 400 test (Task 2).
- `backend/tests/CareerOps.IntegrationTests/JobMcpToolTests.cs` — MCP delete tool tests (Tasks 5, 6).

**Backend — create (tests):**
- `backend/tests/CareerOps.UnitTests/Jobs/ActivityRequestValidatorTests.cs` (Task 1).
- `backend/tests/CareerOps.UnitTests/Jobs/JobDeleteCascadeTests.cs` (Task 4).

**Frontend — create:**
- `frontend/src/lib/api/jobs/hooks.ts` — typed wrapper hooks `useJobs`/`useJob` (Task 7).

**Frontend — modify:**
- `frontend/src/pages/JobsPage.tsx`, `frontend/src/pages/JobDetailPage.tsx`, `frontend/src/features/jobs/JobDetailDrawer.tsx` — consume wrappers, drop casts (Task 7).
- `frontend/src/features/jobs/JobCard.tsx` — guard interactive children from drag (Task 8).

**Sequencing note:** Task 9 (README) runs **last** because its tool count depends on Tasks 5 and 6 landing first (final total = 25 tools). Tasks 2 and 5 both edit `FollowUpTaskEndpoints.cs`; run them in order.

---

### Task 1: Add `UpdateActivityRequestValidator` (assessment item 4)

The update-activity REST endpoint already wires `.AddEndpointFilter<ValidationFilter<UpdateActivityRequest>>()` (`JobEndpoints.cs:80-86`), and `AddValidatorsFromAssembly` (`DependencyInjection.cs:19`) auto-registers any validator in the Application assembly. Today no `UpdateActivityRequestValidator` exists, so update requests are silently unvalidated. Add it mirroring `CreateActivityRequestValidator`.

**Files:**
- Modify: `backend/src/CareerOps.Application/Jobs/JobRequestValidators.cs`
- Test (create): `backend/tests/CareerOps.UnitTests/Jobs/ActivityRequestValidatorTests.cs`
- Test (modify): `backend/tests/CareerOps.IntegrationTests/JobEndpointTests.cs`

**Interfaces:**
- Consumes: `UpdateActivityRequest(string Label, JobActivityType Type, JobActivityStatus Status, DateTime? ScheduledAtUtc, int? DurationMinutes, string? ContactName, string? ContactRole, string? MeetingUrl, string? PrepNotes, string? Notes)`.
- Produces: `public sealed class UpdateActivityRequestValidator : AbstractValidator<UpdateActivityRequest>` (DI auto-registered).

- [ ] **Step 1: Write the failing unit test**

Create `backend/tests/CareerOps.UnitTests/Jobs/ActivityRequestValidatorTests.cs`:

```csharp
using CareerOps.Application.Jobs;
using CareerOps.Domain.Jobs;
using FluentValidation.TestHelper;
using Xunit;

namespace CareerOps.UnitTests.Jobs;

public sealed class ActivityRequestValidatorTests
{
    private readonly UpdateActivityRequestValidator _validator = new();

    private static UpdateActivityRequest Valid(string label = "Round 1") => new(
        Label: label, Type: JobActivityType.Interview, Status: JobActivityStatus.Planned,
        ScheduledAtUtc: null, DurationMinutes: null, ContactName: null, ContactRole: null,
        MeetingUrl: null, PrepNotes: null, Notes: null);

    [Fact]
    public void Label_is_required() =>
        _validator.TestValidate(Valid(label: "")).ShouldHaveValidationErrorFor(r => r.Label);

    [Fact]
    public void MeetingUrl_over_2000_chars_fails() =>
        _validator.TestValidate(Valid() with { MeetingUrl = new string('x', 2001) })
            .ShouldHaveValidationErrorFor(r => r.MeetingUrl);

    [Fact]
    public void Valid_request_passes() =>
        _validator.TestValidate(Valid()).ShouldNotHaveAnyValidationErrors();
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `dotnet test backend/CareerOps.slnx --filter "FullyQualifiedName~ActivityRequestValidatorTests"`
Expected: FAIL — compile error, `UpdateActivityRequestValidator` does not exist.

- [ ] **Step 3: Add the validator**

In `backend/src/CareerOps.Application/Jobs/JobRequestValidators.cs`, append after `CreateActivityRequestValidator` (end of file, before the final newline):

```csharp
public sealed class UpdateActivityRequestValidator : AbstractValidator<UpdateActivityRequest>
{
    public UpdateActivityRequestValidator()
    {
        RuleFor(x => x.Label).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.MeetingUrl).MaximumLength(2000).When(x => x.MeetingUrl is not null);
    }
}
```

- [ ] **Step 4: Run the unit test to verify it passes**

Run: `dotnet test backend/CareerOps.slnx --filter "FullyQualifiedName~ActivityRequestValidatorTests"`
Expected: PASS (3 tests).

- [ ] **Step 5: Add a DB-free integration test proving the filter is wired**

In `backend/tests/CareerOps.IntegrationTests/JobEndpointTests.cs`, add this method inside the class (after `UpdateJob_InvalidTitle_Returns400`):

```csharp
    [Fact]
    public async Task UpdateActivity_BlankLabel_Returns400()
    {
        // Validation runs in the endpoint filter before any DB lookup, so no live DB is needed.
        var res = await _client.PutAsJsonAsync("/api/jobs/1/activities/1", new
        {
            label = "",
            type = "Interview",
            status = "Planned"
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await res.Content.ReadAsStringAsync()).ToLowerInvariant().Should().Contain("label");
    }
```

- [ ] **Step 6: Run the integration test to verify it passes**

Run: `dotnet test backend/CareerOps.slnx --filter "FullyQualifiedName~JobEndpointTests"`
Expected: PASS (all methods, including `UpdateActivity_BlankLabel_Returns400`).

- [ ] **Step 7: Validate and stop for review (do not commit)**

Run: `dotnet test backend/CareerOps.slnx --filter "FullyQualifiedName~ActivityRequestValidatorTests|FullyQualifiedName~JobEndpointTests"`
Then show the changed files and the test output, and wait for review. **Do not commit.**

---

### Task 2: Follow-up ↔ activity relation integrity + clean REST 400 (assessment item 5)

`FollowUpTaskService` currently enforces only "JobActivityId requires JobId" (`FollowUpTaskService.cs:12-13` and `:32-33`). It does not verify that the referenced activity actually belongs to the given job. Strengthen `CreateAsync`/`UpdateAsync` to load the activity and check `activity.JobId == req.JobId`.

The service signals bad input by throwing `ArgumentException`. `Program.cs` uses `UseExceptionHandler()` + `AddProblemDetails()` with **no** `ArgumentException`→400 mapping, so a cross-job request would currently surface as a generic **500**. Add a small endpoint-level catch on the two follow-up write endpoints to return a 400 ProblemDetails instead. (The "JobActivityId without JobId" case is already returned as 400 by the existing FluentValidation rule; the catch matters for the **cross-job mismatch**, which requires a DB lookup to detect.)

**Files:**
- Modify: `backend/src/CareerOps.Application/FollowUpTasks/FollowUpTaskService.cs`
- Modify: `backend/src/CareerOps.Presentation/Endpoints/JobEndpoints.cs`
- Modify: `backend/src/CareerOps.Presentation/Endpoints/FollowUpTaskEndpoints.cs`
- Test (modify): `backend/tests/CareerOps.UnitTests/FollowUpTasks/FollowUpTaskServiceTests.cs`
- Test (modify): `backend/tests/CareerOps.IntegrationTests/FollowUpTaskEndpointTests.cs`

**Interfaces:**
- Consumes: `IAppDbContext.JobActivities` (DbSet at `IAppDbContext.cs:14`); `JobActivity.JobId` (int).
- Produces: `CreateAsync`/`UpdateAsync` throw `ArgumentException` when `JobActivityId` is set and the activity is missing or belongs to a different job. The job-scoped follow-up create and the follow-up update REST endpoints map `ArgumentException`→400.

- [ ] **Step 1: Write the failing service tests**

In `backend/tests/CareerOps.UnitTests/FollowUpTasks/FollowUpTaskServiceTests.cs`, add `using CareerOps.Domain.Jobs;` and `using CareerOps.Domain.Companies;` to the usings, then add this helper + tests inside the class (after `Complete_SetsStatusCompleted`). Timestamps are omitted on seed entities — `CareerOpsDbContext.SaveChangesAsync` audit-stamps them from the test's `FixedClock`.

```csharp
    private static async Task<(int JobId, int ActivityId)> SeedJobWithActivity(CareerOpsDbContext db, string jobTitle = "Dev")
    {
        var company = new Company { Name = "Acme" };
        db.Companies.Add(company);
        await db.SaveChangesAsync();
        var job = new Job { CompanyId = company.Id, Title = jobTitle, Status = JobStatus.Interviewing, Priority = Priority.Medium };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();
        var activity = new JobActivity { JobId = job.Id, Label = "Round 1", Type = JobActivityType.Interview, Status = JobActivityStatus.Planned, Outcome = JobActivityOutcome.Unknown };
        db.JobActivities.Add(activity);
        await db.SaveChangesAsync();
        return (job.Id, activity.Id);
    }

    [Fact]
    public async Task Create_WithActivityFromDifferentJob_Throws()
    {
        var dbName = nameof(Create_WithActivityFromDifferentJob_Throws);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var (_, activityId) = await SeedJobWithActivity(db);
        var (otherJobId, _) = await SeedJobWithActivity(db, jobTitle: "Other");
        var svc = new FollowUpTaskService(db, clock);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            svc.CreateAsync(new CreateFollowUpTaskRequest("Thank you", null, clock.UtcNow.AddDays(1), Priority.Low, JobId: otherJobId, JobActivityId: activityId)));
    }

    [Fact]
    public async Task Create_WithActivityBelongingToJob_Succeeds()
    {
        var dbName = nameof(Create_WithActivityBelongingToJob_Succeeds);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var (jobId, activityId) = await SeedJobWithActivity(db);
        var svc = new FollowUpTaskService(db, clock);

        var dto = await svc.CreateAsync(new CreateFollowUpTaskRequest("Thank you", null, clock.UtcNow.AddDays(1), Priority.Low, JobId: jobId, JobActivityId: activityId));

        Assert.Equal(jobId, dto.JobId);
        Assert.Equal(activityId, dto.JobActivityId);
    }

    [Fact]
    public async Task Create_WithMissingActivity_Throws()
    {
        var dbName = nameof(Create_WithMissingActivity_Throws);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var (jobId, _) = await SeedJobWithActivity(db);
        var svc = new FollowUpTaskService(db, clock);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            svc.CreateAsync(new CreateFollowUpTaskRequest("Thank you", null, clock.UtcNow.AddDays(1), Priority.Low, JobId: jobId, JobActivityId: 99999)));
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `dotnet test backend/CareerOps.slnx --filter "FullyQualifiedName~FollowUpTaskServiceTests"`
Expected: FAIL — `Create_WithActivityFromDifferentJob_Throws` and `Create_WithMissingActivity_Throws` do NOT throw yet; `Create_WithActivityBelongingToJob_Succeeds` may pass already.

- [ ] **Step 3: Implement the relation check in the service**

In `backend/src/CareerOps.Application/FollowUpTasks/FollowUpTaskService.cs`:

Replace the guard at the top of `CreateAsync` (currently lines 12-13):

```csharp
        if (req.JobActivityId.HasValue && !req.JobId.HasValue)
            throw new ArgumentException("JobId must be set when JobActivityId is set");
```

with:

```csharp
        await ValidateActivityLink(req.JobId, req.JobActivityId, ct);
```

Replace the identical guard at the top of `UpdateAsync` (currently lines 32-33) with the same line:

```csharp
        await ValidateActivityLink(req.JobId, req.JobActivityId, ct);
```

Add this private helper near the bottom of the class (e.g. just above `LoadDto`):

```csharp
    private async Task ValidateActivityLink(int? jobId, int? jobActivityId, CancellationToken ct)
    {
        if (!jobActivityId.HasValue) return;
        if (!jobId.HasValue)
            throw new ArgumentException("JobId must be set when JobActivityId is set");

        var activity = await db.JobActivities.FirstOrDefaultAsync(a => a.Id == jobActivityId.Value, ct);
        if (activity is null)
            throw new ArgumentException($"Job activity {jobActivityId.Value} not found");
        if (activity.JobId != jobId.Value)
            throw new ArgumentException("Job activity does not belong to the specified job");
    }
```

(`Microsoft.EntityFrameworkCore` is already imported for `FirstOrDefaultAsync`.)

- [ ] **Step 4: Run the service tests to verify they pass**

Run: `dotnet test backend/CareerOps.slnx --filter "FullyQualifiedName~FollowUpTaskServiceTests"`
Expected: PASS — all methods, including the existing `Create_WithActivityButNoJob_Throws` (the helper still throws when JobId is null).

- [ ] **Step 5: Map `ArgumentException`→400 on the job-scoped follow-up create**

In `backend/src/CareerOps.Presentation/Endpoints/JobEndpoints.cs`, replace the `CreateJobFollowUp` handler body (currently lines 141-148):

```csharp
        jobs.MapPost("/{id:int}/follow-ups", async (int id, CreateFollowUpTaskRequest req, FollowUpTaskService svc) =>
        {
            var reqWithJob = req with { JobId = id };
            var task = await svc.CreateAsync(reqWithJob);
            return TypedResults.Created($"/api/follow-up-tasks/{task.Id}", task);
        })
        .WithName("CreateJobFollowUp")
        .AddEndpointFilter<ValidationFilter<CreateFollowUpTaskRequest>>();
```

with:

```csharp
        jobs.MapPost("/{id:int}/follow-ups", async (int id, CreateFollowUpTaskRequest req, FollowUpTaskService svc) =>
        {
            try
            {
                var reqWithJob = req with { JobId = id };
                var task = await svc.CreateAsync(reqWithJob);
                return Results.Created($"/api/follow-up-tasks/{task.Id}", task);
            }
            catch (ArgumentException ex)
            {
                return Results.Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest);
            }
        })
        .WithName("CreateJobFollowUp")
        .AddEndpointFilter<ValidationFilter<CreateFollowUpTaskRequest>>();
```

- [ ] **Step 6: Map `ArgumentException`→400 on follow-up update**

In `backend/src/CareerOps.Presentation/Endpoints/FollowUpTaskEndpoints.cs`, replace the `UpdateFollowUpTask` handler body (currently lines 16-22):

```csharp
        tasks.MapPut("/{id:int}", async (int id, UpdateFollowUpTaskRequest req, FollowUpTaskService svc) =>
        {
            var task = await svc.UpdateAsync(id, req);
            return task is null ? Results.NotFound() : Results.Ok(task);
        })
        .WithName("UpdateFollowUpTask")
        .AddEndpointFilter<ValidationFilter<UpdateFollowUpTaskRequest>>();
```

with:

```csharp
        tasks.MapPut("/{id:int}", async (int id, UpdateFollowUpTaskRequest req, FollowUpTaskService svc) =>
        {
            try
            {
                var task = await svc.UpdateAsync(id, req);
                return task is null ? Results.NotFound() : Results.Ok(task);
            }
            catch (ArgumentException ex)
            {
                return Results.Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest);
            }
        })
        .WithName("UpdateFollowUpTask")
        .AddEndpointFilter<ValidationFilter<UpdateFollowUpTaskRequest>>();
```

(`StatusCodes` is in `Microsoft.AspNetCore.Http`, available in both files.)

- [ ] **Step 7: Add a DB-free REST regression test for the relation contract**

In `backend/tests/CareerOps.IntegrationTests/FollowUpTaskEndpointTests.cs`, add inside the class:

```csharp
    [Fact]
    public async Task UpdateFollowUp_ActivityWithoutJob_Returns400()
    {
        // JobActivityId set without JobId is rejected (validation rule) before any DB lookup.
        var res = await _client.PutAsJsonAsync("/api/follow-up-tasks/1", new
        {
            title = "Test",
            dueAtUtc = "2026-06-20T00:00:00Z",
            priority = "Medium",
            jobActivityId = 5
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await res.Content.ReadAsStringAsync()).ToLowerInvariant().Should().Contain("jobid");
    }
```

> The cross-job mismatch (activity exists but belongs to a different job) needs a live DB to reproduce and is covered by the service unit test `Create_WithActivityFromDifferentJob_Throws`; the endpoint catch added in Steps 5–6 maps it to a 400 at the REST layer.

- [ ] **Step 8: Build and run the affected tests**

Run: `dotnet test backend/CareerOps.slnx --filter "FullyQualifiedName~FollowUpTaskServiceTests|FullyQualifiedName~FollowUpTaskEndpointTests"`
Expected: PASS (all methods).

- [ ] **Step 9: Validate and stop for review (do not commit)**

Show the changed files and test output, and wait for review. **Do not commit.**

---

### Task 3: Consistent company-name normalization (assessment item 9)

`FindOrCreateByNameAsync` (`CompanyService.cs:10-21`) trims+lowers the input but compares against `c.Name.ToLower()` (the stored name, untrimmed). A legacy row stored with surrounding whitespace would not match. Fix the comparison to trim the stored name too. **Do not** add a normalized unique index/migration now (defer until duplicates are a real problem, per the assessment).

**Files:**
- Modify: `backend/src/CareerOps.Application/Companies/CompanyService.cs`
- Test (modify): `backend/tests/CareerOps.UnitTests/Companies/CompanyServiceTests.cs`

**Interfaces:**
- Consumes/Produces: `Task<CompanyDto> FindOrCreateByNameAsync(string name, CancellationToken ct = default)` — signature unchanged; matching becomes trim- and case-insensitive against stored names.

- [ ] **Step 1: Write the failing tests**

In `backend/tests/CareerOps.UnitTests/Companies/CompanyServiceTests.cs`, add these tests inside the class (after `DeleteAsync_removes_and_reports`). The file already imports `CareerOps.Domain.Companies` and `Microsoft.EntityFrameworkCore`.

```csharp
    [Fact]
    public async Task FindOrCreate_is_case_and_whitespace_insensitive()
    {
        await using var db = NewDb();
        var svc = new CompanyService(db);

        var first = await svc.FindOrCreateByNameAsync("Acme");
        var again = await svc.FindOrCreateByNameAsync("  acme  ");

        Assert.Equal(first.Id, again.Id);
        Assert.Single(await svc.ListAsync());
    }

    [Fact]
    public async Task FindOrCreate_matches_legacy_untrimmed_stored_name()
    {
        await using var db = NewDb();
        db.Companies.Add(new Company { Name = "Acme " }); // simulate a legacy row with a trailing space
        await db.SaveChangesAsync();
        var svc = new CompanyService(db);

        var found = await svc.FindOrCreateByNameAsync("acme");

        Assert.Single(await svc.ListAsync());
        Assert.Equal("Acme ", (await svc.GetAsync(found.Id))!.Name);
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `dotnet test backend/CareerOps.slnx --filter "FullyQualifiedName~CompanyServiceTests"`
Expected: FAIL — `FindOrCreate_matches_legacy_untrimmed_stored_name` creates a second row (stored `"Acme "` is not trimmed in the comparison) so `ListAsync` returns 2.

- [ ] **Step 3: Trim the stored name in the comparison**

In `backend/src/CareerOps.Application/Companies/CompanyService.cs`, change the query inside `FindOrCreateByNameAsync` (line 13-14) from:

```csharp
        var existing = await db.Companies
            .FirstOrDefaultAsync(c => c.Name.ToLower() == normalized, ct);
```

to:

```csharp
        var existing = await db.Companies
            .FirstOrDefaultAsync(c => c.Name.Trim().ToLower() == normalized, ct);
```

(Npgsql translates `Name.Trim().ToLower()` to `lower(btrim(name))`; EF InMemory evaluates it client-side. Leave the client-side `name.Trim().ToLowerInvariant()` on line 12 as-is.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `dotnet test backend/CareerOps.slnx --filter "FullyQualifiedName~CompanyServiceTests"`
Expected: PASS (all methods).

- [ ] **Step 5: Validate and stop for review (do not commit)**

Show the changed files and test output, and wait for review. **Do not commit.**

---

### Task 4: Job-delete cascade regression test (assessment item 6)

`DeleteJobAsync` (`JobService.cs:154-161`) removes only the job and relies on the EF model's `OnDelete` configuration for cascade/cleanup. Lock that configuration with a model-metadata test. (A behavioral delete test is unreliable here: the EF InMemory provider does not enforce DB-level FK cascade for untracked dependents, so asserting the *model's* `DeleteBehavior` is the accurate, provider-independent regression guard for what produces the cascade in the Postgres migration.)

**Files:**
- Test (create): `backend/tests/CareerOps.UnitTests/Jobs/JobDeleteCascadeTests.cs`

**Interfaces:**
- Consumes: `CareerOpsDbContext.Model` (EF model metadata); relationships from `JobConfiguration` (Job → Activities/Transitions/FollowUps/Properties/Attachments = `Cascade`) and `JobActivityConfiguration` (FollowUpTask → JobActivity = `SetNull`).

- [ ] **Step 1: Write the test**

Create `backend/tests/CareerOps.UnitTests/Jobs/JobDeleteCascadeTests.cs`:

```csharp
using CareerOps.Application.Common;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Jobs;
using CareerOps.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CareerOps.UnitTests.Jobs;

public sealed class JobDeleteCascadeTests
{
    private sealed class FixedClock : IClock
    {
        public DateTime UtcNow => new(2026, 6, 29, 12, 0, 0, DateTimeKind.Utc);
        public DateOnly Today => new(2026, 6, 29);
    }

    private static CareerOpsDbContext NewDb() =>
        new(new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase($"careerops-{Guid.NewGuid()}").Options, new FixedClock());

    [Theory]
    [InlineData(typeof(JobActivity))]
    [InlineData(typeof(JobTransition))]
    [InlineData(typeof(JobProperty))]
    [InlineData(typeof(JobAttachment))]
    [InlineData(typeof(FollowUpTask))]
    public void Job_owned_relationships_cascade_on_job_delete(Type dependent)
    {
        using var db = NewDb();
        var fk = db.Model.FindEntityType(dependent)!
            .GetForeignKeys()
            .Single(f => f.PrincipalEntityType.ClrType == typeof(Job));
        fk.DeleteBehavior.Should().Be(DeleteBehavior.Cascade);
    }

    [Fact]
    public void FollowUp_activity_link_is_set_null_on_activity_delete()
    {
        using var db = NewDb();
        var fk = db.Model.FindEntityType(typeof(FollowUpTask))!
            .GetForeignKeys()
            .Single(f => f.PrincipalEntityType.ClrType == typeof(JobActivity));
        fk.DeleteBehavior.Should().Be(DeleteBehavior.SetNull);
    }
}
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `dotnet test backend/CareerOps.slnx --filter "FullyQualifiedName~JobDeleteCascadeTests"`
Expected: PASS (6 cases). This is a characterization test — it passes against the current config and fails only if someone changes an `OnDelete` behavior.

- [ ] **Step 3 (OPTIONAL — only if explicitly requested): manual mutation sanity check**

This step proves the test actually guards the config, but it temporarily edits production code, so **skip it unless a reviewer explicitly asks**. If requested: temporarily change `JobConfiguration.cs` `FollowUps` `OnDelete(DeleteBehavior.Cascade)` to `Restrict`, re-run Step 2, confirm the `FollowUpTask` case FAILS, then **revert** the edit and confirm a clean working tree before continuing.

- [ ] **Step 4: Validate and stop for review (do not commit)**

Show the new test file and test output, and wait for review. **Do not commit.**

---

### Task 5: Follow-up delete — REST endpoint + `delete_follow_up` MCP tool (assessment item 7)

`FollowUpTaskService.DeleteAsync` already exists (`FollowUpTaskService.cs:65-72`) and cleanly removes the row, but neither REST nor MCP expose it. Add `DELETE /api/follow-up-tasks/{id}` and the `delete_follow_up` MCP tool (thin delegations). The service-delete behavior is currently untested — add a unit test too.

**Files:**
- Modify: `backend/src/CareerOps.Presentation/Endpoints/FollowUpTaskEndpoints.cs`
- Modify: `backend/src/CareerOps.Presentation/Mcp/FollowUpTools.cs`
- Test (modify): `backend/tests/CareerOps.UnitTests/FollowUpTasks/FollowUpTaskServiceTests.cs`
- Test (modify): `backend/tests/CareerOps.IntegrationTests/JobMcpToolTests.cs`

**Interfaces:**
- Consumes: `Task<bool> FollowUpTaskService.DeleteAsync(int id, CancellationToken ct = default)` (true if removed, false if not found).
- Produces: REST `DELETE /api/follow-up-tasks/{id}` → 204 / 404; MCP tool `delete_follow_up(int taskId) → bool`.

> **Scope note:** No UI consumes this endpoint, so do **not** regenerate the orval frontend client for it in this pass — that would add unused generated code. The endpoint exists for REST completeness and agent symmetry.

- [ ] **Step 1: Write the failing service unit test**

In `backend/tests/CareerOps.UnitTests/FollowUpTasks/FollowUpTaskServiceTests.cs`, add inside the class:

```csharp
    [Fact]
    public async Task Delete_RemovesTask_AndReportsMissing()
    {
        var dbName = nameof(Delete_RemovesTask_AndReportsMissing);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var svc = new FollowUpTaskService(db, clock);
        var dto = await svc.CreateAsync(new CreateFollowUpTaskRequest("Test", null, clock.UtcNow.AddDays(1), Priority.Low, null, null));

        Assert.True(await svc.DeleteAsync(dto.Id));
        Assert.False(await svc.DeleteAsync(dto.Id));

        await using var db2 = Db(dbName, clock);
        Assert.Null(await db2.FollowUpTasks.FindAsync(dto.Id));
    }
```

- [ ] **Step 2: Run it to verify it passes**

Run: `dotnet test backend/CareerOps.slnx --filter "FullyQualifiedName~FollowUpTaskServiceTests.Delete_RemovesTask_AndReportsMissing"`
Expected: PASS (the service method already exists; this characterizes it).

- [ ] **Step 3: Add the REST endpoint**

In `backend/src/CareerOps.Presentation/Endpoints/FollowUpTaskEndpoints.cs`, add inside `MapFollowUpTasks`, immediately before `return tasks;`:

```csharp
        tasks.MapDelete("/{id:int}", async (int id, FollowUpTaskService svc) =>
        {
            var ok = await svc.DeleteAsync(id);
            return ok ? Results.NoContent() : Results.NotFound();
        }).WithName("DeleteFollowUpTask");
```

- [ ] **Step 4: Add the MCP tool**

In `backend/src/CareerOps.Presentation/Mcp/FollowUpTools.cs`, add inside the `FollowUpTools` class, after `skip_follow_up`:

```csharp
    [McpServerTool, Description("Delete a follow-up task permanently.")]
    public async Task<bool> delete_follow_up([Description("Follow-up task ID")] int taskId)
        => await svc.DeleteAsync(taskId);
```

- [ ] **Step 5: Write the MCP tool integration test**

In `backend/tests/CareerOps.IntegrationTests/JobMcpToolTests.cs`, add `using CareerOps.Application.FollowUpTasks;` and `using CareerOps.Domain.FollowUpTasks;` to the usings, then add inside the class (timestamps use `clock.UtcNow`, matching this file's existing seed convention):

```csharp
    [Fact]
    public async Task DeleteFollowUp_ViaMcpTool_RemovesTask()
    {
        var clock = new FixedClock(new DateTime(2026, 6, 29, 10, 0, 0, DateTimeKind.Utc));
        var opts = new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase(nameof(DeleteFollowUp_ViaMcpTool_RemovesTask))
            .Options;
        await using var db = new CareerOpsDbContext(opts, clock);

        var task = new FollowUpTask { Title = "Ping recruiter", DueAtUtc = clock.UtcNow.AddDays(1), Status = FollowUpStatus.Pending, Priority = Priority.Medium, CreatedAtUtc = clock.UtcNow, UpdatedAtUtc = clock.UtcNow };
        db.FollowUpTasks.Add(task);
        await db.SaveChangesAsync();

        var tools = new FollowUpTools(new FollowUpTaskService(db, clock));
        var ok = await tools.delete_follow_up(task.Id);

        ok.Should().BeTrue();
        (await db.FollowUpTasks.FindAsync(task.Id)).Should().BeNull();
    }
```

- [ ] **Step 6: Run the MCP and service tests**

Run: `dotnet test backend/CareerOps.slnx --filter "FullyQualifiedName~JobMcpToolTests|FullyQualifiedName~FollowUpTaskServiceTests"`
Expected: PASS, including `DeleteFollowUp_ViaMcpTool_RemovesTask`.

- [ ] **Step 7: Validate and stop for review (do not commit)**

Show the changed files and test output, and wait for review. **Do not commit.**

---

### Task 6: `delete_job_activity` MCP tool (assessment item 8)

REST already has `DELETE /api/jobs/{id}/activities/{activityId}` (`JobEndpoints.cs:88-92`) backed by `JobActivityService.DeleteActivityAsync` (which nullifies the activity link on follow-ups, keeping the job link). MCP exposes add/update/complete activity but not delete — add it so agents can clean up wrongly-created activities.

**Files:**
- Modify: `backend/src/CareerOps.Presentation/Mcp/JobTools.cs`
- Test (modify): `backend/tests/CareerOps.IntegrationTests/JobMcpToolTests.cs`

**Interfaces:**
- Consumes: `Task<bool> JobActivityService.DeleteActivityAsync(int jobId, int activityId, CancellationToken ct = default)`.
- Produces: MCP tool `delete_job_activity(int jobId, int activityId) → bool`.

- [ ] **Step 1: Write the failing MCP tool test**

In `backend/tests/CareerOps.IntegrationTests/JobMcpToolTests.cs`, add inside the class (timestamps use `clock.UtcNow`, matching this file's convention):

```csharp
    [Fact]
    public async Task DeleteJobActivity_ViaMcpTool_RemovesActivity()
    {
        var clock = new FixedClock(new DateTime(2026, 6, 29, 10, 0, 0, DateTimeKind.Utc));
        var opts = new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase(nameof(DeleteJobActivity_ViaMcpTool_RemovesActivity))
            .Options;
        await using var db = new CareerOpsDbContext(opts, clock);

        var company = new Company { Name = "Acme", CreatedAtUtc = clock.UtcNow, UpdatedAtUtc = clock.UtcNow };
        db.Companies.Add(company);
        await db.SaveChangesAsync();
        var job = new Job { CompanyId = company.Id, Title = "Dev", Status = JobStatus.Interviewing, Priority = Priority.Medium, CreatedAtUtc = clock.UtcNow, UpdatedAtUtc = clock.UtcNow };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();
        var activity = new JobActivity { JobId = job.Id, Label = "Oops", Type = JobActivityType.Interview, Status = JobActivityStatus.Planned, Outcome = JobActivityOutcome.Unknown, CreatedAtUtc = clock.UtcNow, UpdatedAtUtc = clock.UtcNow };
        db.JobActivities.Add(activity);
        await db.SaveChangesAsync();

        var tools = new JobTools(
            new JobService(db, clock, new CompanyService(db)),
            new JobWorkflowService(db, clock),
            new JobActivityService(db, clock));

        var ok = await tools.delete_job_activity(job.Id, activity.Id);

        ok.Should().BeTrue();
        (await db.JobActivities.FindAsync(activity.Id)).Should().BeNull();
    }
```

- [ ] **Step 2: Run it to verify it fails**

Run: `dotnet test backend/CareerOps.slnx --filter "FullyQualifiedName~JobMcpToolTests.DeleteJobActivity_ViaMcpTool_RemovesActivity"`
Expected: FAIL — compile error, `JobTools` has no `delete_job_activity`.

- [ ] **Step 3: Add the MCP tool**

In `backend/src/CareerOps.Presentation/Mcp/JobTools.cs`, add inside the `JobTools` class, after `complete_job_activity` (before `upsert_job_attachment`):

```csharp
    [McpServerTool, Description("Delete a job activity. Linked follow-ups keep their job link; only the activity link is cleared.")]
    public async Task<bool> delete_job_activity(
        [Description("Job ID")] int jobId,
        [Description("Activity ID")] int activityId)
        => await activitySvc.DeleteActivityAsync(jobId, activityId);
```

- [ ] **Step 4: Run it to verify it passes**

Run: `dotnet test backend/CareerOps.slnx --filter "FullyQualifiedName~JobMcpToolTests"`
Expected: PASS (all methods).

- [ ] **Step 5: Validate and stop for review (do not commit)**

Show the changed files and test output, and wait for review. **Do not commit.**

---

### Task 7: Typed wrapper hooks; remove unsafe `as unknown as` casts (assessment item 3)

orval's mutator (`api-client.ts`) returns the `{ data, status, headers }` envelope on purpose, and the generated hook types already carry the inner type (e.g. `listJobsResponse.data: JobDto[]`). The three call sites that do `response?.data as unknown as JobDto[]` are erasing types unnecessarily. Add two small wrapper hooks that unwrap the envelope via TanStack Query's `select`, then consume them and delete the casts.

> **Why `select` and not just deleting the cast:** `select` keeps the envelope shape in the query *cache* (so `JobsBoard`'s optimistic `setQueryData` on `{ data: JobDto[] }` keeps working) while giving components the unwrapped, fully-typed value. No API or cache-shape change.

**Files:**
- Create: `frontend/src/lib/api/jobs/hooks.ts`
- Modify: `frontend/src/pages/JobsPage.tsx`
- Modify: `frontend/src/pages/JobDetailPage.tsx`
- Modify: `frontend/src/features/jobs/JobDetailDrawer.tsx`

**Interfaces:**
- Produces:
  - `useJobs(params?: ListJobsParams)` → `UseQueryResult<JobDto[], unknown>` (its `.data` is `JobDto[] | undefined`).
  - `useJob(jobId: number | null)` → `UseQueryResult<JobDetailDto, unknown>` (its `.data` is `JobDetailDto | undefined`; query disabled when `jobId` is null).

- [ ] **Step 1: Create the wrapper hooks**

Create `frontend/src/lib/api/jobs/hooks.ts`:

```ts
import type { JobDto, JobDetailDto, ListJobsParams } from '@/lib/api/model';
import { useListJobs, useGetJob } from '@/lib/api/jobs/jobs';

// Thin typed wrappers over the orval hooks. orval's mutator returns a
// { data, status, headers } envelope; `select` unwraps `data` so components
// receive the DTO directly — no `as unknown as` casts. The query cache still
// stores the envelope, so optimistic setQueryData elsewhere is unaffected.

export function useJobs(params?: ListJobsParams) {
  return useListJobs<JobDto[]>(params, { query: { select: r => r.data } });
}

export function useJob(jobId: number | null) {
  return useGetJob<JobDetailDto>(jobId ?? 0, {
    query: { enabled: jobId !== null, select: r => r.data },
  });
}
```

- [ ] **Step 2: Consume `useJobs` in JobsPage**

In `frontend/src/pages/JobsPage.tsx`:

Change the import on line 3 from:

```ts
import { useListJobs } from '@/lib/api/jobs/jobs';
```

to:

```ts
import { useJobs } from '@/lib/api/jobs/hooks';
```

Replace lines 21-22:

```ts
  const { data: response, isLoading, isError } = useListJobs(params);
  const jobs: JobDto[] = (response?.data as unknown as JobDto[] | undefined) ?? [];
```

with:

```ts
  const { data: jobsData, isLoading, isError } = useJobs(params);
  const jobs: JobDto[] = jobsData ?? [];
```

(Keep the `import type { JobDto, ListJobsParams }` on line 9 — both are still used.)

- [ ] **Step 3: Consume `useJob` in JobDetailPage**

In `frontend/src/pages/JobDetailPage.tsx`:

Change line 2 from:

```ts
import { useGetJob } from '@/lib/api/jobs/jobs';
```

to:

```ts
import { useJob } from '@/lib/api/jobs/hooks';
```

Remove the now-unused type import on line 7 (`import type { JobDetailDto } from '@/lib/api/model';`).

Replace lines 12-13:

```ts
  const { data: response, isLoading, isError } = useGetJob(jobId);
  const job = response?.data as unknown as JobDetailDto | undefined;
```

with:

```ts
  const { data: job, isLoading, isError } = useJob(jobId);
```

- [ ] **Step 4: Consume `useJob` in JobDetailDrawer**

In `frontend/src/features/jobs/JobDetailDrawer.tsx`:

Change line 3 from:

```ts
import { useGetJob } from '@/lib/api/jobs/jobs';
```

to:

```ts
import { useJob } from '@/lib/api/jobs/hooks';
```

Remove the now-unused type import on line 6 (`import type { JobDetailDto } from '@/lib/api/model';`).

Replace lines 14-17:

```ts
  const { data: response, isLoading } = useGetJob(jobId ?? 0, {
    query: { enabled: jobId !== null },
  });
  const job = response?.data as unknown as JobDetailDto | undefined;
```

with:

```ts
  const { data: job, isLoading } = useJob(jobId);
```

- [ ] **Step 5: Verify no `as unknown as` casts remain and types compile**

Run: `npm --prefix frontend run typecheck`
Expected: exit 0, no errors.

Then confirm the casts are gone across the whole frontend (should print nothing):

Run: `git grep -n "as unknown as" -- frontend/src`
Expected: no output. (If any extra occurrence exists beyond the three files above, fix it the same way before continuing.)

- [ ] **Step 6: Build and lint**

Run: `npm --prefix frontend run build`
Expected: Vite build succeeds.

Run: `npm --prefix frontend run lint`
Expected: no errors (in particular, no unused-import warnings for the removed `JobDetailDto` imports).

- [ ] **Step 7: Validate and stop for review (do not commit)**

Show the changed files and the typecheck/build/lint output, and wait for review. **Do not commit.**

---

### Task 8: Guard interactive children from drag (assessment item 2)

The board already applies a `PointerSensor` activation constraint of `{ distance: 8 }` (`JobsBoard.tsx:43-45`), which is the standard click-vs-drag guard. The remaining fragility is that `JobCard` spreads drag `{...listeners}` on the whole card, so a pointer-down on the interactive children (the `JOB-{id}` link and the status dropdown) is also seen by the drag listeners. Stop pointer-down propagation on those children so they never start a drag; the card body stays fully draggable and its click still opens the drawer.

**Files:**
- Modify: `frontend/src/features/jobs/JobCard.tsx`

- [ ] **Step 1: Guard the `JOB-{id}` link**

In `frontend/src/features/jobs/JobCard.tsx`, the link currently has `onClick={e => e.stopPropagation()}` (line 55). Add a pointer-down guard. Replace line 55:

```tsx
            onClick={e => e.stopPropagation()}
```

with:

```tsx
            onClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
```

- [ ] **Step 2: Guard the status-dropdown wrapper**

The dropdown wrapper currently is `<div onClick={e => e.stopPropagation()}>` (line 91). Replace line 91:

```tsx
        <div onClick={e => e.stopPropagation()}>
```

with:

```tsx
        <div onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
```

- [ ] **Step 3: Typecheck, build, lint**

Run: `npm --prefix frontend run typecheck`
Expected: exit 0.

Run: `npm --prefix frontend run build`
Expected: succeeds.

Run: `npm --prefix frontend run lint`
Expected: no errors.

- [ ] **Step 4: Manual UX verification**

Start the app (`just up`, or `just api` + `just web`) and on the Jobs board, in the **status** grouping, confirm all four behaviors:
1. Dragging a card across >8px moves it between columns (status transition fires).
2. A plain click on the card body opens the detail drawer.
3. Clicking the status dropdown opens its menu **without** initiating a drag.
4. Clicking `JOB-{id}` opens the detail page in a new tab **without** initiating a drag.

- [ ] **Step 5: Validate and stop for review (do not commit)**

Show the changed file, the typecheck/build/lint output, and the manual-verification result, and wait for review. **Do not commit.**

---

### Task 9: Rewrite the MCP README to V2 + record decision D53 (assessment item 1)

The README claims **44 tools / full REST parity / hard deletes** and lists old `JobLead`/`Application`/`Interview`/`ResumeVariant` tools (`README.md:38-62`, `:31-38`, `:92`). The live server is a **25-tool** workflow-oriented surface over the Job aggregate (after Tasks 5 and 6 add `delete_follow_up` and `delete_job_activity`). Because this reverses decision **D49** (and the "MCP = REST parity" wording of **D51**), record a dated **D53** entry rather than editing those in place.

**Run this task LAST** — its tool inventory assumes Tasks 5 and 6 are already merged.

**Files:**
- Modify (full rewrite): `backend/src/CareerOps.Presentation/Mcp/README.md`
- Modify (append): `docs/knowledge-base/03-decisions.md`

- [ ] **Step 1: Confirm the live tool inventory**

Count only the method-level tool attributes (each is written `[McpServerTool, Description(...)]`; the trailing comma excludes the class-level `[McpServerToolType]`):

Run: `git grep -c "McpServerTool," -- backend/src/CareerOps.Presentation/Mcp`
Expected per file: `JobTools.cs:14`, `FollowUpTools.cs:5`, `CompanyTools.cs:2`, `DashboardTools.cs:1`, `ProfileTools.cs:2`, `DiagnosticsTools.cs:1` — **25 total**.

(Job: list_jobs, get_job, create_job, update_job, transition_job, archive_job, add_job_activity, update_job_activity, complete_job_activity, delete_job_activity, upsert_job_attachment, remove_job_attachment, upsert_job_property, remove_job_property. FollowUp: list_follow_ups, add_follow_up, complete_follow_up, skip_follow_up, delete_follow_up. Company: list_companies, upsert_company. Dashboard: get_dashboard_summary. Profile: get_user_profile, update_user_profile. Diagnostics: ping.)

- [ ] **Step 2: Append decision D53**

At the end of `docs/knowledge-base/03-decisions.md`, append:

```markdown

### D53 — V2 MCP is a curated, workflow-oriented tool set over the Job aggregate (supersedes D49 parity)
- **Date:** 2026-06-29
- **Decision:** After Domain V2 unified `JobLead`/`Application`/`Interview` into the **Job aggregate**,
  the MCP server exposes a **curated, workflow-oriented** surface of **25 tools** built around the Job
  aggregate, follow-ups, companies, dashboard, profile, and a diagnostic — **not** the old
  seven-resource "full REST parity" set. The MCP README enumerates the live tools.
- **Why:** The V2 model has one job aggregate, not seven resources; "full REST parity" (D49) and the
  "MCP = REST parity" framing (D51) no longer describe the surface. Agents drive workflows
  (transition, activities, follow-ups), not CRUD over a wide resource matrix.
- **Supersedes:** D49 (44 tools / full parity / hard-delete parity) and the *parity wording* of D51.
  The no-in-solution-AI core of D51 (all AI lives in external agents via MCP, D44) still stands.
- **Cleanup deletes added this pass:** `delete_follow_up` and `delete_job_activity` (the only
  deletes agents need for self-correction); `delete_company` is deliberately excluded (company
  delete is already blocked while jobs exist).
- **Counterargument / risk:** REST and MCP are no longer 1:1, so an agent cannot reach every REST
  operation. Accepted — the curated set covers the real agent workflows; widening toward parity is
  explicitly rejected (re-introduces the churn V2 removed).
```

- [ ] **Step 3: Rewrite the README**

Overwrite `backend/src/CareerOps.Presentation/Mcp/README.md` with:

````markdown
# CareerOps MCP Server

## Overview

This folder contains the Model Context Protocol (MCP) server implementation, exposing CareerOps data and operations to AI agents (Claude Code / Codex, and others). The MCP server is **hosted in the `CareerOps.Presentation` process over HTTP** at the `/mcp` endpoint, alongside the REST API and Scalar documentation.

No separate console or host build is needed — the running API container *is* the MCP server.

## Prerequisites

- `just up` — starts the Docker-composed stack with Postgres (`:5432`) and the API container (`:8080`), which runs the MCP server.

## Registration

Register the MCP server in Claude Code by adding the entry in `.mcp.json` at the repository root:

```json
{
  "mcpServers": {
    "careerops": {
      "type": "http",
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

## Transport & Safety

- **Transport:** HTTP (localhost, no authentication).
- **Surface:** A **curated, workflow-oriented** tool set over the **Job aggregate** (plus follow-ups, companies, dashboard, profile, and a diagnostic). This is **not** full REST parity — tools cover the real agent workflows (D53). If the API is ever deployed publicly, both REST and MCP would require authentication (future concern, not introduced here). See D44 (agent-native AI; no in-app provider) and D47 (HTTP hosting over `ModelContextProtocol.AspNetCore`).
- **Logging:** stdout is normal application logging.
- **Audit stamping:** All writes are `IClock`-stamped and audit-traceable. The available deletes (`delete_job_activity`, `delete_follow_up`, attachment/property removal) are safe: the service layer cleans loose references in the same operation — deleting an activity nulls the activity link on its follow-ups while preserving the job link (D35). Archive/status changes remain the UI preference (D12).
- **Enum I/O:** Tool I/O uses string names for enums (e.g., `"Applied"`, `"Interviewing"`) via `JsonStringEnumConverter`.

## Tools

**Total: 25 tools** — a curated, workflow-oriented surface over the Job aggregate, plus follow-ups, companies, dashboard, profile, and a diagnostic (D53). Tool names are snake_case; enum fields use string names.

### Dashboard (1)
- `get_dashboard_summary` — active jobs by status, follow-ups due today / overdue, upcoming activities, stale jobs, offer deadlines.

### Job (14)
- `list_jobs` — list with filters (statuses, source, remote mode, employment type, countries, company search, priority, free-text across title/company/sourceUrl/notes).
- `get_job` — full detail including activities, follow-ups, properties, and attachments.
- `create_job` — provide `companyId` **or** `companyName` (find-or-create); status defaults to `Discovered`.
- `update_job` — patch job fields (does **not** change status — use `transition_job`).
- `transition_job` — move to a new status; actor recorded as `Agent`.
- `archive_job` — shorthand transition to `Archived`.
- `add_job_activity`, `update_job_activity`, `complete_job_activity`, `delete_job_activity` — manage activities (interviews, screenings, etc.).
- `upsert_job_attachment`, `remove_job_attachment` — attachment metadata (no file upload).
- `upsert_job_property`, `remove_job_property` — key-value metadata (idempotent by key).

### FollowUpTask (5)
- `list_follow_ups` — filter by `due` (`today`/`overdue`/`all`), status, or jobId.
- `add_follow_up` — optionally link to a job or job activity.
- `complete_follow_up`, `skip_follow_up`, `delete_follow_up`.

### Company (2)
- `list_companies`, `upsert_company` — find-or-create a company by name (trim/case-insensitive).

### UserProfile (2)
- `get_user_profile`, `update_user_profile`.

### Diagnostics (1)
- `ping` — health check; returns `pong`.

## Testing & Visualization

- **Integration test:** Run `dotnet test` to verify tools are listed and callable over HTTP.
- **MCP Inspector:** To inspect the live server, run:
  ```bash
  npx @modelcontextprotocol/inspector http://localhost:8080/mcp
  ```
  Opens a browser UI to list tools, inspect schemas, and test calls in real time.

## Architecture

The MCP server is implemented using **`ModelContextProtocol.AspNetCore`**:

- `Program.cs` registers the MCP server with `builder.Services.AddMcpServer().WithHttpTransport().WithToolsFromAssembly(...)` and maps it via `app.MapMcp("/mcp")`.
- Tools are attribute-decorated (`[McpServerTool]`) methods grouped by `[McpServerToolType]` classes in this folder (`JobTools`, `FollowUpTools`, `CompanyTools`, `DashboardTools`, `ProfileTools`, `DiagnosticsTools`).
- Each tool injects the Application services (e.g., `JobService`, `JobWorkflowService`, `JobActivityService`, `DashboardService`) via ASP.NET Core DI (resolved per HTTP request).
- Enum fields are serialized as string names via `JsonStringEnumConverter` on the MCP server's `JsonSerializerOptions`.

## Related Decisions

- **D35** — Delete behavior: cascade-clean + archive-first UI (loose-reference cleanup in the service layer, no orphans).
- **D44** — Agent-native AI via MCP; no in-app AI provider.
- **D45** — MCP tools = reads + curated writes; string-enum I/O; `IClock` audit stamping.
- **D47** — MCP server hosted over HTTP in `CareerOps.Presentation`.
- **D48** — `CareerOps.Api` renamed to `CareerOps.Presentation` (Clean Architecture presentation layer).
- **D53** — V2 MCP is a curated, workflow-oriented tool set over the Job aggregate (25 tools); supersedes D49's full-REST-parity stance.
````

- [ ] **Step 4: Verify the doc matches reality**

Run: `git grep -n "44 tools\|JobLead\|ResumeVariant\|full REST parity" -- backend/src/CareerOps.Presentation/Mcp/README.md`
Expected: no output (all stale references removed).

- [ ] **Step 5: Validate and stop for review (do not commit)**

Show the rewritten README and the appended D53 entry, and wait for review. **Do not commit.**

---

## Final verification

- [ ] **Run the full gate**

Run: `just verify`
Expected: `dotnet build` succeeds, all backend tests pass, frontend `tsc -b` and `vite build` succeed.

- [ ] **Lint the frontend**

Run: `npm --prefix frontend run lint`
Expected: no errors.

- [ ] **Present for review (do not commit)**

Summarize all changed files across the nine tasks and the full-gate result. **Do not commit, push, or open a PR** — leave the working tree staged-free for the reviewer to inspect and commit.

---

## Self-Review (completed during planning)

**1. Spec coverage** — every in-scope assessment item maps to a task:
- Item 1 (README V2) → Task 9. Item 2 (DnD/click) → Task 8. Item 3 (unsafe casts) → Task 7. Item 4 (UpdateActivityRequestValidator) → Task 1. Item 5 (activity-belongs-to-job + clean 400) → Task 2. Item 6 (cascade test) → Task 4. Item 7 (follow-up delete REST + MCP) → Task 5. Item 8 (delete_job_activity MCP) → Task 6. Item 9 (company normalization) → Task 3.
- Item 10 and all "skip for now" items are intentionally excluded per the agreed scope (1–9) and recorded in Global Constraints.

**2. Placeholder scan** — no TBD/TODO/"add validation"/"similar to" placeholders; every code step shows the full code and every command shows expected output.

**3. Type/signature consistency** — `useJobs`/`useJob` (Task 7) names match their consumers; `ValidateActivityLink` (Task 2) matches its two call sites; `Results.Problem(... StatusCodes.Status400BadRequest)` is used identically in both follow-up endpoints; `delete_follow_up`/`delete_job_activity` tool signatures match the service methods (`DeleteAsync(int)`, `DeleteActivityAsync(int,int)`); README tool count (25) matches Tasks 5+6 additions and the Step-1 grep; cascade-test `DeleteBehavior` values match `JobConfiguration` (Cascade) and `JobActivityConfiguration` (SetNull).

**4. Review-fix conformance** — (1) no commit steps anywhere; (2) Task 9 grep uses `McpServerTool,` (comma) to exclude `[McpServerToolType]`; (3) D53 carries no hard-coded commit SHA; (4) follow-up relation errors return a clean 400 via endpoint-level catch (Task 2 Steps 5–7); (5) the cascade mutation sanity check is optional/skip-by-default (Task 4 Step 3); (6) tests use `clock.UtcNow` or rely on audit auto-stamping — no `DateTime.UtcNow`.
