# CareerOps Phase 4 — Interviews + Cross-Entity Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add interview-round tracking end-to-end (entity → migration → service → API → orval client → React) and make every cross-entity write auto-reflect in all views via one global cache rule.

**Architecture:** Mirror the existing Application slice. Cross-entity effects stay centralized in services + the single `JobLeadStatusTransitions.Advance` map (server "single thread"). Frontend gains one global `MutationCache.onSettled → invalidateQueries()` rule (client "single thread"). No strategy pattern — a `switch` map + small service methods are sufficient (assessed, rejected as over-engineering).

**Tech Stack:** .NET 10, EF Core 10 (Npgsql, snake_case), Minimal APIs, Mapster, FluentValidation, xUnit + EF InMemory. React 19, Vite, TanStack Query v5, RHF (plain, no Zod resolver — D23), orval, date-fns, shadcn/ui, @dnd-kit (unused here).

## Global Constraints

- Enums persist as pinned ints, first member = 0, **never reorder/renumber** (D5).
- Inject `IClock`; never call `DateTime.UtcNow` in app/domain code.
- Clean Architecture + pragmatic DDD: no repositories, MediatR, CQRS, generic repos (D3, D18).
- `Application` (entity) collides with `CareerOps.Application` (namespace) → alias `using DomainApplication = CareerOps.Domain.Applications.Application;` in any file that references the entity type (CS0118).
- Migrations via the dotnet ef CLI directly (the `just migrate name=` recipe mangles the arg on cmd.exe): `dotnet ef migrations add <Name> --project backend/src/CareerOps.Infrastructure --startup-project backend/src/CareerOps.Api --output-dir Persistence/Migrations`.
- On delete, hand-remove loose-reference `FollowUpTask` rows by `RelatedEntityType` + `RelatedEntityId` (no orphans, D12). FK relations cascade automatically.
- Services: `sealed`, primary-ctor inject `IAppDbContext` (+ `IClock` when time-dependent), `.Adapt<>()` for DTOs, registered `AddScoped<T>()` in `AddApplication()`.
- Result-object over exceptions for expected control flow; endpoints return typed `Results<...>`.
- Forms use plain RHF (`useForm`); the orval `.zod.ts` schemas are NOT wired into forms (D23).
- `just verify` (backend build + test + frontend typecheck + build) must pass for every task that compiles code.
- Commit message trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

## File Structure

**Backend (create):**
- `backend/src/CareerOps.Domain/Interviews/Interview.cs`, `InterviewRoundType.cs`, `InterviewStatus.cs`, `InterviewOutcome.cs`
- `backend/src/CareerOps.Infrastructure/Persistence/Configurations/InterviewConfiguration.cs`
- `backend/src/CareerOps.Infrastructure/Persistence/Migrations/<ts>_Interview.cs` (generated)
- `backend/src/CareerOps.Application/Interviews/InterviewDtos.cs` (records), `InterviewMappingConfig.cs`, `InterviewRequestValidators.cs`, `InterviewService.cs`
- `backend/src/CareerOps.Application/Common/FollowUpCleanup.cs` (shared loose-ref remover)
- `backend/src/CareerOps.Api/Endpoints/InterviewEndpoints.cs`
- `backend/tests/CareerOps.UnitTests/Interviews/InterviewServiceTests.cs`

**Backend (modify):** `IAppDbContext.cs`, `CareerOpsDbContext.cs`, `Application/DependencyInjection.cs`, `Api/Program.cs`, `ApplicationService.cs` (DeleteAsync), `JobLeadService.cs` (DeleteAsync), `JobLeadStatusTransitions.cs` (forward-only), the JobLead transitions test file.

**Frontend (create):** `features/interviews/InterviewForm.tsx`, `InterviewItem.tsx`, `InterviewSheet.tsx`, `CompleteInterviewDialog.tsx`; `pages/InterviewsPage.tsx`; `features/dashboard/UpcomingInterviews.tsx`.
**Frontend (modify):** `app/providers.tsx`, `lib/enums.ts`, `components/AppLayout.tsx`, `app/router.tsx`, `features/applications/ApplicationSheet.tsx`, `pages/DashboardPage.tsx`. Generated client regenerated under `lib/api/interviews/` + `lib/api/model/`.

---

### Task 1: Global cross-entity sync (frontend)

One global rule reconciles every mounted view after any write. Fixes the existing bug where moving an application card auto-advances the lead server-side but the Job Leads board / dashboard stay stale. Existing per-mutation `invalidateQueries` calls become harmless redundancy — leave them (D37: minimize churn).

**Files:**
- Modify: `frontend/src/app/providers.tsx`

**Interfaces:**
- Produces: a `QueryClient` that invalidates all queries on every mutation settle. All later interview mutations rely on this and add no manual invalidation.

- [ ] **Step 1: Add the MutationCache rule**

Replace the `const queryClient = new QueryClient();` line and its imports in `frontend/src/app/providers.tsx`:

```tsx
import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";

// Single cross-entity sync rule (D37): any write reconciles every mounted view.
// invalidateQueries() with no filter marks all queries stale and refetches the active ones.
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSettled: () => queryClient.invalidateQueries(),
  }),
});
```

Leave the rest of `Providers` unchanged. (`queryClient` is referenced lazily inside the closure, which runs only after construction — safe.)

- [ ] **Step 2: Verify**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: PASS, no type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/providers.tsx
git commit -m "feat(web): global cross-entity cache sync (D37)"
```

---

### Task 2: Interview domain — enums, entity, D6 forward-only refinement

**Files:**
- Create: `backend/src/CareerOps.Domain/Interviews/InterviewRoundType.cs`, `InterviewStatus.cs`, `InterviewOutcome.cs`, `Interview.cs`
- Modify: `backend/src/CareerOps.Domain/JobLeads/JobLeadStatusTransitions.cs`
- Test: `backend/tests/CareerOps.UnitTests/JobLeads/JobLeadStatusTransitionsTests.cs` (existing; add a Theory)

**Interfaces:**
- Produces: `Interview` entity; enums `InterviewRoundType`/`InterviewStatus`/`InterviewOutcome`; `Interview.Complete(outcome, feedback, followUpRequired, followUpAtUtc)`; refined `JobLeadStatusTransitions.Advance` where `EnteredInterviewStage` is forward-only.

- [ ] **Step 1: Write the failing forward-only test**

Open `backend/tests/CareerOps.UnitTests/JobLeads/JobLeadStatusTransitionsTests.cs` (the file holding the D6 tests). If any existing `[InlineData]`/assertion expects `Advance(Offer, EnteredInterviewStage) == Interviewing` (the old unconditional behavior), delete that case. Add:

```csharp
[Theory]
[InlineData(JobLeadStatus.Discovered, JobLeadStatus.Interviewing)]
[InlineData(JobLeadStatus.Interested, JobLeadStatus.Interviewing)]
[InlineData(JobLeadStatus.Applied, JobLeadStatus.Interviewing)]
[InlineData(JobLeadStatus.Interviewing, JobLeadStatus.Interviewing)]
[InlineData(JobLeadStatus.Offer, JobLeadStatus.Offer)]
[InlineData(JobLeadStatus.Rejected, JobLeadStatus.Rejected)]
[InlineData(JobLeadStatus.Ghosted, JobLeadStatus.Ghosted)]
[InlineData(JobLeadStatus.Withdrawn, JobLeadStatus.Withdrawn)]
[InlineData(JobLeadStatus.Archived, JobLeadStatus.Archived)]
public void EnteredInterviewStage_advances_only_from_pre_interview_statuses(JobLeadStatus current, JobLeadStatus expected) =>
    Assert.Equal(expected, JobLeadStatusTransitions.Advance(current, ApplicationTrigger.EnteredInterviewStage));
```

- [ ] **Step 2: Run it to verify it fails**

Run: `dotnet test backend/CareerOps.slnx --filter "FullyQualifiedName~JobLeadStatusTransitionsTests"`
Expected: FAIL on the Offer/Rejected/Ghosted/Withdrawn rows (current map returns `Interviewing`).

- [ ] **Step 3: Make `EnteredInterviewStage` forward-only**

In `backend/src/CareerOps.Domain/JobLeads/JobLeadStatusTransitions.cs`, replace the `EnteredInterviewStage` arm:

```csharp
ApplicationTrigger.EnteredInterviewStage =>
    current is JobLeadStatus.Discovered or JobLeadStatus.Interested or JobLeadStatus.Applied
        ? JobLeadStatus.Interviewing
        : current,
