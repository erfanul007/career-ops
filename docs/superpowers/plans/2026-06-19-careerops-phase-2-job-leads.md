# Phase 2 — Job Leads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the job-search spreadsheet — track companies and job leads end-to-end (entity → migration → Minimal-API endpoint → orval-generated client → React page), with search/filter and a placeholder dashboard count.

**Architecture:** Three thin vertical slices on the proven S1.2 toolchain — **S2.1 Company** (CRUD), **S2.2 JobLead** (CRUD + inline find-or-create company), **S2.3 filters/search/dashboard counts** (client-side). Each slice mirrors the `UserProfile` slice: Domain entity + pinned int enums, EF config + code-first migration, `IAppDbContext` DbSet, Application service + Mapster + FluentValidation, Minimal-API module wired in `Program.cs`, regenerated orval client, React page. No new infrastructure.

**Tech Stack:** .NET 10 Minimal APIs, EF Core 10 + Npgsql (snake_case), Mapster, FluentValidation, Serilog, RFC 7807 ProblemDetails, `IClock`. React 19 + Vite + TS, TanStack Query, React Hook Form, react-router, orval 8.18, Tailwind v4. `just` runner; `dotnet` + `npm` CLIs only (D19).

## Global Constraints

- **Clean Architecture + pragmatic/tactical DDD** — no repositories, MediatR, or domain-event infra (D3, D18). Data access is direct EF Core through `IAppDbContext`.
- **Enums persist as ints, values pinned in PRD order (first = 0), append-only, never reorder/renumber** (D5). No `HasConversion<string>`.
- **`snake_case` tables/columns** via `UseSnakeCaseNamingConvention()`; tables plural (`companies`, `job_leads`). Timestamps `timestamptz`, UTC only, names end `AtUtc`, set centrally in `SaveChangesAsync` (never per service). Never call `DateTime.UtcNow` — inject `IClock`.
- **Every endpoint sets `operationId` via `.WithName(...)`** (orval hook names depend on it) and `.WithTags(...)`. One module per resource under `/api/<resource>`.
- **Validators** live in `Application/<Aggregate>`, named `<Dto>Validator`, run via `ValidationFilter<T>` endpoint filter → 400 `ValidationProblemDetails`. Rules follow PRD §20.
- **DTOs** in `Application/<Aggregate>`, suffixes `...Request`/`...Dto`. Mapster `IRegister` configs per aggregate; no mapping logic in endpoints.
- **`lib/api/` is orval-generated — never hand-edit.** Regenerate with `just gen-client` (requires the API running: `just up` or `just api`). Data access only through generated TanStack Query hooks. Server-authoritative validation (D23): generated Zod is committed but **not** wired as the RHF resolver; forms display the API's 400.
- **Delete is hard + cascade-clean** (D12): deleting a Company cascade-deletes its JobLeads (EF FK cascade). JobLead has **no** loose-reference children in Phase 2 (FollowUpTask/AiAnalysis arrive Phase 3/6). UX prefers **Archive** (`Status = Archived`) over Delete for leads.
- **Money:** `decimal` amount + 3-letter currency string + period enum; no conversion; format by locale on the frontend.
- **CLI-first (D19):** use `dotnet`/`dotnet ef`/`just` for backend + migrations and `npm`/`npx` for frontend — never hand-author `.csproj`/`package.json` versions or migration files.
- **Clean code:** KISS, YAGNI, DRY; small focused files; comment the non-obvious *why*, never the *what*; no dead/commented-out code.
- **Branch + commits:** branch off `main` before Task 1 (never implement on `main`). Conventional-commit subjects, one commit per slice step. **Commit only when the user has given the go-ahead** (standing rule); the commit steps below mark the intended points. Migrations are committed with the slice that introduces them. Commit trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Per-slice Definition of Done** (`02-delivery-plan.md`): backend builds; `just up` runs; endpoints respond; orval client regenerated + committed; page works against the real API; data persists across a container restart; bad input → `ProblemDetails`; `just verify` green; phase tests pass; manual usability check supports the real workflow.

### Design decisions introduced by this plan (log in `03-decisions.md` during execution)

- **D24 — Phase 2 search/filter/dashboard counts are client-side.** `GET /api/job-leads` returns the full list; the Job Leads page filters (status, priority, title contains) and the dashboard placeholder counts leads **in the browser** over the fetched list. No server-side query params, no `/api/dashboard` endpoint yet. *Why:* personal dataset (~30–50 leads); fewest moving parts; matches the design doc's "simpler first." *Escape hatch:* add optional query params to `GET /api/job-leads` and a real `GET /api/dashboard/summary` at Phase 5 if the list grows. *Rejected:* server-side filtering now (extra endpoint surface, orval regen, tests for no current benefit).
- **D25 — JobLead create resolves company by `CompanyId` XOR `NewCompanyName` (find-or-create).** `CreateJobLeadRequest` carries `int? CompanyId` and `string? NewCompanyName`; the service uses `CompanyId` when present, else find-or-creates a `Company` by case-insensitive trimmed name (enums default `Unknown`). Exactly one must be provided (validator). `UpdateJobLeadRequest` takes `CompanyId` only (required). *Why:* PRD fast-entry — entering 30–50 leads must not require a separate Companies trip; single atomic call; dedupes companies by name. *Rejected:* two round-trips orchestrated on the frontend (race + duplicate-company risk); a dedicated find-or-create endpoint (more surface than needed).

### Pre-flight (before Task 1)

- [ ] **P1:** Resolve the uncommitted port change on `main` (vite.config.ts, appsettings.Development.json, README.md, 03-decisions.md, 05-feedback-loop.md). Either commit it to `main` or carry it onto the new branch — confirm with the user (commit-gating rule).
- [ ] **P2:** Create the feature branch: `git switch -c feat/phase-2-job-leads`.
- [ ] **P3:** Ensure the stack runs: `just up` (Postgres + API healthy at `http://localhost:8080/health/db`). orval regeneration needs the API up.

---

## File Structure

**S2.1 Company**
- Create `backend/src/CareerOps.Domain/Companies/Company.cs` — entity.
- Create `backend/src/CareerOps.Domain/Companies/CompanyType.cs`, `MarketType.cs`, `CompensationFit.cs` — pinned int enums.
- Create `backend/src/CareerOps.Infrastructure/Persistence/Configurations/CompanyConfiguration.cs` — EF mapping.
- Modify `backend/src/CareerOps.Application/Common/IAppDbContext.cs` — add `DbSet<Company> Companies`.
- Modify `backend/src/CareerOps.Infrastructure/Persistence/CareerOpsDbContext.cs` — add the `Companies` set.
- Create `backend/src/CareerOps.Application/Companies/` — `CompanyDto.cs`, `CreateCompanyRequest.cs`, `UpdateCompanyRequest.cs`, `CompanyRequestValidators.cs`, `CompanyMappingConfig.cs`, `CompanyService.cs`.
- Modify `backend/src/CareerOps.Application/DependencyInjection.cs` — register `CompanyService`.
- Create `backend/src/CareerOps.Api/Endpoints/CompanyEndpoints.cs` — `MapCompanies`.
- Modify `backend/src/CareerOps.Api/Program.cs` — map the group.
- Create migration `…/Persistence/Migrations/<ts>_Company.cs` (generated).
- Create `backend/tests/CareerOps.UnitTests/Companies/CompanyRequestValidatorTests.cs`, `CompanyServiceTests.cs`.
- Create `backend/tests/CareerOps.IntegrationTests/CompanyEndpointTests.cs`.
- Create `frontend/src/lib/enums.ts` — int→label maps + option helpers (company enums).
- Create `frontend/src/components/AppLayout.tsx` — nav shell.
- Modify `frontend/src/app/router.tsx` — layout route + `/companies`.
- Create `frontend/src/pages/CompaniesPage.tsx`, `frontend/src/features/companies/CompanyForm.tsx`, `frontend/src/features/companies/CompaniesTable.tsx`.
- Regenerated: `frontend/src/lib/api/companies/*`, `frontend/src/lib/api/model/*`.

**S2.2 JobLead**
- Create `backend/src/CareerOps.Domain/JobLeads/JobLead.cs` + enums `JobSource.cs`, `RemoteMode.cs`, `EmploymentType.cs`, `SalaryPeriod.cs`, `Priority.cs`, `JobLeadStatus.cs`.
- Create `…/Persistence/Configurations/JobLeadConfiguration.cs` (FK to Company, cascade).
- Modify `IAppDbContext.cs` + `CareerOpsDbContext.cs` — add `JobLeads` set.
- Create `backend/src/CareerOps.Application/JobLeads/` — `JobLeadDto.cs`, `CreateJobLeadRequest.cs`, `UpdateJobLeadRequest.cs`, `JobLeadRequestValidators.cs`, `JobLeadMappingConfig.cs`, `JobLeadService.cs`.
- Modify `Application/DependencyInjection.cs` — register `JobLeadService`.
- Create `backend/src/CareerOps.Api/Endpoints/JobLeadEndpoints.cs`; modify `Program.cs`.
- Create migration `<ts>_JobLead.cs` (generated).
- Tests: `…UnitTests/JobLeads/JobLeadRequestValidatorTests.cs`, `JobLeadServiceTests.cs`; `…IntegrationTests/JobLeadEndpointTests.cs`.
- Modify `frontend/src/lib/enums.ts` — add JobLead enum maps.
- Modify `frontend/src/components/AppLayout.tsx` + `router.tsx` — add Job Leads routes.
- Create `frontend/src/pages/JobLeadsPage.tsx`, `JobLeadDetailsPage.tsx`; `frontend/src/features/jobLeads/JobLeadForm.tsx`, `JobLeadsTable.tsx`, `CompanySelect.tsx`.
- Regenerated: `frontend/src/lib/api/job-leads/*`.

**S2.3 Filters / search / dashboard counts**
- Modify `frontend/src/pages/JobLeadsPage.tsx` — search + status/priority filters (client-side).
- Create `frontend/src/pages/DashboardPage.tsx` — lead counts + high-priority rule.
- Modify `frontend/src/components/AppLayout.tsx` + `router.tsx` — Dashboard as index.

---

## Slice S2.1 — Company

### Task 1: Company domain (entity + enums)

**Files:**
- Create: `backend/src/CareerOps.Domain/Companies/CompanyType.cs`, `MarketType.cs`, `CompensationFit.cs`, `Company.cs`

**Interfaces:**
- Produces: `CareerOps.Domain.Companies.Company` (AuditableEntity, `int Id`, `string Name`, nullable strings, three enums); enums `CompanyType`, `MarketType`, `CompensationFit`.

- [ ] **Step 1: Create the three enum files**

`CompanyType.cs`:
```csharp
namespace CareerOps.Domain.Companies;

public enum CompanyType
{
    Unknown = 0,
    Product = 1,
    Outsourcing = 2,
    Startup = 3,
    Enterprise = 4,
    Agency = 5,
}
```

`MarketType.cs`:
```csharp
namespace CareerOps.Domain.Companies;

public enum MarketType
{
    Unknown = 0,
    Local = 1,
    Remote = 2,
    Hybrid = 3,
    International = 4,
}
```

`CompensationFit.cs`:
```csharp
namespace CareerOps.Domain.Companies;

public enum CompensationFit
{
    Unknown = 0,
    Low = 1,
    Medium = 2,
    High = 3,
}
```

- [ ] **Step 2: Create the entity** `Company.cs`

```csharp
using CareerOps.Domain.Common;

namespace CareerOps.Domain.Companies;

public sealed class Company : AuditableEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? WebsiteUrl { get; set; }
    public string? LinkedInUrl { get; set; }
    public string? Country { get; set; }
    public string? City { get; set; }
    public CompanyType CompanyType { get; set; }
    public MarketType MarketType { get; set; }
    public CompensationFit CompensationFit { get; set; }
    public string? Notes { get; set; }
}
```

- [ ] **Step 3: Build**

