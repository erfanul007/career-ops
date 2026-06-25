# CareerOps Domain V2 — Design Spec

**Date:** 2026-06-25  
**Status:** Approved — ready for implementation planning  
**Phases:** 5 (sequential, executed in one go)  
**DB:** PostgreSQL 17 (Docker Compose) — destructive reset, no data preservation

---

## 1. Architecture Overview

### What gets replaced

| Old | New |
|---|---|
| `JobLead` + `Application` entities | `Job` aggregate |
| Top-level `Interview` entity | `JobActivity` child of `Job` |
| Polymorphic `FollowUpTask` (`RelatedEntityType` + `RelatedEntityId`) | Direct FK: `FollowUpTask → Job` (optional `→ JobActivity`) |
| `ResumeVariant` first-class entity/page | `Job.ResumeLabel/Angle/CoverLetterNotes` + `JobAttachment` |
| `JobLeadService` + `ApplicationService` + `InterviewService` | `JobService` + `JobWorkflowService` + `JobActivityService` + refactored `FollowUpTaskService` |
| `/api/job-leads` + `/api/applications` + `/api/interviews` | `/api/jobs` + sub-resources |
| 44 REST-parity MCP tools | Small workflow-parity MCP surface (~24 tools) |
| Job Leads + Applications + Interviews pages | Unified Jobs page: Jira-style board + table |
| V1 migrations | V1 migrations removed; single V2 destructive initial migration |

### What stays

- `Company`, `UserProfile`, base `AuditableEntity`, `IClock`
- `FollowUpTask` concept — restructured with direct Job/JobActivity FKs
- Dashboard concept — rebuilt on job-centric read model
- Clean Architecture layer structure: Domain → Application → Infrastructure → Presentation
- PostgreSQL + Docker Compose, EF Core code-first, Minimal APIs
- React + TypeScript + Vite + shadcn/ui, orval client generation
- `@dnd-kit/core` (already installed)

### New additions

- `JobTransition` — immutable status audit trail
- `JobProperty` — flexible KV metadata for agent/user extension (unique index on `JobId + Key`)
- `JobAttachment` — job-scoped resume, cover letter, JD, email, screenshot, URL/path notes (metadata only — no file upload in V2)
- `@dnd-kit/sortable` — board DnD (new package; `@dnd-kit/core` already present)

### Execution strategy

Sequential phases (A → B → C → D → E). Each phase ends with `just verify` before the next starts. Orval client regenerates once after Phase 3 (API stable), before Phase 4 (frontend).

---

## 2. Backend Domain Model

### Entities

#### `Job` — main aggregate

Replaces `JobLead` + `Application`.

```csharp
public sealed class Job : AuditableEntity
{
    public int Id { get; set; }

    // Company
    public int CompanyId { get; set; }
    public Company? Company { get; set; }

    // Core
    public string Title { get; set; } = "";
    public JobStatus Status { get; set; }
    public Priority Priority { get; set; }

    // Source
    public JobSource Source { get; set; }
    public string? SourceUrl { get; set; }
    public string? JobDescription { get; set; }

    // Location
    public string? Country { get; set; }
    public string? City { get; set; }
    public string? LocationText { get; set; }
    public RemoteMode RemoteMode { get; set; }
    public EmploymentType EmploymentType { get; set; }

    // Salary
    public decimal? SalaryMin { get; set; }
    public decimal? SalaryMax { get; set; }
    public string? SalaryCurrency { get; set; }
    public SalaryPeriod SalaryPeriod { get; set; }

    // Key dates
    public DateTime? DeadlineAtUtc { get; set; }
    public DateTime? AppliedAtUtc { get; set; }
    public DateTime? LastContactedAtUtc { get; set; }
    public DateTime? NextActionAtUtc { get; set; }

    // Candidate strategy
    public int? FitScore { get; set; }
    public string? ResumeLabel { get; set; }
    public string? ResumeAngle { get; set; }
    public string? CoverLetterNotes { get; set; }

    // Offer
    public decimal? OfferSalary { get; set; }
    public string? OfferCurrency { get; set; }
    public DateTime? OfferDeadlineAtUtc { get; set; }
    public string? OfferNotes { get; set; }

    // Exit
    public string? RejectionReason { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public List<JobActivity> Activities { get; set; } = [];
    public List<JobTransition> Transitions { get; set; } = [];
    public List<FollowUpTask> FollowUps { get; set; } = [];
    public List<JobProperty> Properties { get; set; } = [];
    public List<JobAttachment> Attachments { get; set; } = [];
}
```