```

Leave the rest of the `switch` and the `Archived` terminal guard unchanged.

- [ ] **Step 4: Run it to verify it passes**

Run: `dotnet test backend/CareerOps.slnx --filter "FullyQualifiedName~JobLeadStatusTransitionsTests"`
Expected: PASS.

- [ ] **Step 5: Create the enums**

`backend/src/CareerOps.Domain/Interviews/InterviewRoundType.cs`:
```csharp
namespace CareerOps.Domain.Interviews;

public enum InterviewRoundType
{
    RecruiterScreen = 0,
    Technical = 1,
    LiveCoding = 2,
    SystemDesign = 3,
    TakeHomeDiscussion = 4,
    AIEngineering = 5,
    Behavioral = 6,
    HiringManager = 7,
    Final = 8,
    Other = 9,
}
```

`backend/src/CareerOps.Domain/Interviews/InterviewStatus.cs`:
```csharp
namespace CareerOps.Domain.Interviews;

public enum InterviewStatus
{
    Scheduled = 0,
    Completed = 1,
    Cancelled = 2,
    Rescheduled = 3,
}
```

`backend/src/CareerOps.Domain/Interviews/InterviewOutcome.cs`:
```csharp
namespace CareerOps.Domain.Interviews;

public enum InterviewOutcome
{
    Unknown = 0,
    Passed = 1,
    Failed = 2,
    Waiting = 3,
}
```

- [ ] **Step 6: Create the entity**

`backend/src/CareerOps.Domain/Interviews/Interview.cs`:
```csharp
using CareerOps.Domain.Applications;
using CareerOps.Domain.Common;

namespace CareerOps.Domain.Interviews;

public sealed class Interview : AuditableEntity
{
    public int Id { get; set; }
    public int ApplicationId { get; set; }
    public Application? Application { get; set; }
    public InterviewRoundType RoundType { get; set; }
    public DateTime ScheduledAtUtc { get; set; }
    public int? DurationMinutes { get; set; }
    public string? InterviewerName { get; set; }
    public string? InterviewerRole { get; set; }
    public string? MeetingUrl { get; set; }
    public InterviewStatus Status { get; set; }
    public string? PrepNotes { get; set; }
    public InterviewOutcome Outcome { get; set; }
    public string? Feedback { get; set; }
    public bool FollowUpRequired { get; set; }
    public DateTime? FollowUpAtUtc { get; set; }

    // True only when this call is the first transition into Completed (controls one-time follow-up creation).
    public bool Complete(InterviewOutcome outcome, string? feedback, bool followUpRequired, DateTime? followUpAtUtc)
    {
        var wasCompleted = Status == InterviewStatus.Completed;
        Status = InterviewStatus.Completed;
        Outcome = outcome;
        Feedback = feedback;
        FollowUpRequired = followUpRequired;
        FollowUpAtUtc = followUpAtUtc;
        return !wasCompleted;
    }
}
```

Note: `Application` here is the domain entity in the `CareerOps.Domain.Applications` namespace; inside `CareerOps.Domain.*` there is no namespace collision, so no alias is needed in this file.

- [ ] **Step 7: Build**

Run: `dotnet build backend/CareerOps.slnx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/CareerOps.Domain/Interviews backend/src/CareerOps.Domain/JobLeads/JobLeadStatusTransitions.cs backend/tests/CareerOps.UnitTests/JobLeads/JobLeadStatusTransitionsTests.cs
git commit -m "feat(domain): Interview entity + enums; D6 EnteredInterviewStage forward-only (D32)"
```

---

### Task 3: EF mapping + migration

**Files:**
- Create: `backend/src/CareerOps.Infrastructure/Persistence/Configurations/InterviewConfiguration.cs`
- Modify: `backend/src/CareerOps.Application/Common/IAppDbContext.cs`, `backend/src/CareerOps.Infrastructure/Persistence/CareerOpsDbContext.cs`
- Generated: migration under `backend/src/CareerOps.Infrastructure/Persistence/Migrations/`

**Interfaces:**
- Produces: `IAppDbContext.Interviews` (`DbSet<Interview>`); `applications` ← interview FK cascade; migration applied at startup.

- [ ] **Step 1: Add the DbSet to the interface**

In `backend/src/CareerOps.Application/Common/IAppDbContext.cs`, add the using and the property (next to `FollowUpTasks`):
```csharp
using CareerOps.Domain.Interviews;
// ...
DbSet<Interview> Interviews { get; }
```

- [ ] **Step 2: Add the DbSet to the context**

In `backend/src/CareerOps.Infrastructure/Persistence/CareerOpsDbContext.cs`, add (next to `FollowUpTasks`):
```csharp
public DbSet<Interview> Interviews => Set<Interview>();
```
Add `using CareerOps.Domain.Interviews;` if not present.

- [ ] **Step 3: Create the EF configuration**

`backend/src/CareerOps.Infrastructure/Persistence/Configurations/InterviewConfiguration.cs`:
```csharp
using CareerOps.Domain.Interviews;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class InterviewConfiguration : IEntityTypeConfiguration<Interview>
{
    public void Configure(EntityTypeBuilder<Interview> b)
    {
        b.ToTable("interviews");
        b.HasKey(i => i.Id);
        b.Property(i => i.InterviewerName).HasMaxLength(200);
        b.Property(i => i.InterviewerRole).HasMaxLength(200);
        b.Property(i => i.MeetingUrl).HasMaxLength(1000);
        b.Property(i => i.PrepNotes).HasMaxLength(4000);
        b.Property(i => i.Feedback).HasMaxLength(4000);
        b.HasOne(i => i.Application).WithMany().HasForeignKey(i => i.ApplicationId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(i => i.ApplicationId);
        b.HasIndex(i => i.Status);
        b.HasIndex(i => i.ScheduledAtUtc);
    }
}
```

- [ ] **Step 4: Build before generating the migration**

Run: `dotnet build backend/CareerOps.slnx`
Expected: PASS (migration generation requires a building model).

- [ ] **Step 5: Generate the migration**

Run (NOT `just migrate` — cmd.exe mangles the arg):
```bash
dotnet ef migrations add Interview --project backend/src/CareerOps.Infrastructure --startup-project backend/src/CareerOps.Api --output-dir Persistence/Migrations
```
Expected: a new `<timestamp>_Interview.cs` + designer file; `interviews` table with the FK to `applications` (cascade) and the three indexes.

- [ ] **Step 6: Build**

Run: `dotnet build backend/CareerOps.slnx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/CareerOps.Application/Common/IAppDbContext.cs backend/src/CareerOps.Infrastructure/Persistence
git commit -m "feat(infra): Interview EF config + DbSet + migration (D36 cascade)"
```

---

### Task 4: Interview application layer — DTOs, validators, mapping, service, cascade-clean, tests

**Files:**
- Create: `backend/src/CareerOps.Application/Interviews/InterviewDtos.cs`, `InterviewMappingConfig.cs`, `InterviewRequestValidators.cs`, `InterviewService.cs`; `backend/src/CareerOps.Application/Common/FollowUpCleanup.cs`
- Modify: `backend/src/CareerOps.Application/DependencyInjection.cs`, `backend/src/CareerOps.Application/Applications/ApplicationService.cs` (DeleteAsync), `backend/src/CareerOps.Application/JobLeads/JobLeadService.cs` (DeleteAsync)
- Test: `backend/tests/CareerOps.UnitTests/Interviews/InterviewServiceTests.cs`

**Interfaces:**
- Consumes: `Interview`, enums, `Interview.Complete(...)`; `JobLeadStatusTransitions.Advance`; `ApplicationTrigger.EnteredInterviewStage`; `RelatedEntityType.Interview`; `Priority.Medium`; `IAppDbContext.Interviews`.
- Produces: records `CreateInterviewRequest`, `UpdateInterviewRequest`, `MarkInterviewCompletedRequest`, `InterviewDto`; `InterviewService` with `ListAsync`, `GetUpcomingAsync`, `GetAsync(id)`, `CreateAsync` (`InterviewDto?`, null = application missing), `UpdateAsync`, `MarkCompletedAsync`, `DeleteAsync`; `FollowUpCleanup.RemoveForAsync(db, type, ids, ct)`.

- [ ] **Step 1: Create the DTO records**

`backend/src/CareerOps.Application/Interviews/InterviewDtos.cs`:
```csharp
using CareerOps.Domain.Interviews;

namespace CareerOps.Application.Interviews;

public sealed record CreateInterviewRequest(
    int ApplicationId, InterviewRoundType RoundType, DateTime ScheduledAtUtc, int? DurationMinutes,
    string? InterviewerName, string? InterviewerRole, string? MeetingUrl, string? PrepNotes);

public sealed record UpdateInterviewRequest(
    InterviewRoundType RoundType, DateTime ScheduledAtUtc, int? DurationMinutes,
    string? InterviewerName, string? InterviewerRole, string? MeetingUrl, InterviewStatus Status, string? PrepNotes);

public sealed record MarkInterviewCompletedRequest(
    InterviewOutcome Outcome, string? Feedback, bool FollowUpRequired, DateTime? FollowUpAtUtc);

public sealed record InterviewDto(
    int Id, int ApplicationId, string CompanyName, string JobTitle, InterviewRoundType RoundType,
    DateTime ScheduledAtUtc, int? DurationMinutes, string? InterviewerName, string? InterviewerRole,
    string? MeetingUrl, InterviewStatus Status, string? PrepNotes, InterviewOutcome Outcome, string? Feedback,
    bool FollowUpRequired, DateTime? FollowUpAtUtc, DateTime CreatedAtUtc, DateTime UpdatedAtUtc);
```

- [ ] **Step 2: Create the Mapster config**

`backend/src/CareerOps.Application/Interviews/InterviewMappingConfig.cs`:
```csharp
using CareerOps.Domain.Interviews;
using Mapster;

namespace CareerOps.Application.Interviews;

public sealed class InterviewMappingConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<Interview, InterviewDto>()
            .Map(d => d.CompanyName, s => s.Application == null || s.Application.JobLead == null || s.Application.JobLead.Company == null ? "" : s.Application.JobLead.Company.Name)
            .Map(d => d.JobTitle, s => s.Application == null || s.Application.JobLead == null ? "" : s.Application.JobLead.Title);

        config.NewConfig<CreateInterviewRequest, Interview>()
            .Ignore(d => d.Id).Ignore(d => d.CreatedAtUtc).Ignore(d => d.UpdatedAtUtc);
    }
}
```

- [ ] **Step 3: Create the validators**

`backend/src/CareerOps.Application/Interviews/InterviewRequestValidators.cs`:
```csharp
using FluentValidation;