Run: `dotnet build backend/CareerOps.slnx`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add backend/src/CareerOps.Domain/Companies
git commit -m "feat(domain): add Company entity and enums"
```

---

### Task 2: Company persistence (EF config + DbSet + migration)

**Files:**
- Create: `backend/src/CareerOps.Infrastructure/Persistence/Configurations/CompanyConfiguration.cs`
- Modify: `backend/src/CareerOps.Application/Common/IAppDbContext.cs`
- Modify: `backend/src/CareerOps.Infrastructure/Persistence/CareerOpsDbContext.cs`
- Create: `backend/src/CareerOps.Infrastructure/Persistence/Migrations/<ts>_Company.cs` (generated)

**Interfaces:**
- Consumes: `Company` (Task 1).
- Produces: `IAppDbContext.Companies` (`DbSet<Company>`); table `companies`.

- [ ] **Step 1: Add the EF configuration** `CompanyConfiguration.cs`

```csharp
using CareerOps.Domain.Companies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class CompanyConfiguration : IEntityTypeConfiguration<Company>
{
    public void Configure(EntityTypeBuilder<Company> b)
    {
        b.ToTable("companies");
        b.HasKey(c => c.Id);
        b.Property(c => c.Name).HasMaxLength(200).IsRequired();
        b.Property(c => c.WebsiteUrl).HasMaxLength(2048);
        b.Property(c => c.LinkedInUrl).HasMaxLength(2048);
        b.Property(c => c.Country).HasMaxLength(100);
        b.Property(c => c.City).HasMaxLength(100);
        b.HasIndex(c => c.Name);
    }
}
```

- [ ] **Step 2: Add `Companies` to the context interface** — edit `IAppDbContext.cs`

```csharp
using CareerOps.Domain.Companies;
using CareerOps.Domain.UserProfiles;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Common;

public interface IAppDbContext
{
    DbSet<UserProfile> UserProfiles { get; }
    DbSet<Company> Companies { get; }
    Task<bool> CanConnectAsync(CancellationToken cancellationToken = default);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
```

- [ ] **Step 3: Implement the set in the context** — edit `CareerOpsDbContext.cs`, add the using and the property next to `UserProfiles`

```csharp
using CareerOps.Domain.Companies;
```
```csharp
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<Company> Companies => Set<Company>();
```

- [ ] **Step 4: Build to confirm the model compiles**

Run: `dotnet build backend/CareerOps.slnx`
Expected: build succeeds.

- [ ] **Step 5: Add the migration (CLI)**

Run: `just migrate Company`
(equivalent: `dotnet ef migrations add Company --project backend/src/CareerOps.Infrastructure --startup-project backend/src/CareerOps.Api --output-dir Persistence/Migrations`)
Expected: new `…/Migrations/<ts>_Company.cs` + updated `CareerOpsDbContextModelSnapshot.cs`. Open the migration and confirm it creates a `companies` table with snake_case columns and `company_type`/`market_type`/`compensation_fit` as `integer`.

- [ ] **Step 6: Apply it by running the stack**

Run: `just up`
Expected: API starts; startup auto-migrate applies `Company`. Verify: `docker compose -f deploy/compose/docker-compose.yml exec careerops-postgres psql -U careerops -d careerops -c "\dt companies"` lists the table. (Skip if Docker exec is unavailable — the integration build + later page check covers it.)

- [ ] **Step 7: Commit**

```bash
git add backend/src/CareerOps.Application/Common/IAppDbContext.cs backend/src/CareerOps.Infrastructure
git commit -m "feat(db): add companies table, EF config, and migration"
```

---

### Task 3: Company application layer (DTOs, validators, mapping, service)

**Files:**
- Create: `backend/src/CareerOps.Application/Companies/CompanyDto.cs`, `CreateCompanyRequest.cs`, `UpdateCompanyRequest.cs`, `CompanyRequestValidators.cs`, `CompanyMappingConfig.cs`, `CompanyService.cs`
- Modify: `backend/src/CareerOps.Application/DependencyInjection.cs`
- Test: `backend/tests/CareerOps.UnitTests/Companies/CompanyRequestValidatorTests.cs`, `CompanyServiceTests.cs`

**Interfaces:**
- Consumes: `IAppDbContext.Companies`, `Company`.
- Produces: `CompanyService` with `Task<IReadOnlyList<CompanyDto>> ListAsync(CancellationToken)`, `Task<CompanyDto?> GetAsync(int id, CancellationToken)`, `Task<CompanyDto> CreateAsync(CreateCompanyRequest, CancellationToken)`, `Task<CompanyDto?> UpdateAsync(int id, UpdateCompanyRequest, CancellationToken)`, `Task<bool> DeleteAsync(int id, CancellationToken)`. DTO record `CompanyDto`; request records `CreateCompanyRequest`/`UpdateCompanyRequest`.

- [ ] **Step 1: Create the DTO + request records**

`CompanyDto.cs`:
```csharp
using CareerOps.Domain.Companies;

namespace CareerOps.Application.Companies;

public sealed record CompanyDto(
    int Id, string Name, string? WebsiteUrl, string? LinkedInUrl,
    string? Country, string? City,
    CompanyType CompanyType, MarketType MarketType, CompensationFit CompensationFit,
    string? Notes, DateTime CreatedAtUtc, DateTime UpdatedAtUtc);
```

`CreateCompanyRequest.cs`:
```csharp
using CareerOps.Domain.Companies;

namespace CareerOps.Application.Companies;

public sealed record CreateCompanyRequest(
    string Name, string? WebsiteUrl, string? LinkedInUrl,
    string? Country, string? City,
    CompanyType CompanyType, MarketType MarketType, CompensationFit CompensationFit,
    string? Notes);
```

`UpdateCompanyRequest.cs`:
```csharp
using CareerOps.Domain.Companies;

namespace CareerOps.Application.Companies;

public sealed record UpdateCompanyRequest(
    string Name, string? WebsiteUrl, string? LinkedInUrl,
    string? Country, string? City,
    CompanyType CompanyType, MarketType MarketType, CompensationFit CompensationFit,
    string? Notes);
```

- [ ] **Step 2: Create the validators** `CompanyRequestValidators.cs`

```csharp
using FluentValidation;

namespace CareerOps.Application.Companies;

public sealed class CreateCompanyRequestValidator : AbstractValidator<CreateCompanyRequest>
{
    public CreateCompanyRequestValidator()
    {
        RuleFor(r => r.Name).NotEmpty().MaximumLength(200);
        RuleFor(r => r.WebsiteUrl).Must(CompanyValidation.BeHttpUrl)
            .When(r => !string.IsNullOrWhiteSpace(r.WebsiteUrl))
            .WithMessage("WebsiteUrl must be a valid http(s) URL.");
        RuleFor(r => r.LinkedInUrl).Must(CompanyValidation.BeHttpUrl)
            .When(r => !string.IsNullOrWhiteSpace(r.LinkedInUrl))
            .WithMessage("LinkedInUrl must be a valid http(s) URL.");
        RuleFor(r => r.CompanyType).IsInEnum();
        RuleFor(r => r.MarketType).IsInEnum();
        RuleFor(r => r.CompensationFit).IsInEnum();
    }
}

public sealed class UpdateCompanyRequestValidator : AbstractValidator<UpdateCompanyRequest>
{
    public UpdateCompanyRequestValidator()
    {
        RuleFor(r => r.Name).NotEmpty().MaximumLength(200);
        RuleFor(r => r.WebsiteUrl).Must(CompanyValidation.BeHttpUrl)
            .When(r => !string.IsNullOrWhiteSpace(r.WebsiteUrl))
            .WithMessage("WebsiteUrl must be a valid http(s) URL.");
        RuleFor(r => r.LinkedInUrl).Must(CompanyValidation.BeHttpUrl)
            .When(r => !string.IsNullOrWhiteSpace(r.LinkedInUrl))
            .WithMessage("LinkedInUrl must be a valid http(s) URL.");
        RuleFor(r => r.CompanyType).IsInEnum();
        RuleFor(r => r.MarketType).IsInEnum();
        RuleFor(r => r.CompensationFit).IsInEnum();
    }
}

internal static class CompanyValidation
{
    public static bool BeHttpUrl(string? value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
}
```

- [ ] **Step 3: Create the Mapster config** `CompanyMappingConfig.cs`

```csharp
using CareerOps.Domain.Companies;
using Mapster;

namespace CareerOps.Application.Companies;

public sealed class CompanyMappingConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<Company, CompanyDto>();
        config.NewConfig<CreateCompanyRequest, Company>()
              .Ignore(d => d.Id).Ignore(d => d.CreatedAtUtc).Ignore(d => d.UpdatedAtUtc);
        config.NewConfig<UpdateCompanyRequest, Company>()
              .Ignore(d => d.Id).Ignore(d => d.CreatedAtUtc).Ignore(d => d.UpdatedAtUtc);
    }
}
```

- [ ] **Step 4: Write the failing service tests** `backend/tests/CareerOps.UnitTests/Companies/CompanyServiceTests.cs`

```csharp
using CareerOps.Application.Common;
using CareerOps.Application.Companies;
using CareerOps.Domain.Companies;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.UnitTests.Companies;

public class CompanyServiceTests
{
    private sealed class FixedClock : IClock
    {
        public DateTime UtcNow => new(2026, 6, 19, 12, 0, 0, DateTimeKind.Utc);
        public DateOnly Today => new(2026, 6, 19);
    }

    private static CareerOpsDbContext NewDb() =>
        new(new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase($"careerops-{Guid.NewGuid()}").Options, new FixedClock());

    private static CreateCompanyRequest NewCompany(string name = "Equinor") => new(
        Name: name, WebsiteUrl: "https://equinor.com", LinkedInUrl: null,
        Country: "Norway", City: "Stavanger",
        CompanyType: CompanyType.Enterprise, MarketType: MarketType.Hybrid,
        CompensationFit: CompensationFit.High, Notes: null);

    [Fact]
    public async Task CreateAsync_persists_and_sets_audit()
    {
        await using var db = NewDb();
        var svc = new CompanyService(db);

        var dto = await svc.CreateAsync(NewCompany());

        Assert.True(dto.Id > 0);
        Assert.Equal("Equinor", dto.Name);
        Assert.NotEqual(default, dto.CreatedAtUtc);
    }

    [Fact]
    public async Task UpdateAsync_changes_fields()
    {
        await using var db = NewDb();
        var svc = new CompanyService(db);
        var created = await svc.CreateAsync(NewCompany());

        var updated = await svc.UpdateAsync(created.Id, new UpdateCompanyRequest(
            Name: "Equinor ASA", WebsiteUrl: null, LinkedInUrl: null,
            Country: "Norway", City: "Oslo",
            CompanyType: CompanyType.Enterprise, MarketType: MarketType.International,
            CompensationFit: CompensationFit.High, Notes: "renamed"));

        Assert.NotNull(updated);
        Assert.Equal("Equinor ASA", updated!.Name);
        Assert.Equal("Oslo", updated.City);
    }

    [Fact]
    public async Task UpdateAsync_returns_null_when_missing()
    {
        await using var db = NewDb();
        var svc = new CompanyService(db);

        var updated = await svc.UpdateAsync(999, new UpdateCompanyRequest(
            "X", null, null, null, null,
            CompanyType.Unknown, MarketType.Unknown, CompensationFit.Unknown, null));

        Assert.Null(updated);
    }

    [Fact]
    public async Task DeleteAsync_removes_and_reports()
    {
        await using var db = NewDb();
        var svc = new CompanyService(db);
        var created = await svc.CreateAsync(NewCompany());

        Assert.True(await svc.DeleteAsync(created.Id));
        Assert.False(await svc.DeleteAsync(created.Id));
        Assert.Empty(await svc.ListAsync());
    }
}
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `dotnet test backend/CareerOps.slnx --filter FullyQualifiedName~CompanyServiceTests`
Expected: FAIL — `CompanyService` does not exist (compile error).

- [ ] **Step 6: Implement the service** `CompanyService.cs`

```csharp
using CareerOps.Application.Common;
using CareerOps.Domain.Companies;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Companies;

public sealed class CompanyService(IAppDbContext db)
{
    public async Task<IReadOnlyList<CompanyDto>> ListAsync(CancellationToken ct = default)
    {
        var companies = await db.Companies.OrderBy(c => c.Name).ToListAsync(ct);
        return companies.Adapt<List<CompanyDto>>();
    }

    public async Task<CompanyDto?> GetAsync(int id, CancellationToken ct = default)
    {
        var company = await db.Companies.FirstOrDefaultAsync(c => c.Id == id, ct);
        return company?.Adapt<CompanyDto>();
    }

    public async Task<CompanyDto> CreateAsync(CreateCompanyRequest request, CancellationToken ct = default)
    {
        var company = request.Adapt<Company>();
        db.Companies.Add(company);
        await db.SaveChangesAsync(ct);
        return company.Adapt<CompanyDto>();
    }

    public async Task<CompanyDto?> UpdateAsync(int id, UpdateCompanyRequest request, CancellationToken ct = default)
    {
        var company = await db.Companies.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (company is null) return null;
        request.Adapt(company);
        await db.SaveChangesAsync(ct);
        return company.Adapt<CompanyDto>();
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var company = await db.Companies.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (company is null) return false;
        db.Companies.Remove(company);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
```