#### `JobStatus` enum (pinned int values — never reorder)

```csharp
public enum JobStatus
{
    Discovered  = 0,
    Interested  = 1,
    Applied     = 2,
    Interviewing = 3,
    Offered     = 4,
    Rejected    = 5,
    Ghosted     = 6,
    Withdrawn   = 7,
    Archived    = 8
}
```

Active statuses: `Discovered, Interested, Applied, Interviewing, Offered`  
Closed statuses: `Rejected, Ghosted, Withdrawn, Archived`

#### `JobTransition` — immutable append-only

```csharp
public sealed class JobTransition
{
    public int Id { get; set; }
    public int JobId { get; set; }

    public JobStatus? FromStatus { get; set; }
    public JobStatus ToStatus { get; set; }

    public DateTime ChangedAtUtc { get; set; }
    public TransitionActor Actor { get; set; }
    public string? Notes { get; set; }
}

public enum TransitionActor
{
    User   = 0,
    Agent  = 1,
    System = 2
}
```

#### `JobActivity` — child of `Job`, replaces top-level `Interview`

```csharp
public sealed class JobActivity : AuditableEntity
{
    public int Id { get; set; }
    public int JobId { get; set; }

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
}

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

public enum JobActivityStatus
{
    Planned   = 0,
    Scheduled = 1,
    Completed = 2,
    Cancelled = 3
}

public enum JobActivityOutcome
{
    Unknown = 0,
    Waiting = 1,
    Passed  = 2,
    Failed  = 3
}
```

#### `FollowUpTask` — refactored (direct FKs, no polymorphic)

```csharp
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

FK rules:
- Standalone: `JobId = null`, `JobActivityId = null`
- Job task: `JobId` set, `JobActivityId = null`
- Activity task: **both** `JobId` and `JobActivityId` set (never set `JobActivityId` without `JobId`)

#### `JobProperty` — KV metadata extension

```csharp
public sealed class JobProperty
{
    public int Id { get; set; }
    public int JobId { get; set; }