namespace CareerOps.Application.Interviews;

public sealed class CreateInterviewRequestValidator : AbstractValidator<CreateInterviewRequest>
{
    public CreateInterviewRequestValidator()
    {
        RuleFor(r => r.ApplicationId).GreaterThan(0);
        RuleFor(r => r.RoundType).IsInEnum();
        RuleFor(r => r.ScheduledAtUtc).NotEmpty();
        RuleFor(r => r.DurationMinutes).GreaterThan(0).When(r => r.DurationMinutes.HasValue);
        RuleFor(r => r.MeetingUrl).MaximumLength(1000);
        RuleFor(r => r.InterviewerName).MaximumLength(200);
        RuleFor(r => r.InterviewerRole).MaximumLength(200);
    }
}

public sealed class UpdateInterviewRequestValidator : AbstractValidator<UpdateInterviewRequest>
{
    public UpdateInterviewRequestValidator()
    {
        RuleFor(r => r.RoundType).IsInEnum();
        RuleFor(r => r.Status).IsInEnum();
        RuleFor(r => r.ScheduledAtUtc).NotEmpty();
        RuleFor(r => r.DurationMinutes).GreaterThan(0).When(r => r.DurationMinutes.HasValue);
        RuleFor(r => r.MeetingUrl).MaximumLength(1000);
    }
}

public sealed class MarkInterviewCompletedRequestValidator : AbstractValidator<MarkInterviewCompletedRequest>
{
    public MarkInterviewCompletedRequestValidator()
    {
        RuleFor(r => r.Outcome).IsInEnum();
        RuleFor(r => r.FollowUpAtUtc).NotNull().When(r => r.FollowUpRequired)
            .WithMessage("A follow-up date is required when follow-up is requested.");
    }
}
```

- [ ] **Step 4: Create the shared loose-ref cleaner**

`backend/src/CareerOps.Application/Common/FollowUpCleanup.cs`:
```csharp
using CareerOps.Domain.FollowUpTasks;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Common;

// D12 / D35: remove loose-reference FollowUpTask rows (no FK) so deletes leave no orphans.
internal static class FollowUpCleanup
{
    public static async Task RemoveForAsync(IAppDbContext db, RelatedEntityType type, IEnumerable<int> ids, CancellationToken ct)
    {
        var idList = ids.Distinct().ToList();
        if (idList.Count == 0) return;
        var tasks = await db.FollowUpTasks
            .Where(t => t.RelatedEntityType == type && t.RelatedEntityId != null && idList.Contains(t.RelatedEntityId.Value))
            .ToListAsync(ct);
        db.FollowUpTasks.RemoveRange(tasks);
    }
}
```

- [ ] **Step 5: Create the service**

`backend/src/CareerOps.Application/Interviews/InterviewService.cs`:
```csharp
using CareerOps.Application.Common;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Interviews;
using CareerOps.Domain.JobLeads;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Interviews;

public sealed class InterviewService(IAppDbContext db, IClock clock)
{
    private IQueryable<Interview> WithRelations() =>
        db.Interviews.Include(i => i.Application).ThenInclude(a => a!.JobLead).ThenInclude(l => l!.Company);

    public async Task<IReadOnlyList<InterviewDto>> ListAsync(CancellationToken ct = default) =>
        (await WithRelations().OrderByDescending(i => i.ScheduledAtUtc).ToListAsync(ct)).Adapt<List<InterviewDto>>();

    public async Task<IReadOnlyList<InterviewDto>> GetUpcomingAsync(CancellationToken ct = default)
    {
        var now = clock.UtcNow;
        var until = now.AddDays(7);
        return (await WithRelations()
            .Where(i => i.Status == InterviewStatus.Scheduled && i.ScheduledAtUtc >= now && i.ScheduledAtUtc <= until)
            .OrderBy(i => i.ScheduledAtUtc).ToListAsync(ct)).Adapt<List<InterviewDto>>();
    }

    public async Task<InterviewDto?> GetAsync(int id, CancellationToken ct = default) =>
        (await WithRelations().FirstOrDefaultAsync(i => i.Id == id, ct))?.Adapt<InterviewDto>();

    // Returns null when the parent application does not exist (endpoint -> 404).
    public async Task<InterviewDto?> CreateAsync(CreateInterviewRequest request, CancellationToken ct = default)
    {
        var app = await db.Applications.Include(a => a.JobLead).FirstOrDefaultAsync(a => a.Id == request.ApplicationId, ct);
        if (app is null) return null;

        var interview = request.Adapt<Interview>();
        db.Interviews.Add(interview);
        if (app.JobLead is { } lead)
            lead.Status = JobLeadStatusTransitions.Advance(lead.Status, ApplicationTrigger.EnteredInterviewStage);
        await db.SaveChangesAsync(ct);
        return await GetAsync(interview.Id, ct);
    }

