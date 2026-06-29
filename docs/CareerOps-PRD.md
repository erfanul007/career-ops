# CareerOps PRD

> **Amendments (2026-06-19)** — This PRD is the original brief and remains the authority on
> product scope and the domain model. Build decisions and a few concrete deviations were
> agreed during planning and are recorded in
> [`superpowers/specs/2026-06-19-careerops-delivery-plan-design.md`](superpowers/specs/2026-06-19-careerops-delivery-plan-design.md)
> and [`knowledge-base/03-decisions.md`](knowledge-base/03-decisions.md). The body below is
> unchanged; where it conflicts with these, the decisions win:
>
> - **Frontend is host-only, not Dockerized** (supersedes §17, §10.3, §8 `web.Dockerfile`).
>   Everything frontend lives under `frontend/`, separable to its own repo.
> - **Fresh-clone run is two commands** — `just up` (Postgres + API) then `just web`
>   (softens §5.5's single-command goal).
> - **API style = Minimal APIs** (resolves the open choice in §11.4).
> - **Mapping = Mapster** (resolves §10.1).
> - **OpenAPI = built-in `Microsoft.AspNetCore.OpenApi` + Scalar UI** (`/openapi/v1.json`,
>   `/scalar/v1`), not Swashbuckle/Swagger UI (specifies the "Swagger" references in §10.1,
>   §11.4, §18.2, §26).
> - **Backend targets .NET 10 (LTS)**; **CLI-first** for project/dependency/migration ops; and
>   **pragmatic/tactical DDD** consistent with §11 (no repositories/MediatR). See D14, D18, D19.
> - **Solution file is `CareerOps.slnx`** (the .NET 10 SDK's XML solution format), not the
>   legacy `CareerOps.sln` shown in the §8 diagram. See D20.
> - **Enums persist as integers with pinned values, never reordered** (specifies §13).
> - **CI** lands in the polish phase; **seed data** is added only if manual entry proves
>   painful (sequencing per §10.3 / §7.2, not scope change).
> - **Delete is cascade-clean + archive-first UI** — deleting a parent also removes its
>   loose-reference rows; the UI prefers archiving (specifies §13 / §19.2).
> - **Manual AI prompt export** is added early as slice S3.4 (after follow-ups) — the frontend
>   assembles a prompt string and copies it to the clipboard for the user to paste into an
>   external AI agent; no API key, no provider call, no stored analysis. This is the only
>   in-app AI-adjacent surface. Per D51, CareerOps has no in-solution AI capability: the MCP
>   server (Phase 6) is the only AI-adjacent integration surface, and all analysis runs in
>   external agents that consume it.
>
> See [`knowledge-base/00-index.md`](knowledge-base/00-index.md) for the full build knowledge base.

## 1. Product Name

**CareerOps**

## 2. One-Line Summary

CareerOps is a Docker-first personal job-search command center for software engineers, built with .NET, PostgreSQL, React, and AI integration via external agents over an MCP server.

## 3. Product Goal

Help a software engineer under time pressure manage the full job-search process efficiently:

* Find and track job leads
* Prioritize high-value opportunities
* Track applications and interviews
* Manage referrals and contacts
* Track follow-ups
* Prepare for interviews
* Use external AI agents (via the MCP server) to analyze job descriptions and generate preparation material
* Keep a clear daily action plan

The MVP must become usable quickly. The user should not need to wait for the full product to start benefiting from it.

## 4. Current Priority

The user is in a job-search emergency. The product must prioritize immediate usefulness over completeness.

Baseline goal:

> Within the first few deliveries, the user should be able to use CareerOps instead of a spreadsheet for real job searching.

## 5. Product Principles

### 5.1 Baseline First

Build the smallest version that is useful now.

### 5.2 Short Feedback Loop

Every delivery should be usable, testable, and reviewable.

### 5.3 No Overengineering

Avoid unnecessary abstractions, infrastructure, and architecture ceremony.

### 5.4 No Premature Optimization

Do not solve scale, SaaS, multi-user, or enterprise problems before the personal-use baseline works.

### 5.5 Docker First

The project must run from a fresh clone using Docker Compose.

### 5.6 Portfolio Quality

Even though scope is small, the codebase should demonstrate clean .NET engineering, PostgreSQL, React, AI integration, and practical product thinking.

### 5.7 Use Existing Open-Source Tools

Use strong open-source libraries instead of reinventing forms, validation, UI components, API clients, logging, and data access.

## 6. Target User

Primary user:

* Software engineer actively searching for a job
* Needs structure, speed, and visibility
* May be applying to many jobs at once
* Needs to track interviews, follow-ups, contacts, and salary expectations
* Wants AI support but not AI dependency

Initial target profile:

* Backend / AI / platform / full-stack software engineer
* Applying to local, remote, and international roles
* Needs to manage applications under deadline pressure

## 7. MVP Scope

### 7.1 Must Have

CareerOps MVP must include:

1. Job lead tracking
2. Company tracking
3. Application tracking
4. Contact/referral tracking
5. Interview tracking
6. Follow-up task tracking
7. Dashboard with today’s actions
8. Job description analysis via external AI agents (MCP)
9. Interview preparation via external AI agents (MCP)
10. Resume variant tracking
11. Docker Compose setup
12. PostgreSQL database
13. EF Core code-first migrations
14. Clean Architecture project structure
15. Modern React UI

### 7.2 Should Have

These are useful but can come after the core baseline:

1. Clipboard prompt export for referral messages (prompt assembled in-app, completed by an external agent)
2. Clipboard prompt export for follow-up messages (prompt assembled in-app, completed by an external agent)
3. Opportunity scoring
4. Pipeline summary charts
5. Seed data
6. Import/export JSON
7. Markdown notes

### 7.3 Must Not Build in MVP

Do not build these initially:

1. Authentication
2. Multi-user support
3. Payment/subscription
4. Public SaaS deployment
5. Browser extension
6. LinkedIn scraping
7. Gmail integration
8. Google Calendar integration
9. RabbitMQ
10. Redis
11. Kubernetes
12. Complex background jobs
13. Vector database
14. Full RAG system
15. Resume builder
16. File upload system
17. Mobile app
18. Team/career-coach workspace

## 8. Repository Structure

Everything must live in a single repository.

Recommended root structure:

```text
careerops/
  .git/
  .github/
    workflows/
      ci.yml

  backend/
    CareerOps.sln
    src/
      CareerOps.Presentation/
      CareerOps.Application/
      CareerOps.Domain/
      CareerOps.Infrastructure/
      CareerOps.Contracts/
    tests/
      CareerOps.UnitTests/
      CareerOps.IntegrationTests/

  frontend/
    package.json
    vite.config.ts
    tsconfig.json
    src/
      app/
      components/
      features/
      lib/
      pages/
      routes/
      styles/

  docs/
    PRD.md
    BACKLOG.md
    ARCHITECTURE.md
    DECISIONS.md
    api/
    adr/

  deploy/
    docker/
      api.Dockerfile
      web.Dockerfile
      postgres/
    compose/
      docker-compose.yml

  .env.example
  .gitignore
  CLAUDE.md
  README.md
  justfile
```

## 9. Root Folder Requirements

### 9.1 README.md

Must include:

* What CareerOps is
* Why it exists
* Tech stack
* Screenshots placeholder
* How to run with Docker
* How to run backend locally
* How to run frontend locally
* Environment variables
* Development workflow
* Roadmap
* Known limitations

### 9.2 CLAUDE.md

Must include coding-agent instructions:

* Follow this PRD
* Keep scope small
* Prefer useful delivery over perfect abstraction
* Do not add features without explicit approval
* Do not introduce SaaS/multi-user complexity
* Do not add RabbitMQ, Redis, Kubernetes, or auth in MVP
* Use Clean Architecture but avoid ceremony
* Use EF Core code-first migrations
* Maintain Docker-first workflow
* Keep frontend simple, modern, and usable

### 9.3 justfile

Must provide common commands:

```text
just up
just down
just build
just logs
just api
just web
just test
just format
just migrate
just db-reset
```

### 9.4 .env.example

Must include safe example values only.

Example:

```env
POSTGRES_DB=careerops
POSTGRES_USER=careerops
POSTGRES_PASSWORD=careerops

ASPNETCORE_ENVIRONMENT=Development
ConnectionStrings__DefaultConnection=Host=careerops-postgres;Port=5432;Database=careerops;Username=careerops;Password=careerops

VITE_API_BASE_URL=http://localhost:8080
```

## 10. Tech Stack

## 10.1 Backend

Use:

* ASP.NET Core Web API
* C#
* EF Core
* PostgreSQL
* Npgsql
* FluentValidation
* Serilog
* Swagger/OpenAPI
* Mapster or manual mapping
* xUnit
* Testcontainers for integration tests, later

Do not use MediatR in the baseline unless it clearly helps. Simple application services are enough.

## 10.2 Frontend

Use:

* React
* TypeScript
* Vite
* React Router
* TanStack Query
* React Hook Form
* Zod
* Tailwind CSS
* shadcn/ui
* lucide-react
* date-fns
* Recharts, later if dashboard charts are needed

## 10.3 Infrastructure

Use:

* Docker
* Docker Compose
* PostgreSQL container
* API container
* Web container

Optional later:

* pgAdmin
* GitHub Actions CI

## 11. Architecture

Use Clean Architecture with pragmatic DDD.

Backend layers:

```text
CareerOps.Domain
CareerOps.Application
CareerOps.Infrastructure
CareerOps.Presentation
CareerOps.Contracts
```

### 11.1 Domain Layer

Contains:

* Entities
* Enums
* Value objects where useful
* Domain rules that are independent of infrastructure

No dependencies on EF Core, ASP.NET, PostgreSQL, or external packages unless truly domain-safe.

### 11.2 Application Layer

Contains:

* Use cases
* Application services
* DTOs
* Validation
* Interfaces
* MCP tool/contract surface (thin delegations to Application services)
* Dashboard query logic

Keep it simple. Do not create excessive command/query abstractions in the baseline.

### 11.3 Infrastructure Layer

Contains:

* EF Core DbContext
* Entity configurations
* Repository implementations only if useful
* System clock/date provider
* Database migrations

Direct EF Core usage from application services is acceptable if it keeps the code simpler. Do not create generic repositories by default.

### 11.4 API Layer

Contains:

* Controllers or Minimal APIs
* Request/response mapping
* Exception handling
* Swagger
* Health checks
* Dependency injection setup

Prefer whichever API style the coding agent can implement cleanly and consistently.

### 11.5 Contracts Layer

Contains:

* Shared request/response DTOs if needed by frontend code generation later
* Public API contracts if the codebase benefits from separation

Do not overuse this layer in the baseline.

## 12. Domain Model

## 12.1 Company

Represents an employer or potential employer.

Fields:

* Id
* Name
* WebsiteUrl
* LinkedInUrl
* Country
* City
* CompanyType
* MarketType
* CompensationFit
* Notes
* CreatedAtUtc
* UpdatedAtUtc

Enums:

```text
CompanyType:
- Unknown
- Product
- Outsourcing
- Startup
- Enterprise
- Agency

MarketType:
- Unknown
- Local
- Remote
- Hybrid
- International

CompensationFit:
- Unknown
- Low
- Medium
- High
```

## 12.2 JobLead

Represents a job opportunity.

Fields:

* Id
* CompanyId
* Title
* Source
* SourceUrl
* JobDescription
* Location
* RemoteMode
* EmploymentType
* SalaryMin
* SalaryMax
* SalaryCurrency
* SalaryPeriod
* Priority
* Status
* FitScore
* AiSummary
* MissingKeywords
* SuggestedResumeAngle
* NextActionAtUtc
* DeadlineAtUtc
* Notes
* CreatedAtUtc
* UpdatedAtUtc

Enums:

```text
JobSource:
- Unknown
- LinkedIn
- Referral
- Recruiter
- CompanyWebsite
- BDJobs
- Wellfound
- RemoteOK
- Email
- Other

RemoteMode:
- Unknown
- Onsite
- Hybrid
- Remote
- Flexible

EmploymentType:
- Unknown
- FullTime
- Contract
- PartTime
- Freelance

SalaryPeriod:
- Unknown
- Monthly
- Yearly
- Hourly

Priority:
- Low
- Medium
- High
- Critical

JobLeadStatus:
- Discovered
- Interested
- Applied
- Interviewing
- Offer
- Rejected
- Ghosted
- Withdrawn
- Archived
```

## 12.3 ResumeVariant

Represents a resume version.

Fields:

* Id
* Name
* TargetRole
* Summary
* Notes
* IsDefault
* CreatedAtUtc
* UpdatedAtUtc

Example resume variants:

* Backend AI Systems
* Senior .NET Backend
* Platform Integration

Do not implement file upload in baseline.

## 12.4 Contact

Represents a person connected to a company or opportunity.

Fields:

* Id
* CompanyId, nullable
* FullName
* RoleTitle
* RelationshipType
* Email
* LinkedInUrl
* Phone
* LastContactedAtUtc
* NextFollowUpAtUtc
* Notes
* CreatedAtUtc
* UpdatedAtUtc

Enums:

```text
RelationshipType:
- Unknown
- Friend
- FormerColleague
- Recruiter
- HiringManager
- Community
```

## 12.5 Application

Represents a submitted application.

Fields:

* Id
* JobLeadId
* ResumeVariantId
* AppliedAtUtc
* CurrentStage
* Status
* ExpectedSalary
* ExpectedSalaryCurrency
* NoticePeriod
* NextStep
* NextActionAtUtc
* RejectionReason
* Notes
* CreatedAtUtc
* UpdatedAtUtc

Enums:

```text
ApplicationStage:
- Applied
- RecruiterScreen
- TechnicalScreen
- TakeHome
- SystemDesign
- HiringManager
- Final
- Offer
- Rejected
- Ghosted
- Withdrawn

ApplicationStatus:
- Active
- Paused
- Rejected
- Offer
- Withdrawn
```

## 12.6 Interview

Represents an interview round.

Fields:

* Id
* ApplicationId
* RoundType
* ScheduledAtUtc
* DurationMinutes
* InterviewerName
* InterviewerRole
* MeetingUrl
* Status
* PrepNotes
* Outcome
* Feedback
* FollowUpRequired
* FollowUpAtUtc
* CreatedAtUtc
* UpdatedAtUtc

Enums:

```text
InterviewRoundType:
- RecruiterScreen
- Technical
- LiveCoding
- SystemDesign
- TakeHomeDiscussion
- AIEngineering
- Behavioral
- HiringManager
- Final
- Other

InterviewStatus:
- Scheduled
- Completed
- Cancelled
- Rescheduled

InterviewOutcome:
- Unknown
- Passed
- Failed
- Waiting
```

## 12.7 FollowUpTask

Represents a required action.

Fields:

* Id
* Title
* Description
* RelatedEntityType
* RelatedEntityId
* DueAtUtc
* Status
* Priority
* CreatedAtUtc
* UpdatedAtUtc

Enums:

```text
RelatedEntityType:
- None
- JobLead
- Application
- Interview
- Contact

FollowUpStatus:
- Pending
- Completed
- Skipped
```

## 12.9 UserProfile

Single local user profile.

Fields:

* Id
* FullName
* Email
* Phone
* LinkedInUrl
* GitHubUrl
* PortfolioUrl
* CurrentLocation
* TargetRoles
* TargetSalaryMin
* TargetSalaryCurrency
* SearchDeadlineUtc
* PreferredTechStack
* CareerSummary
* CreatedAtUtc
* UpdatedAtUtc

## 13. Database Requirements

Use PostgreSQL with EF Core code-first migrations.

Requirements:

* Use snake_case table and column names
* Use UTC timestamps
* Use migration files committed to Git
* Use development seed data only when enabled
* Use simple relational modeling
* Avoid unnecessary JSON columns in baseline
* Avoid soft delete in baseline unless deletion becomes risky

Initial tables:

```text
companies
job_leads
resume_variants
contacts
applications
interviews
follow_up_tasks
user_profiles
```

## 14. API Requirements

## 14.1 Health

```text
GET /health
GET /health/db
```

## 14.2 Dashboard

```text
GET /api/dashboard/summary
```

Returns:

* Active application count
* Job leads by status
* Applications by stage
* Follow-ups due today
* Overdue follow-ups
* Upcoming interviews
* High-priority leads
* Stale applications
* Search deadline countdown

## 14.3 Companies

```text
GET    /api/companies
GET    /api/companies/{id}
POST   /api/companies
PUT    /api/companies/{id}
DELETE /api/companies/{id}
```

## 14.4 Job Leads

```text
GET    /api/job-leads
GET    /api/job-leads/{id}
POST   /api/job-leads
PUT    /api/job-leads/{id}
DELETE /api/job-leads/{id}

POST   /api/job-leads/{id}/convert-to-application
```

## 14.5 Applications

```text
GET    /api/applications
GET    /api/applications/{id}
POST   /api/applications
PUT    /api/applications/{id}
DELETE /api/applications/{id}

POST   /api/applications/{id}/change-stage
POST   /api/applications/{id}/mark-rejected
POST   /api/applications/{id}/mark-offer
POST   /api/applications/{id}/mark-ghosted
```

## 14.6 Interviews

```text
GET    /api/interviews
GET    /api/interviews/{id}
POST   /api/interviews
PUT    /api/interviews/{id}
DELETE /api/interviews/{id}

POST   /api/interviews/{id}/mark-completed
```

## 14.7 Contacts

```text
GET    /api/contacts
GET    /api/contacts/{id}
POST   /api/contacts
PUT    /api/contacts/{id}
DELETE /api/contacts/{id}
```

## 14.8 Resume Variants

```text
GET    /api/resume-variants
GET    /api/resume-variants/{id}
POST   /api/resume-variants
PUT    /api/resume-variants/{id}
DELETE /api/resume-variants/{id}

POST   /api/resume-variants/{id}/make-default
```

## 14.9 Follow-Up Tasks

```text
GET    /api/follow-up-tasks
GET    /api/follow-up-tasks/due
POST   /api/follow-up-tasks
PUT    /api/follow-up-tasks/{id}
DELETE /api/follow-up-tasks/{id}

POST   /api/follow-up-tasks/{id}/complete
POST   /api/follow-up-tasks/{id}/skip
```

## 14.10 Settings

```text
GET /api/settings/profile
PUT /api/settings/profile
```

Settings API can be delayed if profile is seeded manually in baseline.

## 15. Frontend Requirements

## 15.1 UI Goal

The frontend should be simple, modern, eye-pleasing, and powerful enough for daily use.

It should feel like a focused productivity app, not an admin panel.

## 15.2 Navigation

Main sidebar:

* Dashboard
* Job Leads
* Applications
* Interviews
* Contacts
* Resume Variants
* Settings

## 15.3 Main Pages

### Dashboard

Must show:

* Today’s follow-ups
* Overdue follow-ups
* Upcoming interviews
* Active applications
* High-priority job leads
* Stale applications
* Pipeline summary
* Search deadline countdown

### Job Leads

Must support:

* List
* Search
* Filter by status
* Filter by priority
* Add/edit job lead
* View job details
* Copy AI prompt (clipboard export for an external agent)
* Convert lead to application

### Applications

Must support:

* List
* Filter by stage
* Filter by status
* View details
* Change stage
* Mark rejected
* Mark offer
* Mark ghosted
* Add interview

### Interviews

Must support:

* Upcoming interviews
* Completed interviews
* Add/edit interview
* Copy AI prompt (clipboard export for an external agent)
* Mark outcome
* Add feedback

### Contacts

Must support:

* Add/edit contact
* Link to company
* Track last contacted date
* Track next follow-up
* Copy AI prompt (clipboard export for an external agent)

### Resume Variants

Must support:

* Add/edit resume variant
* Mark default
* Use in applications

### Settings

Must support:

* User profile
* Target roles
* Search deadline

Settings can be minimal in early deliveries.

## 16. AI Integration (External Agents via MCP)

CareerOps has no in-solution AI capability. It runs no analysis, scoring, research, or prompt
completion itself, and holds no AI provider keys.

The MCP server — hosted in the Presentation layer — is the only AI-adjacent surface. It exposes
exactly the same operations as the REST API and frontend: pure CRUD/workflow delegations with no
AI logic of its own. All analysis, scoring, research, and prompt completion run in external AI
agents/hosts (Claude Code, ChatGPT, etc.) that consume the MCP server and write results back
through it.

The `FitScore`, `AiSummary`, `MissingKeywords`, and `SuggestedResumeAngle` fields on JobLead, and
`PrepNotes` on Interview, are plain writable data slots. An external agent populates them via the
MCP/REST update operations; CareerOps never computes them.

The only in-app AI-adjacent feature is the manual clipboard prompt export (S3.4): the frontend
assembles a prompt string and copies it to the clipboard for the user to paste into an external
agent. There is no provider call, no API key, and no stored analysis.

This is locked by decision D51, which closed D7, cancelled the AiAnalysis store (D50), and dropped
the planned Phase 6 "AI baseline" and Phase 7 "real provider".

## 17. Docker Requirements

The app must run with:

```bash
docker compose -f deploy/compose/docker-compose.yml up --build
```

Optionally expose root-level alias through justfile:

```bash
just up
```

Services:

```text
careerops-api
careerops-web
careerops-postgres
```

Ports:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:8080
Postgres: localhost:5432
```

Docker Compose must include:

* API service
* Web service
* PostgreSQL service
* Postgres volume
* Health checks
* Shared network
* Environment variables

## 18. Delivery Lifecycle

The development process must be divided into short, usable deliveries.

Each delivery should produce something testable.

Do not wait until the entire app is complete.

## 18.1 Delivery 0: Repo and Project Skeleton

Goal:

> Make the repository ready for coding agents and future development.

Scope:

* Root folder structure
* README.md
* CLAUDE.md
* docs/PRD.md
* docs/BACKLOG.md
* justfile
* .env.example
* .gitignore
* Empty backend solution
* Empty frontend app

Acceptance criteria:

* Repo structure is correct
* Coding agent instructions exist
* Project direction is clear
* No business feature required yet

## 18.2 Delivery 1: Docker-First Running App

Goal:

> Run backend, frontend, and database with one command.

Scope:

* ASP.NET Core API
* React Vite frontend
* PostgreSQL
* Dockerfiles
* Docker Compose
* Health endpoints
* Frontend health check call
* Swagger enabled

Acceptance criteria:

* `just up` runs the full stack
* API health endpoint works
* Frontend loads
* Frontend can call backend
* PostgreSQL is reachable
* No domain features required yet

## 18.3 Delivery 2: Job Leads Baseline

Goal:

> Start using CareerOps to track real job leads.

Scope:

* Company entity
* JobLead entity
* EF Core migration
* Company CRUD API
* JobLead CRUD API
* Job Leads frontend page
* Add/edit job lead form
* Job lead details page
* Basic filters: status, priority
* Dashboard placeholder with job lead counts

Acceptance criteria:

* User can add real job leads
* User can update status and priority
* User can paste job descriptions
* Data persists after restart
* This delivery is usable for real job search

## 18.4 Delivery 3: Applications and Follow-Ups

Goal:

> Track applications and know what to do next.

Scope:

* ResumeVariant entity
* Application entity
* FollowUpTask entity
* Convert job lead to application
* Application list/details
* Follow-up task list
* Dashboard shows due/overdue follow-ups
* Manual follow-up creation

Acceptance criteria:

* User can mark a lead as applied
* User can select resume variant
* User can create next action/follow-up
* Dashboard shows today’s actions
* This replaces basic spreadsheet tracking

## 18.5 Delivery 4: Interviews

Goal:

> Track interviews and preparation state.

Scope:

* Interview entity
* Interview CRUD API
* Interview list/page
* Add interview to application
* Upcoming interviews on dashboard
* Prep notes field
* Outcome tracking

Acceptance criteria:

* User can track interview rounds
* Dashboard shows upcoming interviews
* User can store prep notes and feedback
* User can update interview outcome

## 18.6 Delivery 5: Agent-Native AI via MCP (Phase 6)

Goal:

> Expose CareerOps to external AI agents through an MCP server at full REST parity, with no
> in-app AI provider.

Scope:

* CareerOps MCP HTTP server, hosted in the Presentation layer
* MCP tools mirror the REST API exactly — pure CRUD/workflow delegations, no AI logic
* External agents read context and write results into the plain JobLead data slots
  (`FitScore`, `AiSummary`, `MissingKeywords`, `SuggestedResumeAngle`) and Interview `PrepNotes`
  via the MCP/REST update operations
* Manual clipboard prompt export (S3.4) in the frontend — assembles a prompt string and copies
  it to the clipboard; no provider call, no API key, no stored analysis

Acceptance criteria:

* App works without any AI key or provider
* MCP server exposes the same operations as the REST API and frontend
* An external agent can populate `FitScore`/`AiSummary`/`MissingKeywords`/`SuggestedResumeAngle`
  and Interview `PrepNotes` through MCP/REST update operations
* The frontend can copy an assembled AI prompt to the clipboard

## 18.7 Delivery 6: UX Polish and Portfolio Readiness

Goal:

> Make the project presentable and pleasant to use.

Scope:

* Better empty states
* Better loading states
* Better error states
* Responsive layout
* Dashboard cards
* README screenshots
* Architecture diagram
* Seed data
* Basic tests

Acceptance criteria:

* Project looks clean
* README is recruiter/interviewer friendly
* Fresh clone setup works
* App is usable daily

## 19. Development Rules

## 19.1 Baseline Pushback Rules

The coding agent must push back on:

* Adding authentication before local MVP works
* Adding multi-user support
* Adding background job infrastructure too early
* Adding RabbitMQ/Redis/Kubernetes
* Adding scraping
* Adding browser extension
* Adding complex analytics
* Adding calendar/email integrations
* Adding generic repository abstractions without need
* Adding MediatR/CQRS ceremony before baseline CRUD works
* Adding vector database or RAG
* Spending too much time on perfect UI before core workflow works

## 19.2 Acceptable Shortcuts

For speed, these are acceptable:

* Single local user
* No auth
* Hard delete
* Basic dashboard queries
* Simple application services
* Manual forms
* Simple filters
* Basic table views
* Basic seed data
* Minimal tests in first deliveries

## 19.3 Non-Acceptable Shortcuts

These are not acceptable:

* No Docker setup
* No PostgreSQL persistence
* No migration strategy
* No validation
* No error handling
* No clear folder structure
* No README
* No way to run from fresh clone
* Hardcoded secrets
* AI key committed to repo
* Frontend tightly coupled to mock data only

## 20. Validation Rules

### Company

* Name is required
* Website URL must be valid if provided

### JobLead

* Title is required
* Company is required
* Priority is required
* Status is required
* FitScore must be 0–100 if provided
* SalaryMax must be greater than or equal to SalaryMin

### ResumeVariant

* Name is required
* TargetRole is recommended

### Application

* JobLead is required
* ResumeVariant is required
* AppliedAtUtc is required
* CurrentStage is required

### Interview

* Application is required
* RoundType is required
* ScheduledAtUtc is required
* DurationMinutes must be positive if provided

### FollowUpTask

* Title is required
* DueAtUtc is required
* Status is required
* Priority is required

## 21. Dashboard Rules

### Follow-Up Due

A follow-up task is due when:

```text
status = Pending
and due_at_utc <= now
```

### Overdue Follow-Up

A follow-up task is overdue when:

```text
status = Pending
and due_at_utc < start_of_today
```

### Upcoming Interview

An interview is upcoming when:

```text
status = Scheduled
and scheduled_at_utc >= now
and scheduled_at_utc <= now + 7 days
```

### Stale Application

An application is stale when:

```text
status = Active
and next_action_at_utc is null
and updated_at_utc < now - 7 days
```

or:

```text
status = Active
and next_action_at_utc < now
```

### High-Priority Lead

A high-priority lead is:

```text
priority in [High, Critical]
and status in [Discovered, Interested]
```

## 22. UI Design Direction

The UI should feel like a modern productivity dashboard.

Preferred style:

* Light/dark mode later, not baseline
* Clean cards
* Strong spacing
* Clear typography
* Subtle borders
* Status badges
* Priority badges
* Table-first for dense data
* Details pages for context
* Minimal but polished

Avoid:

* Heavy animations
* Fancy landing pages
* Overdesigned dashboards
* Complex drag-and-drop Kanban in baseline
* Too many colors
* Too many nested modals

## 23. Suggested Frontend Folder Structure

```text
frontend/src/
  app/
    App.tsx
    providers.tsx
    router.tsx

  components/
    ui/
    layout/
    shared/

  features/
    dashboard/
    companies/
    job-leads/
    applications/
    interviews/
    contacts/
    resume-variants/
    follow-ups/
    settings/
    ai/

  lib/
    api-client.ts
    dates.ts
    constants.ts
    schemas.ts
    utils.ts

  pages/
    DashboardPage.tsx
    JobLeadsPage.tsx
    JobLeadDetailsPage.tsx
    ApplicationsPage.tsx
    ApplicationDetailsPage.tsx
    InterviewsPage.tsx
    ContactsPage.tsx
    ResumeVariantsPage.tsx
    SettingsPage.tsx

  styles/
    globals.css
```

## 24. Suggested Backend Folder Structure

```text
backend/src/CareerOps.Domain/
  Common/
  Companies/
  JobLeads/
  Applications/
  Interviews/
  Contacts/
  ResumeVariants/
  FollowUps/
  UserProfiles/

backend/src/CareerOps.Application/
  Common/
  Companies/
  JobLeads/
  Applications/
  Interviews/
  Contacts/
  ResumeVariants/
  FollowUps/
  Dashboard/
  Settings/

backend/src/CareerOps.Infrastructure/
  Persistence/
    CareerOpsDbContext.cs
    Configurations/
    Migrations/
    Seed/
  Time/

backend/src/CareerOps.Presentation/
  Endpoints/
  Mcp/
  Filters/
  HealthChecks/
  Program.cs
```

## 25. Testing Strategy

Baseline testing should be practical.

Delivery 1–2:

* Health endpoint test
* DbContext migration smoke test
* Basic domain validation tests

Delivery 3–5:

* Dashboard summary tests
* Follow-up due calculation tests
* Application status transition tests
* MCP/REST parity tests

Avoid large test suites before the product is usable.

## 26. Initial Backlog

## Epic 1: Foundation

* Create root repo structure
* Add README
* Add CLAUDE.md
* Add PRD
* Add justfile
* Add .env.example
* Create backend solution
* Create frontend app
* Add Docker Compose

## Epic 2: Running Stack

* Add API Dockerfile
* Add web Dockerfile
* Add PostgreSQL Compose service
* Add health endpoints
* Add Swagger
* Add frontend API health call

## Epic 3: Job Leads

* Add Company entity
* Add JobLead entity
* Add EF Core configurations
* Add migration
* Add Company APIs
* Add JobLead APIs
* Add Job Leads UI
* Add Job Lead details UI
* Add filters

## Epic 4: Applications and Follow-Ups

* Add ResumeVariant entity
* Add Application entity
* Add FollowUpTask entity
* Add APIs
* Add frontend pages
* Add convert lead to application
* Add dashboard follow-up section

## Epic 5: Interviews

* Add Interview entity
* Add APIs
* Add frontend page
* Add dashboard upcoming interviews
* Add prep notes and feedback

## Epic 6: Agent-Native AI via MCP

* Add CareerOps MCP HTTP server (Presentation layer) at full REST parity
* Map MCP tools to existing CRUD/workflow operations — no AI logic
* Ensure external agents can write JobLead `FitScore`/`AiSummary`/`MissingKeywords`/`SuggestedResumeAngle` and Interview `PrepNotes`
* Add the clipboard prompt export (S3.4) in the frontend

## Epic 7: Polish

* Add seed data
* Add empty/loading/error states
* Add README screenshots
* Add architecture diagram
* Add basic tests

## 27. MVP Definition of Done

CareerOps MVP is done when:

* App runs with Docker Compose
* PostgreSQL persists data
* User can track job leads
* User can track companies
* User can track applications
* User can track interviews
* User can track contacts
* User can track follow-ups
* Dashboard shows today’s actions
* MCP server exposes the same operations as the REST API for external agents
* The frontend can copy an assembled AI prompt to the clipboard
* Code follows Clean Architecture at a practical level
* README explains setup and purpose
* Project is usable for the user’s active job search

## 28. Final Scope Guard

The first objective is not to build the best job-search app.

The first objective is to build a useful personal tool fast enough to support an urgent job search.

Any feature that does not help the user apply, follow up, prepare, or track progress in the next 2 weeks should be delayed.
