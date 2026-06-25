# Domain V2 — Phase 2: Backend Domain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace JobLead + Application + Interview domain with unified Job aggregate — entities, enums, EF Core configs, application services, and unit tests.

**Architecture:** Clean Architecture layers (Domain → Application → Infrastructure). Direct EF Core via IAppDbContext, no repositories. IClock injected everywhere.

**Tech Stack:** .NET 10, EF Core 10, PostgreSQL 18, FluentValidation 12, Mapster 10, xUnit 2.9, EF InMemory

## Global Constraints

- Never call `DateTime.UtcNow` directly — inject and use `IClock`
- Never reorder or renumber existing enum member int values
- No MediatR, no generic repositories, no domain events framework
- EF Core code-first; use dotnet CLI for migrations (`just migrate <Name>`)
- Use `dotnet` CLI for all project/package ops — do not hand-author .csproj
- Enums stored as ints in DB; serialized as strings in JSON (handled in Program.cs)
- Phase ends with `just verify` — must pass before Phase 3 begins
- Working directory: `E:\personal\projects\CareerOps`

---

## File Structure

### Delete (stale V1)
- `backend/src/CareerOps.Domain/JobLeads/` — entire directory
- `backend/src/CareerOps.Domain/Applications/` — entire directory
- `backend/src/CareerOps.Domain/Interviews/` — entire directory
- `backend/src/CareerOps.Domain/ResumeVariants/` — entire directory
- `backend/src/CareerOps.Application/JobLeads/` — entire directory
- `backend/src/CareerOps.Application/Applications/` — entire directory
- `backend/src/CareerOps.Application/Interviews/` — entire directory
- `backend/src/CareerOps.Application/ResumeVariants/` — entire directory
- `backend/src/CareerOps.Application/Common/FollowUpCleanup.cs`
- `backend/src/CareerOps.Infrastructure/Persistence/Configurations/JobLeadConfiguration.cs`
- `backend/src/CareerOps.Infrastructure/Persistence/Configurations/ApplicationConfiguration.cs`
- `backend/src/CareerOps.Infrastructure/Persistence/Configurations/InterviewConfiguration.cs`
- `backend/src/CareerOps.Infrastructure/Persistence/Configurations/ResumeVariantConfiguration.cs`
- `backend/src/CareerOps.Infrastructure/Persistence/Migrations/` — all files
- `backend/tests/CareerOps.UnitTests/JobLeads/` — entire directory
- `backend/tests/CareerOps.UnitTests/Applications/` — entire directory
- `backend/tests/CareerOps.UnitTests/Interviews/` — entire directory
- `backend/tests/CareerOps.UnitTests/ResumeVariants/` — entire directory
- `backend/tests/CareerOps.UnitTests/FollowUpTasks/CascadeCleanTests.cs`
- `backend/src/CareerOps.Presentation/Endpoints/JobLeadEndpoints.cs`
- `backend/src/CareerOps.Presentation/Endpoints/ApplicationEndpoints.cs`
- `backend/src/CareerOps.Presentation/Endpoints/InterviewEndpoints.cs`
- `backend/src/CareerOps.Presentation/Endpoints/ResumeVariantEndpoints.cs`
- `backend/src/CareerOps.Presentation/Mcp/JobLeadTools.cs`
- `backend/src/CareerOps.Presentation/Mcp/ApplicationTools.cs`
- `backend/src/CareerOps.Presentation/Mcp/InterviewTools.cs`
- `backend/src/CareerOps.Presentation/Mcp/ResumeVariantTools.cs`
- `backend/tests/CareerOps.IntegrationTests/JobLeadEndpointTests.cs`
- `backend/tests/CareerOps.IntegrationTests/ApplicationEndpointTests.cs`
- `backend/tests/CareerOps.IntegrationTests/ResumeVariantEndpointTests.cs`

### Create (V2 domain)
- `backend/src/CareerOps.Domain/Common/Priority.cs` — moved from JobLeads
- `backend/src/CareerOps.Domain/Jobs/Job.cs`
- `backend/src/CareerOps.Domain/Jobs/JobStatus.cs`
- `backend/src/CareerOps.Domain/Jobs/JobSource.cs`
- `backend/src/CareerOps.Domain/Jobs/RemoteMode.cs`
- `backend/src/CareerOps.Domain/Jobs/EmploymentType.cs`
- `backend/src/CareerOps.Domain/Jobs/SalaryPeriod.cs`
- `backend/src/CareerOps.Domain/Jobs/JobActivity.cs`
- `backend/src/CareerOps.Domain/Jobs/JobActivityType.cs`
- `backend/src/CareerOps.Domain/Jobs/JobActivityStatus.cs`
- `backend/src/CareerOps.Domain/Jobs/JobActivityOutcome.cs`
- `backend/src/CareerOps.Domain/Jobs/JobTransition.cs`
- `backend/src/CareerOps.Domain/Jobs/TransitionActor.cs`
- `backend/src/CareerOps.Domain/Jobs/JobProperty.cs`
- `backend/src/CareerOps.Domain/Jobs/JobPropertyValueType.cs`
- `backend/src/CareerOps.Domain/Jobs/JobAttachment.cs`
- `backend/src/CareerOps.Domain/Jobs/JobAttachmentType.cs`

### Modify (V2 domain)
- `backend/src/CareerOps.Domain/FollowUpTasks/FollowUpTask.cs` — replace polymorphic FKs with direct Job/JobActivity FKs

### Create (V2 application)
- `backend/src/CareerOps.Application/Jobs/JobDto.cs`
- `backend/src/CareerOps.Application/Jobs/JobDetailDto.cs`
- `backend/src/CareerOps.Application/Jobs/JobActivityDto.cs`
- `backend/src/CareerOps.Application/Jobs/JobTransitionDto.cs`
- `backend/src/CareerOps.Application/Jobs/JobPropertyDto.cs`
- `backend/src/CareerOps.Application/Jobs/JobAttachmentDto.cs`
- `backend/src/CareerOps.Application/Jobs/TransitionResult.cs`
- `backend/src/CareerOps.Application/Jobs/ListJobsQuery.cs`
- `backend/src/CareerOps.Application/Jobs/CreateJobRequest.cs`
- `backend/src/CareerOps.Application/Jobs/UpdateJobRequest.cs`
- `backend/src/CareerOps.Application/Jobs/TransitionJobRequest.cs`
- `backend/src/CareerOps.Application/Jobs/CreateActivityRequest.cs`
- `backend/src/CareerOps.Application/Jobs/UpdateActivityRequest.cs`
- `backend/src/CareerOps.Application/Jobs/CompleteActivityRequest.cs`
- `backend/src/CareerOps.Application/Jobs/AddAttachmentRequest.cs`
- `backend/src/CareerOps.Application/Jobs/UpdateAttachmentRequest.cs`
- `backend/src/CareerOps.Application/Jobs/UpsertPropertyRequest.cs`
- `backend/src/CareerOps.Application/Jobs/JobMappingConfig.cs`
- `backend/src/CareerOps.Application/Jobs/JobRequestValidators.cs`
- `backend/src/CareerOps.Application/Jobs/JobService.cs`
- `backend/src/CareerOps.Application/Jobs/JobWorkflowService.cs`
- `backend/src/CareerOps.Application/Jobs/JobActivityService.cs`

### Modify (V2 application)
- `backend/src/CareerOps.Application/Common/IAppDbContext.cs` — replace old DbSets with V2
- `backend/src/CareerOps.Application/FollowUpTasks/FollowUpTaskDto.cs` — add JobId/JobActivityId
- `backend/src/CareerOps.Application/FollowUpTasks/FollowUpTaskService.cs` — rewrite with direct FKs
- `backend/src/CareerOps.Application/FollowUpTasks/CreateFollowUpTaskRequest.cs` — replace RelatedEntityType with JobId/JobActivityId
- `backend/src/CareerOps.Application/FollowUpTasks/UpdateFollowUpTaskRequest.cs` — same
- `backend/src/CareerOps.Application/Dashboard/DashboardDtos.cs` — job-centric shape
- `backend/src/CareerOps.Application/Dashboard/DashboardService.cs` — rebuild on Job model
- `backend/src/CareerOps.Application/Companies/CompanyService.cs` — add inline find-or-create, 409 on delete with jobs
- `backend/src/CareerOps.Application/DependencyInjection.cs` — register new services, remove old

### Create (V2 infrastructure)
- `backend/src/CareerOps.Infrastructure/Persistence/Configurations/JobConfiguration.cs`
- `backend/src/CareerOps.Infrastructure/Persistence/Configurations/JobActivityConfiguration.cs`
- `backend/src/CareerOps.Infrastructure/Persistence/Configurations/JobTransitionConfiguration.cs`
- `backend/src/CareerOps.Infrastructure/Persistence/Configurations/JobPropertyConfiguration.cs`
- `backend/src/CareerOps.Infrastructure/Persistence/Configurations/JobAttachmentConfiguration.cs`

### Modify (V2 infrastructure)
- `backend/src/CareerOps.Infrastructure/Persistence/Configurations/FollowUpTaskConfiguration.cs` — update FK config
- `backend/src/CareerOps.Infrastructure/Persistence/CareerOpsDbContext.cs` — add new DbSets, remove old

### Create (V2 tests)
- `backend/tests/CareerOps.UnitTests/Jobs/JobWorkflowServiceTests.cs`
- `backend/tests/CareerOps.UnitTests/Jobs/JobActivityServiceTests.cs`
- `backend/tests/CareerOps.UnitTests/FollowUpTasks/FollowUpTaskServiceTests.cs` — rewrite
- `backend/tests/CareerOps.UnitTests/Dashboard/DashboardServiceTests.cs` — rewrite

---

## Tasks

### Task 1: Reset DB and delete all V1 artifacts

**Files:**
- Delete: `backend/src/CareerOps.Infrastructure/Persistence/Migrations/` (all files)
- Delete: `backend/src/CareerOps.Infrastructure/Persistence/Configurations/JobLeadConfiguration.cs`
- Delete: `backend/src/CareerOps.Infrastructure/Persistence/Configurations/ApplicationConfiguration.cs`
- Delete: `backend/src/CareerOps.Infrastructure/Persistence/Configurations/InterviewConfiguration.cs`
- Delete: `backend/src/CareerOps.Infrastructure/Persistence/Configurations/ResumeVariantConfiguration.cs`
- Delete: entire `backend/src/CareerOps.Domain/JobLeads/`
- Delete: entire `backend/src/CareerOps.Domain/Applications/`
- Delete: entire `backend/src/CareerOps.Domain/Interviews/`
- Delete: entire `backend/src/CareerOps.Domain/ResumeVariants/`
- Delete: entire `backend/src/CareerOps.Application/JobLeads/`
- Delete: entire `backend/src/CareerOps.Application/Applications/`
- Delete: entire `backend/src/CareerOps.Application/Interviews/`
- Delete: entire `backend/src/CareerOps.Application/ResumeVariants/`
- Delete: `backend/src/CareerOps.Application/Common/FollowUpCleanup.cs`
- Delete: `backend/tests/CareerOps.UnitTests/JobLeads/` (all)
- Delete: `backend/tests/CareerOps.UnitTests/Applications/` (all)
- Delete: `backend/tests/CareerOps.UnitTests/Interviews/` (all)
- Delete: `backend/tests/CareerOps.UnitTests/ResumeVariants/` (all)
- Delete: `backend/tests/CareerOps.UnitTests/FollowUpTasks/CascadeCleanTests.cs`

**Interfaces:**
- Produces: clean slate for V2 domain

- [ ] **Step 1: Wipe Docker volume and restart Postgres**

```
just db-reset
```
Expected: containers stop, volume deleted, postgres restarts healthy.

- [ ] **Step 2: Delete V1 migration files**

```powershell
Remove-Item -Recurse -Force backend/src/CareerOps.Infrastructure/Persistence/Migrations
New-Item -ItemType Directory -Force backend/src/CareerOps.Infrastructure/Persistence/Migrations
```

- [ ] **Step 3: Delete V1 entity configs**

```powershell
Remove-Item backend/src/CareerOps.Infrastructure/Persistence/Configurations/JobLeadConfiguration.cs
Remove-Item backend/src/CareerOps.Infrastructure/Persistence/Configurations/ApplicationConfiguration.cs
Remove-Item backend/src/CareerOps.Infrastructure/Persistence/Configurations/InterviewConfiguration.cs
Remove-Item backend/src/CareerOps.Infrastructure/Persistence/Configurations/ResumeVariantConfiguration.cs
```

- [ ] **Step 4: Delete V1 domain directories**

```powershell
Remove-Item -Recurse -Force backend/src/CareerOps.Domain/JobLeads
Remove-Item -Recurse -Force backend/src/CareerOps.Domain/Applications
Remove-Item -Recurse -Force backend/src/CareerOps.Domain/Interviews
Remove-Item -Recurse -Force backend/src/CareerOps.Domain/ResumeVariants
```