- [ ] **Step 7: Register the service** — edit `Application/DependencyInjection.cs`, add after the `UserProfileService` registration

```csharp
        services.AddScoped<CompanyService>();
```
(and `using CareerOps.Application.Companies;` is unnecessary — `AddScoped<CompanyService>()` needs the namespace; add `using CareerOps.Application.Companies;` at the top.)

- [ ] **Step 8: Run the service tests — verify pass**

Run: `dotnet test backend/CareerOps.slnx --filter FullyQualifiedName~CompanyServiceTests`
Expected: PASS (4 tests).

- [ ] **Step 9: Add validator tests** `CompanyRequestValidatorTests.cs`

```csharp
using CareerOps.Application.Companies;
using CareerOps.Domain.Companies;
using FluentValidation.TestHelper;

namespace CareerOps.UnitTests.Companies;

public class CompanyRequestValidatorTests
{
    private readonly CreateCompanyRequestValidator _validator = new();

    private static CreateCompanyRequest Valid() => new(
        Name: "Equinor", WebsiteUrl: "https://equinor.com", LinkedInUrl: null,
        Country: "Norway", City: "Stavanger",
        CompanyType: CompanyType.Enterprise, MarketType: MarketType.Hybrid,
        CompensationFit: CompensationFit.High, Notes: null);

    [Fact]
    public void Valid_request_passes()
        => _validator.TestValidate(Valid()).ShouldNotHaveAnyValidationErrors();

    [Fact]
    public void Blank_name_fails()
        => _validator.TestValidate(Valid() with { Name = "" })
            .ShouldHaveValidationErrorFor(r => r.Name);

    [Fact]
    public void Bad_website_url_fails()
        => _validator.TestValidate(Valid() with { WebsiteUrl = "ftp://nope" })
            .ShouldHaveValidationErrorFor(r => r.WebsiteUrl);

    [Fact]
    public void Out_of_range_enum_fails()
        => _validator.TestValidate(Valid() with { CompanyType = (CompanyType)99 })
            .ShouldHaveValidationErrorFor(r => r.CompanyType);
}
```

- [ ] **Step 10: Run all unit tests**

Run: `dotnet test backend/CareerOps.slnx --filter FullyQualifiedName~Companies`
Expected: PASS (8 tests).

- [ ] **Step 11: Commit**

```bash
git add backend/src/CareerOps.Application backend/tests/CareerOps.UnitTests/Companies
git commit -m "feat(app): Company DTOs, validators, mapping, and service with tests"
```

---

### Task 4: Company API endpoints

**Files:**
- Create: `backend/src/CareerOps.Api/Endpoints/CompanyEndpoints.cs`
- Modify: `backend/src/CareerOps.Api/Program.cs`
- Test: `backend/tests/CareerOps.IntegrationTests/CompanyEndpointTests.cs`

**Interfaces:**
- Consumes: `CompanyService`, `ValidationFilter<T>`.
- Produces: routes under `/api/companies`; operationIds `GetCompanies`, `GetCompany`, `CreateCompany`, `UpdateCompany`, `DeleteCompany`.

- [ ] **Step 1: Create the endpoint module** `CompanyEndpoints.cs`

```csharp
using CareerOps.Api.Filters;
using CareerOps.Application.Companies;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CareerOps.Api.Endpoints;

public static class CompanyEndpoints
{
    public static RouteGroupBuilder MapCompanies(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (CompanyService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.ListAsync(ct)))
             .WithName("GetCompanies");

        group.MapGet("/{id:int}", async Task<Results<Ok<CompanyDto>, NotFound>> (
                int id, CompanyService svc, CancellationToken ct) =>
                await svc.GetAsync(id, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("GetCompany");

        group.MapPost("/", async (CreateCompanyRequest req, CompanyService svc, CancellationToken ct) =>
            {
                var dto = await svc.CreateAsync(req, ct);
                return TypedResults.Created($"/api/companies/{dto.Id}", dto);
            })
             .WithName("CreateCompany")
             .AddEndpointFilter<ValidationFilter<CreateCompanyRequest>>()
             .ProducesValidationProblem();

        group.MapPut("/{id:int}", async Task<Results<Ok<CompanyDto>, NotFound>> (
                int id, UpdateCompanyRequest req, CompanyService svc, CancellationToken ct) =>
                await svc.UpdateAsync(id, req, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("UpdateCompany")
             .AddEndpointFilter<ValidationFilter<UpdateCompanyRequest>>()
             .ProducesValidationProblem();

        group.MapDelete("/{id:int}", async Task<Results<NoContent, NotFound>> (
                int id, CompanyService svc, CancellationToken ct) =>
                await svc.DeleteAsync(id, ct) ? TypedResults.NoContent() : TypedResults.NotFound())
             .WithName("DeleteCompany");

        return group;
    }
}
```

- [ ] **Step 2: Wire it in `Program.cs`** — add after the settings group mapping

```csharp
app.MapGroup("/api/companies").WithTags("Companies").MapCompanies();
```

- [ ] **Step 3: Write the failing integration test** `CompanyEndpointTests.cs`

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace CareerOps.IntegrationTests;