    public async Task<InterviewDto?> UpdateAsync(int id, UpdateInterviewRequest request, CancellationToken ct = default)
    {
        var interview = await db.Interviews.FirstOrDefaultAsync(i => i.Id == id, ct);
        if (interview is null) return null;
        interview.RoundType = request.RoundType;
        interview.ScheduledAtUtc = request.ScheduledAtUtc;
        interview.DurationMinutes = request.DurationMinutes;
        interview.InterviewerName = request.InterviewerName;
        interview.InterviewerRole = request.InterviewerRole;
        interview.MeetingUrl = request.MeetingUrl;
        interview.Status = request.Status;
        interview.PrepNotes = request.PrepNotes;
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task<InterviewDto?> MarkCompletedAsync(int id, MarkInterviewCompletedRequest request, CancellationToken ct = default)
    {
        var interview = await db.Interviews.FirstOrDefaultAsync(i => i.Id == id, ct);
        if (interview is null) return null;

        var firstCompletion = interview.Complete(request.Outcome, request.Feedback, request.FollowUpRequired, request.FollowUpAtUtc);
        if (firstCompletion && request.FollowUpRequired && request.FollowUpAtUtc is { } due)
        {
            db.FollowUpTasks.Add(new FollowUpTask
            {
                Title = $"Follow up — {interview.RoundType} interview",
                RelatedEntityType = RelatedEntityType.Interview,
                RelatedEntityId = interview.Id,
                DueAtUtc = due,
                Status = FollowUpStatus.Pending,
                Priority = Priority.Medium,
            });
        }
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var interview = await db.Interviews.FirstOrDefaultAsync(i => i.Id == id, ct);
        if (interview is null) return false;
        await FollowUpCleanup.RemoveForAsync(db, RelatedEntityType.Interview, [id], ct);
        db.Interviews.Remove(interview);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
```

- [ ] **Step 6: Register the service**

In `backend/src/CareerOps.Application/DependencyInjection.cs`, add next to the other `AddScoped`:
```csharp
services.AddScoped<InterviewService>();
```
Add `using CareerOps.Application.Interviews;` if needed.

- [ ] **Step 7: Extend ApplicationService.DeleteAsync to clean interview follow-ups**

In `backend/src/CareerOps.Application/Applications/ApplicationService.cs`, replace the body of `DeleteAsync` with:
```csharp
public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
{
    var app = await db.Applications.FirstOrDefaultAsync(a => a.Id == id, ct);
    if (app is null) return false;

    // D35: clean this application's loose follow-ups + those of its (cascade-deleted) interviews.
    var interviewIds = await db.Interviews.Where(i => i.ApplicationId == id).Select(i => i.Id).ToListAsync(ct);
    await FollowUpCleanup.RemoveForAsync(db, RelatedEntityType.Application, [id], ct);
    await FollowUpCleanup.RemoveForAsync(db, RelatedEntityType.Interview, interviewIds, ct);

    db.Applications.Remove(app);
    await db.SaveChangesAsync(ct);
    return true;
}
```
Ensure the file's usings include `using CareerOps.Domain.Interviews;` (for `db.Interviews`). The existing `DomainApplication` alias and other usings stay.

- [ ] **Step 8: Extend JobLeadService.DeleteAsync to clean application + interview follow-ups**

In `backend/src/CareerOps.Application/JobLeads/JobLeadService.cs`, replace the body of `DeleteAsync` with:
```csharp
public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
{
    var lead = await db.JobLeads.FirstOrDefaultAsync(l => l.Id == id, ct);
    if (lead is null) return false;

    // D35: lead delete cascades app + interviews via FK; clean ALL loose follow-ups (no orphans).
    var appIds = await db.Applications.Where(a => a.JobLeadId == id).Select(a => a.Id).ToListAsync(ct);
    var interviewIds = await db.Interviews.Where(i => appIds.Contains(i.ApplicationId)).Select(i => i.Id).ToListAsync(ct);
    await FollowUpCleanup.RemoveForAsync(db, RelatedEntityType.JobLead, [id], ct);
    await FollowUpCleanup.RemoveForAsync(db, RelatedEntityType.Application, appIds, ct);
    await FollowUpCleanup.RemoveForAsync(db, RelatedEntityType.Interview, interviewIds, ct);

    db.JobLeads.Remove(lead);
    await db.SaveChangesAsync(ct);
    return true;
}
```
Add usings `using CareerOps.Domain.Applications;` and `using CareerOps.Domain.Interviews;` if not present (for `db.Applications`/`db.Interviews`). Keep the existing `ResolveCompanyIdAsync` helper.

- [ ] **Step 9: Write the service tests**

`backend/tests/CareerOps.UnitTests/Interviews/InterviewServiceTests.cs`:
```csharp
using CareerOps.Application.Applications;
using CareerOps.Application.Common;
using CareerOps.Application.Interviews;
using CareerOps.Application.JobLeads;
using CareerOps.Domain.Applications;
using CareerOps.Domain.Companies;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Interviews;
using CareerOps.Domain.JobLeads;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using DomainApplication = CareerOps.Domain.Applications.Application;

namespace CareerOps.UnitTests.Interviews;

public class InterviewServiceTests
{
    private sealed class FixedClock : IClock
    {
        public DateTime UtcNow => new(2026, 6, 20, 12, 0, 0, DateTimeKind.Utc);
        public DateOnly Today => new(2026, 6, 20);
    }

    private static readonly FixedClock Clock = new();

    private static CareerOpsDbContext NewDb() =>
        new(new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase($"careerops-{Guid.NewGuid()}").Options, Clock);

    // Seeds a company, a default resume variant, a lead at the given status, and a converted application.
    private static async Task<(CareerOpsDbContext db, int leadId, int appId)> SeedAppAsync(JobLeadStatus leadStatus)
    {
        var db = NewDb();
        var company = new Company { Name = "Equinor" }; db.Companies.Add(company);
        var variant = new ResumeVariant { Name = "Backend .NET", IsDefault = true }; db.ResumeVariants.Add(variant);
        await db.SaveChangesAsync();
        var lead = new JobLead { CompanyId = company.Id, Title = "Backend Engineer", Status = leadStatus };
        db.JobLeads.Add(lead); await db.SaveChangesAsync();
        var app = new DomainApplication
        {
            JobLeadId = lead.Id, ResumeVariantId = variant.Id, AppliedAtUtc = Clock.UtcNow,
            CurrentStage = ApplicationStage.Applied, Status = ApplicationStatus.Active,
        };
        db.Applications.Add(app); await db.SaveChangesAsync();
        return (db, lead.Id, app.Id);
    }

    private static CreateInterviewRequest CreateReq(int appId) =>
        new(appId, InterviewRoundType.RecruiterScreen, new DateTime(2026, 6, 22, 9, 0, 0, DateTimeKind.Utc),
            45, "Kari Nordmann", "Recruiter", "https://meet.example/abc", null);

    [Fact]
    public async Task Create_advances_applied_lead_to_interviewing()
    {
        var (db, leadId, appId) = await SeedAppAsync(JobLeadStatus.Applied);
        var dto = await new InterviewService(db, Clock).CreateAsync(CreateReq(appId));
        Assert.NotNull(dto);
        Assert.Equal(JobLeadStatus.Interviewing, (await db.JobLeads.FindAsync(leadId))!.Status);
    }

    [Fact]
    public async Task Create_does_not_regress_offer_lead()
    {
        var (db, leadId, appId) = await SeedAppAsync(JobLeadStatus.Offer);
        await new InterviewService(db, Clock).CreateAsync(CreateReq(appId));
        Assert.Equal(JobLeadStatus.Offer, (await db.JobLeads.FindAsync(leadId))!.Status);
    }

    [Fact]
    public async Task Create_returns_null_when_application_missing()
    {
        var db = NewDb();
        var dto = await new InterviewService(db, Clock).CreateAsync(CreateReq(999));
        Assert.Null(dto);
    }

    [Fact]
    public async Task MarkCompleted_creates_follow_up_when_required()
    {
        var (db, _, appId) = await SeedAppAsync(JobLeadStatus.Applied);
        var svc = new InterviewService(db, Clock);
        var created = await svc.CreateAsync(CreateReq(appId));
        var due = new DateTime(2026, 6, 25, 9, 0, 0, DateTimeKind.Utc);
        await svc.MarkCompletedAsync(created!.Id, new(InterviewOutcome.Passed, "Strong", true, due));

        var tasks = await db.FollowUpTasks.ToListAsync();
        var task = Assert.Single(tasks);
        Assert.Equal(RelatedEntityType.Interview, task.RelatedEntityType);
        Assert.Equal(created.Id, task.RelatedEntityId);
        Assert.Equal(FollowUpStatus.Pending, task.Status);
    }

    [Fact]
    public async Task MarkCompleted_creates_no_follow_up_when_not_required()
    {
        var (db, _, appId) = await SeedAppAsync(JobLeadStatus.Applied);
        var svc = new InterviewService(db, Clock);
        var created = await svc.CreateAsync(CreateReq(appId));
        await svc.MarkCompletedAsync(created!.Id, new(InterviewOutcome.Passed, null, false, null));
        Assert.Empty(await db.FollowUpTasks.ToListAsync());
    }

    [Fact]
    public async Task MarkCompleted_does_not_duplicate_follow_up_on_recompletion()
    {
        var (db, _, appId) = await SeedAppAsync(JobLeadStatus.Applied);
        var svc = new InterviewService(db, Clock);
        var created = await svc.CreateAsync(CreateReq(appId));
        var due = new DateTime(2026, 6, 25, 9, 0, 0, DateTimeKind.Utc);
        await svc.MarkCompletedAsync(created!.Id, new(InterviewOutcome.Passed, "x", true, due));
        await svc.MarkCompletedAsync(created.Id, new(InterviewOutcome.Passed, "x", true, due));
        Assert.Single(await db.FollowUpTasks.ToListAsync());
    }

    [Fact]
    public async Task Delete_interview_removes_its_follow_ups()
    {
        var (db, _, appId) = await SeedAppAsync(JobLeadStatus.Applied);
        var svc = new InterviewService(db, Clock);
        var created = await svc.CreateAsync(CreateReq(appId));
        await svc.MarkCompletedAsync(created!.Id, new(InterviewOutcome.Passed, null, true, new DateTime(2026, 6, 25, 9, 0, 0, DateTimeKind.Utc)));
        await svc.DeleteAsync(created.Id);
        Assert.Empty(await db.FollowUpTasks.ToListAsync());
    }

    [Fact]
    public async Task Delete_application_removes_interview_follow_ups()
    {
        var (db, _, appId) = await SeedAppAsync(JobLeadStatus.Applied);
        var interviews = new InterviewService(db, Clock);
        var created = await interviews.CreateAsync(CreateReq(appId));
        await interviews.MarkCompletedAsync(created!.Id, new(InterviewOutcome.Passed, null, true, new DateTime(2026, 6, 25, 9, 0, 0, DateTimeKind.Utc)));
        await new ApplicationService(db).DeleteAsync(appId);
        Assert.Empty(await db.FollowUpTasks.ToListAsync());
    }

    [Fact]
    public async Task Delete_lead_removes_application_and_interview_follow_ups()
    {
        var (db, leadId, appId) = await SeedAppAsync(JobLeadStatus.Applied);
        var interviews = new InterviewService(db, Clock);
        var created = await interviews.CreateAsync(CreateReq(appId));
        await interviews.MarkCompletedAsync(created!.Id, new(InterviewOutcome.Passed, null, true, new DateTime(2026, 6, 25, 9, 0, 0, DateTimeKind.Utc)));
        db.FollowUpTasks.Add(new FollowUpTask { Title = "App task", RelatedEntityType = RelatedEntityType.Application, RelatedEntityId = appId, DueAtUtc = Clock.UtcNow, Status = FollowUpStatus.Pending, Priority = Priority.Medium });
        await db.SaveChangesAsync();
        await new JobLeadService(db).DeleteAsync(leadId);
        Assert.Empty(await db.FollowUpTasks.ToListAsync());
    }

    [Fact]
    public async Task Upcoming_includes_only_scheduled_within_seven_days()
    {
        var (db, _, appId) = await SeedAppAsync(JobLeadStatus.Applied);
        var svc = new InterviewService(db, Clock);
        await svc.CreateAsync(CreateReq(appId) with { ScheduledAtUtc = Clock.UtcNow.AddDays(3) });   // in window
        await svc.CreateAsync(CreateReq(appId) with { ScheduledAtUtc = Clock.UtcNow.AddDays(10) });  // outside window
        await svc.CreateAsync(CreateReq(appId) with { ScheduledAtUtc = Clock.UtcNow.AddHours(-1) }); // past
        var upcoming = await svc.GetUpcomingAsync();
        Assert.Single(upcoming);
    }
}
```

- [ ] **Step 10: Run the tests**

Run: `dotnet test backend/CareerOps.slnx --filter "FullyQualifiedName~InterviewServiceTests"`
Expected: PASS (10 tests).

- [ ] **Step 11: Full backend build + test**

Run: `dotnet build backend/CareerOps.slnx && dotnet test backend/CareerOps.slnx`
Expected: PASS (all existing + new tests).

- [ ] **Step 12: Commit**

```bash
git add backend/src/CareerOps.Application backend/tests/CareerOps.UnitTests/Interviews
git commit -m "feat(api): Interview service — auto-advance, mark-completed task, multi-level cascade-clean (D33-D35)"
```

---

### Task 5: Interview endpoints + Program registration

**Files:**
- Create: `backend/src/CareerOps.Api/Endpoints/InterviewEndpoints.cs`
- Modify: `backend/src/CareerOps.Api/Program.cs`

**Interfaces:**
- Consumes: `InterviewService`, the request/DTO records, `ValidationFilter<T>`.
- Produces: routes under `/api/interviews`; operation names `GetInterviews`, `GetUpcomingInterviews`, `GetInterview`, `CreateInterview`, `UpdateInterview`, `MarkInterviewCompleted`, `DeleteInterview` (drive orval hook names in Task 6).

- [ ] **Step 1: Create the endpoints**

`backend/src/CareerOps.Api/Endpoints/InterviewEndpoints.cs`:
```csharp
using CareerOps.Api.Filters;
using CareerOps.Application.Interviews;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CareerOps.Api.Endpoints;

public static class InterviewEndpoints
{
    public static RouteGroupBuilder MapInterviews(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (InterviewService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.ListAsync(ct)))
            .WithName("GetInterviews");

        group.MapGet("/upcoming", async (InterviewService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.GetUpcomingAsync(ct)))
            .WithName("GetUpcomingInterviews");

        group.MapGet("/{id:int}", async Task<Results<Ok<InterviewDto>, NotFound>> (
                int id, InterviewService svc, CancellationToken ct) =>
                await svc.GetAsync(id, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
            .WithName("GetInterview");

        group.MapPost("/", async Task<Results<Created<InterviewDto>, NotFound>> (
                CreateInterviewRequest req, InterviewService svc, CancellationToken ct) =>
                await svc.CreateAsync(req, ct) is { } dto
                    ? TypedResults.Created($"/api/interviews/{dto.Id}", dto)
                    : TypedResults.NotFound())
            .WithName("CreateInterview")
            .AddEndpointFilter<ValidationFilter<CreateInterviewRequest>>().ProducesValidationProblem();

        group.MapPut("/{id:int}", async Task<Results<Ok<InterviewDto>, NotFound>> (
                int id, UpdateInterviewRequest req, InterviewService svc, CancellationToken ct) =>
                await svc.UpdateAsync(id, req, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
            .WithName("UpdateInterview")
            .AddEndpointFilter<ValidationFilter<UpdateInterviewRequest>>().ProducesValidationProblem();

        group.MapPost("/{id:int}/mark-completed", async Task<Results<Ok<InterviewDto>, NotFound>> (
                int id, MarkInterviewCompletedRequest req, InterviewService svc, CancellationToken ct) =>
                await svc.MarkCompletedAsync(id, req, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
            .WithName("MarkInterviewCompleted")
            .AddEndpointFilter<ValidationFilter<MarkInterviewCompletedRequest>>().ProducesValidationProblem();

        group.MapDelete("/{id:int}", async Task<Results<NoContent, NotFound>> (
                int id, InterviewService svc, CancellationToken ct) =>
                await svc.DeleteAsync(id, ct) ? TypedResults.NoContent() : TypedResults.NotFound())
            .WithName("DeleteInterview");

        return group;
    }
}
```

- [ ] **Step 2: Register the group in Program.cs**

In `backend/src/CareerOps.Api/Program.cs`, add after the follow-up-tasks group:
```csharp
app.MapGroup("/api/interviews").WithTags("Interviews").MapInterviews();
```

- [ ] **Step 3: Build**

Run: `dotnet build backend/CareerOps.slnx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/CareerOps.Api
git commit -m "feat(api): interview endpoints + register /api/interviews"
```

---

### Task 6: Regenerate the orval client (controller-run — needs the live API)

> **Controller note:** orval reads the live swagger at `http://localhost:8080/openapi/v1.json`, so the API must be running with the new endpoints before generation. The controller runs this task directly (Docker/host orchestration), not a subagent.

**Files:**
- Generated: `frontend/src/lib/api/interviews/interviews.ts` (+ `.zod.ts`), `frontend/src/lib/api/model/*Interview*` types.

- [ ] **Step 1: Bring up the API** (applies the migration at startup in Development)

Run: `just up`  (or `just api` for host watch). Confirm `http://localhost:8080/health` and `/health/db` are OK and the OpenAPI doc lists the interview paths.

- [ ] **Step 2: Generate the client**

Run: `just gen-client`
Expected: new `frontend/src/lib/api/interviews/` files + `InterviewDto`, `CreateInterviewRequest`, `UpdateInterviewRequest`, `MarkInterviewCompletedRequest`, and the three enum types in `frontend/src/lib/api/model/`.

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api
git commit -m "chore(web): regenerate orval client for interviews"
```

---

### Task 7: Frontend enums + nav

**Files:**
- Modify: `frontend/src/lib/enums.ts`, `frontend/src/components/AppLayout.tsx`

**Interfaces:**
- Produces: `interviewRoundType`, `interviewStatus`, `interviewOutcome` (`EnumMap`); `interviewStatusBadgeClass`, `interviewOutcomeBadgeClass` (`Record<number,string>`); Interviews nav item at `/interviews`.

- [ ] **Step 1: Add enum maps + badge classes**

In `frontend/src/lib/enums.ts`, add (after the existing interview-adjacent maps):
```ts
export const interviewRoundType: EnumMap = {
  0: "Recruiter screen", 1: "Technical", 2: "Live coding", 3: "System design",
  4: "Take-home discussion", 5: "AI engineering", 6: "Behavioral", 7: "Hiring manager",
  8: "Final", 9: "Other",
};
export const interviewStatus: EnumMap = { 0: "Scheduled", 1: "Completed", 2: "Cancelled", 3: "Rescheduled" };
export const interviewOutcome: EnumMap = { 0: "Unknown", 1: "Passed", 2: "Failed", 3: "Waiting" };

export const interviewStatusBadgeClass: Record<number, string> = {
  0: "bg-sky-100 text-sky-700",      // Scheduled
  1: "bg-emerald-100 text-emerald-700", // Completed
  2: "bg-zinc-100 text-zinc-600",    // Cancelled
  3: "bg-amber-100 text-amber-800",  // Rescheduled
};
export const interviewOutcomeBadgeClass: Record<number, string> = {
  0: "bg-zinc-100 text-zinc-600",    // Unknown
  1: "bg-emerald-100 text-emerald-700", // Passed
  2: "bg-red-100 text-red-700",      // Failed
  3: "bg-amber-100 text-amber-800",  // Waiting
};
```

- [ ] **Step 2: Add the nav item**

In `frontend/src/components/AppLayout.tsx`, import the icon and add the nav entry between Applications and Tasks:
```tsx
import { CalendarClock } from "lucide-react"; // add to the existing lucide-react import
// ...
{ to: "/applications", label: "Applications", icon: Send },
{ to: "/interviews", label: "Interviews", icon: CalendarClock },
{ to: "/tasks", label: "Tasks", icon: ListChecks },
```

- [ ] **Step 3: Verify**

Run: `cd frontend && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/enums.ts frontend/src/components/AppLayout.tsx
git commit -m "feat(web): interview enum maps + nav"
```

---

### Task 8: Interview components — form, item, sheet, complete dialog

**Files:**
- Create: `frontend/src/features/interviews/InterviewForm.tsx`, `InterviewItem.tsx`, `InterviewSheet.tsx`, `CompleteInterviewDialog.tsx`

**Interfaces:**
- Consumes: orval hooks `useCreateInterview`, `useUpdateInterview`, `useMarkInterviewCompleted`, `useGetApplications`; types `InterviewDto`, `CreateInterviewRequest`, `UpdateInterviewRequest`, `MarkInterviewCompletedRequest`, `ApplicationDto`; enum maps from Task 7; `EnumSelect`, shadcn `Sheet`/`Dialog`/`Input`/`Textarea`/`Button`/`Badge`/`Switch`. Global sync (Task 1) handles cache — no manual invalidation.
- Produces: `<InterviewSheet open interview? applicationId? onOpenChange />`, `<CompleteInterviewDialog open interview onOpenChange />`, `<InterviewItem interview onEdit onComplete onDelete />`.

- [ ] **Step 1: Create InterviewForm**

`frontend/src/features/interviews/InterviewForm.tsx`:
```tsx
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EnumSelect } from "@/components/form/EnumSelect";
import { interviewRoundType, interviewStatus } from "@/lib/enums";
import type { ApplicationDto, InterviewDto } from "@/lib/api/model";

const dtLocal = (iso?: string) => (iso ? iso.slice(0, 16) : new Date().toISOString().slice(0, 16));
const toNull = (s?: string | null) => { const t = s?.trim(); return t ? t : null; };

export type InterviewFormValues = {
  applicationId: number; roundType: number; scheduledAtUtc: string; durationMinutes: string;
  interviewerName: string; interviewerRole: string; meetingUrl: string; status: number; prepNotes: string;
};

type Props = {
  interview?: InterviewDto;
  fixedApplicationId?: number;
  applications?: ApplicationDto[];   // shown as a picker only when no fixedApplicationId
  pending: boolean;
  errors: string[];
  onSubmit: (v: {
    applicationId: number; roundType: number; scheduledAtUtc: string; durationMinutes: number | null;
    interviewerName: string | null; interviewerRole: string | null; meetingUrl: string | null;
    status: number; prepNotes: string | null;
  }) => void;
};

export function InterviewForm({ interview, fixedApplicationId, applications = [], pending, errors, onSubmit }: Props) {
  const { register, handleSubmit, control } = useForm<InterviewFormValues>({
    defaultValues: {
      applicationId: interview?.applicationId ?? fixedApplicationId ?? applications[0]?.id ?? 0,
      roundType: interview?.roundType ?? 0,
      scheduledAtUtc: dtLocal(interview?.scheduledAtUtc),
      durationMinutes: interview?.durationMinutes != null ? String(interview.durationMinutes) : "",
      interviewerName: interview?.interviewerName ?? "",
      interviewerRole: interview?.interviewerRole ?? "",
      meetingUrl: interview?.meetingUrl ?? "",
      status: interview?.status ?? 0,
      prepNotes: interview?.prepNotes ?? "",
    },
  });

  const submit = handleSubmit((v) => onSubmit({
    applicationId: Number(v.applicationId),
    roundType: Number(v.roundType),
    scheduledAtUtc: new Date(v.scheduledAtUtc).toISOString(),
    durationMinutes: v.durationMinutes ? Number(v.durationMinutes) : null,
    interviewerName: toNull(v.interviewerName),
    interviewerRole: toNull(v.interviewerRole),
    meetingUrl: toNull(v.meetingUrl),
    status: Number(v.status),
    prepNotes: toNull(v.prepNotes),
  }));

  const applicationOptions = applications.map((a) => ({ value: Number(a.id), label: `${a.companyName} · ${a.jobTitle}` }));

  return (
    <form onSubmit={submit} className="space-y-4">
      {!fixedApplicationId && applications.length > 0 && (
        <EnumSelect control={control} name="applicationId" label="Application"
          options={applicationOptions} />
      )}
      <EnumSelect control={control} name="roundType" label="Round" map={interviewRoundType} />
      <label className="block space-y-1">
        <span className="text-sm font-medium">Scheduled</span>
        <Input type="datetime-local" {...register("scheduledAtUtc")} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Duration (minutes)</span>
        <Input type="number" min={1} {...register("durationMinutes")} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Interviewer</span>
        <Input {...register("interviewerName")} placeholder="Name" />
      </label>
      <Input {...register("interviewerRole")} placeholder="Role" />
      <label className="block space-y-1">
        <span className="text-sm font-medium">Meeting URL</span>
        <Input {...register("meetingUrl")} placeholder="https://…" />
      </label>
      {interview && <EnumSelect control={control} name="status" label="Status" map={interviewStatus} />}
      <label className="block space-y-1">
        <span className="text-sm font-medium">Prep notes</span>
        <Textarea {...register("prepNotes")} rows={3} />
      </label>
      {errors.length > 0 && (
        <ul className="text-sm text-red-600">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
      )}
      <Button type="submit" disabled={pending}>{interview ? "Save" : "Add interview"}</Button>
    </form>
  );
}
```

> Note: `EnumSelect` takes either a `map` (EnumMap) or explicit `options`. Read `frontend/src/components/form/EnumSelect.tsx`; if it only accepts `map`, add an optional `options?: {value:number;label:string}[]` prop that takes precedence over `map` (small, backward-compatible). Keep its `Controller` value/onChange `Number()` coercion unchanged.

- [ ] **Step 2: Create InterviewItem**

`frontend/src/features/interviews/InterviewItem.tsx`:
```tsx
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { interviewRoundType, interviewStatus, interviewOutcome, interviewStatusBadgeClass, interviewOutcomeBadgeClass, enumLabel } from "@/lib/enums";
import type { InterviewDto } from "@/lib/api/model";

type Props = { interview: InterviewDto; onEdit: (i: InterviewDto) => void; onComplete: (i: InterviewDto) => void; onDelete: (i: InterviewDto) => void };

export function InterviewItem({ interview, onEdit, onComplete, onDelete }: Props) {
  const when = new Date(interview.scheduledAtUtc);
  const completed = interview.status === 1;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{enumLabel(interviewRoundType, interview.roundType)}</span>
          <Badge className={interviewStatusBadgeClass[interview.status]}>{enumLabel(interviewStatus, interview.status)}</Badge>
          {completed && <Badge className={interviewOutcomeBadgeClass[interview.outcome]}>{enumLabel(interviewOutcome, interview.outcome)}</Badge>}
        </div>
        <div className="truncate text-sm text-muted-foreground">{interview.companyName} · {interview.jobTitle}</div>
        <div className="text-xs text-muted-foreground">
          {when.toLocaleString()} · {formatDistanceToNow(when, { addSuffix: true })}
          {interview.interviewerName ? ` · ${interview.interviewerName}` : ""}
        </div>
        {interview.meetingUrl && <a href={interview.meetingUrl} target="_blank" rel="noreferrer" className="text-xs text-sky-600 hover:underline">Meeting link</a>}
      </div>
      <div className="flex shrink-0 gap-1">
        {!completed && <Button variant="ghost" size="sm" onClick={() => onComplete(interview)}>Complete</Button>}
        <Button variant="ghost" size="sm" onClick={() => onEdit(interview)}>Edit</Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(interview)}>Delete</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create InterviewSheet (create/edit; inlines the mutation)**

`frontend/src/features/interviews/InterviewSheet.tsx`:
```tsx
import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCreateInterview, useUpdateInterview } from "@/lib/api/interviews/interviews";
import { useGetApplications } from "@/lib/api/applications/applications";
import type { InterviewDto } from "@/lib/api/model";
import { InterviewForm } from "./InterviewForm";

const readErrors = (e: unknown): string[] => {
  const p = (e as { data?: { errors?: Record<string, string[]> } }).data;
  return p?.errors ? Object.values(p.errors).flat() : ["Save failed."];
};

type Props = { open: boolean; interview?: InterviewDto; applicationId?: number; onOpenChange: (o: boolean) => void };

export function InterviewSheet({ open, interview, applicationId, onOpenChange }: Props) {
  const create = useCreateInterview();
  const update = useUpdateInterview();
  const { data: appsResp } = useGetApplications();
  const applications = appsResp?.data ?? [];
  const [errors, setErrors] = useState<string[]>([]);

  const onSubmit = async (v: Parameters<React.ComponentProps<typeof InterviewForm>["onSubmit"]>[0]) => {
    setErrors([]);
    try {
      if (interview) {
        const { applicationId: _ignored, ...data } = v;   // applicationId is immutable on update
        await update.mutateAsync({ id: Number(interview.id), data });
        toast.success("Interview updated");
      } else {
        await create.mutateAsync({ data: v });
        toast.success("Interview added");
      }
      onOpenChange(false);
    } catch (e) {
      const status = (e as { status?: number }).status;
      setErrors(status === 404 ? ["That application no longer exists."] : readErrors(e));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader><SheetTitle>{interview ? "Edit interview" : "Add interview"}</SheetTitle></SheetHeader>
        <div className="p-4">
          <InterviewForm
            key={interview?.id ?? applicationId ?? "new"}
            interview={interview}
            fixedApplicationId={applicationId}
            applications={applications}
            pending={create.isPending || update.isPending}
            errors={errors}
            onSubmit={onSubmit}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Create CompleteInterviewDialog**

`frontend/src/features/interviews/CompleteInterviewDialog.tsx`:
```tsx
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useMarkInterviewCompleted } from "@/lib/api/interviews/interviews";
import { interviewOutcome, enumOptions } from "@/lib/enums";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InterviewDto } from "@/lib/api/model";

type Props = { open: boolean; interview: InterviewDto | null; onOpenChange: (o: boolean) => void };

export function CompleteInterviewDialog({ open, interview, onOpenChange }: Props) {
  const complete = useMarkInterviewCompleted();
  const [outcome, setOutcome] = useState("1");           // Passed
  const [feedback, setFeedback] = useState("");
  const [followUp, setFollowUp] = useState(false);
  const [followUpAt, setFollowUpAt] = useState(new Date().toISOString().slice(0, 10));
  const [errors, setErrors] = useState<string[]>([]);
  if (!interview) return null;

  const onSubmit = async () => {
    setErrors([]);
    try {
      await complete.mutateAsync({
        id: Number(interview.id),
        data: {
          outcome: Number(outcome),
          feedback: feedback.trim() || null,
          followUpRequired: followUp,
          followUpAtUtc: followUp ? new Date(`${followUpAt}T09:00:00`).toISOString() : null,
        },
      });
      toast.success("Interview completed");
      onOpenChange(false);
    } catch (e) {
      const p = (e as { data?: { errors?: Record<string, string[]> } }).data;
      setErrors(p?.errors ? Object.values(p.errors).flat() : ["Could not complete."]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Complete interview</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Outcome</span>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{enumOptions(interviewOutcome).map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Feedback</span>
            <Textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium">Create a follow-up task</span>
            <Switch checked={followUp} onCheckedChange={setFollowUp} />
          </label>
          {followUp && (
            <label className="block space-y-1">
              <span className="text-sm font-medium">Follow up on</span>
              <Input type="date" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} />
            </label>
          )}
          {errors.length > 0 && <ul className="text-sm text-red-600">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
          <Button onClick={onSubmit} disabled={complete.isPending}>Complete</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

> If `frontend/src/components/ui/switch.tsx` does not exist, add it with `npx shadcn@latest add switch` (do not hand-author). If that is unavailable, substitute a checkbox `<input type="checkbox">` styled with Tailwind — keep the same `followUp` state.

- [ ] **Step 5: Verify**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/interviews frontend/src/components/form/EnumSelect.tsx frontend/src/components/ui
git commit -m "feat(web): interview form, item, sheet, complete dialog"
```

---

### Task 9: Interviews page + route

**Files:**
- Create: `frontend/src/pages/InterviewsPage.tsx`
- Modify: `frontend/src/app/router.tsx`

**Interfaces:**
- Consumes: `useGetInterviews`, `useDeleteInterview`; `InterviewSheet`, `CompleteInterviewDialog`, `InterviewItem`; `InterviewDto`.

- [ ] **Step 1: Create the page**

`frontend/src/pages/InterviewsPage.tsx`:
```tsx
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetInterviews, useDeleteInterview } from "@/lib/api/interviews/interviews";
import type { InterviewDto } from "@/lib/api/model";
import { InterviewItem } from "@/features/interviews/InterviewItem";
import { InterviewSheet } from "@/features/interviews/InterviewSheet";
import { CompleteInterviewDialog } from "@/features/interviews/CompleteInterviewDialog";

export default function InterviewsPage() {
  const { data, isLoading } = useGetInterviews();
  const remove = useDeleteInterview();
  const all = data?.data ?? [];

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<InterviewDto | undefined>();
  const [completing, setCompleting] = useState<InterviewDto | null>(null);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const isUpcoming = (i: InterviewDto) => i.status === 0 && new Date(i.scheduledAtUtc).getTime() >= now;
    const up = all.filter(isUpcoming).sort((a, b) => +new Date(a.scheduledAtUtc) - +new Date(b.scheduledAtUtc));
    const pa = all.filter((i) => !isUpcoming(i)).sort((a, b) => +new Date(b.scheduledAtUtc) - +new Date(a.scheduledAtUtc));
    return { upcoming: up, past: pa };
  }, [all]);

  const openCreate = () => { setEditing(undefined); setSheetOpen(true); };
  const openEdit = (i: InterviewDto) => { setEditing(i); setSheetOpen(true); };
  const onDelete = async (i: InterviewDto) => {
    if (!confirm("Delete this interview?")) return;
    await remove.mutateAsync({ id: Number(i.id) });
    toast.success("Interview deleted");
  };

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Interviews</h1>
        <Button onClick={openCreate}>Add interview</Button>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Upcoming</h2>
        {upcoming.length === 0
          ? <p className="text-sm text-muted-foreground">No upcoming interviews.</p>
          : upcoming.map((i) => <InterviewItem key={i.id} interview={i} onEdit={openEdit} onComplete={setCompleting} onDelete={onDelete} />)}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Completed &amp; past</h2>
        {past.length === 0
          ? <p className="text-sm text-muted-foreground">Nothing yet.</p>
          : past.map((i) => <InterviewItem key={i.id} interview={i} onEdit={openEdit} onComplete={setCompleting} onDelete={onDelete} />)}
      </section>

      <InterviewSheet open={sheetOpen} interview={editing} onOpenChange={setSheetOpen} />
      <CompleteInterviewDialog open={completing !== null} interview={completing} onOpenChange={(o) => !o && setCompleting(null)} />
    </div>
  );
}
```

- [ ] **Step 2: Register the route**

In `frontend/src/app/router.tsx`, add the import and the child route (after `applications`):
```tsx
import InterviewsPage from "@/pages/InterviewsPage";
// ...
{ path: "interviews", element: <InterviewsPage /> },
```

- [ ] **Step 3: Verify**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/InterviewsPage.tsx frontend/src/app/router.tsx
git commit -m "feat(web): Interviews page + route"
```

---

### Task 10: Application sheet interviews section + dashboard upcoming card

**Files:**
- Modify: `frontend/src/features/applications/ApplicationSheet.tsx`, `frontend/src/pages/DashboardPage.tsx`
- Create: `frontend/src/features/dashboard/UpcomingInterviews.tsx`

**Interfaces:**
- Consumes: `useGetInterviews`, `useGetUpcomingInterviews`, `useDeleteInterview`; `InterviewItem`, `InterviewSheet`, `CompleteInterviewDialog`.

- [ ] **Step 1: Add the interviews section to ApplicationSheet**

In `frontend/src/features/applications/ApplicationSheet.tsx`, add imports and render a section below `<ApplicationForm .../>`. Add at top:
```tsx
import { useState } from "react";
import { toast } from "sonner";
import { useGetInterviews, useDeleteInterview } from "@/lib/api/interviews/interviews";
import type { InterviewDto } from "@/lib/api/model";
import { InterviewItem } from "@/features/interviews/InterviewItem";
import { InterviewSheet } from "@/features/interviews/InterviewSheet";
import { CompleteInterviewDialog } from "@/features/interviews/CompleteInterviewDialog";
import { Button } from "@/components/ui/button";
```
Inside `ApplicationSheet`, after the existing `update`/`errors` state, add:
```tsx
const { data: interviewsResp } = useGetInterviews();
const removeInterview = useDeleteInterview();
const [addOpen, setAddOpen] = useState(false);
const [editing, setEditing] = useState<InterviewDto | undefined>();
const [completing, setCompleting] = useState<InterviewDto | null>(null);
```
(`if (!app) return null;` stays — these hooks are declared before that guard to keep hook order stable.) After the guard, compute:
```tsx
const interviews = (interviewsResp?.data ?? []).filter((i) => i.applicationId === Number(app.id));
const onDeleteInterview = async (i: InterviewDto) => { await removeInterview.mutateAsync({ id: Number(i.id) }); toast.success("Interview deleted"); };
```
Render this block inside `<div className="p-4">` after `<ApplicationForm .../>`:
```tsx
<div className="mt-6 space-y-2">
  <div className="flex items-center justify-between">
    <h3 className="text-sm font-medium">Interviews</h3>
    <Button variant="outline" size="sm" onClick={() => { setEditing(undefined); setAddOpen(true); }}>Add</Button>
  </div>
  {interviews.length === 0
    ? <p className="text-sm text-muted-foreground">No interviews yet.</p>
    : interviews.map((i) => <InterviewItem key={i.id} interview={i} onEdit={(x) => { setEditing(x); setAddOpen(true); }} onComplete={setCompleting} onDelete={onDeleteInterview} />)}
</div>
<InterviewSheet open={addOpen} interview={editing} applicationId={Number(app.id)} onOpenChange={setAddOpen} />
<CompleteInterviewDialog open={completing !== null} interview={completing} onOpenChange={(o) => !o && setCompleting(null)} />
```
(If hooks were previously after `if (!app) return null;`, move that guard below all hook calls to satisfy the rules-of-hooks; render `null` content guards as needed.)

- [ ] **Step 2: Create the dashboard card**

`frontend/src/features/dashboard/UpcomingInterviews.tsx`:
```tsx
import { Link } from "react-router";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetUpcomingInterviews } from "@/lib/api/interviews/interviews";
import { interviewRoundType, enumLabel } from "@/lib/enums";

export function UpcomingInterviews() {
  const { data } = useGetUpcomingInterviews();
  const items = data?.data ?? [];
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
              <span className="shrink-0 text-xs text-muted-foreground">{formatDistanceToNow(new Date(i.scheduledAtUtc), { addSuffix: true })}</span>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Mount the card on the dashboard**

In `frontend/src/pages/DashboardPage.tsx`, import and render `<UpcomingInterviews />` inside the two-column grid that currently holds "High-priority to action" and "Recently updated" (make it a 3-up or add a row). Add:
```tsx
import { UpcomingInterviews } from "@/features/dashboard/UpcomingInterviews";
```
and place `<UpcomingInterviews />` as a sibling card within the existing `<div className="grid gap-6 md:grid-cols-2">` (it will wrap to a new row), or wrap the three cards in `md:grid-cols-3`. Keep it simple — add it as a third card.

- [ ] **Step 4: Verify**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/applications/ApplicationSheet.tsx frontend/src/features/dashboard/UpcomingInterviews.tsx frontend/src/pages/DashboardPage.tsx
git commit -m "feat(web): interviews in application sheet + dashboard upcoming card"
```

---

### Task 11: Log decisions + mark Phase 4 delivered

**Files:**
- Modify: `docs/knowledge-base/03-decisions.md`, `docs/knowledge-base/02-delivery-plan.md`

- [ ] **Step 1: Append decisions D32–D38**

Add dated entries to `docs/knowledge-base/03-decisions.md` (2026-06-20):
- **D32** — `EnteredInterviewStage` forward-only in `JobLeadStatusTransitions.Advance` (advances only from Discovered/Interested/Applied; no regression from Offer/closed; fixes a latent Phase-3 bug).
- **D33** — Creating an interview auto-advances the parent lead to Interviewing (D6); does not change the application's own stage.
- **D34** — `mark-completed` auto-creates a linked `FollowUpTask` when follow-up flagged (once; not on re-completion).
- **D35** — Multi-level delete cascade-clean of loose follow-up rows across lead → application → interview via `FollowUpCleanup`; closes a pre-existing lead-delete orphan gap (D12).
- **D36** — `Application → Interview` FK OnDelete Cascade.
- **D37** — Global `MutationCache.onSettled → invalidateQueries()` is the single cross-entity sync mechanism; existing per-mutation invalidations left as harmless redundancy. Trade-off: broad refetch, accepted for the personal single-user baseline.
- **D38** — Strategy pattern assessed for interview/transition logic and rejected: a static `switch` map + small service methods are sufficient (KISS/YAGNI).

- [ ] **Step 2: Mark S4.1 delivered**

In `docs/knowledge-base/02-delivery-plan.md`, add a note under Phase 4 / S4.1: "**Note (2026-06-20):** S4.1 delivered; cross-entity sync foundation added; decisions D32–D38 logged."

- [ ] **Step 3: Commit**

```bash
git add docs/knowledge-base/03-decisions.md docs/knowledge-base/02-delivery-plan.md
git commit -m "docs: log D32-D38 and mark Phase 4 (S4.1) delivered"
```

---

## Self-Review

**Spec coverage:** entity/enums (T2), EF+migration (T3, D36), validation (T4 validators), auto-advance + D6 forward-only (T2/T4, D32/D33), mark-completed auto-task (T4, D34), multi-level cascade-clean (T4, D35), endpoints incl. `upcoming` (T5), client (T6), sync foundation (T1, D37), Interviews page (T9), Application-sheet section (T10), dashboard card (T10), nav/enums (T7), testing (T2/T4), decisions (T11). All §-items mapped.

**Placeholder scan:** no TBD/TODO. The two `>`-prefixed notes (EnumSelect options prop; shadcn switch fallback) are concrete conditional instructions with exact code, not placeholders.

**Type consistency:** operation names in T5 → orval hook names used in T8–T10 (`useGetInterviews`, `useGetUpcomingInterviews`, `useCreateInterview`, `useUpdateInterview`, `useMarkInterviewCompleted`, `useDeleteInterview`). DTO field names (camelCase via orval: `applicationId`, `roundType`, `scheduledAtUtc`, `companyName`, `jobTitle`, `outcome`, `status`) consistent across components. `Interview.Complete(...)` signature (T2) matches its call in `MarkCompletedAsync` (T4). `FollowUpCleanup.RemoveForAsync` signature consistent across T4 service/Application/JobLead deletes. Enum int values match across backend enums (T2) and frontend maps (T7).