- [ ] **Step 5: Delete V1 application directories and stale helpers**

```powershell
Remove-Item -Recurse -Force backend/src/CareerOps.Application/JobLeads
Remove-Item -Recurse -Force backend/src/CareerOps.Application/Applications
Remove-Item -Recurse -Force backend/src/CareerOps.Application/Interviews
Remove-Item -Recurse -Force backend/src/CareerOps.Application/ResumeVariants
Remove-Item backend/src/CareerOps.Application/Common/FollowUpCleanup.cs
```

- [ ] **Step 6: Delete stale unit tests**

```powershell
Remove-Item -Recurse -Force backend/tests/CareerOps.UnitTests/JobLeads
Remove-Item -Recurse -Force backend/tests/CareerOps.UnitTests/Applications
Remove-Item -Recurse -Force backend/tests/CareerOps.UnitTests/Interviews
Remove-Item -Recurse -Force backend/tests/CareerOps.UnitTests/ResumeVariants
Remove-Item backend/tests/CareerOps.UnitTests/FollowUpTasks/CascadeCleanTests.cs
```

- [ ] **Step 7: Delete stale Presentation endpoints, MCP tools, and integration tests**

```powershell
Remove-Item backend/src/CareerOps.Presentation/Endpoints/JobLeadEndpoints.cs
Remove-Item backend/src/CareerOps.Presentation/Endpoints/ApplicationEndpoints.cs
Remove-Item backend/src/CareerOps.Presentation/Endpoints/InterviewEndpoints.cs
Remove-Item backend/src/CareerOps.Presentation/Endpoints/ResumeVariantEndpoints.cs
Remove-Item backend/src/CareerOps.Presentation/Mcp/JobLeadTools.cs
Remove-Item backend/src/CareerOps.Presentation/Mcp/ApplicationTools.cs
Remove-Item backend/src/CareerOps.Presentation/Mcp/InterviewTools.cs
Remove-Item backend/src/CareerOps.Presentation/Mcp/ResumeVariantTools.cs
Remove-Item backend/tests/CareerOps.IntegrationTests/JobLeadEndpointTests.cs
Remove-Item backend/tests/CareerOps.IntegrationTests/ApplicationEndpointTests.cs
Remove-Item backend/tests/CareerOps.IntegrationTests/ResumeVariantEndpointTests.cs
```

Also, open `backend/src/CareerOps.Presentation/Program.cs` and remove the old endpoint registrations:
```csharp
// Delete these lines:
app.MapJobLeads();
app.MapApplications();
app.MapInterviews();
app.MapResumeVariants();
```

Also remove old `using` directives for deleted MCP tool types and endpoint types.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: delete V1 domain artifacts — JobLead, Application, Interview, ResumeVariant"
```

---

### Task 2: V2 domain enums

**Files:**
- Create: `backend/src/CareerOps.Domain/Common/Priority.cs`
- Create: `backend/src/CareerOps.Domain/Jobs/JobStatus.cs`
- Create: `backend/src/CareerOps.Domain/Jobs/JobSource.cs`
- Create: `backend/src/CareerOps.Domain/Jobs/RemoteMode.cs`
- Create: `backend/src/CareerOps.Domain/Jobs/EmploymentType.cs`
- Create: `backend/src/CareerOps.Domain/Jobs/SalaryPeriod.cs`
- Create: `backend/src/CareerOps.Domain/Jobs/JobActivityType.cs`
- Create: `backend/src/CareerOps.Domain/Jobs/JobActivityStatus.cs`
- Create: `backend/src/CareerOps.Domain/Jobs/JobActivityOutcome.cs`
- Create: `backend/src/CareerOps.Domain/Jobs/TransitionActor.cs`
- Create: `backend/src/CareerOps.Domain/Jobs/JobPropertyValueType.cs`
- Create: `backend/src/CareerOps.Domain/Jobs/JobAttachmentType.cs`

**Interfaces:**
- Produces: all enums used by Job aggregate entities

- [ ] **Step 1: Create Priority in Common (moved from JobLeads)**

```csharp
// backend/src/CareerOps.Domain/Common/Priority.cs
namespace CareerOps.Domain.Common;

public enum Priority
{
    Low    = 0,
    Medium = 1,
    High   = 2
}
```

- [ ] **Step 2: Create JobStatus**

```csharp
// backend/src/CareerOps.Domain/Jobs/JobStatus.cs
namespace CareerOps.Domain.Jobs;

public enum JobStatus
{
    Discovered   = 0,
    Interested   = 1,
    Applied      = 2,
    Interviewing = 3,
    Offered      = 4,
    Rejected     = 5,
    Ghosted      = 6,
    Withdrawn    = 7,
    Archived     = 8
}
```

- [ ] **Step 3: Create remaining job enums**

```csharp
// backend/src/CareerOps.Domain/Jobs/JobSource.cs
namespace CareerOps.Domain.Jobs;
public enum JobSource
{
    LinkedIn    = 0,
    Indeed      = 1,
    Referral    = 2,
    CompanySite = 3,
    Recruiter   = 4,
    Other       = 5,
    Glassdoor   = 6,
    Wellfound   = 7,
    Otta        = 8,
    StepStone   = 9,
    Bdjobs      = 10,
    Monster     = 11
}
```

```csharp
// backend/src/CareerOps.Domain/Jobs/RemoteMode.cs
namespace CareerOps.Domain.Jobs;
public enum RemoteMode
{
    OnSite  = 0,
    Hybrid  = 1,
    Remote  = 2
}
```

```csharp
// backend/src/CareerOps.Domain/Jobs/EmploymentType.cs
namespace CareerOps.Domain.Jobs;
public enum EmploymentType
{
    FullTime   = 0,
    PartTime   = 1,
    Contract   = 2,
    Freelance  = 3,
    Internship = 4
}
```

```csharp
// backend/src/CareerOps.Domain/Jobs/SalaryPeriod.cs
namespace CareerOps.Domain.Jobs;
public enum SalaryPeriod
{
    Annual  = 0,
    Monthly = 1,
    Hourly  = 2
}
```

- [ ] **Step 4: Create activity enums**

```csharp
// backend/src/CareerOps.Domain/Jobs/JobActivityType.cs
namespace CareerOps.Domain.Jobs;
public enum JobActivityType
{
    Screening       = 0,
    Interview       = 1,
    Technical       = 2,
    SystemDesign    = 3,
    Behavioral      = 4,
    TakeHome        = 5,
    Assessment      = 6,
    OfferDiscussion = 7,
    Other           = 8
}
```

```csharp
// backend/src/CareerOps.Domain/Jobs/JobActivityStatus.cs
namespace CareerOps.Domain.Jobs;
public enum JobActivityStatus
{
    Planned   = 0,
    Scheduled = 1,
    Completed = 2,
    Cancelled = 3
}
```

```csharp
// backend/src/CareerOps.Domain/Jobs/JobActivityOutcome.cs
namespace CareerOps.Domain.Jobs;
public enum JobActivityOutcome
{
    Unknown = 0,
    Waiting = 1,
    Passed  = 2,
    Failed  = 3
}
```

- [ ] **Step 5: Create transition and metadata enums**

```csharp
// backend/src/CareerOps.Domain/Jobs/TransitionActor.cs
namespace CareerOps.Domain.Jobs;
public enum TransitionActor
{
    User   = 0,
    Agent  = 1,
    System = 2
}
```

```csharp
// backend/src/CareerOps.Domain/Jobs/JobPropertyValueType.cs
namespace CareerOps.Domain.Jobs;
public enum JobPropertyValueType
{
    Text   = 0,
    Number = 1,
    Date   = 2,
    Url    = 3,
    Bool   = 4
}
```

```csharp
// backend/src/CareerOps.Domain/Jobs/JobAttachmentType.cs
namespace CareerOps.Domain.Jobs;
public enum JobAttachmentType
{
    Resume         = 0,
    CoverLetter    = 1,
    JobDescription = 2,
    Email          = 3,
    Screenshot     = 4,
    Other          = 5
}
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/CareerOps.Domain/
git commit -m "feat(domain): add V2 job aggregate enums"
```

---

### Task 3: V2 domain entities

**Files:**
- Create: `backend/src/CareerOps.Domain/Jobs/Job.cs`
- Create: `backend/src/CareerOps.Domain/Jobs/JobActivity.cs`
- Create: `backend/src/CareerOps.Domain/Jobs/JobTransition.cs`
- Create: `backend/src/CareerOps.Domain/Jobs/JobProperty.cs`
- Create: `backend/src/CareerOps.Domain/Jobs/JobAttachment.cs`
- Modify: `backend/src/CareerOps.Domain/FollowUpTasks/FollowUpTask.cs`

**Interfaces:**
- Consumes: enums from Task 2, `AuditableEntity` from Domain.Common, `Priority` from Domain.Common
- Produces: entity classes used by EF Core configs (Task 5) and services (Tasks 8–12)

- [ ] **Step 1: Create Job aggregate**

```csharp
// backend/src/CareerOps.Domain/Jobs/Job.cs
using CareerOps.Domain.Common;
using CareerOps.Domain.Companies;
using CareerOps.Domain.FollowUpTasks;

namespace CareerOps.Domain.Jobs;

public sealed class Job : AuditableEntity
{
    public int Id { get; set; }

    public int CompanyId { get; set; }
    public Company? Company { get; set; }

    public string Title { get; set; } = "";
    public JobStatus Status { get; set; }
    public Priority Priority { get; set; }

    public JobSource Source { get; set; }
    public string? SourceUrl { get; set; }
    public string? JobDescription { get; set; }

    public string? Country { get; set; }
    public string? City { get; set; }
    public string? LocationText { get; set; }
    public RemoteMode RemoteMode { get; set; }
    public EmploymentType EmploymentType { get; set; }

    public decimal? SalaryMin { get; set; }
    public decimal? SalaryMax { get; set; }
    public string? SalaryCurrency { get; set; }
    public SalaryPeriod SalaryPeriod { get; set; }

    public DateTime? DeadlineAtUtc { get; set; }
    public DateTime? AppliedAtUtc { get; set; }
    public DateTime? LastContactedAtUtc { get; set; }
    public DateTime? NextActionAtUtc { get; set; }

    public int? FitScore { get; set; }
    public string? ResumeLabel { get; set; }
    public string? ResumeAngle { get; set; }
    public string? CoverLetterNotes { get; set; }

    public decimal? OfferSalary { get; set; }
    public string? OfferCurrency { get; set; }
    public DateTime? OfferDeadlineAtUtc { get; set; }
    public string? OfferNotes { get; set; }

    public string? RejectionReason { get; set; }
    public string? Notes { get; set; }

    public List<JobActivity> Activities { get; set; } = [];
    public List<JobTransition> Transitions { get; set; } = [];
    public List<FollowUpTask> FollowUps { get; set; } = [];
    public List<JobProperty> Properties { get; set; } = [];
    public List<JobAttachment> Attachments { get; set; } = [];
}
```

- [ ] **Step 2: Create JobActivity**

```csharp
// backend/src/CareerOps.Domain/Jobs/JobActivity.cs
using CareerOps.Domain.Common;
using CareerOps.Domain.FollowUpTasks;

namespace CareerOps.Domain.Jobs;

public sealed class JobActivity : AuditableEntity
{
    public int Id { get; set; }
    public int JobId { get; set; }
    public Job? Job { get; set; }

    public string Label { get; set; } = "";
    public JobActivityType Type { get; set; }
    public JobActivityStatus Status { get; set; }
    public JobActivityOutcome Outcome { get; set; }

    public DateTime? ScheduledAtUtc { get; set; }
    public int? DurationMinutes { get; set; }

    public string? ContactName { get; set; }
    public string? ContactRole { get; set; }
    public string? MeetingUrl { get; set; }

    public string? PrepNotes { get; set; }
    public string? Feedback { get; set; }
    public string? Notes { get; set; }

    public List<FollowUpTask> FollowUps { get; set; } = [];
}
```

- [ ] **Step 3: Create JobTransition (immutable — no AuditableEntity)**

```csharp
// backend/src/CareerOps.Domain/Jobs/JobTransition.cs
namespace CareerOps.Domain.Jobs;

public sealed class JobTransition
{
    public int Id { get; set; }
    public int JobId { get; set; }
    public Job? Job { get; set; }

    public JobStatus? FromStatus { get; set; }
    public JobStatus ToStatus { get; set; }

    public DateTime ChangedAtUtc { get; set; }
    public TransitionActor Actor { get; set; }
    public string? Notes { get; set; }
}
```

- [ ] **Step 4: Create JobProperty**

```csharp
// backend/src/CareerOps.Domain/Jobs/JobProperty.cs
namespace CareerOps.Domain.Jobs;

