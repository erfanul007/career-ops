# CareerOps Domain Redesign V2

## Purpose

This document locks the next product direction for CareerOps: a simple, job-centric personal job-search tracker optimized for immediate usefulness, external-agent workflows, and long-term maintainability.

CareerOps is not a SaaS product, workflow engine, resume-management platform, ATS clone, or in-app AI product. It is a single-user system of record for managing a real job search with a clean UI and an MCP surface that lets external agents read and update the workflow safely.

The highest-ROI redesign is to collapse the current `JobLead` + `Application` + `Interview` split into one lifecycle-centered domain: `Job`.

---

## Core Goals

1. **One job, one lifecycle**
   - A job starts as discovered/interested.
   - The same job can later become applied, interviewing, offered, rejected, ghosted, withdrawn, or archived.
   - The user should never need a separate “convert to application” mental model.

2. **One primary UX surface**
   - Replace separate Job Leads, Applications, and Interviews pages with a unified **Jobs** page.
   - Board view and table view are both useful; keep both.
   - Job detail shows timeline, activities, follow-ups, notes, metadata, and attachments.

3. **Workflow-first, not CRUD-first**
   - The product should help answer: “What should I do next?”
   - Follow-ups, stale jobs, upcoming activities, and active opportunities are more important than admin-style resource management.

4. **MCP workflow parity, not REST parity**
   - The MCP server should expose safe, agent-friendly workflow tools.
   - It does not need one tool for every REST endpoint.
   - Agents should manage the job-search workflow, not perform arbitrary raw CRUD.

5. **External agents own AI reasoning**
   - No in-app AI provider.
   - No OpenAI/Anthropic key management in CareerOps.
   - Claude Code, ChatGPT, Codex, or other MCP-capable agents read/write CareerOps data through MCP.
   - CareerOps stores user/agent-produced outputs as plain data, notes, properties, or attachments.

6. **Max ROI over completeness**
   - Push out anything that does not immediately improve job-search execution.
   - Prefer simple fixed fields when they power filtering, sorting, grouping, or dashboard decisions.
   - Use flexible metadata only as an extension point.

---

## Non-Goals

Do not build these now:

- Authentication or multi-user support.
- Public SaaS deployment.
- Configurable workflow engine.
- Custom workflow designer.
- Calendar/email integration.
- LinkedIn scraping or browser extension.
- File storage pipeline unless truly needed.
- Resume builder.
- Full resume management module.
- In-app LLM provider integration.
- RAG/vector database.
- Background job infrastructure.
- Generic repositories, MediatR, CQRS ceremony, or domain-event framework.
- Full snapshot audit log.
- REST-parity MCP tool explosion.
- Angular migration unless the explicit goal becomes Angular portfolio value.

---

## Current Problem

The existing domain splits one real-world concept into multiple top-level concepts:

- `JobLead` = opportunity before application.
- `Application` = submitted version of the same opportunity.
- `Interview` = activity inside the same opportunity.

This creates unnecessary friction:

- Separate pages for one lifecycle.
- Forced “convert to application” step.
- Interview data separated from the job context.
- Follow-up tasks linked through loose polymorphic references.
- Dashboard and MCP logic need cross-resource coordination.
- Agents need too many tools for what is conceptually one workflow.

The redesign removes this split.

---

## Target Domain Model

### 1. Job

`Job` is the main aggregate and replaces `JobLead` + `Application`.

A Job represents one opportunity across its full lifecycle.

Suggested fields:

```csharp
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

### 2. JobStatus

Pin integer values and never reorder.

```csharp
public enum JobStatus
{
    Discovered = 0,
    Interested = 1,
    Applied = 2,
    Interviewing = 3,
    Offered = 4,
    Rejected = 5,
    Ghosted = 6,
    Withdrawn = 7,
    Archived = 8
}
```

Terminal states:

- `Rejected`
- `Ghosted`
- `Withdrawn`
- `Archived`

`Archived` is a user-driven visibility state. Do not auto-overwrite it from workflow triggers.

### 3. JobTransition

Immutable audit log of status changes.

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
```