    public string Key { get; set; } = "";
    public string? Value { get; set; }
    public JobPropertyValueType ValueType { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
```

Unique index on `(JobId, Key)`. Upsert semantics — never duplicate.

#### `JobAttachment` — job-scoped materials (metadata only)

```csharp
public sealed class JobAttachment : AuditableEntity
{
    public int Id { get; set; }
    public int JobId { get; set; }

    public JobAttachmentType Type { get; set; }
    public string Title { get; set; } = "";

    public string? FileName { get; set; }
    public string? Url { get; set; }
    public string? StoragePath { get; set; }  // nullable; no upload service in V2
    public string? Notes { get; set; }
}

public enum JobAttachmentType
{
    Resume       = 0,
    CoverLetter  = 1,
    JobDescription = 2,
    Email        = 3,
    Screenshot   = 4,
    Other        = 5
}
```

No multipart upload, no download endpoint, no storage service in V2.

### Dropped entities and enums

Entities: `JobLead`, `Application`, `Interview`, `ResumeVariant`  
Enums: `JobLeadStatus`, `ApplicationStage`, `ApplicationStatus`, `InterviewRoundType`, `InterviewStatus`, `InterviewOutcome`, `RelatedEntityType`

### Kept unchanged

`Company`, `UserProfile`, `AuditableEntity`, `IClock`

---

## 3. Backend Services

### `JobService` — Job CRUD and job-scoped data

- `CreateJob`, `UpdateJob`, `GetJob`, `DeleteJob`, `ArchiveJob`
- `ListJobs` — filters: status[], source, remoteMode, employmentType, country, priority, salary range, applied date range; search: title, company name, source URL, notes
- `AddAttachment`, `UpdateAttachment`, `DeleteAttachment`
- `UpsertProperty` (idempotent by key), `DeleteProperty`

### `JobWorkflowService` — status transitions + workflow side effects

Single method: `TransitionJob(jobId, toStatus, notes?, actor, context?)`

Responsibilities (in order):
1. Load job — throw if not found
2. Validate: valid enum value, handle same-status as no-op
3. Update `Job.Status`
4. Set date fields where applicable (e.g. `AppliedAtUtc` only if currently null)
5. Append immutable `JobTransition` row
6. Create default `FollowUpTask` where strongly useful (per trigger table below)
7. Return `TransitionResult` with optional UI suggestion

No state machine. No configurable transition matrix. No blocked transitions. `Archived` is not auto-overwritten by system side effects.

**Default trigger table:**

| Transition | Side effect |
|---|---|
| → `Applied` | Set `AppliedAtUtc` if null; create follow-up: "Check status in 7 days" |
| → `Interviewing` | Return suggestion: "Add first activity?" — do not force |
| → `Offered` | Return suggestion: "Add offer details" |
| → `Rejected` | Return suggestion: "Request feedback" |
| → `Ghosted` | Return suggestion: "Send final follow-up" |
| All others | No auto-action |

### `JobActivityService` — child activity operations

- `AddActivity`, `UpdateActivity`, `DeleteActivity`
- `CompleteActivity(activityId, outcome, feedback, notes, createFollowUp)` — sets `Status = Completed`; if `createFollowUp = true`, creates "Send thank you" follow-up; returns optional suggestion
- On `DeleteActivity`: nullify `FollowUpTask.JobActivityId` (keep `JobId`), do not cascade-delete follow-ups

### `FollowUpTaskService` — refactored

- `CreateFollowUp`, `UpdateFollowUp`, `CompleteFollowUp`, `SkipFollowUp`
- `ListDue` — due today + overdue
- `ListByJob(jobId)`, `ListAll(filters)`
- Standalone task support (null `JobId`)
- FK invariant: if `JobActivityId` set, `JobId` must also be set

### `DashboardService` — job-centric read model

`GetSummary()` returns:
- Active job count by status
- Follow-ups due today
- Overdue follow-ups
- Upcoming activities (next 7 days)
- High-priority active jobs
- Stale jobs (active status + no update in 7 days and `NextActionAtUtc` is null, OR `NextActionAtUtc` is overdue)
- Offer deadlines
- Search deadline countdown (from `UserProfile`)

### `CompanyService` — minor update

- Add inline-create-by-name: find or create by normalized name
- Block delete with 409 if company has associated jobs

### `UserProfileService` — no changes

### Dropped services

`JobLeadService`, `ApplicationService`, `InterviewService`, `ResumeVariantService`

### Architecture rules

No generic repositories. No MediatR. No domain events framework. No strategy pattern for transitions. Direct EF Core via `IAppDbContext`. Inject `IClock`; never call `DateTime.UtcNow` in app/domain code.

---

## 4. API Surface

Enums serialized as readable strings in JSON (e.g. `"Applied"` not `2`). Stored as pinned ints in PostgreSQL. OpenAPI spec drives orval client generation.

### Jobs

```
GET    /api/jobs                              # list + filters + search
GET    /api/jobs/{id}                         # full detail: job + activities + followUps + attachments + properties
POST   /api/jobs
PUT    /api/jobs/{id}
DELETE /api/jobs/{id}                         # hard delete; UI prefers transition to Archived
POST   /api/jobs/{id}/transition              # { toStatus, notes? }
GET    /api/jobs/{id}/timeline                # chronological read model
```

`GET /api/jobs/{id}` returns full job detail shape including child collections. No separate child GET endpoints needed for MVP.

### Activities

```
POST   /api/jobs/{id}/activities
PUT    /api/jobs/{id}/activities/{activityId}
DELETE /api/jobs/{id}/activities/{activityId}
POST   /api/jobs/{id}/activities/{activityId}/complete
```

### Follow-ups

```
GET    /api/follow-up-tasks                   # filters: status, jobId, due
POST   /api/jobs/{id}/follow-ups              # job-scoped creation
PUT    /api/follow-up-tasks/{id}
POST   /api/follow-up-tasks/{id}/complete
POST   /api/follow-up-tasks/{id}/skip
```

### Attachments + Properties

```
POST   /api/jobs/{id}/attachments             # JSON metadata only — no file upload
PUT    /api/jobs/{id}/attachments/{attachmentId}
DELETE /api/jobs/{id}/attachments/{attachmentId}

PUT    /api/jobs/{id}/properties/{key}        # idempotent upsert
DELETE /api/jobs/{id}/properties/{key}
```

### Other

```
GET    /api/dashboard/summary

GET    /api/companies
POST   /api/companies
PUT    /api/companies/{id}
DELETE /api/companies/{id}                    # 409 Conflict if company has jobs

GET    /api/settings/profile
PUT    /api/settings/profile
```

**Removed:** `/api/job-leads`, `/api/applications`, `/api/interviews`, `/api/resume-variants`

**Total:** ~28–30 endpoints

---

## 5. MCP Tools (~24 tools)

Tools delegate to application services. No business logic in tool handlers. Enums as strings. MCP handler sets `actor = Agent` internally — not exposed as input.

### Dashboard / Profile (3)

```
get_dashboard_summary
get_user_profile
update_user_profile
```

### Jobs (7)

```
list_jobs           # filters: status[], source, remoteMode, priority, country; search: title/company/notes
get_job             # full detail including activities, follow-ups, properties, attachments
create_job
update_job
transition_job      # jobId, toStatus, notes? — actor=Agent set internally
archive_job         # shorthand: transition to Archived
get_job_timeline    # chronological feed: transitions + activities + follow-ups
```

### Activities (3)

```
add_job_activity
update_job_activity
complete_job_activity   # outcome, feedback, notes; createFollowUp?
```

### Follow-ups (4)

```
list_follow_ups         # filters: due=today|overdue|all, status, jobId
add_follow_up
complete_follow_up
skip_follow_up
```

### Companies (2)

```
list_companies
upsert_company          # find-or-create by normalized name; update only non-null fields
```

### Attachments / Properties (5)

```
upsert_job_attachment   # create or update by id
remove_job_attachment
upsert_job_property     # idempotent by (jobId, key)
remove_job_property
```

**Total: 24 tools**

No hard-delete tools for core records (Job, Company, Activity, FollowUp). Use archive/status transitions instead. Metadata cleanup tools (`remove_job_property`, `remove_job_attachment`) are acceptable — these are not core workflow records.

---

## 6. Frontend Architecture

### Navigation

```
Dashboard  /
Jobs       /jobs
Tasks      /tasks
Companies  /companies
Settings   /settings/profile
```

Removed routes: `/job-leads`, `/applications`, `/interviews`, `/resume-variants`

### Jobs page — primary workspace

Two views: Board (default) + Table, toggled via tab/button.

**Board view:**
- Kanban columns by `JobStatus`
- Default: show Discovered, Interested, Applied, Interviewing, Offered
- Hidden by default (toggle): Rejected, Ghosted, Withdrawn, Archived
- DnD via `@dnd-kit/sortable` — implementation order: board columns → status dropdown → optimistic update → DnD last
- Drop triggers `POST /api/jobs/{id}/transition` + optimistic card move + rollback on failure
- Same-column drop = no-op
- Transition result suggestions shown as toast/action card (no forced modal)

**Table view:** sortable, filterable list

**Search:** title, company name, source/sourceUrl, notes  
**Filters:** status multi-select, country, remoteMode, employmentType, source, company, priority, salary range, applied date range  
**Quick-add fields:** company name, title, source, sourceUrl, priority — `Status` defaults to `Discovered`

### Job card content

- Company + title
- Priority badge + fit score (if set)
- Country / remote mode
- Salary hint (if set)
- Next action date (highlighted if overdue)
- For `Interviewing`: current activity label + date + outcome (e.g. `Current: Technical 1 · Jan 28 · Waiting`)

### Job detail — side drawer

`GET /api/jobs/{id}` loads full detail on open.

Sections (scrollable):
1. **Header** — title, company, status badge, priority
2. **Actions** — transition button, add activity, add follow-up
3. **Overview** — source, location, salary, dates, candidate strategy fields, offer fields
4. **Timeline** — chronological feed from `GET /api/jobs/{id}/timeline`
5. **Activities** — list + add/edit/complete
6. **Follow-ups** — list + add/complete/skip
7. **Attachments** — metadata list + add/edit/remove (no file upload)
8. **Agent Notes / Metadata** — KV property table, collapsed by default

### Other pages

- **Dashboard** — keep widget layout, rebuild queries on job-centric data
- **Tasks** — `GET /api/follow-up-tasks`, show job link, complete/skip actions
- **Companies** — keep existing table + detail sheet, handle 409 on delete

### Libraries

- `@dnd-kit/sortable` — new (core already installed)
- All other deps unchanged: shadcn/ui, tanstack-query, react-hook-form, zod, orval

### Client generation

Run `just gen-client` after Phase 3 (API stable) before Phase 4 (frontend build). All TypeScript types regenerated from OpenAPI spec.

---

## 7. Migration Strategy

1. Delete all files in `backend/src/CareerOps.Infrastructure/Persistence/Migrations/`
2. Run `just db-reset` — wipes Docker volume, starts clean Postgres container
3. Remove old entity configurations: `ApplicationConfiguration`, `JobLeadConfiguration`, `InterviewConfiguration`, `ResumeVariantConfiguration`
4. Remove old `DbSet`s from `IAppDbContext` / `AppDbContext`: `JobLeads`, `Applications`, `Interviews`, `ResumeVariants`
5. Add new EF Core configurations: `JobConfiguration` (indexes, FK relationships, delete behaviors, required/max-length constraints), `JobTransitionConfiguration`, `JobActivityConfiguration`, `JobPropertyConfiguration` (unique index on `JobId + Key`), `JobAttachmentConfiguration`, updated `FollowUpTaskConfiguration`
6. Add new `DbSet`s: `Jobs`, `JobTransitions`, `JobActivities`, `JobProperties`, `JobAttachments`
7. Run `just migrate DomainV2` — generates single clean V2 initial migration
8. Apply: `dotnet ef database update` or `just up`

No data preservation. No rollback path. Clean break.

---

## 8. Test Strategy

### Backend unit tests — new/updated

**`JobWorkflowServiceTests`:**
- `→ Applied` sets `AppliedAtUtc` if null; skips if already set
- `→ Applied` creates follow-up "Check status in 7 days"
- Every transition appends a `JobTransition` row
- `Archived` not auto-overwritten by system side effects
- Same-status transition handled as no-op
- Provided actor stored correctly on transition row

**`DashboardServiceTests`:**
- Stale job rule: active status + no update in 7 days + null `NextActionAtUtc` = stale
- Stale job rule: overdue `NextActionAtUtc` = stale
- Closed statuses excluded from stale and active counts

**`JobActivityServiceTests`:**
- `CompleteActivity` sets `Status = Completed`, stores outcome/feedback/notes
- `CompleteActivity` returns suggestion; creates follow-up only when `createFollowUp = true`
- `DeleteActivity` nullifies `FollowUpTask.JobActivityId` while preserving `JobId`

**Removed (stale):** `JobLeadServiceTests`, `ApplicationServiceTests`, `InterviewServiceTests`, `ResumeVariantServiceTests`

### Backend integration tests — new/updated

**`JobEndpointTests`:** CRUD, transition, timeline endpoint  
**`FollowUpTaskEndpointTests`:** create, complete, skip, list with filters  
**`CompanyEndpointTests`:** 409 on delete when jobs exist  
**MCP / integration:** `transition_job` sets `actor = Agent` internally

**Removed (stale):** old job-lead, application, interview, resume-variant endpoint tests

### Frontend

- TypeScript typecheck + build as primary gate (`just verify`)
- No new frontend test files for MVP unless a component has non-trivial logic
- Type safety from orval-generated client is the main correctness layer

### Quality gate

Each phase ends with `just verify` (dotnet build + dotnet test + frontend typecheck + frontend build) before starting the next phase.

---

## 9. Phase Execution Summary

| Phase | Scope | Gate |
|---|---|---|
| **Phase 2** | Backend domain refactor — entities, enums, services, EF Core, migration | `just verify` |
| **Phase 3** | API + MCP reshape — endpoints, MCP tools, orval client regeneration | `just verify` |
| **Phase 4** | Frontend clean rewrite — Jobs page, board, detail drawer, routing | `just verify` |
| **Phase 5** | Timeline + polish — timeline read model, filters, board card polish, empty/error states | `just verify` |

Phase 1 (doc + lock) is already complete — this spec and `07-domain-redesign-v2.md` serve as the locked direction.

---

## 10. Decisions Locked by This Spec

- `Job` is the single lifecycle entity — no "convert to application" step
- Free-form transitions — no state machine, no blocked transitions, no configurable rules
- `Archived` is user-driven visibility — not auto-overwritten
- DB wiped cleanly — no migration path from V1 data
- No in-app AI provider — external agents via MCP only
- No ResumeVariant as first-class module
- No file upload/storage in V2
- No Angular migration
- MCP is workflow-parity (~24 tools), not REST-parity
- Enums serialized as strings in JSON, stored as pinned ints in DB
- `@dnd-kit/sortable` for board DnD; status dropdown transitions first