public sealed class JobProperty
{
    public int Id { get; set; }
    public int JobId { get; set; }
    public Job? Job { get; set; }

    public string Key { get; set; } = "";
    public string? Value { get; set; }
    public JobPropertyValueType ValueType { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
```

- [ ] **Step 5: Create JobAttachment**

```csharp
// backend/src/CareerOps.Domain/Jobs/JobAttachment.cs
using CareerOps.Domain.Common;

namespace CareerOps.Domain.Jobs;

public sealed class JobAttachment : AuditableEntity
{
    public int Id { get; set; }
    public int JobId { get; set; }
    public Job? Job { get; set; }

    public JobAttachmentType Type { get; set; }
    public string Title { get; set; } = "";

    public string? FileName { get; set; }
    public string? Url { get; set; }
    public string? StoragePath { get; set; }
    public string? Notes { get; set; }
}
```

- [ ] **Step 6: Rewrite FollowUpTask with direct FKs**

Replace the entire file content:

```csharp
// backend/src/CareerOps.Domain/FollowUpTasks/FollowUpTask.cs
using CareerOps.Domain.Common;
using CareerOps.Domain.Jobs;

namespace CareerOps.Domain.FollowUpTasks;

public sealed class FollowUpTask : AuditableEntity
{
    public int Id { get; set; }

    public int? JobId { get; set; }
    public Job? Job { get; set; }

    public int? JobActivityId { get; set; }
    public JobActivity? JobActivity { get; set; }

    public string Title { get; set; } = "";
    public string? Description { get; set; }

    public DateTime DueAtUtc { get; set; }
    public FollowUpStatus Status { get; set; }
    public Priority Priority { get; set; }
}
```

Note: `RelatedEntityType` enum and old navigation properties are gone. Delete `RelatedEntityType.cs` from `backend/src/CareerOps.Domain/FollowUpTasks/` if it exists.

- [ ] **Step 7: Commit**

```bash
git add backend/src/CareerOps.Domain/
git commit -m "feat(domain): add V2 Job aggregate entities and refactor FollowUpTask"
```

---

### Task 4: Update IAppDbContext

**Files:**
- Modify: `backend/src/CareerOps.Application/Common/IAppDbContext.cs`

**Interfaces:**
- Produces: `IAppDbContext` with V2 DbSets used by all application services

- [ ] **Step 1: Replace IAppDbContext content**

```csharp
// backend/src/CareerOps.Application/Common/IAppDbContext.cs
using CareerOps.Domain.Companies;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Jobs;
using CareerOps.Domain.UserProfiles;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Common;

public interface IAppDbContext
{
    DbSet<UserProfile> UserProfiles { get; }
    DbSet<Company> Companies { get; }
    DbSet<Job> Jobs { get; }
    DbSet<JobActivity> JobActivities { get; }
    DbSet<JobTransition> JobTransitions { get; }
    DbSet<JobProperty> JobProperties { get; }
    DbSet<JobAttachment> JobAttachments { get; }
    DbSet<FollowUpTask> FollowUpTasks { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task<bool> CanConnectAsync(CancellationToken ct = default);
}
```

- [ ] **Step 2: Update CareerOpsDbContext to add new DbSets**

In `backend/src/CareerOps.Infrastructure/Persistence/CareerOpsDbContext.cs`, replace old DbSet declarations with:

```csharp
public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
public DbSet<Company> Companies => Set<Company>();
public DbSet<Job> Jobs => Set<Job>();
public DbSet<JobActivity> JobActivities => Set<JobActivity>();
public DbSet<JobTransition> JobTransitions => Set<JobTransition>();
public DbSet<JobProperty> JobProperties => Set<JobProperty>();
public DbSet<JobAttachment> JobAttachments => Set<JobAttachment>();
public DbSet<FollowUpTask> FollowUpTasks => Set<FollowUpTask>();
```

Remove old DbSet properties: `JobLeads`, `ResumeVariants`, `Applications`, `Interviews`. Update using directives accordingly.

- [ ] **Step 3: Commit**

```bash
git add backend/src/CareerOps.Application/Common/IAppDbContext.cs
git add backend/src/CareerOps.Infrastructure/Persistence/CareerOpsDbContext.cs
git commit -m "feat(infra): update IAppDbContext and DbContext for V2 Job aggregate"
```

---

### Task 5: EF Core configurations — Job and children

**Files:**
- Create: `backend/src/CareerOps.Infrastructure/Persistence/Configurations/JobConfiguration.cs`
- Create: `backend/src/CareerOps.Infrastructure/Persistence/Configurations/JobActivityConfiguration.cs`
- Create: `backend/src/CareerOps.Infrastructure/Persistence/Configurations/JobTransitionConfiguration.cs`
- Create: `backend/src/CareerOps.Infrastructure/Persistence/Configurations/JobPropertyConfiguration.cs`
- Create: `backend/src/CareerOps.Infrastructure/Persistence/Configurations/JobAttachmentConfiguration.cs`
- Modify: `backend/src/CareerOps.Infrastructure/Persistence/Configurations/FollowUpTaskConfiguration.cs`

**Interfaces:**
- Produces: EF Core table/column/FK/cascade/index mappings for all V2 entities

- [ ] **Step 1: Create JobConfiguration**

```csharp
// backend/src/CareerOps.Infrastructure/Persistence/Configurations/JobConfiguration.cs
using CareerOps.Domain.Jobs;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class JobConfiguration : IEntityTypeConfiguration<Job>
{
    public void Configure(EntityTypeBuilder<Job> b)
    {
        b.ToTable("jobs");
        b.HasKey(j => j.Id);

        b.Property(j => j.Title).IsRequired().HasMaxLength(300);
        b.Property(j => j.SourceUrl).HasMaxLength(2000);
        b.Property(j => j.Country).HasMaxLength(100);
        b.Property(j => j.City).HasMaxLength(100);
        b.Property(j => j.LocationText).HasMaxLength(200);
        b.Property(j => j.SalaryCurrency).HasMaxLength(10);
        b.Property(j => j.OfferCurrency).HasMaxLength(10);
        b.Property(j => j.ResumeLabel).HasMaxLength(200);
        b.Property(j => j.ResumeAngle).HasMaxLength(500);
        b.Property(j => j.SalaryMin).HasPrecision(18, 2);
        b.Property(j => j.SalaryMax).HasPrecision(18, 2);
        b.Property(j => j.OfferSalary).HasPrecision(18, 2);

        b.HasOne(j => j.Company)
            .WithMany()
            .HasForeignKey(j => j.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasMany(j => j.Activities)
            .WithOne(a => a.Job)
            .HasForeignKey(a => a.JobId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasMany(j => j.Transitions)
            .WithOne(t => t.Job)
            .HasForeignKey(t => t.JobId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasMany(j => j.FollowUps)
            .WithOne(f => f.Job)
            .HasForeignKey(f => f.JobId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasMany(j => j.Properties)
            .WithOne(p => p.Job)
            .HasForeignKey(p => p.JobId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasMany(j => j.Attachments)
            .WithOne(a => a.Job)
            .HasForeignKey(a => a.JobId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasIndex(j => j.Status);
        b.HasIndex(j => j.CompanyId);
    }
}
```

- [ ] **Step 2: Create JobActivityConfiguration**

```csharp
// backend/src/CareerOps.Infrastructure/Persistence/Configurations/JobActivityConfiguration.cs
using CareerOps.Domain.Jobs;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class JobActivityConfiguration : IEntityTypeConfiguration<JobActivity>
{
    public void Configure(EntityTypeBuilder<JobActivity> b)
    {
        b.ToTable("job_activities");
        b.HasKey(a => a.Id);

        b.Property(a => a.Label).IsRequired().HasMaxLength(200);
        b.Property(a => a.ContactName).HasMaxLength(200);
        b.Property(a => a.ContactRole).HasMaxLength(200);
        b.Property(a => a.MeetingUrl).HasMaxLength(2000);

        // FollowUps linked to this activity: nullify JobActivityId on delete, keep Job link
        b.HasMany(a => a.FollowUps)
            .WithOne(f => f.JobActivity)
            .HasForeignKey(f => f.JobActivityId)
            .OnDelete(DeleteBehavior.SetNull);

        b.HasIndex(a => a.JobId);
    }
}
```

- [ ] **Step 3: Create JobTransitionConfiguration**

```csharp
// backend/src/CareerOps.Infrastructure/Persistence/Configurations/JobTransitionConfiguration.cs
using CareerOps.Domain.Jobs;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class JobTransitionConfiguration : IEntityTypeConfiguration<JobTransition>
{
    public void Configure(EntityTypeBuilder<JobTransition> b)
    {
        b.ToTable("job_transitions");
        b.HasKey(t => t.Id);
        b.Property(t => t.Notes).HasMaxLength(1000);
        b.HasIndex(t => t.JobId);
        b.HasIndex(t => t.ChangedAtUtc);
    }
}
```

- [ ] **Step 4: Create JobPropertyConfiguration**

```csharp
// backend/src/CareerOps.Infrastructure/Persistence/Configurations/JobPropertyConfiguration.cs
using CareerOps.Domain.Jobs;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class JobPropertyConfiguration : IEntityTypeConfiguration<JobProperty>
{
    public void Configure(EntityTypeBuilder<JobProperty> b)
    {
        b.ToTable("job_properties");
        b.HasKey(p => p.Id);
        b.Property(p => p.Key).IsRequired().HasMaxLength(200);
        b.Property(p => p.Value).HasMaxLength(4000);

        // Upsert semantics: (JobId, Key) must be unique
        b.HasIndex(p => new { p.JobId, p.Key }).IsUnique();
    }
}
```

- [ ] **Step 5: Create JobAttachmentConfiguration**

```csharp
// backend/src/CareerOps.Infrastructure/Persistence/Configurations/JobAttachmentConfiguration.cs
using CareerOps.Domain.Jobs;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class JobAttachmentConfiguration : IEntityTypeConfiguration<JobAttachment>
{
    public void Configure(EntityTypeBuilder<JobAttachment> b)
    {
        b.ToTable("job_attachments");
        b.HasKey(a => a.Id);
        b.Property(a => a.Title).IsRequired().HasMaxLength(300);
        b.Property(a => a.FileName).HasMaxLength(500);
        b.Property(a => a.Url).HasMaxLength(2000);
        b.Property(a => a.StoragePath).HasMaxLength(1000);
        b.HasIndex(a => a.JobId);
    }
}
```

- [ ] **Step 6: Update FollowUpTaskConfiguration**

Replace entire file:

```csharp
// backend/src/CareerOps.Infrastructure/Persistence/Configurations/FollowUpTaskConfiguration.cs
using CareerOps.Domain.FollowUpTasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class FollowUpTaskConfiguration : IEntityTypeConfiguration<FollowUpTask>
{
    public void Configure(EntityTypeBuilder<FollowUpTask> b)
    {
        b.ToTable("follow_up_tasks");
        b.HasKey(f => f.Id);
        b.Property(f => f.Title).IsRequired().HasMaxLength(300);
        b.Property(f => f.Description).HasMaxLength(2000);

        // Job FK — cascade on Job delete
        b.HasOne(f => f.Job)
            .WithMany(j => j.FollowUps)
            .HasForeignKey(f => f.JobId)
            .OnDelete(DeleteBehavior.Cascade);

        // Activity FK — set null on Activity delete (Job remains)
        // Relationship defined in JobActivityConfiguration

        b.HasIndex(f => f.JobId);
        b.HasIndex(f => f.JobActivityId);
        b.HasIndex(f => f.DueAtUtc);
        b.HasIndex(f => f.Status);
    }
}
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/CareerOps.Infrastructure/
git commit -m "feat(infra): V2 EF Core configurations with cascade rules and indexes"
```

---

### Task 6: Generate V2 migration

**Files:**
- Creates: `backend/src/CareerOps.Infrastructure/Persistence/Migrations/` (generated)

**Interfaces:**
- Consumes: all EF configs from Task 5
- Produces: single clean DomainV2 migration + snapshot

- [ ] **Step 1: Run migration**

```
just migrate DomainV2
```

Expected: generates `<timestamp>_DomainV2.cs` and `CareerOpsDbContextModelSnapshot.cs` in `Persistence/Migrations/`.

- [ ] **Step 2: Apply migration to local Postgres**

```
dotnet ef database update --project backend/src/CareerOps.Infrastructure --startup-project backend/src/CareerOps.Presentation
```

Expected: `Done. 1 migration applied.`

- [ ] **Step 3: Verify build still compiles**

```
dotnet build backend/CareerOps.slnx
```

Expected: `Build succeeded.` (will have errors about missing services — that's fine here, fix in next tasks)

- [ ] **Step 4: Commit**

```bash
git add backend/src/CareerOps.Infrastructure/Persistence/Migrations/
git commit -m "feat(infra): V2 initial migration DomainV2"
```

---

### Task 7: DTOs, mapping, and request types

**Files:**
- Create: `backend/src/CareerOps.Application/Jobs/JobDto.cs`
- Create: `backend/src/CareerOps.Application/Jobs/JobDetailDto.cs`
- Create: `backend/src/CareerOps.Application/Jobs/JobActivityDto.cs`
- Create: `backend/src/CareerOps.Application/Jobs/JobTransitionDto.cs`
- Create: `backend/src/CareerOps.Application/Jobs/JobPropertyDto.cs`
- Create: `backend/src/CareerOps.Application/Jobs/JobAttachmentDto.cs`
- Create: `backend/src/CareerOps.Application/Jobs/TransitionResult.cs`
- Create: `backend/src/CareerOps.Application/Jobs/ListJobsQuery.cs`
- Create: `backend/src/CareerOps.Application/Jobs/CreateJobRequest.cs`
- Create: `backend/src/CareerOps.Application/Jobs/UpdateJobRequest.cs`
- Create: `backend/src/CareerOps.Application/Jobs/TransitionJobRequest.cs`
- Create: `backend/src/CareerOps.Application/Jobs/CreateActivityRequest.cs`
- Create: `backend/src/CareerOps.Application/Jobs/UpdateActivityRequest.cs`
- Create: `backend/src/CareerOps.Application/Jobs/CompleteActivityRequest.cs`
- Create: `backend/src/CareerOps.Application/Jobs/AddAttachmentRequest.cs`
- Create: `backend/src/CareerOps.Application/Jobs/UpdateAttachmentRequest.cs`
- Create: `backend/src/CareerOps.Application/Jobs/UpsertPropertyRequest.cs`
- Create: `backend/src/CareerOps.Application/Jobs/JobMappingConfig.cs`
- Create: `backend/src/CareerOps.Application/Jobs/JobRequestValidators.cs`
- Modify: `backend/src/CareerOps.Application/FollowUpTasks/FollowUpTaskDto.cs`
- Modify: `backend/src/CareerOps.Application/FollowUpTasks/CreateFollowUpTaskRequest.cs`
- Modify: `backend/src/CareerOps.Application/FollowUpTasks/UpdateFollowUpTaskRequest.cs`

**Interfaces:**
- Produces: all request/response types consumed by services and endpoints

- [ ] **Step 1: Create DTOs**

```csharp
// backend/src/CareerOps.Application/Jobs/JobDto.cs
using CareerOps.Domain.Common;
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record JobDto(
    int Id,
    int CompanyId,
    string CompanyName,
    string Title,
    JobStatus Status,
    Priority Priority,
    JobSource Source,
    string? SourceUrl,
    string? Country,
    string? City,
    string? LocationText,
    RemoteMode RemoteMode,
    EmploymentType EmploymentType,
    decimal? SalaryMin,
    decimal? SalaryMax,
    string? SalaryCurrency,
    SalaryPeriod SalaryPeriod,
    DateTime? DeadlineAtUtc,
    DateTime? AppliedAtUtc,
    DateTime? LastContactedAtUtc,
    DateTime? NextActionAtUtc,
    int? FitScore,
    string? Notes,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc
);
```

```csharp
// backend/src/CareerOps.Application/Jobs/JobDetailDto.cs
using CareerOps.Application.FollowUpTasks;
using CareerOps.Domain.Common;
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record JobDetailDto(
    int Id,
    int CompanyId,
    string CompanyName,
    string Title,
    JobStatus Status,
    Priority Priority,
    JobSource Source,
    string? SourceUrl,
    string? JobDescription,
    string? Country,
    string? City,
    string? LocationText,
    RemoteMode RemoteMode,
    EmploymentType EmploymentType,
    decimal? SalaryMin,
    decimal? SalaryMax,
    string? SalaryCurrency,
    SalaryPeriod SalaryPeriod,
    DateTime? DeadlineAtUtc,
    DateTime? AppliedAtUtc,
    DateTime? LastContactedAtUtc,
    DateTime? NextActionAtUtc,
    int? FitScore,
    string? ResumeLabel,
    string? ResumeAngle,
    string? CoverLetterNotes,
    decimal? OfferSalary,
    string? OfferCurrency,
    DateTime? OfferDeadlineAtUtc,
    string? OfferNotes,
    string? RejectionReason,
    string? Notes,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    List<JobActivityDto> Activities,
    List<JobPropertyDto> Properties,
    List<JobAttachmentDto> Attachments,
    List<FollowUpTaskDto> FollowUps
);
```

```csharp
// backend/src/CareerOps.Application/Jobs/JobActivityDto.cs
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record JobActivityDto(
    int Id,
    int JobId,
    string Label,
    JobActivityType Type,
    JobActivityStatus Status,
    JobActivityOutcome Outcome,
    DateTime? ScheduledAtUtc,
    int? DurationMinutes,
    string? ContactName,
    string? ContactRole,
    string? MeetingUrl,
    string? PrepNotes,
    string? Feedback,
    string? Notes,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc
);
```

```csharp
// backend/src/CareerOps.Application/Jobs/JobTransitionDto.cs
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record JobTransitionDto(
    int Id,
    int JobId,
    JobStatus? FromStatus,
    JobStatus ToStatus,
    DateTime ChangedAtUtc,
    TransitionActor Actor,
    string? Notes
);
```

```csharp
// backend/src/CareerOps.Application/Jobs/JobPropertyDto.cs
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record JobPropertyDto(
    int Id,
    int JobId,
    string Key,
    string? Value,
    JobPropertyValueType ValueType,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc
);
```

```csharp
// backend/src/CareerOps.Application/Jobs/JobAttachmentDto.cs
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record JobAttachmentDto(
    int Id,
    int JobId,
    JobAttachmentType Type,
    string Title,
    string? FileName,
    string? Url,
    string? Notes,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc
);
```

```csharp
// backend/src/CareerOps.Application/Jobs/TransitionResult.cs
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record TransitionResult(JobStatus NewStatus, string? Suggestion);
```

- [ ] **Step 2: Create request types**

```csharp
// backend/src/CareerOps.Application/Jobs/ListJobsQuery.cs
using CareerOps.Domain.Common;
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record ListJobsQuery(
    JobStatus[]? Statuses = null,
    JobSource? Source = null,
    RemoteMode? RemoteMode = null,
    EmploymentType? EmploymentType = null,
    string[]? Countries = null,      // multi-country: BD, DE, IE, GB, NL, NO, …
    int[]? CompanyIds = null,
    string? CompanySearch = null,    // free-text match on Company.Name
    Priority? Priority = null,
    decimal? SalaryMin = null,
    decimal? SalaryMax = null,
    DateTime? AppliedFrom = null,
    DateTime? AppliedTo = null,
    string? Search = null            // full-text: title, company name, notes
);
```

```csharp
// backend/src/CareerOps.Application/Jobs/CreateJobRequest.cs
using CareerOps.Domain.Common;
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record CreateJobRequest(
    int? CompanyId,
    string Title,
    JobStatus Status,
    Priority Priority,
    JobSource Source,
    string? SourceUrl,
    string? JobDescription,
    string? Country,
    string? City,
    string? LocationText,
    RemoteMode RemoteMode,
    EmploymentType EmploymentType,
    decimal? SalaryMin,
    decimal? SalaryMax,
    string? SalaryCurrency,
    SalaryPeriod SalaryPeriod,
    DateTime? DeadlineAtUtc,
    int? FitScore,
    string? ResumeLabel,
    string? ResumeAngle,
    string? CoverLetterNotes,
    string? Notes,
    string? CompanyName = null
);
```

```csharp
// backend/src/CareerOps.Application/Jobs/UpdateJobRequest.cs
using CareerOps.Domain.Common;
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record UpdateJobRequest(
    int CompanyId,
    string Title,
    Priority Priority,
    JobSource Source,
    string? SourceUrl,
    string? JobDescription,
    string? Country,
    string? City,
    string? LocationText,
    RemoteMode RemoteMode,
    EmploymentType EmploymentType,
    decimal? SalaryMin,
    decimal? SalaryMax,
    string? SalaryCurrency,
    SalaryPeriod SalaryPeriod,
    DateTime? DeadlineAtUtc,
    DateTime? AppliedAtUtc,
    DateTime? LastContactedAtUtc,
    DateTime? NextActionAtUtc,
    int? FitScore,
    string? ResumeLabel,
    string? ResumeAngle,
    string? CoverLetterNotes,
    decimal? OfferSalary,
    string? OfferCurrency,
    DateTime? OfferDeadlineAtUtc,
    string? OfferNotes,
    string? RejectionReason,
    string? Notes
);
```

```csharp
// backend/src/CareerOps.Application/Jobs/TransitionJobRequest.cs
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record TransitionJobRequest(JobStatus ToStatus, string? Notes);
```

```csharp
// backend/src/CareerOps.Application/Jobs/CreateActivityRequest.cs
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record CreateActivityRequest(
    string Label,
    JobActivityType Type,
    JobActivityStatus Status,
    DateTime? ScheduledAtUtc,
    int? DurationMinutes,
    string? ContactName,
    string? ContactRole,
    string? MeetingUrl,
    string? PrepNotes,
    string? Notes
);
```

```csharp
// backend/src/CareerOps.Application/Jobs/UpdateActivityRequest.cs
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record UpdateActivityRequest(
    string Label,
    JobActivityType Type,
    JobActivityStatus Status,
    DateTime? ScheduledAtUtc,
    int? DurationMinutes,
    string? ContactName,
    string? ContactRole,
    string? MeetingUrl,
    string? PrepNotes,
    string? Notes
);
```

```csharp
// backend/src/CareerOps.Application/Jobs/CompleteActivityRequest.cs
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record CompleteActivityRequest(
    JobActivityOutcome Outcome,
    string? Feedback,
    string? Notes,
    bool CreateFollowUp
);
```

```csharp
// backend/src/CareerOps.Application/Jobs/AddAttachmentRequest.cs
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record AddAttachmentRequest(
    JobAttachmentType Type,
    string Title,
    string? FileName,
    string? Url,
    string? Notes
);
```

```csharp
// backend/src/CareerOps.Application/Jobs/UpdateAttachmentRequest.cs
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record UpdateAttachmentRequest(
    JobAttachmentType Type,
    string Title,
    string? FileName,
    string? Url,
    string? Notes
);
```

```csharp
// backend/src/CareerOps.Application/Jobs/UpsertPropertyRequest.cs
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record UpsertPropertyRequest(string? Value, JobPropertyValueType ValueType);
```

- [ ] **Step 3: Create JobMappingConfig (Mapster)**

```csharp
// backend/src/CareerOps.Application/Jobs/JobMappingConfig.cs
using CareerOps.Domain.Jobs;
using Mapster;

namespace CareerOps.Application.Jobs;

public sealed class JobMappingConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<Job, JobDto>()
            .Map(d => d.CompanyName, s => s.Company != null ? s.Company.Name : "");

        config.NewConfig<Job, JobDetailDto>()
            .Map(d => d.CompanyName, s => s.Company != null ? s.Company.Name : "")
            .Map(d => d.Activities, s => s.Activities)
            .Map(d => d.Properties, s => s.Properties)
            .Map(d => d.Attachments, s => s.Attachments)
            .Map(d => d.FollowUps, s => s.FollowUps);
    }
}
```

- [ ] **Step 4: Create JobRequestValidators**

```csharp
// backend/src/CareerOps.Application/Jobs/JobRequestValidators.cs
using FluentValidation;

namespace CareerOps.Application.Jobs;

public sealed class CreateJobRequestValidator : AbstractValidator<CreateJobRequest>
{
    public CreateJobRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(300);
        RuleFor(x => x.CompanyId).GreaterThan(0).When(x => x.CompanyId.HasValue);
        RuleFor(x => x.SourceUrl).MaximumLength(2000).When(x => x.SourceUrl is not null);
        RuleFor(x => x.FitScore).InclusiveBetween(1, 10).When(x => x.FitScore is not null);
        RuleFor(x => x)
            .Must(x => x.CompanyId.HasValue || !string.IsNullOrWhiteSpace(x.CompanyName))
            .WithMessage("Either CompanyId or CompanyName must be provided");
    }
}

public sealed class UpdateJobRequestValidator : AbstractValidator<UpdateJobRequest>
{
    public UpdateJobRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(300);
        RuleFor(x => x.CompanyId).GreaterThan(0);
        RuleFor(x => x.SourceUrl).MaximumLength(2000).When(x => x.SourceUrl is not null);
        RuleFor(x => x.FitScore).InclusiveBetween(1, 10).When(x => x.FitScore is not null);
    }
}

public sealed class TransitionJobRequestValidator : AbstractValidator<TransitionJobRequest>
{
    public TransitionJobRequestValidator()
    {
        RuleFor(x => x.ToStatus).IsInEnum();
        RuleFor(x => x.Notes).MaximumLength(1000).When(x => x.Notes is not null);
    }
}

public sealed class CreateActivityRequestValidator : AbstractValidator<CreateActivityRequest>
{
    public CreateActivityRequestValidator()
    {
        RuleFor(x => x.Label).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.MeetingUrl).MaximumLength(2000).When(x => x.MeetingUrl is not null);
    }
}
```

- [ ] **Step 5: Update FollowUpTask request/DTO types**

```csharp
// backend/src/CareerOps.Application/FollowUpTasks/FollowUpTaskDto.cs
using CareerOps.Domain.Common;
using CareerOps.Domain.FollowUpTasks;

namespace CareerOps.Application.FollowUpTasks;

public record FollowUpTaskDto(
    int Id,
    int? JobId,
    string? JobTitle,
    int? JobActivityId,
    string? JobActivityLabel,
    string Title,
    string? Description,
    DateTime DueAtUtc,
    FollowUpStatus Status,
    Priority Priority,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc
);
```

```csharp
// backend/src/CareerOps.Application/FollowUpTasks/CreateFollowUpTaskRequest.cs
using CareerOps.Domain.Common;

namespace CareerOps.Application.FollowUpTasks;

public record CreateFollowUpTaskRequest(
    string Title,
    string? Description,
    DateTime DueAtUtc,
    Priority Priority,
    int? JobId,
    int? JobActivityId
);
```

```csharp
// backend/src/CareerOps.Application/FollowUpTasks/UpdateFollowUpTaskRequest.cs
using CareerOps.Domain.Common;

namespace CareerOps.Application.FollowUpTasks;

public record UpdateFollowUpTaskRequest(
    string Title,
    string? Description,
    DateTime DueAtUtc,
    Priority Priority,
    int? JobId,
    int? JobActivityId
);
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/CareerOps.Application/
git commit -m "feat(app): V2 DTOs, request types, validators, and mapping configs"
```

---

### Task 8: JobService

**Files:**
- Create: `backend/src/CareerOps.Application/Jobs/JobService.cs`

**Interfaces:**
- Consumes: `IAppDbContext`, `IClock`, all Job request/DTO types from Task 7
- Produces: `JobService` with `CreateJob`, `UpdateJob`, `GetJob`, `GetJobDetail`, `ListJobs`, `DeleteJob`, `AddAttachment`, `UpdateAttachment`, `DeleteAttachment`, `UpsertProperty`, `DeleteProperty`

- [ ] **Step 1: Create JobService**

```csharp
// backend/src/CareerOps.Application/Jobs/JobService.cs
using CareerOps.Application.Common;
using CareerOps.Application.Companies;
using CareerOps.Domain.Jobs;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Jobs;

public sealed class JobService(IAppDbContext db, IClock clock, CompanyService companySvc)
{
    public async Task<JobDetailDto> CreateJobAsync(CreateJobRequest req, CancellationToken ct = default)
    {
        var companyId = req.CompanyId
            ?? (await companySvc.FindOrCreateByNameAsync(req.CompanyName!, ct)).Id;

        var job = new Job
        {
            CompanyId = companyId,
            Title = req.Title,
            Status = req.Status,
            Priority = req.Priority,
            Source = req.Source,
            SourceUrl = req.SourceUrl,
            JobDescription = req.JobDescription,
            Country = req.Country,
            City = req.City,
            LocationText = req.LocationText,
            RemoteMode = req.RemoteMode,
            EmploymentType = req.EmploymentType,
            SalaryMin = req.SalaryMin,
            SalaryMax = req.SalaryMax,
            SalaryCurrency = req.SalaryCurrency,
            SalaryPeriod = req.SalaryPeriod,
            DeadlineAtUtc = req.DeadlineAtUtc,
            FitScore = req.FitScore,
            ResumeLabel = req.ResumeLabel,
            ResumeAngle = req.ResumeAngle,
            CoverLetterNotes = req.CoverLetterNotes,
            Notes = req.Notes
        };
        db.Jobs.Add(job);
        await db.SaveChangesAsync(ct);
        return await GetJobDetailAsync(job.Id, ct)
            ?? throw new InvalidOperationException("Job not found after create");
    }

    public async Task<JobDetailDto?> UpdateJobAsync(int id, UpdateJobRequest req, CancellationToken ct = default)
    {
        var job = await db.Jobs.FindAsync([id], ct);
        if (job is null) return null;

        job.CompanyId = req.CompanyId;
        job.Title = req.Title;
        job.Priority = req.Priority;
        job.Source = req.Source;
        job.SourceUrl = req.SourceUrl;
        job.JobDescription = req.JobDescription;
        job.Country = req.Country;
        job.City = req.City;
        job.LocationText = req.LocationText;
        job.RemoteMode = req.RemoteMode;
        job.EmploymentType = req.EmploymentType;
        job.SalaryMin = req.SalaryMin;
        job.SalaryMax = req.SalaryMax;
        job.SalaryCurrency = req.SalaryCurrency;
        job.SalaryPeriod = req.SalaryPeriod;
        job.DeadlineAtUtc = req.DeadlineAtUtc;
        job.AppliedAtUtc = req.AppliedAtUtc;
        job.LastContactedAtUtc = req.LastContactedAtUtc;
        job.NextActionAtUtc = req.NextActionAtUtc;
        job.FitScore = req.FitScore;
        job.ResumeLabel = req.ResumeLabel;
        job.ResumeAngle = req.ResumeAngle;
        job.CoverLetterNotes = req.CoverLetterNotes;
        job.OfferSalary = req.OfferSalary;
        job.OfferCurrency = req.OfferCurrency;
        job.OfferDeadlineAtUtc = req.OfferDeadlineAtUtc;
        job.OfferNotes = req.OfferNotes;
        job.RejectionReason = req.RejectionReason;
        job.Notes = req.Notes;

        await db.SaveChangesAsync(ct);
        return await GetJobDetailAsync(id, ct);
    }

    public async Task<JobDetailDto?> GetJobDetailAsync(int id, CancellationToken ct = default)
    {
        var job = await db.Jobs
            .Include(j => j.Company)
            .Include(j => j.Activities)
            .Include(j => j.Properties)
            .Include(j => j.Attachments)
            .Include(j => j.FollowUps)
            .FirstOrDefaultAsync(j => j.Id == id, ct);

        return job?.Adapt<JobDetailDto>();
    }

    public async Task<List<JobDto>> ListJobsAsync(ListJobsQuery query, CancellationToken ct = default)
    {
        var q = db.Jobs.Include(j => j.Company).AsQueryable();

        if (query.Statuses is { Length: > 0 })
            q = q.Where(j => query.Statuses.Contains(j.Status));
        if (query.Source.HasValue)
            q = q.Where(j => j.Source == query.Source.Value);
        if (query.RemoteMode.HasValue)
            q = q.Where(j => j.RemoteMode == query.RemoteMode.Value);
        if (query.EmploymentType.HasValue)
            q = q.Where(j => j.EmploymentType == query.EmploymentType.Value);
        if (query.Countries is { Length: > 0 })
            q = q.Where(j => query.Countries.Contains(j.Country));
        if (query.CompanyIds is { Length: > 0 })
            q = q.Where(j => query.CompanyIds.Contains(j.CompanyId));
        if (query.CompanySearch is not null)
        {
            var cs = query.CompanySearch.ToLower();
            q = q.Where(j => j.Company!.Name.ToLower().Contains(cs));
        }
        if (query.Priority.HasValue)
            q = q.Where(j => j.Priority == query.Priority.Value);
        if (query.SalaryMin.HasValue)
            q = q.Where(j => j.SalaryMin >= query.SalaryMin.Value);
        if (query.SalaryMax.HasValue)
            q = q.Where(j => j.SalaryMax <= query.SalaryMax.Value);
        if (query.AppliedFrom.HasValue)
            q = q.Where(j => j.AppliedAtUtc >= query.AppliedFrom.Value);
        if (query.AppliedTo.HasValue)
            q = q.Where(j => j.AppliedAtUtc <= query.AppliedTo.Value);
        if (query.Search is not null)
        {
            var s = query.Search.ToLower();
            q = q.Where(j =>
                j.Title.ToLower().Contains(s) ||
                j.Company!.Name.ToLower().Contains(s) ||
                (j.SourceUrl != null && j.SourceUrl.ToLower().Contains(s)) ||
                (j.Notes != null && j.Notes.ToLower().Contains(s)));
        }

        return (await q.OrderByDescending(j => j.UpdatedAtUtc).ToListAsync(ct))
            .Adapt<List<JobDto>>();
    }

    public async Task<bool> DeleteJobAsync(int id, CancellationToken ct = default)
    {
        var job = await db.Jobs.FindAsync([id], ct);
        if (job is null) return false;
        db.Jobs.Remove(job);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<JobAttachmentDto?> AddAttachmentAsync(int jobId, AddAttachmentRequest req, CancellationToken ct = default)
    {
        if (!await db.Jobs.AnyAsync(j => j.Id == jobId, ct)) return null;
        var att = new JobAttachment
        {
            JobId = jobId,
            Type = req.Type,
            Title = req.Title,
            FileName = req.FileName,
            Url = req.Url,
            Notes = req.Notes
        };
        db.JobAttachments.Add(att);
        await db.SaveChangesAsync(ct);
        return att.Adapt<JobAttachmentDto>();
    }

    public async Task<JobAttachmentDto?> UpdateAttachmentAsync(int jobId, int attachmentId, UpdateAttachmentRequest req, CancellationToken ct = default)
    {
        var att = await db.JobAttachments.FirstOrDefaultAsync(a => a.Id == attachmentId && a.JobId == jobId, ct);
        if (att is null) return null;
        att.Type = req.Type;
        att.Title = req.Title;
        att.FileName = req.FileName;
        att.Url = req.Url;
        att.Notes = req.Notes;
        await db.SaveChangesAsync(ct);
        return att.Adapt<JobAttachmentDto>();
    }

    public async Task<bool> DeleteAttachmentAsync(int jobId, int attachmentId, CancellationToken ct = default)
    {
        var att = await db.JobAttachments.FirstOrDefaultAsync(a => a.Id == attachmentId && a.JobId == jobId, ct);
        if (att is null) return false;
        db.JobAttachments.Remove(att);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<JobPropertyDto?> UpsertPropertyAsync(int jobId, string key, UpsertPropertyRequest req, CancellationToken ct = default)
    {
        if (!await db.Jobs.AnyAsync(j => j.Id == jobId, ct)) return null;
        var prop = await db.JobProperties.FirstOrDefaultAsync(p => p.JobId == jobId && p.Key == key, ct);
        var now = clock.UtcNow;
        if (prop is null)
        {
            prop = new JobProperty { JobId = jobId, Key = key, Value = req.Value, ValueType = req.ValueType, CreatedAtUtc = now, UpdatedAtUtc = now };
            db.JobProperties.Add(prop);
        }
        else
        {
            prop.Value = req.Value;
            prop.ValueType = req.ValueType;
            prop.UpdatedAtUtc = now;
        }
        await db.SaveChangesAsync(ct);
        return prop.Adapt<JobPropertyDto>();
    }

    public async Task<bool> DeletePropertyAsync(int jobId, string key, CancellationToken ct = default)
    {
        var prop = await db.JobProperties.FirstOrDefaultAsync(p => p.JobId == jobId && p.Key == key, ct);
        if (prop is null) return false;
        db.JobProperties.Remove(prop);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/CareerOps.Application/Jobs/JobService.cs
git commit -m "feat(app): JobService — CRUD, list with filters, attachments, properties"
```

---

### Task 9: JobWorkflowService + unit tests

**Files:**
- Create: `backend/src/CareerOps.Application/Jobs/JobWorkflowService.cs`
- Create: `backend/tests/CareerOps.UnitTests/Jobs/JobWorkflowServiceTests.cs`

**Interfaces:**
- Consumes: `IAppDbContext`, `IClock`, `TransitionJobRequest`, `TransitionResult`, domain entities
- Produces: `JobWorkflowService.TransitionJobAsync(int, JobStatus, string?, TransitionActor, CancellationToken)`

- [ ] **Step 1: Write failing tests first**

```csharp
// backend/tests/CareerOps.UnitTests/Jobs/JobWorkflowServiceTests.cs
using CareerOps.Application.Jobs;
using CareerOps.Domain.Common;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Jobs;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Xunit;

namespace CareerOps.UnitTests.Jobs;

public sealed class JobWorkflowServiceTests
{
    private sealed class FixedClock(DateTime utcNow) : CareerOps.Application.Common.IClock
    {
        public DateTime UtcNow => utcNow;
        public DateOnly Today => DateOnly.FromDateTime(utcNow);
    }

    private static readonly InMemoryDatabaseRoot Root = new();

    private static CareerOpsDbContext Db(string name, FixedClock clock)
    {
        var opts = new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase(name, Root)
            .Options;
        return new CareerOpsDbContext(opts, clock);
    }

    private static async Task<Job> SeedJob(CareerOpsDbContext db, JobStatus status = JobStatus.Interested)
    {
        var company = new CareerOps.Domain.Companies.Company { Name = "Acme", CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow };
        db.Companies.Add(company);
        await db.SaveChangesAsync();

        var job = new Job
        {
            CompanyId = company.Id,
            Title = "Dev",
            Status = status,
            Priority = Priority.Medium,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();
        return job;
    }

    [Fact]
    public async Task TransitionToApplied_SetsAppliedAtUtcWhenNull()
    {
        var dbName = nameof(TransitionToApplied_SetsAppliedAtUtcWhenNull);
        var now = new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc);
        var clock = new FixedClock(now);
        await using var db = Db(dbName, clock);
        var job = await SeedJob(db);

        var svc = new JobWorkflowService(db, clock);
        await svc.TransitionJobAsync(job.Id, JobStatus.Applied, null, TransitionActor.User);

        await using var db2 = Db(dbName, clock);
        var updated = await db2.Jobs.FindAsync(job.Id);
        Assert.Equal(now, updated!.AppliedAtUtc);
    }

    [Fact]
    public async Task TransitionToApplied_DoesNotOverwriteExistingAppliedAtUtc()
    {
        var dbName = nameof(TransitionToApplied_DoesNotOverwriteExistingAppliedAtUtc);
        var original = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc);
        var now = new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc);
        var clock = new FixedClock(now);
        await using var db = Db(dbName, clock);
        var job = await SeedJob(db);
        job.AppliedAtUtc = original;
        await db.SaveChangesAsync();

        var svc = new JobWorkflowService(db, clock);
        await svc.TransitionJobAsync(job.Id, JobStatus.Applied, null, TransitionActor.User);

        await using var db2 = Db(dbName, clock);
        var updated = await db2.Jobs.FindAsync(job.Id);
        Assert.Equal(original, updated!.AppliedAtUtc);
    }

    [Fact]
    public async Task TransitionToApplied_CreatesFollowUpDue7Days()
    {
        var dbName = nameof(TransitionToApplied_CreatesFollowUpDue7Days);
        var now = new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc);
        var clock = new FixedClock(now);
        await using var db = Db(dbName, clock);
        var job = await SeedJob(db);

        var svc = new JobWorkflowService(db, clock);
        await svc.TransitionJobAsync(job.Id, JobStatus.Applied, null, TransitionActor.User);

        await using var db2 = Db(dbName, clock);
        var followUp = await db2.FollowUpTasks.FirstOrDefaultAsync(f => f.JobId == job.Id);
        Assert.NotNull(followUp);
        Assert.Equal(now.AddDays(7), followUp!.DueAtUtc);
    }

    [Fact]
    public async Task StatusChangingTransition_AppendsTransitionRow()
    {
        var dbName = nameof(StatusChangingTransition_AppendsTransitionRow);
        var now = new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc);
        var clock = new FixedClock(now);
        await using var db = Db(dbName, clock);
        var job = await SeedJob(db, JobStatus.Interested);

        var svc = new JobWorkflowService(db, clock);
        await svc.TransitionJobAsync(job.Id, JobStatus.Applied, "applying now", TransitionActor.User);

        await using var db2 = Db(dbName, clock);
        var transition = await db2.JobTransitions.FirstOrDefaultAsync(t => t.JobId == job.Id);
        Assert.NotNull(transition);
        Assert.Equal(JobStatus.Interested, transition!.FromStatus);
        Assert.Equal(JobStatus.Applied, transition.ToStatus);
        Assert.Equal(TransitionActor.User, transition.Actor);
        Assert.Equal("applying now", transition.Notes);
    }

    [Fact]
    public async Task SameStatusTransition_IsNoOp_NoTransitionRowAppended()
    {
        var dbName = nameof(SameStatusTransition_IsNoOp_NoTransitionRowAppended);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var job = await SeedJob(db, JobStatus.Applied);

        var svc = new JobWorkflowService(db, clock);
        var result = await svc.TransitionJobAsync(job.Id, JobStatus.Applied, null, TransitionActor.User);

        await using var db2 = Db(dbName, clock);
        var count = await db2.JobTransitions.CountAsync(t => t.JobId == job.Id);
        Assert.Equal(0, count);
        Assert.Equal(JobStatus.Applied, result.NewStatus);
    }

    [Fact]
    public async Task SameStatusTransition_DoesNotCreateFollowUp()
    {
        var dbName = nameof(SameStatusTransition_DoesNotCreateFollowUp);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var job = await SeedJob(db, JobStatus.Applied);

        var svc = new JobWorkflowService(db, clock);
        await svc.TransitionJobAsync(job.Id, JobStatus.Applied, null, TransitionActor.User);

        await using var db2 = Db(dbName, clock);
        var count = await db2.FollowUpTasks.CountAsync(f => f.JobId == job.Id);
        Assert.Equal(0, count);
    }

    [Fact]
    public async Task TransitionToInterviewing_ReturnsSuggestion()
    {
        var dbName = nameof(TransitionToInterviewing_ReturnsSuggestion);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var job = await SeedJob(db);

        var svc = new JobWorkflowService(db, clock);
        var result = await svc.TransitionJobAsync(job.Id, JobStatus.Interviewing, null, TransitionActor.Agent);

        Assert.NotNull(result.Suggestion);
    }

    [Fact]
    public async Task ActorStoredCorrectlyOnTransitionRow()
    {
        var dbName = nameof(ActorStoredCorrectlyOnTransitionRow);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var job = await SeedJob(db);

        var svc = new JobWorkflowService(db, clock);
        await svc.TransitionJobAsync(job.Id, JobStatus.Applied, null, TransitionActor.Agent);

        await using var db2 = Db(dbName, clock);
        var transition = await db2.JobTransitions.FirstAsync(t => t.JobId == job.Id);
        Assert.Equal(TransitionActor.Agent, transition.Actor);
    }
}
```

- [ ] **Step 2: Run tests — verify they fail**

```
dotnet test backend/tests/CareerOps.UnitTests/CareerOps.UnitTests.csproj --filter "FullyQualifiedName~JobWorkflowServiceTests"
```

Expected: compile errors (JobWorkflowService not found).

- [ ] **Step 3: Implement JobWorkflowService**

```csharp
// backend/src/CareerOps.Application/Jobs/JobWorkflowService.cs
using CareerOps.Application.Common;
using CareerOps.Domain.Common;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Jobs;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Jobs;

public sealed class JobWorkflowService(IAppDbContext db, IClock clock)
{
    public async Task<TransitionResult> TransitionJobAsync(
        int jobId,
        JobStatus toStatus,
        string? notes,
        TransitionActor actor,
        CancellationToken ct = default)
    {
        var job = await db.Jobs.FindAsync([jobId], ct)
            ?? throw new KeyNotFoundException($"Job {jobId} not found");

        if (job.Status == toStatus)
            return new TransitionResult(toStatus, null);

        var fromStatus = job.Status;
        job.Status = toStatus;

        if (toStatus == JobStatus.Applied && job.AppliedAtUtc is null)
            job.AppliedAtUtc = clock.UtcNow;

        db.JobTransitions.Add(new JobTransition
        {
            JobId = jobId,
            FromStatus = fromStatus,
            ToStatus = toStatus,
            ChangedAtUtc = clock.UtcNow,
            Actor = actor,
            Notes = notes
        });

        string? suggestion = null;

        if (toStatus == JobStatus.Applied)
        {
            db.FollowUpTasks.Add(new FollowUpTask
            {
                JobId = jobId,
                Title = "Check application status",
                DueAtUtc = clock.UtcNow.AddDays(7),
                Status = FollowUpStatus.Pending,
                Priority = Priority.Medium
            });
        }
        else if (toStatus == JobStatus.Interviewing)
            suggestion = "Add first activity?";
        else if (toStatus == JobStatus.Offered)
            suggestion = "Add offer details";
        else if (toStatus == JobStatus.Rejected)
            suggestion = "Request feedback from recruiter";
        else if (toStatus == JobStatus.Ghosted)
            suggestion = "Send a final follow-up email";

        await db.SaveChangesAsync(ct);
        return new TransitionResult(toStatus, suggestion);
    }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```
dotnet test backend/tests/CareerOps.UnitTests/CareerOps.UnitTests.csproj --filter "FullyQualifiedName~JobWorkflowServiceTests"
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/CareerOps.Application/Jobs/JobWorkflowService.cs
git add backend/tests/CareerOps.UnitTests/Jobs/JobWorkflowServiceTests.cs
git commit -m "feat(app): JobWorkflowService with transition logic and unit tests"
```

---

### Task 10: JobActivityService + unit tests

**Files:**
- Create: `backend/src/CareerOps.Application/Jobs/JobActivityService.cs`
- Create: `backend/tests/CareerOps.UnitTests/Jobs/JobActivityServiceTests.cs`

**Interfaces:**
- Consumes: `IAppDbContext`, `IClock`, activity request types from Task 7
- Produces: `JobActivityService.AddActivity`, `UpdateActivity`, `DeleteActivity`, `CompleteActivity`

- [ ] **Step 1: Write failing tests**

```csharp
// backend/tests/CareerOps.UnitTests/Jobs/JobActivityServiceTests.cs
using CareerOps.Application.Jobs;
using CareerOps.Domain.Common;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Jobs;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Xunit;

namespace CareerOps.UnitTests.Jobs;

public sealed class JobActivityServiceTests
{
    private sealed class FixedClock(DateTime utcNow) : CareerOps.Application.Common.IClock
    {
        public DateTime UtcNow => utcNow;
        public DateOnly Today => DateOnly.FromDateTime(utcNow);
    }

    private static readonly InMemoryDatabaseRoot Root = new();

    private static CareerOpsDbContext Db(string name, FixedClock clock)
    {
        var opts = new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase(name, Root)
            .Options;
        return new CareerOpsDbContext(opts, clock);
    }

    private static async Task<(CareerOps.Domain.Companies.Company, Job)> Seed(CareerOpsDbContext db)
    {
        var company = new CareerOps.Domain.Companies.Company { Name = "Acme", CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow };
        db.Companies.Add(company);
        await db.SaveChangesAsync();
        var job = new Job { CompanyId = company.Id, Title = "Dev", Status = JobStatus.Interviewing, Priority = Priority.Medium, CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();
        return (company, job);
    }

    [Fact]
    public async Task CompleteActivity_SetsStatusCompleted()
    {
        var dbName = nameof(CompleteActivity_SetsStatusCompleted);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var (_, job) = await Seed(db);
        var activity = new JobActivity { JobId = job.Id, Label = "Round 1", Type = JobActivityType.Interview, Status = JobActivityStatus.Planned, Outcome = JobActivityOutcome.Unknown, CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow };
        db.JobActivities.Add(activity);
        await db.SaveChangesAsync();

        var svc = new JobActivityService(db, clock);
        await svc.CompleteActivityAsync(activity.Id, new CompleteActivityRequest(JobActivityOutcome.Passed, "Good", "Notes", false));

        await using var db2 = Db(dbName, clock);
        var updated = await db2.JobActivities.FindAsync(activity.Id);
        Assert.Equal(JobActivityStatus.Completed, updated!.Status);
        Assert.Equal(JobActivityOutcome.Passed, updated.Outcome);
        Assert.Equal("Good", updated.Feedback);
    }

    [Fact]
    public async Task CompleteActivity_WithCreateFollowUp_CreatesFollowUp()
    {
        var dbName = nameof(CompleteActivity_WithCreateFollowUp_CreatesFollowUp);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var (_, job) = await Seed(db);
        var activity = new JobActivity { JobId = job.Id, Label = "Round 1", Type = JobActivityType.Interview, Status = JobActivityStatus.Planned, Outcome = JobActivityOutcome.Unknown, CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow };
        db.JobActivities.Add(activity);
        await db.SaveChangesAsync();

        var svc = new JobActivityService(db, clock);
        await svc.CompleteActivityAsync(activity.Id, new CompleteActivityRequest(JobActivityOutcome.Passed, null, null, CreateFollowUp: true));

        await using var db2 = Db(dbName, clock);
        var followUp = await db2.FollowUpTasks.FirstOrDefaultAsync(f => f.JobActivityId == activity.Id);
        Assert.NotNull(followUp);
        Assert.Equal(job.Id, followUp!.JobId);
    }

    [Fact]
    public async Task DeleteActivity_NullifiesFollowUpJobActivityId_PreservesJobId()
    {
        var dbName = nameof(DeleteActivity_NullifiesFollowUpJobActivityId_PreservesJobId);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var (_, job) = await Seed(db);
        var activity = new JobActivity { JobId = job.Id, Label = "Round 1", Type = JobActivityType.Interview, Status = JobActivityStatus.Planned, Outcome = JobActivityOutcome.Unknown, CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow };
        db.JobActivities.Add(activity);
        await db.SaveChangesAsync();
        var followUp = new FollowUpTask { JobId = job.Id, JobActivityId = activity.Id, Title = "Thank you", DueAtUtc = DateTime.UtcNow.AddDays(1), Status = FollowUpStatus.Pending, Priority = Priority.Low, CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow };
        db.FollowUpTasks.Add(followUp);
        await db.SaveChangesAsync();

        var svc = new JobActivityService(db, clock);
        await svc.DeleteActivityAsync(activity.Id);

        await using var db2 = Db(dbName, clock);
        var fu = await db2.FollowUpTasks.FindAsync(followUp.Id);
        Assert.NotNull(fu);
        Assert.Null(fu!.JobActivityId);
        Assert.Equal(job.Id, fu.JobId);
    }
}
```

- [ ] **Step 2: Run — verify fail**

```
dotnet test backend/tests/CareerOps.UnitTests/CareerOps.UnitTests.csproj --filter "FullyQualifiedName~JobActivityServiceTests"
```

- [ ] **Step 3: Implement JobActivityService**

```csharp
// backend/src/CareerOps.Application/Jobs/JobActivityService.cs
using CareerOps.Application.Common;
using CareerOps.Domain.Common;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Jobs;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Jobs;

public sealed class JobActivityService(IAppDbContext db, IClock clock)
{
    public async Task<JobActivityDto?> AddActivityAsync(int jobId, CreateActivityRequest req, CancellationToken ct = default)
    {
        if (!await db.Jobs.AnyAsync(j => j.Id == jobId, ct)) return null;
        var activity = new JobActivity
        {
            JobId = jobId,
            Label = req.Label,
            Type = req.Type,
            Status = req.Status,
            Outcome = JobActivityOutcome.Unknown,
            ScheduledAtUtc = req.ScheduledAtUtc,
            DurationMinutes = req.DurationMinutes,
            ContactName = req.ContactName,
            ContactRole = req.ContactRole,
            MeetingUrl = req.MeetingUrl,
            PrepNotes = req.PrepNotes,
            Notes = req.Notes
        };
        db.JobActivities.Add(activity);
        await db.SaveChangesAsync(ct);
        return activity.Adapt<JobActivityDto>();
    }

    public async Task<JobActivityDto?> UpdateActivityAsync(int activityId, UpdateActivityRequest req, CancellationToken ct = default)
    {
        var activity = await db.JobActivities.FindAsync([activityId], ct);
        if (activity is null) return null;
        activity.Label = req.Label;
        activity.Type = req.Type;
        activity.Status = req.Status;
        activity.ScheduledAtUtc = req.ScheduledAtUtc;
        activity.DurationMinutes = req.DurationMinutes;
        activity.ContactName = req.ContactName;
        activity.ContactRole = req.ContactRole;
        activity.MeetingUrl = req.MeetingUrl;
        activity.PrepNotes = req.PrepNotes;
        activity.Notes = req.Notes;
        await db.SaveChangesAsync(ct);
        return activity.Adapt<JobActivityDto>();
    }

    public async Task<(JobActivityDto? Activity, string? Suggestion)> CompleteActivityAsync(
        int activityId,
        CompleteActivityRequest req,
        CancellationToken ct = default)
    {
        var activity = await db.JobActivities.FindAsync([activityId], ct);
        if (activity is null) return (null, null);

        activity.Status = JobActivityStatus.Completed;
        activity.Outcome = req.Outcome;
        activity.Feedback = req.Feedback;
        activity.Notes = req.Notes ?? activity.Notes;

        if (req.CreateFollowUp)
        {
            db.FollowUpTasks.Add(new FollowUpTask
            {
                JobId = activity.JobId,
                JobActivityId = activity.Id,
                Title = "Send thank you / follow-up",
                DueAtUtc = clock.UtcNow.AddDays(1),
                Status = FollowUpStatus.Pending,
                Priority = Priority.Medium
            });
        }

        await db.SaveChangesAsync(ct);
        return (activity.Adapt<JobActivityDto>(), "Great — log your notes while fresh");
    }

    public async Task<bool> DeleteActivityAsync(int activityId, CancellationToken ct = default)
    {
        var activity = await db.JobActivities.FindAsync([activityId], ct);
        if (activity is null) return false;

        // Nullify the activity link on follow-ups; preserve the Job link
        var linked = await db.FollowUpTasks
            .Where(f => f.JobActivityId == activityId)
            .ToListAsync(ct);
        foreach (var f in linked)
            f.JobActivityId = null;

        db.JobActivities.Remove(activity);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
```

Note: `Adapt<>` requires Mapster. Add `using Mapster;` at top.

- [ ] **Step 4: Run — verify pass**

```
dotnet test backend/tests/CareerOps.UnitTests/CareerOps.UnitTests.csproj --filter "FullyQualifiedName~JobActivityServiceTests"
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/CareerOps.Application/Jobs/JobActivityService.cs
git add backend/tests/CareerOps.UnitTests/Jobs/JobActivityServiceTests.cs
git commit -m "feat(app): JobActivityService with complete/delete logic and unit tests"
```

---

### Task 11: FollowUpTaskService rewrite + unit tests

**Files:**
- Modify: `backend/src/CareerOps.Application/FollowUpTasks/FollowUpTaskService.cs`
- Modify: `backend/tests/CareerOps.UnitTests/FollowUpTasks/FollowUpTaskServiceTests.cs`

**Interfaces:**
- Consumes: `IAppDbContext`, `IClock`, updated FollowUp request types from Task 7
- Produces: `FollowUpTaskService` — create, update, complete, skip, listDue, listByJob, listAll

- [ ] **Step 1: Rewrite FollowUpTaskService**

```csharp
// backend/src/CareerOps.Application/FollowUpTasks/FollowUpTaskService.cs
using CareerOps.Application.Common;
using CareerOps.Domain.FollowUpTasks;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.FollowUpTasks;

public sealed class FollowUpTaskService(IAppDbContext db, IClock clock)
{
    public async Task<FollowUpTaskDto> CreateAsync(CreateFollowUpTaskRequest req, CancellationToken ct = default)
    {
        if (req.JobActivityId.HasValue && !req.JobId.HasValue)
            throw new ArgumentException("JobId must be set when JobActivityId is set");

        var task = new FollowUpTask
        {
            JobId = req.JobId,
            JobActivityId = req.JobActivityId,
            Title = req.Title,
            Description = req.Description,
            DueAtUtc = req.DueAtUtc,
            Status = FollowUpStatus.Pending,
            Priority = req.Priority
        };
        db.FollowUpTasks.Add(task);
        await db.SaveChangesAsync(ct);
        return await LoadDto(task.Id, ct);
    }

    public async Task<FollowUpTaskDto?> UpdateAsync(int id, UpdateFollowUpTaskRequest req, CancellationToken ct = default)
    {
        if (req.JobActivityId.HasValue && !req.JobId.HasValue)
            throw new ArgumentException("JobId must be set when JobActivityId is set");

        var task = await db.FollowUpTasks.FindAsync([id], ct);
        if (task is null) return null;
        task.Title = req.Title;
        task.Description = req.Description;
        task.DueAtUtc = req.DueAtUtc;
        task.Priority = req.Priority;
        task.JobId = req.JobId;
        task.JobActivityId = req.JobActivityId;
        await db.SaveChangesAsync(ct);
        return await LoadDto(id, ct);
    }

    public async Task<bool> CompleteAsync(int id, CancellationToken ct = default)
    {
        var task = await db.FollowUpTasks.FindAsync([id], ct);
        if (task is null) return false;
        task.Status = FollowUpStatus.Completed;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> SkipAsync(int id, CancellationToken ct = default)
    {
        var task = await db.FollowUpTasks.FindAsync([id], ct);
        if (task is null) return false;
        task.Status = FollowUpStatus.Skipped;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<List<FollowUpTaskDto>> ListDueAsync(CancellationToken ct = default)
    {
        var today = clock.UtcNow.Date;
        var tasks = await db.FollowUpTasks
            .Include(f => f.Job)
            .Include(f => f.JobActivity)
            .Where(f => f.Status == FollowUpStatus.Pending && f.DueAtUtc <= today.AddDays(1))
            .OrderBy(f => f.DueAtUtc)
            .ToListAsync(ct);
        return tasks.Adapt<List<FollowUpTaskDto>>();
    }

    public async Task<List<FollowUpTaskDto>> ListByJobAsync(int jobId, CancellationToken ct = default)
    {
        var tasks = await db.FollowUpTasks
            .Include(f => f.Job)
            .Include(f => f.JobActivity)
            .Where(f => f.JobId == jobId)
            .OrderBy(f => f.DueAtUtc)
            .ToListAsync(ct);
        return tasks.Adapt<List<FollowUpTaskDto>>();
    }

    public async Task<List<FollowUpTaskDto>> ListAllAsync(FollowUpStatus? status = null, int? jobId = null, CancellationToken ct = default)
    {
        var q = db.FollowUpTasks
            .Include(f => f.Job)
            .Include(f => f.JobActivity)
            .AsQueryable();
        if (status.HasValue) q = q.Where(f => f.Status == status.Value);
        if (jobId.HasValue) q = q.Where(f => f.JobId == jobId.Value);
        return (await q.OrderBy(f => f.DueAtUtc).ToListAsync(ct)).Adapt<List<FollowUpTaskDto>>();
    }

    private async Task<FollowUpTaskDto> LoadDto(int id, CancellationToken ct)
    {
        var task = await db.FollowUpTasks
            .Include(f => f.Job)
            .Include(f => f.JobActivity)
            .FirstAsync(f => f.Id == id, ct);
        return task.Adapt<FollowUpTaskDto>();
    }
}
```

- [ ] **Step 2: Rewrite FollowUpTaskServiceTests**

```csharp
// backend/tests/CareerOps.UnitTests/FollowUpTasks/FollowUpTaskServiceTests.cs
using CareerOps.Application.FollowUpTasks;
using CareerOps.Domain.Common;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Xunit;

namespace CareerOps.UnitTests.FollowUpTasks;

public sealed class FollowUpTaskServiceTests
{
    private sealed class FixedClock(DateTime utcNow) : CareerOps.Application.Common.IClock
    {
        public DateTime UtcNow => utcNow;
        public DateOnly Today => DateOnly.FromDateTime(utcNow);
    }

    private static readonly InMemoryDatabaseRoot Root = new();

    private static CareerOpsDbContext Db(string name, FixedClock clock)
    {
        var opts = new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase(name, Root).Options;
        return new CareerOpsDbContext(opts, clock);
    }

    [Fact]
    public async Task Create_StandaloneTask_NoJobId()
    {
        var dbName = nameof(Create_StandaloneTask_NoJobId);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var svc = new FollowUpTaskService(db, clock);

        var dto = await svc.CreateAsync(new CreateFollowUpTaskRequest("Call recruiter", null, clock.UtcNow.AddDays(3), Priority.Low, null, null));

        Assert.Null(dto.JobId);
        Assert.Null(dto.JobActivityId);
    }

    [Fact]
    public async Task Create_WithActivityButNoJob_Throws()
    {
        var dbName = nameof(Create_WithActivityButNoJob_Throws);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var svc = new FollowUpTaskService(db, clock);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            svc.CreateAsync(new CreateFollowUpTaskRequest("Test", null, clock.UtcNow.AddDays(1), Priority.Low, JobId: null, JobActivityId: 99)));
    }

    [Fact]
    public async Task Complete_SetsStatusCompleted()
    {
        var dbName = nameof(Complete_SetsStatusCompleted);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var svc = new FollowUpTaskService(db, clock);
        var dto = await svc.CreateAsync(new CreateFollowUpTaskRequest("Test", null, clock.UtcNow.AddDays(1), Priority.Low, null, null));

        await svc.CompleteAsync(dto.Id);

        await using var db2 = Db(dbName, clock);
        var task = await db2.FollowUpTasks.FindAsync(dto.Id);
        Assert.Equal(FollowUpStatus.Completed, task!.Status);
    }
}
```

- [ ] **Step 3: Run — verify pass**

```
dotnet test backend/tests/CareerOps.UnitTests/CareerOps.UnitTests.csproj --filter "FullyQualifiedName~FollowUpTaskServiceTests"
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/CareerOps.Application/FollowUpTasks/
git add backend/tests/CareerOps.UnitTests/FollowUpTasks/
git commit -m "feat(app): rewrite FollowUpTaskService with direct Job/Activity FKs"
```

---

### Task 12: DashboardService rebuild + unit tests

**Files:**
- Modify: `backend/src/CareerOps.Application/Dashboard/DashboardDtos.cs`
- Modify: `backend/src/CareerOps.Application/Dashboard/DashboardService.cs`
- Modify: `backend/tests/CareerOps.UnitTests/Dashboard/DashboardServiceTests.cs`

**Interfaces:**
- Consumes: `IAppDbContext`, `IClock`, Job/FollowUpTask entities
- Produces: `DashboardService.GetSummaryAsync()` returning `DashboardSummaryDto`

- [ ] **Step 1: Rewrite DashboardDtos**

```csharp
// backend/src/CareerOps.Application/Dashboard/DashboardDtos.cs
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Dashboard;

public record DashboardSummaryDto(
    Dictionary<JobStatus, int> ActiveJobsByStatus,
    int FollowUpsDueToday,
    int OverdueFollowUps,
    List<UpcomingActivityDto> UpcomingActivities,
    List<StaleJobDto> StaleJobs,
    List<OfferDeadlineDto> OfferDeadlines,
    int? DaysUntilSearchDeadline
);

public record UpcomingActivityDto(
    int JobId,
    string JobTitle,
    string CompanyName,
    int ActivityId,
    string ActivityLabel,
    DateTime ScheduledAtUtc
);

public record StaleJobDto(
    int Id,
    string Title,
    string CompanyName,
    JobStatus Status,
    DateTime UpdatedAtUtc,
    DateTime? NextActionAtUtc
);

public record OfferDeadlineDto(
    int JobId,
    string Title,
    string CompanyName,
    DateTime OfferDeadlineAtUtc
);
```

- [ ] **Step 2: Write failing tests**

```csharp
// backend/tests/CareerOps.UnitTests/Dashboard/DashboardServiceTests.cs
using CareerOps.Application.Dashboard;
using CareerOps.Domain.Common;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Jobs;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Xunit;

namespace CareerOps.UnitTests.Dashboard;

public sealed class DashboardServiceTests
{
    private sealed class FixedClock(DateTime utcNow) : CareerOps.Application.Common.IClock
    {
        public DateTime UtcNow => utcNow;
        public DateOnly Today => DateOnly.FromDateTime(utcNow);
    }

    private static readonly InMemoryDatabaseRoot Root = new();

    private static CareerOpsDbContext Db(string name, FixedClock clock)
    {
        var opts = new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase(name, Root).Options;
        return new CareerOpsDbContext(opts, clock);
    }

    private static async Task<int> SeedCompany(CareerOpsDbContext db)
    {
        var c = new CareerOps.Domain.Companies.Company { Name = "Acme", CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow };
        db.Companies.Add(c);
        await db.SaveChangesAsync();
        return c.Id;
    }

    [Fact]
    public async Task StaleJob_NoUpdateIn7Days_NullNextAction_IsStale()
    {
        var dbName = nameof(StaleJob_NoUpdateIn7Days_NullNextAction_IsStale);
        var now = new DateTime(2026, 6, 25, 12, 0, 0, DateTimeKind.Utc);
        var clock = new FixedClock(now);
        await using var db = Db(dbName, clock);
        var companyId = await SeedCompany(db);
        var job = new Job
        {
            CompanyId = companyId,
            Title = "Old Job",
            Status = JobStatus.Applied,
            Priority = Priority.Medium,
            CreatedAtUtc = now.AddDays(-10),
            UpdatedAtUtc = now.AddDays(-8), // last updated 8 days ago
            NextActionAtUtc = null
        };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();

        var svc = new DashboardService(db, clock);
        var summary = await svc.GetSummaryAsync();

        Assert.Contains(summary.StaleJobs, s => s.Id == job.Id);
    }

    [Fact]
    public async Task StaleJob_OverdueNextAction_IsStale()
    {
        var dbName = nameof(StaleJob_OverdueNextAction_IsStale);
        var now = new DateTime(2026, 6, 25, 12, 0, 0, DateTimeKind.Utc);
        var clock = new FixedClock(now);
        await using var db = Db(dbName, clock);
        var companyId = await SeedCompany(db);
        var job = new Job
        {
            CompanyId = companyId,
            Title = "Overdue Job",
            Status = JobStatus.Interested,
            Priority = Priority.Medium,
            CreatedAtUtc = now.AddDays(-3),
            UpdatedAtUtc = now.AddDays(-1),
            NextActionAtUtc = now.AddDays(-2) // overdue
        };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();

        var svc = new DashboardService(db, clock);
        var summary = await svc.GetSummaryAsync();

        Assert.Contains(summary.StaleJobs, s => s.Id == job.Id);
    }

    [Fact]
    public async Task ClosedStatus_ExcludedFromActiveCountsAndStale()
    {
        var dbName = nameof(ClosedStatus_ExcludedFromActiveCountsAndStale);
        var now = new DateTime(2026, 6, 25, 12, 0, 0, DateTimeKind.Utc);
        var clock = new FixedClock(now);
        await using var db = Db(dbName, clock);
        var companyId = await SeedCompany(db);
        var rejected = new Job
        {
            CompanyId = companyId,
            Title = "Rejected",
            Status = JobStatus.Rejected,
            Priority = Priority.Low,
            CreatedAtUtc = now.AddDays(-20),
            UpdatedAtUtc = now.AddDays(-15),
            NextActionAtUtc = null
        };
        db.Jobs.Add(rejected);
        await db.SaveChangesAsync();

        var svc = new DashboardService(db, clock);
        var summary = await svc.GetSummaryAsync();

        Assert.DoesNotContain(summary.StaleJobs, s => s.Id == rejected.Id);
        Assert.False(summary.ActiveJobsByStatus.ContainsKey(JobStatus.Rejected));
    }
}
```

- [ ] **Step 3: Implement DashboardService**

```csharp
// backend/src/CareerOps.Application/Dashboard/DashboardService.cs
using CareerOps.Application.Common;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Jobs;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Dashboard;

public sealed class DashboardService(IAppDbContext db, IClock clock)
{
    private static readonly JobStatus[] ActiveStatuses =
    [
        JobStatus.Discovered, JobStatus.Interested, JobStatus.Applied,
        JobStatus.Interviewing, JobStatus.Offered
    ];

    public async Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken ct = default)
    {
        var now = clock.UtcNow;
        var staleThreshold = now.AddDays(-7);
        var sevenDaysAhead = now.AddDays(7);

        var activeJobs = await db.Jobs
            .Include(j => j.Company)
            .Where(j => ActiveStatuses.Contains(j.Status))
            .ToListAsync(ct);

        var activeByStatus = activeJobs
            .GroupBy(j => j.Status)
            .ToDictionary(g => g.Key, g => g.Count());

        var staleJobs = activeJobs
            .Where(j =>
                (j.UpdatedAtUtc < staleThreshold && j.NextActionAtUtc == null) ||
                (j.NextActionAtUtc.HasValue && j.NextActionAtUtc < now))
            .Select(j => new StaleJobDto(j.Id, j.Title, j.Company!.Name, j.Status, j.UpdatedAtUtc, j.NextActionAtUtc))
            .ToList();

        var todayEnd = now.Date.AddDays(1);
        var dueToday = await db.FollowUpTasks
            .CountAsync(f => f.Status == FollowUpStatus.Pending && f.DueAtUtc >= now.Date && f.DueAtUtc < todayEnd, ct);
        var overdue = await db.FollowUpTasks
            .CountAsync(f => f.Status == FollowUpStatus.Pending && f.DueAtUtc < now.Date, ct);

        var upcoming = await db.JobActivities
            .Include(a => a.Job).ThenInclude(j => j!.Company)
            .Where(a => a.Status == JobActivityStatus.Scheduled && a.ScheduledAtUtc >= now && a.ScheduledAtUtc <= sevenDaysAhead)
            .OrderBy(a => a.ScheduledAtUtc)
            .Select(a => new UpcomingActivityDto(a.JobId, a.Job!.Title, a.Job.Company!.Name, a.Id, a.Label, a.ScheduledAtUtc!.Value))
            .ToListAsync(ct);

        var offerDeadlines = await db.Jobs
            .Include(j => j.Company)
            .Where(j => j.Status == JobStatus.Offered && j.OfferDeadlineAtUtc.HasValue && j.OfferDeadlineAtUtc > now)
            .OrderBy(j => j.OfferDeadlineAtUtc)
            .Select(j => new OfferDeadlineDto(j.Id, j.Title, j.Company!.Name, j.OfferDeadlineAtUtc!.Value))
            .ToListAsync(ct);

        var profile = await db.UserProfiles.FirstOrDefaultAsync(ct);
        int? daysUntilDeadline = profile?.SearchDeadlineUtc.HasValue == true
            ? (int?)(profile.SearchDeadlineUtc!.Value - now).TotalDays
            : null;

        return new DashboardSummaryDto(activeByStatus, dueToday, overdue, upcoming, staleJobs, offerDeadlines, daysUntilDeadline);
    }
}
```

- [ ] **Step 4: Run — verify pass**

```
dotnet test backend/tests/CareerOps.UnitTests/CareerOps.UnitTests.csproj --filter "FullyQualifiedName~DashboardServiceTests"
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/CareerOps.Application/Dashboard/
git add backend/tests/CareerOps.UnitTests/Dashboard/
git commit -m "feat(app): rebuild DashboardService on job-centric model with stale rule tests"
```

---

### Task 13: CompanyService update + DI

**Files:**
- Modify: `backend/src/CareerOps.Application/Companies/CompanyService.cs`
- Modify: `backend/src/CareerOps.Application/DependencyInjection.cs`

**Interfaces:**
- Produces: `CompanyService.FindOrCreateByNameAsync`, delete blocked with 409 data; updated DI registrations

- [ ] **Step 1: Add FindOrCreateByName and jobs-exist guard to CompanyService**

In `CompanyService.cs`, add:

```csharp
public async Task<CompanyDto> FindOrCreateByNameAsync(string name, CancellationToken ct = default)
{
    var normalized = name.Trim().ToLowerInvariant();
    var existing = await db.Companies
        .FirstOrDefaultAsync(c => c.Name.ToLower() == normalized, ct);
    if (existing is not null) return existing.Adapt<CompanyDto>();

    var company = new Company { Name = name.Trim() };
    db.Companies.Add(company);
    await db.SaveChangesAsync(ct);
    return company.Adapt<CompanyDto>();
}

public async Task<bool> HasJobsAsync(int companyId, CancellationToken ct = default)
    => await db.Jobs.AnyAsync(j => j.CompanyId == companyId, ct);
```

- [ ] **Step 2: Update DependencyInjection.cs — remove old services, register new**

```csharp
// backend/src/CareerOps.Application/DependencyInjection.cs
using System.Reflection;
using CareerOps.Application.Companies;
using CareerOps.Application.Dashboard;
using CareerOps.Application.FollowUpTasks;
using CareerOps.Application.Jobs;
using CareerOps.Application.Settings;
using FluentValidation;
using Mapster;
using Microsoft.Extensions.DependencyInjection;

namespace CareerOps.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();
        TypeAdapterConfig.GlobalSettings.Scan(assembly);
        services.AddValidatorsFromAssembly(assembly);

        services.AddScoped<JobService>();
        services.AddScoped<JobWorkflowService>();
        services.AddScoped<JobActivityService>();
        services.AddScoped<FollowUpTaskService>();
        services.AddScoped<DashboardService>();
        services.AddScoped<CompanyService>();
        services.AddScoped<UserProfileService>();
        return services;
    }
}
```

- [ ] **Step 3: Run full build to verify no broken references**

```
dotnet build backend/CareerOps.slnx
```

Expected: `Build succeeded.` Fix any remaining compile errors from old using directives before continuing.

- [ ] **Step 4: Commit**

```bash
git add backend/src/CareerOps.Application/
git commit -m "feat(app): update CompanyService find-or-create, rebuild DI registrations"
```

---

### Task 14: Phase 2 quality gate

**Interfaces:**
- Consumes: all tasks above
- Produces: `just verify` passes — build + all tests + frontend typecheck + frontend build

- [ ] **Step 1: Run full verify**

```
just verify
```

Expected: `Build succeeded`, all tests pass, frontend typecheck succeeds, frontend build succeeds.

If frontend fails due to old imports referencing deleted endpoints, that's expected — note the errors but do not fix frontend here (Phase 4). The backend must build and test clean.

- [ ] **Step 2: Fix any backend compile errors**

Common issues:
- Leftover `using` directives referencing deleted namespaces
- Old endpoint files in Presentation still referencing deleted Application services — leave those for Phase 3 (they'll be deleted then)
- `FollowUpTaskMappingConfig.cs` may reference old FK fields — update to use `JobId`/`JobActivityId`

- [ ] **Step 3: Run backend-only verify**

```
dotnet build backend/CareerOps.slnx && dotnet test backend/CareerOps.slnx
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(phase2): backend domain V2 complete — all tests passing"
```

---

*Phase 2 complete. Proceed to `docs/superpowers/plans/2026-06-25-domain-v2-phase3-api-mcp.md`.*