Do not store full job snapshots now. The transition log only needs status movement, time, actor, and notes.

### 4. JobActivity

Dynamic child record under a Job. This replaces top-level `Interview`.

Used for:

- recruiter screening
- technical interview
- system design round
- behavioral round
- take-home assignment
- assessment
- offer discussion
- custom rounds

```csharp
public sealed class JobActivity : AuditableEntity
{
    public int Id { get; set; }
    public int JobId { get; set; }

    public string Label { get; set; } = ""; // e.g. "Technical 1"
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
```

Suggested enums:

```csharp
public enum JobActivityType
{
    Screening = 0,
    Interview = 1,
    Technical = 2,
    SystemDesign = 3,
    Behavioral = 4,
    TakeHome = 5,
    Assessment = 6,
    OfferDiscussion = 7,
    Other = 8
}

public enum JobActivityStatus
{
    Planned = 0,
    Scheduled = 1,
    Completed = 2,
    Cancelled = 3
}

public enum JobActivityOutcome
{
    Unknown = 0,
    Waiting = 1,
    Passed = 2,
    Failed = 3
}
```

Do not add `JobActivityProperty` now. Notes and structured fields are enough for MVP.

### 5. FollowUpTask

A follow-up belongs directly to a Job.

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

Remove the polymorphic `RelatedEntityType + RelatedEntityId` pattern.

A task may be:

- linked to a Job,
- linked to a JobActivity,
- or standalone if `JobId` is null.

### 6. JobProperty

Flexible key-value metadata for agent/user extension.

Use it for data that is useful but not core enough to deserve a column.

Examples:

- `ai_summary`
- `missing_keywords`
- `visa_notes`
- `sponsorship_probability`
- `agent_fit_reasoning`
- `company_reputation_notes`
- `relocation_notes`

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

Restriction:

- Do not move important filter/sort/group fields into properties.
- Keep `FitScore`, `Country`, `RemoteMode`, `EmploymentType`, `Priority`, salary fields, and status as fixed fields.

### 7. JobAttachment

Attachments are job-specific supporting materials.

This is higher ROI than a standalone `ResumeVariant` module.

```csharp
public sealed class JobAttachment : AuditableEntity
{
    public int Id { get; set; }
    public int JobId { get; set; }

    public JobAttachmentType Type { get; set; }
    public string Title { get; set; } = "";

    public string? FileName { get; set; }
    public string? Url { get; set; }
    public string? StoragePath { get; set; }
    public string? Notes { get; set; }
}
```

Suggested enum:

```csharp
public enum JobAttachmentType
{
    Resume = 0,
    CoverLetter = 1,
    JobDescription = 2,
    Email = 3,
    Screenshot = 4,
    Other = 5
}
```

MVP restriction:

- Do not build full file upload/storage unless necessary.
- Start with title, type, URL/path, and notes.
- Local file upload can be a later feature.

### 8. ResumeVariant

Do not keep `ResumeVariant` as a first-class MVP entity/page.

Replace it with:

- `Job.ResumeLabel`
- `Job.ResumeAngle`
- `Job.CoverLetterNotes`
- `JobAttachment` with type `Resume` or `CoverLetter`

Rationale:

- The daily workflow asks: “What did I submit for this job?”
- It does not need a separate resume-management module.
- A reusable resume catalog can be added later only if repeated usage proves it valuable.

### 9. Company

Keep `Company`, but make it frictionless.

- A Job can select an existing company or create one inline by name.
- Do not force the user to manage companies separately before adding jobs.
- Company remains useful for grouping, filtering, and future company-level notes.

### 10. UserProfile

Keep the singleton profile.

Use fixed fields for essentials:

- name
- email
- links
- current location
- target roles
- preferred tech stack
- career summary
- target salary
- search deadline