public class CompanyEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Post_company_with_blank_name_returns_400_validation_problem()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/companies", new { name = "" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.ToLowerInvariant().Should().Contain("name");
    }
}
```
> Like `SettingsEndpointTests`, this runs in the `Testing` environment with no database — the `ValidationFilter` rejects before any DB access, so `just verify` stays compose-free.

- [ ] **Step 4: Run it — verify fail then pass**

Run: `dotnet test backend/CareerOps.slnx --filter FullyQualifiedName~CompanyEndpointTests`
Expected: after Steps 1–2 it should PASS (route + validation exist). If you run it before wiring, it fails with 404.

- [ ] **Step 5: Smoke the live endpoints**

With `just up` running:
```powershell
$c = Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/companies -ContentType application/json -Body (@{ name='Equinor'; companyType=4; marketType=3; compensationFit=3 } | ConvertTo-Json)
Invoke-RestMethod -Uri http://localhost:8080/api/companies   # lists it
```
Expected: POST returns the created company with an `id`; GET returns an array containing it.

- [ ] **Step 6: Commit**

```bash
git add backend/src/CareerOps.Api backend/tests/CareerOps.IntegrationTests/CompanyEndpointTests.cs
git commit -m "feat(api): /api/companies CRUD endpoints"
```

---

### Task 5: Company frontend (client + nav shell + page)

**Files:**
- Create: `frontend/src/lib/enums.ts`
- Create: `frontend/src/components/AppLayout.tsx`
- Modify: `frontend/src/app/router.tsx`
- Create: `frontend/src/features/companies/CompanyForm.tsx`, `frontend/src/features/companies/CompaniesTable.tsx`, `frontend/src/pages/CompaniesPage.tsx`
- Regenerated: `frontend/src/lib/api/companies/*`, `frontend/src/lib/api/model/*`

**Interfaces:**
- Consumes: generated hooks `useGetCompanies`, `useCreateCompany`, `useUpdateCompany`, `useDeleteCompany`; model types `CompanyDto`, `CreateCompanyRequest`, `UpdateCompanyRequest`.
- Produces: `lib/enums.ts` exports `companyType`, `marketType`, `compensationFit` (`Record<number,string>`) and `enumOptions(map)`; `AppLayout`; route `/companies`.

- [ ] **Step 1: Regenerate the API client** (API must be running)

Run: `just gen-client`
Expected: new files under `frontend/src/lib/api/companies/` and new model files (`companyDto.ts`, `createCompanyRequest.ts`, `updateCompanyRequest.ts`). Enum properties are typed as `number` (ints over the wire, D5).

- [ ] **Step 2: Create `lib/enums.ts`** (company enums; extended for JobLead in S2.2)

```ts
export type EnumMap = Record<number, string>;
export type EnumOption = { value: number; label: string };

export const enumOptions = (map: EnumMap): EnumOption[] =>
  Object.entries(map).map(([value, label]) => ({ value: Number(value), label }));

export const enumLabel = (map: EnumMap, value: number | null | undefined): string =>
  value == null ? "" : (map[value] ?? String(value));

export const companyType: EnumMap = {
  0: "Unknown", 1: "Product", 2: "Outsourcing", 3: "Startup", 4: "Enterprise", 5: "Agency",
};

export const marketType: EnumMap = {
  0: "Unknown", 1: "Local", 2: "Remote", 3: "Hybrid", 4: "International",
};

export const compensationFit: EnumMap = {
  0: "Unknown", 1: "Low", 2: "Medium", 3: "High",
};
```

- [ ] **Step 3: Create the nav shell** `components/AppLayout.tsx`

```tsx
import { NavLink, Outlet } from "react-router";

const links = [
  { to: "/companies", label: "Companies" },
  { to: "/settings/profile", label: "Settings" },
];

export function AppLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <nav className="mx-auto flex max-w-5xl gap-4 p-4">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                isActive ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground"
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl p-8">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Restructure the router** — edit `app/router.tsx`. Wrap pages in `AppLayout`; the page components keep their own headings but drop the `<main>` wrapper (now provided by the layout).

```tsx
import { createBrowserRouter, RouterProvider, Navigate } from "react-router";
import { AppLayout } from "@/components/AppLayout";
import CompaniesPage from "@/pages/CompaniesPage";
import SettingsProfilePage from "@/pages/SettingsProfilePage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/companies" replace /> },
      { path: "companies", element: <CompaniesPage /> },
      { path: "settings/profile", element: <SettingsProfilePage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```
> Edit `pages/SettingsProfilePage.tsx`: remove the outer `<main className="mx-auto max-w-2xl p-8">` wrapper and return the heading + `<ProfileForm />` directly (the layout now owns the page chrome).

- [ ] **Step 5: Create the company form** `features/companies/CompanyForm.tsx`

```tsx
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { companyType, marketType, compensationFit, enumOptions } from "@/lib/enums";
import type { CompanyDto, CreateCompanyRequest } from "@/lib/api/model";

type FormValues = {
  name: string; websiteUrl: string; linkedInUrl: string;
  country: string; city: string;
  companyType: number; marketType: number; compensationFit: number;
  notes: string;
};

const EMPTY: FormValues = {
  name: "", websiteUrl: "", linkedInUrl: "", country: "", city: "",
  companyType: 0, marketType: 0, compensationFit: 0, notes: "",
};

const toFormValues = (c: CompanyDto): FormValues => ({
  name: c.name ?? "", websiteUrl: c.websiteUrl ?? "", linkedInUrl: c.linkedInUrl ?? "",
  country: c.country ?? "", city: c.city ?? "",
  companyType: c.companyType, marketType: c.marketType, compensationFit: c.compensationFit,
  notes: c.notes ?? "",
});

const trimToNull = (s: string): string | null => (s.trim() === "" ? null : s.trim());

type Props = {
  initial?: CompanyDto;
  pending: boolean;
  errors: string[];
  onSubmit: (req: CreateCompanyRequest) => void;
  onCancel?: () => void;
};

const inputClass = "mt-1 w-full rounded border border-input bg-background p-2";

export function CompanyForm({ initial, pending, errors, onSubmit, onCancel }: Props) {
  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: EMPTY });

  useEffect(() => {
    reset(initial ? toFormValues(initial) : EMPTY);
  }, [initial, reset]);

  const submit = handleSubmit((v) =>
    onSubmit({
      name: v.name.trim(),
      websiteUrl: trimToNull(v.websiteUrl),
      linkedInUrl: trimToNull(v.linkedInUrl),
      country: trimToNull(v.country),
      city: trimToNull(v.city),
      companyType: Number(v.companyType),
      marketType: Number(v.marketType),
      compensationFit: Number(v.compensationFit),
      notes: trimToNull(v.notes),
    }),
  );

  const selects: { name: keyof FormValues; label: string; map: Record<number, string> }[] = [
    { name: "companyType", label: "Type", map: companyType },
    { name: "marketType", label: "Market", map: marketType },
    { name: "compensationFit", label: "Compensation fit", map: compensationFit },
  ];

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Name</label>
        <input className={inputClass} {...register("name")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Website URL</label>
          <input type="url" className={inputClass} {...register("websiteUrl")} />
        </div>
        <div>
          <label className="block text-sm font-medium">LinkedIn URL</label>
          <input type="url" className={inputClass} {...register("linkedInUrl")} />
        </div>
        <div>
          <label className="block text-sm font-medium">Country</label>
          <input className={inputClass} {...register("country")} />
        </div>
        <div>
          <label className="block text-sm font-medium">City</label>
          <input className={inputClass} {...register("city")} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {selects.map((s) => (
          <div key={s.name}>
            <label className="block text-sm font-medium">{s.label}</label>
            <select className={inputClass} {...register(s.name)}>
              {enumOptions(s.map).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div>
        <label className="block text-sm font-medium">Notes</label>
        <textarea rows={3} className={inputClass} {...register("notes")} />
      </div>

      {errors.length > 0 && (
        <ul className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {errors.map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending}
          className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">
          {pending ? "Saving…" : initial ? "Update" : "Add company"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded border px-4 py-2">Cancel</button>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 6: Create the table** `features/companies/CompaniesTable.tsx`

```tsx
import { companyType, marketType, compensationFit, enumLabel } from "@/lib/enums";
import type { CompanyDto } from "@/lib/api/model";

type Props = {
  companies: CompanyDto[];
  onEdit: (c: CompanyDto) => void;
  onDelete: (c: CompanyDto) => void;
};

export function CompaniesTable({ companies, onEdit, onDelete }: Props) {
  if (companies.length === 0) return <p className="text-muted-foreground">No companies yet.</p>;
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b text-left">
          <th className="p-2">Name</th><th className="p-2">Type</th>
          <th className="p-2">Market</th><th className="p-2">Comp.</th>
          <th className="p-2">Location</th><th className="p-2"></th>
        </tr>
      </thead>
      <tbody>
        {companies.map((c) => (
          <tr key={c.id} className="border-b">
            <td className="p-2 font-medium">{c.name}</td>
            <td className="p-2">{enumLabel(companyType, c.companyType)}</td>
            <td className="p-2">{enumLabel(marketType, c.marketType)}</td>
            <td className="p-2">{enumLabel(compensationFit, c.compensationFit)}</td>
            <td className="p-2">{[c.city, c.country].filter(Boolean).join(", ")}</td>
            <td className="p-2 text-right">
              <button onClick={() => onEdit(c)} className="mr-3 text-primary">Edit</button>
              <button onClick={() => onDelete(c)} className="text-destructive">Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 7: Create the page** `pages/CompaniesPage.tsx`

```tsx
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany,
  getGetCompaniesQueryKey,
} from "@/lib/api/companies/companies";
import type { CompanyDto, CreateCompanyRequest } from "@/lib/api/model";
import { CompanyForm } from "@/features/companies/CompanyForm";
import { CompaniesTable } from "@/features/companies/CompaniesTable";

export default function CompaniesPage() {
  const queryClient = useQueryClient();
  const { data: response, isLoading } = useGetCompanies();
  const create = useCreateCompany();
  const update = useUpdateCompany();
  const remove = useDeleteCompany();
  const [editing, setEditing] = useState<CompanyDto | undefined>();
  const [errors, setErrors] = useState<string[]>([]);

  const companies = response?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetCompaniesQueryKey() });

  const readErrors = (e: unknown): string[] => {
    const problem = (e as { data?: { errors?: Record<string, string[]> } }).data;
    return problem?.errors ? Object.values(problem.errors).flat() : ["Save failed."];
  };

  const onSubmit = async (req: CreateCompanyRequest) => {
    setErrors([]);
    try {
      if (editing) await update.mutateAsync({ id: editing.id, data: req });
      else await create.mutateAsync({ data: req });
      setEditing(undefined);
      invalidate();
    } catch (e) {
      setErrors(readErrors(e));
    }
  };

  const onDelete = async (c: CompanyDto) => {
    if (!confirm(`Delete ${c.name}? This also deletes its job leads.`)) return;
    await remove.mutateAsync({ id: c.id });
    if (editing?.id === c.id) setEditing(undefined);
    invalidate();
  };

  if (isLoading) return <p>Loading…</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Companies</h1>
      <section className="rounded border p-4">
        <h2 className="mb-4 text-lg font-medium">{editing ? `Edit ${editing.name}` : "Add company"}</h2>
        <CompanyForm
          initial={editing}
          pending={create.isPending || update.isPending}
          errors={errors}
          onSubmit={onSubmit}
          onCancel={editing ? () => { setEditing(undefined); setErrors([]); } : undefined}
        />
      </section>
      <CompaniesTable companies={companies} onEdit={setEditing} onDelete={onDelete} />
    </div>
  );
}
```
> Confirm the generated query-key helper is named `getGetCompaniesQueryKey` (matches the `getGetUserProfileQueryKey` pattern). If orval names it differently, use the generated name.

- [ ] **Step 8: Typecheck + build**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: no TS errors; build succeeds.

- [ ] **Step 9: Manual usability check (human acceptance)**

With `just up` + `just web`: open `http://localhost:5280/companies`. Add a company; it appears in the table. Edit it; changes persist. Reload — values persist. Submit a blank name — the API validation error shows. Restart the stack (`just down && just up`) — the company is still there (DB persistence).

- [ ] **Step 10: Run the full gate + commit**

Run: `just verify`
Expected: backend build + tests, frontend typecheck + build all green.
```bash
git add frontend
git commit -m "feat(web): Companies page with add/edit/delete and nav shell"
```

- [ ] **Step 11: Log decisions** — append D24 + D25 to `docs/knowledge-base/03-decisions.md` (full entries; text from the "Design decisions" section above). Commit:
```bash
git add docs/knowledge-base/03-decisions.md
git commit -m "docs: log D24 (client-side Phase 2 filtering) and D25 (JobLead find-or-create company)"
```

---

## Slice S2.2 — JobLead ⭐ (replace the spreadsheet)

### Task 6: JobLead domain (entity + enums)

**Files:**
- Create: `backend/src/CareerOps.Domain/JobLeads/JobSource.cs`, `RemoteMode.cs`, `EmploymentType.cs`, `SalaryPeriod.cs`, `Priority.cs`, `JobLeadStatus.cs`, `JobLead.cs`

**Interfaces:**
- Produces: `CareerOps.Domain.JobLeads.JobLead` (AuditableEntity, `int Id`, `int CompanyId`, `Company? Company` nav, fields per PRD §12.2) and six pinned enums.

- [ ] **Step 1: Create the six enum files** (values in PRD order, first = 0)

`JobSource.cs`:
```csharp
namespace CareerOps.Domain.JobLeads;

public enum JobSource
{
    Unknown = 0, LinkedIn = 1, Referral = 2, Recruiter = 3, CompanyWebsite = 4,
    BDJobs = 5, Wellfound = 6, RemoteOK = 7, Email = 8, Other = 9,
}
```

`RemoteMode.cs`:
```csharp
namespace CareerOps.Domain.JobLeads;

public enum RemoteMode
{
    Unknown = 0, Onsite = 1, Hybrid = 2, Remote = 3, Flexible = 4,
}
```

`EmploymentType.cs`:
```csharp
namespace CareerOps.Domain.JobLeads;

public enum EmploymentType
{
    Unknown = 0, FullTime = 1, Contract = 2, PartTime = 3, Freelance = 4,
}
```

`SalaryPeriod.cs`:
```csharp
namespace CareerOps.Domain.JobLeads;

public enum SalaryPeriod
{
    Unknown = 0, Monthly = 1, Yearly = 2, Hourly = 3,
}
```

`Priority.cs`:
```csharp
namespace CareerOps.Domain.JobLeads;

public enum Priority
{
    Low = 0, Medium = 1, High = 2, Critical = 3,
}
```

`JobLeadStatus.cs`:
```csharp
namespace CareerOps.Domain.JobLeads;

public enum JobLeadStatus
{
    Discovered = 0, Interested = 1, Applied = 2, Interviewing = 3, Offer = 4,
    Rejected = 5, Ghosted = 6, Withdrawn = 7, Archived = 8,
}
```

- [ ] **Step 2: Create the entity** `JobLead.cs`

```csharp
using CareerOps.Domain.Common;
using CareerOps.Domain.Companies;

namespace CareerOps.Domain.JobLeads;

public sealed class JobLead : AuditableEntity
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    public Company? Company { get; set; }
    public string Title { get; set; } = "";
    public JobSource Source { get; set; }
    public string? SourceUrl { get; set; }
    public string? JobDescription { get; set; }
    public string? Location { get; set; }
    public RemoteMode RemoteMode { get; set; }
    public EmploymentType EmploymentType { get; set; }
    public decimal? SalaryMin { get; set; }
    public decimal? SalaryMax { get; set; }
    public string? SalaryCurrency { get; set; }
    public SalaryPeriod SalaryPeriod { get; set; }
    public Priority Priority { get; set; }
    public JobLeadStatus Status { get; set; }
    public int? FitScore { get; set; }
    public string? AiSummary { get; set; }
    public string? MissingKeywords { get; set; }
    public string? SuggestedResumeAngle { get; set; }
    public DateTime? NextActionAtUtc { get; set; }
    public DateTime? DeadlineAtUtc { get; set; }
    public string? Notes { get; set; }
}
```

- [ ] **Step 3: Build + commit**

Run: `dotnet build backend/CareerOps.slnx`
Expected: succeeds.
```bash
git add backend/src/CareerOps.Domain/JobLeads
git commit -m "feat(domain): add JobLead entity and enums"
```

---

### Task 7: JobLead persistence (EF config + FK cascade + migration)

**Files:**
- Create: `backend/src/CareerOps.Infrastructure/Persistence/Configurations/JobLeadConfiguration.cs`
- Modify: `IAppDbContext.cs`, `CareerOpsDbContext.cs`
- Create: migration `<ts>_JobLead.cs` (generated)

**Interfaces:**
- Consumes: `JobLead`, `Company`.
- Produces: `IAppDbContext.JobLeads`; table `job_leads` with FK `company_id` → `companies` ON DELETE CASCADE.

- [ ] **Step 1: Add the EF configuration** `JobLeadConfiguration.cs`

```csharp
using CareerOps.Domain.JobLeads;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class JobLeadConfiguration : IEntityTypeConfiguration<JobLead>
{
    public void Configure(EntityTypeBuilder<JobLead> b)
    {
        b.ToTable("job_leads");
        b.HasKey(l => l.Id);
        b.Property(l => l.Title).HasMaxLength(300).IsRequired();
        b.Property(l => l.SourceUrl).HasMaxLength(2048);
        b.Property(l => l.Location).HasMaxLength(200);
        b.Property(l => l.SalaryCurrency).HasMaxLength(3);
        b.Property(l => l.SuggestedResumeAngle).HasMaxLength(2000);
        b.Property(l => l.SalaryMin).HasPrecision(18, 2);
        b.Property(l => l.SalaryMax).HasPrecision(18, 2);

        b.HasOne(l => l.Company)
         .WithMany()
         .HasForeignKey(l => l.CompanyId)
         .OnDelete(DeleteBehavior.Cascade);

        b.HasIndex(l => l.CompanyId);
        b.HasIndex(l => l.Status);
        b.HasIndex(l => l.Priority);
    }
}
```
> `JobDescription`, `AiSummary`, `MissingKeywords`, `Notes` are left unbounded (`text`) deliberately — pasted descriptions and AI output can be long.

- [ ] **Step 2: Add `JobLeads` to `IAppDbContext.cs`**

```csharp
using CareerOps.Domain.JobLeads;
```
```csharp
    DbSet<JobLead> JobLeads { get; }
```

- [ ] **Step 3: Implement the set in `CareerOpsDbContext.cs`**

```csharp
using CareerOps.Domain.JobLeads;
```
```csharp
    public DbSet<JobLead> JobLeads => Set<JobLead>();
```

- [ ] **Step 4: Build**

Run: `dotnet build backend/CareerOps.slnx`
Expected: succeeds.

- [ ] **Step 5: Add the migration**

Run: `just migrate JobLead`
Expected: `<ts>_JobLead.cs` creates `job_leads` with `company_id` FK (cascade), int enum columns, `numeric(18,2)` salaries, indexes. Confirm the FK `onDelete: ReferentialAction.Cascade`.

- [ ] **Step 6: Apply + commit**

Run: `just up` (startup auto-migrate applies it).
```bash
git add backend/src/CareerOps.Application/Common/IAppDbContext.cs backend/src/CareerOps.Infrastructure
git commit -m "feat(db): add job_leads table with company FK cascade and migration"
```

---

### Task 8: JobLead application layer (DTOs, find-or-create service, validators, mapping)

**Files:**
- Create: `backend/src/CareerOps.Application/JobLeads/JobLeadDto.cs`, `CreateJobLeadRequest.cs`, `UpdateJobLeadRequest.cs`, `JobLeadRequestValidators.cs`, `JobLeadMappingConfig.cs`, `JobLeadService.cs`
- Modify: `Application/DependencyInjection.cs`
- Test: `backend/tests/CareerOps.UnitTests/JobLeads/JobLeadRequestValidatorTests.cs`, `JobLeadServiceTests.cs`

**Interfaces:**
- Consumes: `IAppDbContext.JobLeads`/`.Companies`, `JobLead`, `Company`.
- Produces: `JobLeadService` — `ListAsync`, `GetAsync(int)`, `CreateAsync(CreateJobLeadRequest)`, `UpdateAsync(int, UpdateJobLeadRequest)`, `DeleteAsync(int)` (all `CancellationToken`), returning `JobLeadDto?`/`IReadOnlyList<JobLeadDto>`/`bool`. `JobLeadDto` includes `CompanyName`. `CreateJobLeadRequest` has `int? CompanyId` + `string? NewCompanyName` (D25).

- [ ] **Step 1: Create the DTO** `JobLeadDto.cs`

```csharp
using CareerOps.Domain.JobLeads;

namespace CareerOps.Application.JobLeads;

public sealed record JobLeadDto(
    int Id, int CompanyId, string CompanyName, string Title,
    JobSource Source, string? SourceUrl, string? JobDescription, string? Location,
    RemoteMode RemoteMode, EmploymentType EmploymentType,
    decimal? SalaryMin, decimal? SalaryMax, string? SalaryCurrency, SalaryPeriod SalaryPeriod,
    Priority Priority, JobLeadStatus Status,
    int? FitScore, string? AiSummary, string? MissingKeywords, string? SuggestedResumeAngle,
    DateTime? NextActionAtUtc, DateTime? DeadlineAtUtc, string? Notes,
    DateTime CreatedAtUtc, DateTime UpdatedAtUtc);
```

- [ ] **Step 2: Create the request records**

`CreateJobLeadRequest.cs`:
```csharp
using CareerOps.Domain.JobLeads;

namespace CareerOps.Application.JobLeads;

public sealed record CreateJobLeadRequest(
    int? CompanyId, string? NewCompanyName, string Title,
    JobSource Source, string? SourceUrl, string? JobDescription, string? Location,
    RemoteMode RemoteMode, EmploymentType EmploymentType,
    decimal? SalaryMin, decimal? SalaryMax, string? SalaryCurrency, SalaryPeriod SalaryPeriod,
    Priority Priority, JobLeadStatus Status,
    int? FitScore, DateTime? NextActionAtUtc, DateTime? DeadlineAtUtc, string? Notes);
```

`UpdateJobLeadRequest.cs`:
```csharp
using CareerOps.Domain.JobLeads;

namespace CareerOps.Application.JobLeads;

public sealed record UpdateJobLeadRequest(
    int CompanyId, string Title,
    JobSource Source, string? SourceUrl, string? JobDescription, string? Location,
    RemoteMode RemoteMode, EmploymentType EmploymentType,
    decimal? SalaryMin, decimal? SalaryMax, string? SalaryCurrency, SalaryPeriod SalaryPeriod,
    Priority Priority, JobLeadStatus Status,
    int? FitScore, DateTime? NextActionAtUtc, DateTime? DeadlineAtUtc, string? Notes);
```
> AI fields (`AiSummary`, `MissingKeywords`, `SuggestedResumeAngle`) are **not** in the requests — they are written by Phase 6 analyze-fit, not user edits.

- [ ] **Step 3: Create the validators** `JobLeadRequestValidators.cs`

```csharp
using FluentValidation;

namespace CareerOps.Application.JobLeads;

public sealed class CreateJobLeadRequestValidator : AbstractValidator<CreateJobLeadRequest>
{
    public CreateJobLeadRequestValidator()
    {
        RuleFor(r => r.Title).NotEmpty().MaximumLength(300);
        RuleFor(r => r.Priority).IsInEnum();
        RuleFor(r => r.Status).IsInEnum();
        RuleFor(r => r.Source).IsInEnum();
        RuleFor(r => r.RemoteMode).IsInEnum();
        RuleFor(r => r.EmploymentType).IsInEnum();
        RuleFor(r => r.SalaryPeriod).IsInEnum();
        RuleFor(r => r.FitScore).InclusiveBetween(0, 100).When(r => r.FitScore.HasValue);
        RuleFor(r => r.SalaryCurrency).Length(3).When(r => !string.IsNullOrWhiteSpace(r.SalaryCurrency));
        RuleFor(r => r.SalaryMax).GreaterThanOrEqualTo(r => r.SalaryMin!.Value)
            .When(r => r.SalaryMin.HasValue && r.SalaryMax.HasValue)
            .WithMessage("SalaryMax must be greater than or equal to SalaryMin.");
        RuleFor(r => r.SourceUrl).Must(JobLeadValidation.BeHttpUrl)
            .When(r => !string.IsNullOrWhiteSpace(r.SourceUrl))
            .WithMessage("SourceUrl must be a valid http(s) URL.");
        RuleFor(r => r)
            .Must(r => (r.CompanyId.HasValue) ^ !string.IsNullOrWhiteSpace(r.NewCompanyName))
            .WithName("Company")
            .WithMessage("Provide exactly one of CompanyId or NewCompanyName.");
    }
}

public sealed class UpdateJobLeadRequestValidator : AbstractValidator<UpdateJobLeadRequest>
{
    public UpdateJobLeadRequestValidator()
    {
        RuleFor(r => r.CompanyId).GreaterThan(0);
        RuleFor(r => r.Title).NotEmpty().MaximumLength(300);
        RuleFor(r => r.Priority).IsInEnum();
        RuleFor(r => r.Status).IsInEnum();
        RuleFor(r => r.Source).IsInEnum();
        RuleFor(r => r.RemoteMode).IsInEnum();
        RuleFor(r => r.EmploymentType).IsInEnum();
        RuleFor(r => r.SalaryPeriod).IsInEnum();
        RuleFor(r => r.FitScore).InclusiveBetween(0, 100).When(r => r.FitScore.HasValue);
        RuleFor(r => r.SalaryCurrency).Length(3).When(r => !string.IsNullOrWhiteSpace(r.SalaryCurrency));
        RuleFor(r => r.SalaryMax).GreaterThanOrEqualTo(r => r.SalaryMin!.Value)
            .When(r => r.SalaryMin.HasValue && r.SalaryMax.HasValue)
            .WithMessage("SalaryMax must be greater than or equal to SalaryMin.");
        RuleFor(r => r.SourceUrl).Must(JobLeadValidation.BeHttpUrl)
            .When(r => !string.IsNullOrWhiteSpace(r.SourceUrl))
            .WithMessage("SourceUrl must be a valid http(s) URL.");
    }
}

internal static class JobLeadValidation
{
    public static bool BeHttpUrl(string? value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
}
```

- [ ] **Step 4: Create the Mapster config** `JobLeadMappingConfig.cs`

```csharp
using CareerOps.Domain.JobLeads;
using Mapster;

namespace CareerOps.Application.JobLeads;

public sealed class JobLeadMappingConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<JobLead, JobLeadDto>()
              .Map(d => d.CompanyName, s => s.Company == null ? "" : s.Company.Name);

        config.NewConfig<CreateJobLeadRequest, JobLead>()
              .Ignore(d => d.Id).Ignore(d => d.CompanyId).Ignore(d => d.Company!)
              .Ignore(d => d.CreatedAtUtc).Ignore(d => d.UpdatedAtUtc)
              .Ignore(d => d.AiSummary).Ignore(d => d.MissingKeywords).Ignore(d => d.SuggestedResumeAngle);

        config.NewConfig<UpdateJobLeadRequest, JobLead>()
              .Ignore(d => d.Id).Ignore(d => d.CompanyId).Ignore(d => d.Company!)
              .Ignore(d => d.CreatedAtUtc).Ignore(d => d.UpdatedAtUtc)
              .Ignore(d => d.AiSummary).Ignore(d => d.MissingKeywords).Ignore(d => d.SuggestedResumeAngle);
    }
}
```
> `CompanyId` is set explicitly by the service (find-or-create), so the mapping ignores it.

- [ ] **Step 5: Write the failing service tests** `JobLeadServiceTests.cs`

```csharp
using CareerOps.Application.Common;
using CareerOps.Application.JobLeads;
using CareerOps.Domain.Companies;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.UnitTests.JobLeads;

public class JobLeadServiceTests
{
    private sealed class FixedClock : IClock
    {
        public DateTime UtcNow => new(2026, 6, 19, 12, 0, 0, DateTimeKind.Utc);
        public DateOnly Today => new(2026, 6, 19);
    }

    private static CareerOpsDbContext NewDb() =>
        new(new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase($"careerops-{Guid.NewGuid()}").Options, new FixedClock());

    private static CreateJobLeadRequest NewLead(int? companyId = null, string? newCompanyName = null) => new(
        CompanyId: companyId, NewCompanyName: newCompanyName, Title: "Backend Engineer",
        Source: Domain.JobLeads.JobSource.LinkedIn, SourceUrl: null, JobDescription: "build APIs",
        Location: "Oslo", RemoteMode: Domain.JobLeads.RemoteMode.Hybrid,
        EmploymentType: Domain.JobLeads.EmploymentType.FullTime,
        SalaryMin: 800000m, SalaryMax: 950000m, SalaryCurrency: "NOK",
        SalaryPeriod: Domain.JobLeads.SalaryPeriod.Yearly,
        Priority: Domain.JobLeads.Priority.High, Status: Domain.JobLeads.JobLeadStatus.Discovered,
        FitScore: null, NextActionAtUtc: null, DeadlineAtUtc: null, Notes: null);

    [Fact]
    public async Task CreateAsync_with_existing_companyId_links_lead()
    {
        await using var db = NewDb();
        var company = new Company { Name = "Equinor" };
        db.Companies.Add(company);
        await db.SaveChangesAsync();

        var dto = await new JobLeadService(db).CreateAsync(NewLead(companyId: company.Id));

        Assert.Equal(company.Id, dto.CompanyId);
        Assert.Equal("Equinor", dto.CompanyName);
        Assert.Equal("Backend Engineer", dto.Title);
    }

    [Fact]
    public async Task CreateAsync_with_new_company_name_creates_company()
    {
        await using var db = NewDb();
        var svc = new JobLeadService(db);

        var dto = await svc.CreateAsync(NewLead(newCompanyName: "Cognite"));

        Assert.True(dto.CompanyId > 0);
        Assert.Equal("Cognite", dto.CompanyName);
        Assert.Single(await db.Companies.ToListAsync());
    }

    [Fact]
    public async Task CreateAsync_with_existing_name_does_not_duplicate_company()
    {
        await using var db = NewDb();
        db.Companies.Add(new Company { Name = "Cognite" });
        await db.SaveChangesAsync();
        var svc = new JobLeadService(db);

        await svc.CreateAsync(NewLead(newCompanyName: "  cognite "));

        Assert.Single(await db.Companies.ToListAsync()); // matched case-insensitively, no dup
    }

    [Fact]
    public async Task UpdateAsync_changes_status_and_keeps_company()
    {
        await using var db = NewDb();
        var svc = new JobLeadService(db);
        var created = await svc.CreateAsync(NewLead(newCompanyName: "Cognite"));

        var updated = await svc.UpdateAsync(created.Id, new UpdateJobLeadRequest(
            CompanyId: created.CompanyId, Title: created.Title,
            Source: Domain.JobLeads.JobSource.LinkedIn, SourceUrl: null, JobDescription: null, Location: "Oslo",
            RemoteMode: Domain.JobLeads.RemoteMode.Remote, EmploymentType: Domain.JobLeads.EmploymentType.FullTime,
            SalaryMin: null, SalaryMax: null, SalaryCurrency: null, SalaryPeriod: Domain.JobLeads.SalaryPeriod.Yearly,
            Priority: Domain.JobLeads.Priority.Critical, Status: Domain.JobLeads.JobLeadStatus.Applied,
            FitScore: 80, NextActionAtUtc: null, DeadlineAtUtc: null, Notes: null));

        Assert.NotNull(updated);
        Assert.Equal(Domain.JobLeads.JobLeadStatus.Applied, updated!.Status);
        Assert.Equal(80, updated.FitScore);
    }

    [Fact]
    public async Task DeleteAsync_removes_lead()
    {
        await using var db = NewDb();
        var svc = new JobLeadService(db);
        var created = await svc.CreateAsync(NewLead(newCompanyName: "Cognite"));

        Assert.True(await svc.DeleteAsync(created.Id));
        Assert.Empty(await svc.ListAsync());
    }
}
```

- [ ] **Step 6: Run tests — verify fail**

Run: `dotnet test backend/CareerOps.slnx --filter FullyQualifiedName~JobLeadServiceTests`
Expected: FAIL — `JobLeadService` not defined.

- [ ] **Step 7: Implement the service** `JobLeadService.cs`

```csharp
using CareerOps.Application.Common;
using CareerOps.Domain.Companies;
using CareerOps.Domain.JobLeads;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.JobLeads;

public sealed class JobLeadService(IAppDbContext db)
{
    public async Task<IReadOnlyList<JobLeadDto>> ListAsync(CancellationToken ct = default)
    {
        var leads = await db.JobLeads
            .Include(l => l.Company)
            .OrderByDescending(l => l.UpdatedAtUtc)
            .ToListAsync(ct);
        return leads.Adapt<List<JobLeadDto>>();
    }

    public async Task<JobLeadDto?> GetAsync(int id, CancellationToken ct = default)
    {
        var lead = await db.JobLeads.Include(l => l.Company).FirstOrDefaultAsync(l => l.Id == id, ct);
        return lead?.Adapt<JobLeadDto>();
    }

    public async Task<JobLeadDto> CreateAsync(CreateJobLeadRequest request, CancellationToken ct = default)
    {
        var lead = request.Adapt<JobLead>();
        lead.CompanyId = await ResolveCompanyIdAsync(request.CompanyId, request.NewCompanyName, ct);
        db.JobLeads.Add(lead);
        await db.SaveChangesAsync(ct);
        return (await GetAsync(lead.Id, ct))!;
    }

    public async Task<JobLeadDto?> UpdateAsync(int id, UpdateJobLeadRequest request, CancellationToken ct = default)
    {
        var lead = await db.JobLeads.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lead is null) return null;
        request.Adapt(lead);
        lead.CompanyId = request.CompanyId;
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var lead = await db.JobLeads.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lead is null) return false;
        db.JobLeads.Remove(lead);
        await db.SaveChangesAsync(ct);
        return true;
    }

    // D25: existing company by id, or find-or-create by case-insensitive trimmed name (defaults to Unknown enums).
    private async Task<int> ResolveCompanyIdAsync(int? companyId, string? newCompanyName, CancellationToken ct)
    {
        if (companyId is int id) return id;

        var name = newCompanyName!.Trim();
        var existing = await db.Companies
            .FirstOrDefaultAsync(c => c.Name.ToLower() == name.ToLower(), ct);
        if (existing is not null) return existing.Id;

        var company = new Company { Name = name };
        db.Companies.Add(company);
        await db.SaveChangesAsync(ct);
        return company.Id;
    }
}
```

- [ ] **Step 8: Register the service** — edit `Application/DependencyInjection.cs`

```csharp
using CareerOps.Application.JobLeads;
```
```csharp
        services.AddScoped<JobLeadService>();
```

- [ ] **Step 9: Run service tests — verify pass**

Run: `dotnet test backend/CareerOps.slnx --filter FullyQualifiedName~JobLeadServiceTests`
Expected: PASS (5 tests).

- [ ] **Step 10: Add validator tests** `JobLeadRequestValidatorTests.cs`

```csharp
using CareerOps.Application.JobLeads;
using CareerOps.Domain.JobLeads;
using FluentValidation.TestHelper;

namespace CareerOps.UnitTests.JobLeads;

public class JobLeadRequestValidatorTests
{
    private readonly CreateJobLeadRequestValidator _validator = new();

    private static CreateJobLeadRequest Valid() => new(
        CompanyId: 1, NewCompanyName: null, Title: "Backend Engineer",
        Source: JobSource.LinkedIn, SourceUrl: "https://jobs.example.com/1", JobDescription: null, Location: "Oslo",
        RemoteMode: RemoteMode.Hybrid, EmploymentType: EmploymentType.FullTime,
        SalaryMin: 800000m, SalaryMax: 950000m, SalaryCurrency: "NOK", SalaryPeriod: SalaryPeriod.Yearly,
        Priority: Priority.High, Status: JobLeadStatus.Discovered,
        FitScore: 75, NextActionAtUtc: null, DeadlineAtUtc: null, Notes: null);

    [Fact]
    public void Valid_request_passes()
        => _validator.TestValidate(Valid()).ShouldNotHaveAnyValidationErrors();

    [Fact]
    public void Blank_title_fails()
        => _validator.TestValidate(Valid() with { Title = "" })
            .ShouldHaveValidationErrorFor(r => r.Title);

    [Fact]
    public void Both_company_options_fails()
        => _validator.TestValidate(Valid() with { CompanyId = 1, NewCompanyName = "X" })
            .ShouldHaveValidationErrorFor("Company");

    [Fact]
    public void Neither_company_option_fails()
        => _validator.TestValidate(Valid() with { CompanyId = null, NewCompanyName = null })
            .ShouldHaveValidationErrorFor("Company");

    [Fact]
    public void New_company_name_only_passes()
        => _validator.TestValidate(Valid() with { CompanyId = null, NewCompanyName = "Cognite" })
            .ShouldNotHaveValidationErrorFor("Company");

    [Fact]
    public void Fit_score_over_100_fails()
        => _validator.TestValidate(Valid() with { FitScore = 101 })
            .ShouldHaveValidationErrorFor(r => r.FitScore);

    [Fact]
    public void Salary_max_below_min_fails()
        => _validator.TestValidate(Valid() with { SalaryMin = 900000m, SalaryMax = 800000m })
            .ShouldHaveValidationErrorFor(r => r.SalaryMax);
}
```

- [ ] **Step 11: Run all JobLead unit tests + commit**

Run: `dotnet test backend/CareerOps.slnx --filter FullyQualifiedName~JobLeads`
Expected: PASS (12 tests).
```bash
git add backend/src/CareerOps.Application backend/tests/CareerOps.UnitTests/JobLeads
git commit -m "feat(app): JobLead DTOs, find-or-create service, validators, mapping with tests"
```

---

### Task 9: JobLead API endpoints

**Files:**
- Create: `backend/src/CareerOps.Api/Endpoints/JobLeadEndpoints.cs`
- Modify: `backend/src/CareerOps.Api/Program.cs`
- Test: `backend/tests/CareerOps.IntegrationTests/JobLeadEndpointTests.cs`

**Interfaces:**
- Consumes: `JobLeadService`, `ValidationFilter<T>`.
- Produces: routes under `/api/job-leads`; operationIds `GetJobLeads`, `GetJobLead`, `CreateJobLead`, `UpdateJobLead`, `DeleteJobLead`.

- [ ] **Step 1: Create the endpoint module** `JobLeadEndpoints.cs`

```csharp
using CareerOps.Api.Filters;
using CareerOps.Application.JobLeads;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CareerOps.Api.Endpoints;

public static class JobLeadEndpoints
{
    public static RouteGroupBuilder MapJobLeads(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (JobLeadService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.ListAsync(ct)))
             .WithName("GetJobLeads");

        group.MapGet("/{id:int}", async Task<Results<Ok<JobLeadDto>, NotFound>> (
                int id, JobLeadService svc, CancellationToken ct) =>
                await svc.GetAsync(id, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("GetJobLead");

        group.MapPost("/", async (CreateJobLeadRequest req, JobLeadService svc, CancellationToken ct) =>
            {
                var dto = await svc.CreateAsync(req, ct);
                return TypedResults.Created($"/api/job-leads/{dto.Id}", dto);
            })
             .WithName("CreateJobLead")
             .AddEndpointFilter<ValidationFilter<CreateJobLeadRequest>>()
             .ProducesValidationProblem();

        group.MapPut("/{id:int}", async Task<Results<Ok<JobLeadDto>, NotFound>> (
                int id, UpdateJobLeadRequest req, JobLeadService svc, CancellationToken ct) =>
                await svc.UpdateAsync(id, req, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("UpdateJobLead")
             .AddEndpointFilter<ValidationFilter<UpdateJobLeadRequest>>()
             .ProducesValidationProblem();

        group.MapDelete("/{id:int}", async Task<Results<NoContent, NotFound>> (
                int id, JobLeadService svc, CancellationToken ct) =>
                await svc.DeleteAsync(id, ct) ? TypedResults.NoContent() : TypedResults.NotFound())
             .WithName("DeleteJobLead");

        return group;
    }
}
```
> The Phase-2 endpoints are CRUD only. `analyze-fit` (Phase 6) and `convert-to-application` (Phase 3) from PRD §14.4 are out of scope here.

- [ ] **Step 2: Wire it in `Program.cs`**

```csharp
app.MapGroup("/api/job-leads").WithTags("JobLeads").MapJobLeads();
```

- [ ] **Step 3: Add the integration test** `JobLeadEndpointTests.cs`

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace CareerOps.IntegrationTests;

public class JobLeadEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Post_job_lead_with_blank_title_returns_400()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/job-leads",
            new { title = "", companyId = 1, priority = 2, status = 0 });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).ToLowerInvariant().Should().Contain("title");
    }

    [Fact]
    public async Task Post_job_lead_without_company_returns_400()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/job-leads",
            new { title = "Backend Engineer", priority = 2, status = 0 });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
```

- [ ] **Step 4: Run it**

Run: `dotnet test backend/CareerOps.slnx --filter FullyQualifiedName~JobLeadEndpointTests`
Expected: PASS (2 tests, validation rejects pre-DB in `Testing`).

- [ ] **Step 5: Commit**

```bash
git add backend/src/CareerOps.Api backend/tests/CareerOps.IntegrationTests/JobLeadEndpointTests.cs
git commit -m "feat(api): /api/job-leads CRUD endpoints"
```

---

### Task 10: JobLead list page (client + enums + table)

**Files:**
- Modify: `frontend/src/lib/enums.ts` (add JobLead enums)
- Modify: `frontend/src/components/AppLayout.tsx`, `frontend/src/app/router.tsx`
- Create: `frontend/src/features/jobLeads/JobLeadsTable.tsx`, `frontend/src/pages/JobLeadsPage.tsx`
- Regenerated: `frontend/src/lib/api/job-leads/*`

**Interfaces:**
- Consumes: generated `useGetJobLeads`, `useDeleteJobLead`; model `JobLeadDto`.
- Produces: enum maps `jobSource`, `remoteMode`, `employmentType`, `salaryPeriod`, `priority`, `jobLeadStatus`; route `/job-leads`.

- [ ] **Step 1: Regenerate the client**

Run: `just gen-client`
Expected: `frontend/src/lib/api/job-leads/*` + model files `jobLeadDto.ts`, `createJobLeadRequest.ts`, `updateJobLeadRequest.ts`.

- [ ] **Step 2: Add JobLead enum maps to `lib/enums.ts`**

```ts
export const jobSource: EnumMap = {
  0: "Unknown", 1: "LinkedIn", 2: "Referral", 3: "Recruiter", 4: "Company website",
  5: "BDJobs", 6: "Wellfound", 7: "RemoteOK", 8: "Email", 9: "Other",
};

export const remoteMode: EnumMap = {
  0: "Unknown", 1: "Onsite", 2: "Hybrid", 3: "Remote", 4: "Flexible",
};

export const employmentType: EnumMap = {
  0: "Unknown", 1: "Full-time", 2: "Contract", 3: "Part-time", 4: "Freelance",
};

export const salaryPeriod: EnumMap = {
  0: "Unknown", 1: "Monthly", 2: "Yearly", 3: "Hourly",
};

export const priority: EnumMap = {
  0: "Low", 1: "Medium", 2: "High", 3: "Critical",
};

export const jobLeadStatus: EnumMap = {
  0: "Discovered", 1: "Interested", 2: "Applied", 3: "Interviewing", 4: "Offer",
  5: "Rejected", 6: "Ghosted", 7: "Withdrawn", 8: "Archived",
};
```

- [ ] **Step 3: Add the Job Leads nav link** — edit `AppLayout.tsx` `links` array (place first)

```tsx
const links = [
  { to: "/job-leads", label: "Job Leads" },
  { to: "/companies", label: "Companies" },
  { to: "/settings/profile", label: "Settings" },
];
```

- [ ] **Step 4: Add routes** — edit `app/router.tsx` children (import the pages)

```tsx
import JobLeadsPage from "@/pages/JobLeadsPage";
import JobLeadDetailsPage from "@/pages/JobLeadDetailsPage";
```
```tsx
      { index: true, element: <Navigate to="/job-leads" replace /> },
      { path: "job-leads", element: <JobLeadsPage /> },
      { path: "job-leads/new", element: <JobLeadDetailsPage /> },
      { path: "job-leads/:id", element: <JobLeadDetailsPage /> },
      { path: "companies", element: <CompaniesPage /> },
      { path: "settings/profile", element: <SettingsProfilePage /> },
```
> `JobLeadDetailsPage` is created in Task 11. To keep the app compiling until then, create a one-line placeholder now: `export default function JobLeadDetailsPage() { return <p>Coming soon</p>; }` and replace it in Task 11.

- [ ] **Step 5: Create the table** `features/jobLeads/JobLeadsTable.tsx`

```tsx
import { Link } from "react-router";
import { priority, jobLeadStatus, remoteMode, enumLabel } from "@/lib/enums";
import type { JobLeadDto } from "@/lib/api/model";

type Props = { leads: JobLeadDto[]; onDelete: (l: JobLeadDto) => void };

export function JobLeadsTable({ leads, onDelete }: Props) {
  if (leads.length === 0) return <p className="text-muted-foreground">No job leads match.</p>;
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b text-left">
          <th className="p-2">Title</th><th className="p-2">Company</th>
          <th className="p-2">Status</th><th className="p-2">Priority</th>
          <th className="p-2">Remote</th><th className="p-2"></th>
        </tr>
      </thead>
      <tbody>
        {leads.map((l) => (
          <tr key={l.id} className="border-b">
            <td className="p-2 font-medium">
              <Link to={`/job-leads/${l.id}`} className="text-primary hover:underline">{l.title}</Link>
            </td>
            <td className="p-2">{l.companyName}</td>
            <td className="p-2">{enumLabel(jobLeadStatus, l.status)}</td>
            <td className="p-2">{enumLabel(priority, l.priority)}</td>
            <td className="p-2">{enumLabel(remoteMode, l.remoteMode)}</td>
            <td className="p-2 text-right">
              <button onClick={() => onDelete(l)} className="text-destructive">Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 6: Create the list page** `pages/JobLeadsPage.tsx` (filters added in S2.3; basic list now)

```tsx
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useGetJobLeads, useDeleteJobLead, getGetJobLeadsQueryKey } from "@/lib/api/job-leads/job-leads";
import type { JobLeadDto } from "@/lib/api/model";
import { JobLeadsTable } from "@/features/jobLeads/JobLeadsTable";

export default function JobLeadsPage() {
  const queryClient = useQueryClient();
  const { data: response, isLoading } = useGetJobLeads();
  const remove = useDeleteJobLead();
  const leads = response?.data ?? [];

  const onDelete = async (l: JobLeadDto) => {
    if (!confirm(`Delete "${l.title}"? Prefer Archive (set status) to keep history.`)) return;
    await remove.mutateAsync({ id: l.id });
    queryClient.invalidateQueries({ queryKey: getGetJobLeadsQueryKey() });
  };

  if (isLoading) return <p>Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Job Leads</h1>
        <Link to="/job-leads/new" className="rounded bg-primary px-4 py-2 text-primary-foreground">
          Add lead
        </Link>
      </div>
      <JobLeadsTable leads={leads} onDelete={onDelete} />
    </div>
  );
}
```
> Confirm the generated names `useGetJobLeads`, `useDeleteJobLead`, `getGetJobLeadsQueryKey` and the route segment `job-leads/job-leads.ts` after generation; adjust the import path if orval splits the tag differently.

- [ ] **Step 7: Typecheck + build + commit**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: green (with the `JobLeadDetailsPage` placeholder in place).
```bash
git add frontend
git commit -m "feat(web): Job Leads list page and enum labels"
```

---

### Task 11: JobLead add/edit form + details page

**Files:**
- Create: `frontend/src/features/jobLeads/CompanySelect.tsx`, `frontend/src/features/jobLeads/JobLeadForm.tsx`
- Replace placeholder: `frontend/src/pages/JobLeadDetailsPage.tsx`

**Interfaces:**
- Consumes: `useGetCompanies`, `useGetJobLead`, `useCreateJobLead`, `useUpdateJobLead`; models `JobLeadDto`, `CreateJobLeadRequest`, `UpdateJobLeadRequest`, `CompanyDto`.
- Produces: a create/edit form supporting existing company **or** inline new company (D25), and a details view.

- [ ] **Step 1: Create the company picker** `features/jobLeads/CompanySelect.tsx`

```tsx
import { useGetCompanies } from "@/lib/api/companies/companies";

type Props = {
  mode: "existing" | "new";
  companyId: string;
  newCompanyName: string;
  onModeChange: (m: "existing" | "new") => void;
  onCompanyIdChange: (id: string) => void;
  onNewCompanyNameChange: (name: string) => void;
};

const inputClass = "mt-1 w-full rounded border border-input bg-background p-2";

export function CompanySelect({
  mode, companyId, newCompanyName, onModeChange, onCompanyIdChange, onNewCompanyNameChange,
}: Props) {
  const { data: response } = useGetCompanies();
  const companies = response?.data ?? [];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Company</label>
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" checked={mode === "existing"} onChange={() => onModeChange("existing")} />
          Existing
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={mode === "new"} onChange={() => onModeChange("new")} />
          New
        </label>
      </div>
      {mode === "existing" ? (
        <select className={inputClass} value={companyId} onChange={(e) => onCompanyIdChange(e.target.value)}>
          <option value="">Select a company…</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      ) : (
        <input
          className={inputClass}
          placeholder="New company name"
          value={newCompanyName}
          onChange={(e) => onNewCompanyNameChange(e.target.value)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the form** `features/jobLeads/JobLeadForm.tsx`

```tsx
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  jobSource, remoteMode, employmentType, salaryPeriod, priority, jobLeadStatus, enumOptions,
} from "@/lib/enums";
import type { CreateJobLeadRequest, JobLeadDto } from "@/lib/api/model";
import { CompanySelect } from "./CompanySelect";

type FormValues = {
  title: string; source: number; sourceUrl: string; jobDescription: string; location: string;
  remoteMode: number; employmentType: number;
  salaryMin: string; salaryMax: string; salaryCurrency: string; salaryPeriod: number;
  priority: number; status: number; fitScore: string;
  nextActionAtUtc: string; deadlineAtUtc: string; notes: string;
};

const EMPTY: FormValues = {
  title: "", source: 0, sourceUrl: "", jobDescription: "", location: "",
  remoteMode: 0, employmentType: 0, salaryMin: "", salaryMax: "", salaryCurrency: "", salaryPeriod: 0,
  priority: 1, status: 0, fitScore: "", nextActionAtUtc: "", deadlineAtUtc: "", notes: "",
};

const toFormValues = (l: JobLeadDto): FormValues => ({
  title: l.title ?? "", source: l.source, sourceUrl: l.sourceUrl ?? "",
  jobDescription: l.jobDescription ?? "", location: l.location ?? "",
  remoteMode: l.remoteMode, employmentType: l.employmentType,
  salaryMin: l.salaryMin != null ? String(l.salaryMin) : "",
  salaryMax: l.salaryMax != null ? String(l.salaryMax) : "",
  salaryCurrency: l.salaryCurrency ?? "", salaryPeriod: l.salaryPeriod,
  priority: l.priority, status: l.status,
  fitScore: l.fitScore != null ? String(l.fitScore) : "",
  nextActionAtUtc: l.nextActionAtUtc ? l.nextActionAtUtc.slice(0, 10) : "",
  deadlineAtUtc: l.deadlineAtUtc ? l.deadlineAtUtc.slice(0, 10) : "",
  notes: l.notes ?? "",
});

const trimToNull = (s: string): string | null => (s.trim() === "" ? null : s.trim());
const numOrNull = (s: string): number | null => (s.trim() === "" ? null : Number(s));
// Date-only → 09:00 local → UTC (matches the dashboard "due today" contract, 04-conventions.md).
const dateToUtc = (s: string): string | null => {
  if (!s) return null;
  const d = new Date(`${s}T09:00:00`);
  return d.toISOString();
};

type Props = {
  initial?: JobLeadDto;
  pending: boolean;
  errors: string[];
  onSubmit: (req: CreateJobLeadRequest) => void;
};

const inputClass = "mt-1 w-full rounded border border-input bg-background p-2";

export function JobLeadForm({ initial, pending, errors, onSubmit }: Props) {
  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: EMPTY });
  const [companyMode, setCompanyMode] = useState<"existing" | "new">("existing");
  const [companyId, setCompanyId] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");

  useEffect(() => {
    reset(initial ? toFormValues(initial) : EMPTY);
    if (initial) { setCompanyMode("existing"); setCompanyId(String(initial.companyId)); }
  }, [initial, reset]);

  const submit = handleSubmit((v) =>
    onSubmit({
      companyId: companyMode === "existing" && companyId ? Number(companyId) : null,
      newCompanyName: companyMode === "new" ? trimToNull(newCompanyName) : null,
      title: v.title.trim(),
      source: Number(v.source),
      sourceUrl: trimToNull(v.sourceUrl),
      jobDescription: trimToNull(v.jobDescription),
      location: trimToNull(v.location),
      remoteMode: Number(v.remoteMode),
      employmentType: Number(v.employmentType),
      salaryMin: numOrNull(v.salaryMin),
      salaryMax: numOrNull(v.salaryMax),
      salaryCurrency: trimToNull(v.salaryCurrency),
      salaryPeriod: Number(v.salaryPeriod),
      priority: Number(v.priority),
      status: Number(v.status),
      fitScore: numOrNull(v.fitScore),
      nextActionAtUtc: dateToUtc(v.nextActionAtUtc),
      deadlineAtUtc: dateToUtc(v.deadlineAtUtc),
      notes: trimToNull(v.notes),
    }),
  );

  const selects: { name: keyof FormValues; label: string; map: Record<number, string> }[] = [
    { name: "source", label: "Source", map: jobSource },
    { name: "remoteMode", label: "Remote mode", map: remoteMode },
    { name: "employmentType", label: "Employment", map: employmentType },
    { name: "salaryPeriod", label: "Salary period", map: salaryPeriod },
    { name: "priority", label: "Priority", map: priority },
    { name: "status", label: "Status", map: jobLeadStatus },
  ];

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* In edit mode the company is fixed to the existing one (no inline create on edit). */}
      {initial ? (
        <input type="hidden" value={companyId} readOnly />
      ) : (
        <CompanySelect
          mode={companyMode} companyId={companyId} newCompanyName={newCompanyName}
          onModeChange={setCompanyMode} onCompanyIdChange={setCompanyId}
          onNewCompanyNameChange={setNewCompanyName}
        />
      )}

      <div>
        <label className="block text-sm font-medium">Title</label>
        <input className={inputClass} {...register("title")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {selects.map((s) => (
          <div key={s.name}>
            <label className="block text-sm font-medium">{s.label}</label>
            <select className={inputClass} {...register(s.name)}>
              {enumOptions(s.map).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium">Location</label>
          <input className={inputClass} {...register("location")} />
        </div>
        <div>
          <label className="block text-sm font-medium">Source URL</label>
          <input type="url" className={inputClass} {...register("sourceUrl")} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium">Salary min</label>
          <input type="number" step="any" className={inputClass} {...register("salaryMin")} />
        </div>
        <div>
          <label className="block text-sm font-medium">Salary max</label>
          <input type="number" step="any" className={inputClass} {...register("salaryMax")} />
        </div>
        <div>
          <label className="block text-sm font-medium">Currency</label>
          <input className={inputClass} {...register("salaryCurrency")} />
        </div>
        <div>
          <label className="block text-sm font-medium">Fit score</label>
          <input type="number" min="0" max="100" className={inputClass} {...register("fitScore")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Next action</label>
          <input type="date" className={inputClass} {...register("nextActionAtUtc")} />
        </div>
        <div>
          <label className="block text-sm font-medium">Deadline</label>
          <input type="date" className={inputClass} {...register("deadlineAtUtc")} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Job description</label>
        <textarea rows={6} className={inputClass} {...register("jobDescription")} />
      </div>
      <div>
        <label className="block text-sm font-medium">Notes</label>
        <textarea rows={3} className={inputClass} {...register("notes")} />
      </div>

      {errors.length > 0 && (
        <ul className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {errors.map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}

      <button type="submit" disabled={pending}
        className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">
        {pending ? "Saving…" : initial ? "Update lead" : "Add lead"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Replace the details page placeholder** `pages/JobLeadDetailsPage.tsx`

```tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetJobLead, useCreateJobLead, useUpdateJobLead, getGetJobLeadsQueryKey,
} from "@/lib/api/job-leads/job-leads";
import type { CreateJobLeadRequest, UpdateJobLeadRequest } from "@/lib/api/model";
import { JobLeadForm } from "@/features/jobLeads/JobLeadForm";

export default function JobLeadDetailsPage() {
  const { id } = useParams();
  const isNew = id === undefined;
  const leadId = isNew ? 0 : Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: response, isLoading } = useGetJobLead(leadId, { query: { enabled: !isNew } });
  const create = useCreateJobLead();
  const update = useUpdateJobLead();
  const [errors, setErrors] = useState<string[]>([]);

  const lead = response?.data && "id" in response.data ? response.data : undefined;

  const readErrors = (e: unknown): string[] => {
    const problem = (e as { data?: { errors?: Record<string, string[]> } }).data;
    return problem?.errors ? Object.values(problem.errors).flat() : ["Save failed."];
  };

  const onSubmit = async (req: CreateJobLeadRequest) => {
    setErrors([]);
    try {
      if (isNew) {
        await create.mutateAsync({ data: req });
      } else {
        const { companyId, newCompanyName: _drop, ...rest } = req;
        const updateReq: UpdateJobLeadRequest = { ...rest, companyId: companyId! };
        await update.mutateAsync({ id: leadId, data: updateReq });
      }
      queryClient.invalidateQueries({ queryKey: getGetJobLeadsQueryKey() });
      navigate("/job-leads");
    } catch (e) {
      setErrors(readErrors(e));
    }
  };

  if (!isNew && isLoading) return <p>Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{isNew ? "Add job lead" : lead?.title ?? "Job lead"}</h1>
      <JobLeadForm
        initial={lead}
        pending={create.isPending || update.isPending}
        errors={errors}
        onSubmit={onSubmit}
      />
    </div>
  );
}
```
> The form collects a single `CreateJobLeadRequest` shape; on edit the page maps it to `UpdateJobLeadRequest` (drops `newCompanyName`, keeps `companyId`). Confirm `useGetJobLead` accepts `(id, { query })` like the generated `useGetUserProfile` options shape.

- [ ] **Step 4: Typecheck + build**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: green.

- [ ] **Step 5: Manual usability check (human acceptance) — the spreadsheet moment**

With `just up` + `just web`: at `http://localhost:5280/job-leads` click **Add lead**. Create a lead with a **new** company name inline (mode "New") → it saves, the company is created, the lead shows the company name. Add a second lead picking the **existing** company. Edit a lead's status/priority; reload — persists. Try `SalaryMax < SalaryMin` → API validation error shows. Restart the stack — leads persist.

- [ ] **Step 6: Full gate + commit**

Run: `just verify`
Expected: all green.
```bash
git add frontend
git commit -m "feat(web): Job Lead add/edit form with inline company find-or-create and details page"
```

---

## Slice S2.3 — Filters, search & dashboard counts

### Task 12: Job Leads search + status/priority filters (client-side, D24)

**Files:**
- Modify: `frontend/src/pages/JobLeadsPage.tsx`

**Interfaces:**
- Consumes: the already-fetched `useGetJobLeads` list, enum maps.
- Produces: in-page search (title contains) + status + priority dropdown filters.

- [ ] **Step 1: Add filter state + controls to `JobLeadsPage.tsx`** (replace the page body built in Task 10)

```tsx
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useGetJobLeads, useDeleteJobLead, getGetJobLeadsQueryKey } from "@/lib/api/job-leads/job-leads";
import type { JobLeadDto } from "@/lib/api/model";
import { jobLeadStatus, priority, enumOptions } from "@/lib/enums";
import { JobLeadsTable } from "@/features/jobLeads/JobLeadsTable";

const ANY = "";
const inputClass = "rounded border border-input bg-background p-2 text-sm";

export default function JobLeadsPage() {
  const queryClient = useQueryClient();
  const { data: response, isLoading } = useGetJobLeads();
  const remove = useDeleteJobLead();
  const all = response?.data ?? [];

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ANY);
  const [prio, setPrio] = useState<string>(ANY);

  const leads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((l) =>
      (q === "" || l.title.toLowerCase().includes(q) || l.companyName.toLowerCase().includes(q)) &&
      (status === ANY || l.status === Number(status)) &&
      (prio === ANY || l.priority === Number(prio)),
    );
  }, [all, search, status, prio]);

  const onDelete = async (l: JobLeadDto) => {
    if (!confirm(`Delete "${l.title}"? Prefer Archive (set status) to keep history.`)) return;
    await remove.mutateAsync({ id: l.id });
    queryClient.invalidateQueries({ queryKey: getGetJobLeadsQueryKey() });
  };

  if (isLoading) return <p>Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Job Leads</h1>
        <Link to="/job-leads/new" className="rounded bg-primary px-4 py-2 text-primary-foreground">Add lead</Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className={inputClass} placeholder="Search title or company…"
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value={ANY}>All statuses</option>
          {enumOptions(jobLeadStatus).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className={inputClass} value={prio} onChange={(e) => setPrio(e.target.value)}>
          <option value={ANY}>All priorities</option>
          {enumOptions(priority).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="self-center text-sm text-muted-foreground">{leads.length} of {all.length}</span>
      </div>

      <JobLeadsTable leads={leads} onDelete={onDelete} />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + build**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: green.

- [ ] **Step 3: Manual check + commit**

With the stack up: add several leads, then filter by status/priority and type a search term — the table narrows; the "N of M" count updates.
```bash
git add frontend/src/pages/JobLeadsPage.tsx
git commit -m "feat(web): client-side search and status/priority filters for job leads"
```

---

### Task 13: Dashboard placeholder (lead counts + high-priority rule)

**Files:**
- Create: `frontend/src/pages/DashboardPage.tsx`
- Modify: `frontend/src/components/AppLayout.tsx`, `frontend/src/app/router.tsx`

**Interfaces:**
- Consumes: `useGetJobLeads`, enum maps.
- Produces: route `/dashboard` (new index); cards for total leads, counts by status, and high-priority leads (PRD §21: `priority in [High, Critical] and status in [Discovered, Interested]`).

- [ ] **Step 1: Create the dashboard page** `pages/DashboardPage.tsx`

```tsx
import { Link } from "react-router";
import { useGetJobLeads } from "@/lib/api/job-leads/job-leads";
import { jobLeadStatus, enumLabel } from "@/lib/enums";
import type { JobLeadDto } from "@/lib/api/model";

const HIGH_PRIORITY = [2, 3];        // High, Critical
const ACTIONABLE_STATUS = [0, 1];    // Discovered, Interested

const isHighPriorityLead = (l: JobLeadDto) =>
  HIGH_PRIORITY.includes(l.priority) && ACTIONABLE_STATUS.includes(l.status);

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded border p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-3xl font-semibold">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: response, isLoading } = useGetJobLeads();
  const leads = response?.data ?? [];

  if (isLoading) return <p>Loading…</p>;

  const byStatus = leads.reduce<Record<number, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});
  const highPriority = leads.filter(isHighPriorityLead);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card title="Total leads" value={leads.length} />
        <Card title="High-priority" value={highPriority.length} />
        <Card title="Applied" value={byStatus[2] ?? 0} />
        <Card title="Interviewing" value={byStatus[3] ?? 0} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">High-priority leads to action</h2>
        {highPriority.length === 0 ? (
          <p className="text-muted-foreground">Nothing high-priority awaiting action.</p>
        ) : (
          <ul className="space-y-2">
            {highPriority.map((l) => (
              <li key={l.id} className="rounded border p-3">
                <Link to={`/job-leads/${l.id}`} className="font-medium text-primary hover:underline">{l.title}</Link>
                <span className="text-muted-foreground"> — {l.companyName} · {enumLabel(jobLeadStatus, l.status)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```
> This is the Phase-2 **placeholder** (D24, client-side). Phase 5 replaces it with `GET /api/dashboard/summary` (follow-ups due/overdue, upcoming interviews, stale applications, pipeline).

- [ ] **Step 2: Make Dashboard the index + add nav** — edit `AppLayout.tsx` links

```tsx
const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/job-leads", label: "Job Leads" },
  { to: "/companies", label: "Companies" },
  { to: "/settings/profile", label: "Settings" },
];
```

- [ ] **Step 3: Wire the route** — edit `app/router.tsx`

```tsx
import DashboardPage from "@/pages/DashboardPage";
```
```tsx
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
```
(keep the job-leads/companies/settings routes)

- [ ] **Step 4: Typecheck + build**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: green.

- [ ] **Step 5: Manual check (human acceptance)**

With the stack up at `http://localhost:5280/`: it redirects to `/dashboard`. Counts reflect the leads entered. Create a `High`/`Critical` lead with status `Discovered` → it appears under "High-priority leads to action"; move it to `Applied` → it leaves the list and the "Applied" card increments.

- [ ] **Step 6: Final gate + commit**

Run: `just verify`
Expected: all green (backend build + tests, frontend typecheck + build).
```bash
git add frontend
git commit -m "feat(web): Phase 2 dashboard placeholder with lead counts and high-priority rule"
```

---

## Phase 2 completion

- [ ] All slices' DoD met: `just up` runs the stack; `/api/companies` and `/api/job-leads` respond; orval client regenerated + committed; pages work against the real API; data persists across `just down && just up`; bad input returns `ProblemDetails`; `just verify` green.
- [ ] Update `docs/knowledge-base/02-delivery-plan.md` if any slice scope shifted (it should not have).
- [ ] **REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch to verify tests and choose merge/PR/keep/discard for `feat/phase-2-job-leads`.

---

## Self-Review

**1. Spec coverage (PRD D2 / delivery-plan S2.1–S2.3):**
- Company entity + 3 enums + CRUD + page → Tasks 1–5. ✓ (PRD §12.1, §14.3, §20 Company)
- JobLead entity + 6 enums + FK + CRUD + list/form/details, inline find-or-create company → Tasks 6–11. ✓ (PRD §12.2, §14.4 CRUD, §15.3, §20 JobLead, fast-entry requirement)
- Filters (status, priority) + search → Task 12. ✓ (PRD §15.3 Job Leads)
- Dashboard placeholder lead counts + high-priority rule → Task 13. ✓ (PRD §21 High-Priority Lead)
- Out of scope here (correctly deferred): `analyze-fit` (Phase 6), `convert-to-application` (Phase 3), full dashboard summary (Phase 5). ✓
- Testing cadence (PRD §25 phase 1–2: validation tests, service tests, endpoint tests) → validator + service unit tests + endpoint integration tests per slice. ✓

**2. Placeholder scan:** No "TBD/TODO/handle edge cases" — every code step has complete code; commands have expected output. The only intentional stub is the one-line `JobLeadDetailsPage` placeholder in Task 10 Step 4, explicitly replaced in Task 11 Step 3 (keeps the app compiling between tasks). ✓

**3. Type consistency:**
- Service method names stable across tasks: `ListAsync`/`GetAsync(int)`/`CreateAsync`/`UpdateAsync(int,…)`/`DeleteAsync(int)` for both services.
- `JobLeadDto.CompanyName` produced by mapping (Task 8 Step 4) and consumed by table/dashboard (Tasks 10/13). ✓
- `CreateJobLeadRequest` (CompanyId? + NewCompanyName) vs `UpdateJobLeadRequest` (CompanyId required) — the details page (Task 11 Step 3) maps create→update by dropping `newCompanyName`. ✓
- enum int values match PRD order exactly in both C# (Tasks 1, 6) and `lib/enums.ts` (Tasks 5, 10) — Priority starts at 0 (`Low`), JobLeadStatus starts at 0 (`Discovered`). ✓
- Generated hook/query-key names (`useGetCompanies`/`getGetCompaniesQueryKey`, `useGetJobLeads`/`getGetJobLeadsQueryKey`, etc.) follow the verified `useGetUserProfile`/`getGetUserProfileQueryKey` pattern; each consuming step notes to confirm the exact generated name. ✓

**Risk note:** int enums may surface in the OpenAPI doc without member names, so orval types enum fields as `number` — handled by `lib/enums.ts` mapping. If orval instead emits named TS enums, the `Number(...)` coercions in forms still hold and the maps remain valid. Verify after the first `just gen-client` (Task 5 Step 1).