Do not add `ProfileProperty` now unless an agent workflow strongly needs open-ended profile metadata.

---

## Workflow Rules

Use a small `JobWorkflowService`. Do not build a strategy framework or configurable state machine.

### Transition command

```text
TransitionJob(jobId, toStatus, notes?, context?)
```

Responsibilities:

1. Load Job.
2. Validate transition.
3. Update `Job.Status`.
4. Set related date fields where applicable.
5. Insert `JobTransition`.
6. Create default follow-up if useful.
7. Return a result with optional next UI prompt.

### Default triggers

| Transition / Event | Default action |
|---|---|
| `Discovered` -> `Interested` | No auto-action |
| -> `Applied` | Set `AppliedAtUtc` if missing; create follow-up: “Check status in 7 days” |
| -> `Interviewing` | Suggest adding first activity; do not force it |
| `JobActivity` completed | Suggest follow-up: “Send thank you”; allow one-click task creation |
| -> `Offered` | Prompt for offer salary, deadline, expiry/notes |
| -> `Rejected` | Optional follow-up: “Request feedback” |
| -> `Ghosted` | Optional follow-up: “Send final follow-up” or “Request feedback” |
| -> `Withdrawn` | No auto-action by default |
| -> `Archived` | Hide from active boards; no auto-action |

### UI prompt rule

Avoid forced modals unless data is required.

Preferred UX:

- Use lightweight drawer for transition context.
- Use toast/action card for optional next steps.
- Auto-create obvious follow-ups only when the default is highly useful.
- Always allow edit/undo/skip.

---

## Timeline Requirements

Job detail must show a chronological timeline combining:

- status transitions from `JobTransition`
- activities from `JobActivity`
- follow-ups from `FollowUpTask`
- attachments/properties only if important enough to display

Example:

```text
2026-01-15  Discovered    Found on LinkedIn
2026-01-20  Applied       Resume: Senior .NET Backend v2
2026-01-25  Screening     Sarah, HR — Passed
              ↳ FollowUp: Send thank you — Due 2026-01-26
2026-01-28  Technical 1   John, Lead Dev — Waiting
2026-02-02  Rejected      Requested feedback
```

The timeline is a read model. Do not over-model it as a separate persisted feed unless needed.

---

## Frontend UX Requirements

### Navigation

Recommended MVP navigation:

- Dashboard
- Jobs
- Tasks
- Companies
- Settings

Optional/hidden/later:

- Resume Templates
- Analytics
- Attachments library

Remove as first-class pages:

- Job Leads
- Applications
- Interviews
- Resume Variants

### Jobs page

The Jobs page is the primary workspace.

Must support:

- board view grouped by `JobStatus`
- table/list view
- search by title, company, source
- filters:
  - status multi-select
  - country
  - remote mode
  - employment type
  - source
  - company
  - priority
  - salary range
  - applied date range
- grouping:
  - by status
  - by company
  - by country
- show/hide closed jobs
- quick add job
- open detail drawer/page

### Board card content

Each job card should show:

- company
- title
- priority
- fit score if available
- country/remote mode
- salary hint if available
- next action date
- current activity label if interviewing

For `Interviewing`, keep the card in the `Interviewing` column and show substatus text:

```text
Current: Technical 1 · Jan 28 · Waiting
```

Do not create dynamic Kanban columns for every interview round.

### Job detail

Recommended sections:

1. Header summary
2. Main actions
3. Overview
4. Timeline
5. Activities
6. Follow-ups
7. Attachments
8. Metadata / Agent Notes

The detail can be a side drawer first. A dedicated page can be added later if the drawer becomes too dense.

---

## Backend/API Requirements

Prefer workflow-oriented endpoints.

Recommended REST surface:

```text
GET    /api/jobs
GET    /api/jobs/{id}
POST   /api/jobs
PUT    /api/jobs/{id}
DELETE /api/jobs/{id}              # optional; UI should prefer archive
POST   /api/jobs/{id}/transition
GET    /api/jobs/{id}/timeline

POST   /api/jobs/{id}/activities
PUT    /api/jobs/{id}/activities/{activityId}
DELETE /api/jobs/{id}/activities/{activityId}
POST   /api/jobs/{id}/activities/{activityId}/complete

POST   /api/jobs/{id}/follow-ups
PUT    /api/follow-up-tasks/{id}
POST   /api/follow-up-tasks/{id}/complete
POST   /api/follow-up-tasks/{id}/skip

POST   /api/jobs/{id}/attachments
PUT    /api/jobs/{id}/attachments/{attachmentId}
DELETE /api/jobs/{id}/attachments/{attachmentId}

GET    /api/dashboard/summary
GET    /api/settings/profile
PUT    /api/settings/profile
GET    /api/companies
POST   /api/companies
PUT    /api/companies/{id}
```

Do not expose unnecessary resource actions just to mirror old endpoints.

### Dashboard summary

Dashboard should answer:

- active jobs count
- jobs by status
- follow-ups due today
- overdue follow-ups
- upcoming activities/interviews
- high-priority active jobs
- stale jobs
- offer deadlines
- search deadline countdown

### Stale job rule

A job is stale if:

- it is active, and
- `NextActionAtUtc` is null and it has not been updated in 7 days, or
- `NextActionAtUtc` is overdue.

Active statuses:

- `Discovered`
- `Interested`
- `Applied`
- `Interviewing`
- `Offered`

Closed statuses:

- `Rejected`
- `Ghosted`
- `Withdrawn`
- `Archived`

---

## MCP Requirements

### Principle

MCP should provide **workflow parity**, not REST parity.

Agents should get a small set of tools that match job-search tasks. They do not need every REST endpoint.

### Recommended MCP tools

Dashboard/profile:

- `get_dashboard_summary`
- `get_user_profile`
- `update_user_profile`

Jobs:

- `list_jobs`
- `get_job`
- `create_job`
- `update_job`
- `transition_job`
- `archive_job`
- `get_job_timeline`

Activities:

- `add_job_activity`
- `update_job_activity`
- `complete_job_activity`

Follow-ups:

- `list_due_follow_ups`
- `add_follow_up`
- `complete_follow_up`
- `skip_follow_up`

Companies:

- `list_companies`
- `upsert_company`

Attachments/properties:

- `add_job_attachment`
- `upsert_job_property`
- `remove_job_property`

Optional later:

- `bulk_import_jobs`
- `export_jobs`
- `suggest_next_actions` only if it delegates to deterministic app rules, not an LLM.

### MCP restrictions

- No hard delete tools by default.
- Use `archive_job` instead of `delete_job`.
- No AI inference tools.
- No provider-specific fields.
- Enum input/output should use readable string names.
- Tools should delegate to application services and contain no business logic.
- Tool count is not the goal; agent workflow clarity is the goal.

---

## Data/Migration Strategy

The DB can be wiped. Use that advantage.

Recommended approach:

1. Create a destructive Domain V2 migration.
2. Drop old tables:
   - `job_leads`
   - `applications`
   - `interviews`
   - old polymorphic follow-up columns
   - resume variant references if removed
3. Add new tables:
   - `jobs`
   - `job_transitions`
   - `job_activities`
   - `job_properties`
   - `job_attachments`
   - updated `follow_up_tasks`
4. Keep or recreate:
   - `companies`
   - `user_profiles`
5. Update generated frontend client after API changes.
6. Remove obsolete frontend pages/components gradually but decisively.

Do not build a complex migration path from old data unless real data exists.

---

## Implementation Plan

### Phase 1 — Document and lock V2

- Add this document.
- Add a new decision entry: CareerOps is job-centric; `Job` replaces `JobLead`, `Application`, and top-level `Interview`.
- Update roadmap references.
- Mark old Application/Interview top-level model as superseded.

Acceptance:

- Direction is clear.
- Future agents know what to remove and what to build.

### Phase 2 — Backend domain refactor

- Add new domain entities/enums.
- Update `IAppDbContext`.
- Replace old application services with:
  - `JobService`
  - `JobWorkflowService`
  - `JobActivityService` if needed
  - `FollowUpTaskService`
  - `DashboardService`
- Create destructive migration.
- Update validators and mappings.

Acceptance:

- Backend builds.
- New job CRUD and transition flow work.
- Transition creates audit row.
- Applied transition can create default follow-up.

### Phase 3 — API and MCP reshape

- Add `/api/jobs` endpoints.
- Remove old job-leads/applications/interviews endpoint usage.
- Replace MCP REST-parity tools with workflow-parity tools.
- Keep MCP thin and service-delegating.

Acceptance:

- Agent can create a job, transition it, add activity, add follow-up, and read dashboard.
- No AI logic in MCP.
- No hard-delete MCP tools unless explicitly re-approved.

### Phase 4 — Unified frontend

- Add unified Jobs page.
- Reuse existing board/list UI patterns.
- Add job detail drawer/page.
- Remove old Job Leads, Applications, Interviews routes.
- Keep Tasks and Dashboard.

Acceptance:

- User can manage a real job from discovery to rejection/offer in one place.
- No “convert to application” step.
- Interview rounds appear inside job detail.

### Phase 5 — Timeline and polish

- Add timeline read model.
- Show transitions, activities, and follow-ups chronologically.
- Add empty/loading/error states.
- Polish filters and board card content.

Acceptance:

- Job detail tells the full story.
- Dashboard and Jobs page support daily job-search execution.

---

## Engineering Rules

Keep existing good decisions:

- .NET backend.
- PostgreSQL.
- EF Core code-first migrations.
- Clean Architecture, pragmatic DDD.
- Minimal APIs.
- Direct EF Core through `IAppDbContext`.
- No generic repositories.
- No MediatR/CQRS unless a real need appears.
- `IClock` for time. Never use `DateTime.UtcNow` directly in app/domain code.
- Enums stored as ints with pinned explicit values.
- OpenAPI-generated frontend client.
- Docker Compose for API + Postgres.
- Frontend host-only unless deployment need changes.

Update or reconsider:

- Frontend is currently React. Do not migrate to Angular now unless explicitly re-scoped.
- MCP should be workflow parity, not REST parity.
- Resume variants should be downgraded from top-level entity/page to job fields + attachments.
- AI fixed fields should be reduced or moved to `JobProperty`, except `FitScore` if used in UI/filtering.

---

## Simplification Decisions

### Accept

- One `Job` lifecycle.
- Dynamic `JobActivity` records for interview rounds and assessments.
- `JobTransition` audit trail.
- Direct FK from `FollowUpTask` to `Job` and optionally `JobActivity`.
- Flexible `JobProperty` extension point.
- Job-specific attachments.
- External AI agents through MCP.
- Workflow-oriented MCP tools.

### Reject for now

- Workflow strategy pattern.
- Configurable transition rules.
- Full audit snapshots.
- Separate Application domain.
- Separate Interview top-level domain.
- ResumeVariant as first-class MVP module.
- Full attachment storage system.
- REST-parity MCP.
- In-app AI provider.
- Angular migration.

### Defer

- Reusable resume template catalog.
- File upload and storage.
- Contact/referral module.
- Calendar/email integration.
- Import/export.
- Analytics charts beyond dashboard basics.
- Dev seed data unless manual testing becomes painful.

---

## Final Product Shape

CareerOps should feel like:

> A personal Linear/Jira-style job-search board with a complete timeline and agent-friendly workflow API.

The product should not feel like:

> A collection of admin CRUD pages for leads, applications, interviews, resume variants, AI analyses, and tasks.

The success metric is simple:

> Can the user manage a real job search faster and with less mental overhead than a spreadsheet?

If a feature does not improve that soon, push it out.
