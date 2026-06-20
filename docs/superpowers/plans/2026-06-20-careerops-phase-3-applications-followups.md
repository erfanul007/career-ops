# Phase 3 — Applications, Follow-ups & Manual AI Prompt Export — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert leads into Applications, move them through a pipeline (auto-advancing the lead), manage Follow-up tasks with today's-actions on the dashboard, and copy AI prompts into your own Claude/ChatGPT — no API key.

**Architecture:** Clean Architecture + pragmatic DDD (D18). Each entity is a thin vertical slice mirroring the existing `JobLead` slice: Domain entity + pinned-int enums → Application service over `IAppDbContext` (no repositories, D3) → EF config + migration → Minimal-API module (`MapGroup`, explicit `operationId`) → orval-regenerated client → React feature/page. State transitions live on entities; one pure function maps Application events to `JobLead.Status` (D6). S3.4 is frontend-only.

**Tech Stack:** .NET 10, EF Core 10 (Npgsql, snake_case), Minimal APIs, Mapster, FluentValidation, xUnit (+ EF InMemory for unit tests, `WebApplicationFactory` for integration). React 19, Vite, TS, Tailwind v4, shadcn/ui, TanStack Query v5, RHF, react-router v8, orval, @dnd-kit/core, sonner, date-fns.

## Global Constraints

- Enums persist as **ints, pinned, first member = 0**; never reorder/renumber (D5). New enum members append.
- Inject `IClock`; never call `DateTime.UtcNow` in app/domain code (D-guardrail). Audit set centrally in `SaveChangesAsync`.
- No repositories/MediatR/domain-event infra (D3, D18). Services take `IAppDbContext` via ctor.
- Use the CLI for migrations/packages (D19): `just migrate name="X"`. Never hand-author `.csproj`/migrations.
- Endpoints set explicit `operationId` via `.WithName(...)` (D1) for clean orval output. Validation via `AddEndpointFilter<ValidationFilter<T>>()` + `.ProducesValidationProblem()`.
- 404 uses `Results<Ok<T>, NotFound>` typed-results. Bad input → FluentValidation `ProblemDetails` 400 (server-authoritative, D23).
- `gen-client` reads `http://localhost:8080/openapi/v1.json` — **API must be running** (`just up`) before `just gen-client`. Commit the generated `frontend/src/lib/api/**`.
- Per-slice gate: `just verify` (backend build + tests, frontend typecheck + build) + manual usability check. No frontend test runner (D26).
- Keep tests light (PRD §25): unit the logic that matters (invariants, transitions, due/overdue boundaries), integration the contract (convert flow, validation 400, cascade-clean).
- Frontend numeric coercion: orval types identity `id` as `number | string`; coerce with `Number(...)` at mutation call sites. Int enums are plain `number`.
- Branch first (currently on `main`): `git checkout -b phase-3-applications-followups` before Task 1.

---

## File Structure

**Backend — new (one folder per aggregate):**
```
Domain/ResumeVariants/ResumeVariant.cs
Domain/Applications/{Application,ApplicationStage,ApplicationStatus}.cs
Domain/JobLeads/{JobLeadStatusTransitions,ApplicationTrigger}.cs   # auto-advance lives with JobLead
Domain/FollowUpTasks/{FollowUpTask,RelatedEntityType,FollowUpStatus}.cs
Application/ResumeVariants/{CreateResumeVariantRequest,UpdateResumeVariantRequest,ResumeVariantDto,ResumeVariantMappingConfig,ResumeVariantRequestValidators,ResumeVariantService}.cs
Application/Applications/{ConvertToApplicationRequest,ChangeStageRequest,MarkRejectedRequest,UpdateApplicationRequest,ApplicationDto,ApplicationMappingConfig,ApplicationRequestValidators,ApplicationService,ConvertResult}.cs
Application/FollowUpTasks/{CreateFollowUpTaskRequest,UpdateFollowUpTaskRequest,FollowUpTaskDto,FollowUpTaskMappingConfig,FollowUpTaskRequestValidators,FollowUpTaskService}.cs
Infrastructure/Persistence/Configurations/{ResumeVariantConfiguration,ApplicationConfiguration,FollowUpTaskConfiguration}.cs
Api/Endpoints/{ResumeVariantEndpoints,ApplicationEndpoints,FollowUpTaskEndpoints}.cs
```
**Backend — modified:** `Application/Common/IAppDbContext.cs` (+3 DbSets), `Infrastructure/Persistence/CareerOpsDbContext.cs` (+3 DbSets), `Application/DependencyInjection.cs` (+3 services), `Api/Program.cs` (+3 MapGroups), `Application/JobLeads/JobLeadService.cs` (delete cascade-clean), `+ migrations`.

**Frontend — new:**
```
src/lib/aiPrompts.ts
src/features/resumeVariants/{ResumeVariantDialog,ResumeVariantsTable,ResumeVariantForm}.tsx
src/features/applications/{ApplicationsBoard,ApplicationBoardColumn,ApplicationCard,ApplicationsTable,ApplicationSheet,ApplicationForm,useApplicationMutations,applicationRequest.ts,ConvertLeadDialog}.tsx
src/features/followUpTasks/{FollowUpTaskDialog,FollowUpTasksTable,FollowUpTaskForm,useFollowUpMutations}.tsx
src/features/ai/AiPromptDialog.tsx
src/features/dashboard/TodaysActions.tsx
src/pages/{ResumeVariantsPage,ApplicationsPage,TasksPage}.tsx
```
**Frontend — modified:** `src/lib/enums.ts` (+ maps/badge classes), `src/app/router.tsx` (+3 routes), `src/components/AppLayout.tsx` (+3 nav items), `src/features/jobLeads/JobLeadSheet.tsx` (+ Convert + AI prompt buttons), `src/pages/DashboardPage.tsx` (+ today's-actions). orval-generated `src/lib/api/**` regenerated.

**Docs — modified at end:** `docs/knowledge-base/03-decisions.md` (D27–D31), `docs/knowledge-base/02-delivery-plan.md` (mark S3.1–S3.4 done).

---

## Task 1: ResumeVariant backend (domain + app + persistence)

**Files:**
- Create: `Domain/ResumeVariants/ResumeVariant.cs`, `Application/ResumeVariants/{CreateResumeVariantRequest,UpdateResumeVariantRequest,ResumeVariantDto,ResumeVariantMappingConfig,ResumeVariantRequestValidators,ResumeVariantService}.cs`, `Infrastructure/Persistence/Configurations/ResumeVariantConfiguration.cs`
- Modify: `Application/Common/IAppDbContext.cs`, `Infrastructure/Persistence/CareerOpsDbContext.cs`, `Application/DependencyInjection.cs`
- Test: `backend/tests/CareerOps.UnitTests/ResumeVariants/{ResumeVariantServiceTests,ResumeVariantRequestValidatorTests}.cs`

**Interfaces — Produces:** `ResumeVariantService(IAppDbContext)` with `ListAsync`, `GetAsync(int)`, `CreateAsync(CreateResumeVariantRequest)`, `UpdateAsync(int, UpdateResumeVariantRequest)`, `DeleteAsync(int)`, `MakeDefaultAsync(int)` → all return `ResumeVariantDto?`/`bool`. `ResumeVariantDto(int Id, string Name, string? TargetRole, string? Summary, string? Notes, bool IsDefault, DateTime CreatedAtUtc, DateTime UpdatedAtUtc)`. `IAppDbContext.ResumeVariants`.

- [ ] **Step 1: Domain entity**

`Domain/ResumeVariants/ResumeVariant.cs`:
```csharp
using CareerOps.Domain.Common;

namespace CareerOps.Domain.ResumeVariants;

public sealed class ResumeVariant : AuditableEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? TargetRole { get; set; }
    public string? Summary { get; set; }
    public string? Notes { get; set; }
    public bool IsDefault { get; set; }
}
```

- [ ] **Step 2: App layer (requests, DTO, mapping, validators)**

`Application/ResumeVariants/CreateResumeVariantRequest.cs`:
```csharp
namespace CareerOps.Application.ResumeVariants;

public sealed record CreateResumeVariantRequest(string Name, string? TargetRole, string? Summary, string? Notes);
```
`Application/ResumeVariants/UpdateResumeVariantRequest.cs`:
```csharp
namespace CareerOps.Application.ResumeVariants;

public sealed record UpdateResumeVariantRequest(string Name, string? TargetRole, string? Summary, string? Notes);
```
`Application/ResumeVariants/ResumeVariantDto.cs`:
```csharp
namespace CareerOps.Application.ResumeVariants;

public sealed record ResumeVariantDto(
    int Id, string Name, string? TargetRole, string? Summary, string? Notes, bool IsDefault,
    DateTime CreatedAtUtc, DateTime UpdatedAtUtc);
```
`Application/ResumeVariants/ResumeVariantMappingConfig.cs`:
```csharp
using CareerOps.Domain.ResumeVariants;
using Mapster;

namespace CareerOps.Application.ResumeVariants;

public sealed class ResumeVariantMappingConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<CreateResumeVariantRequest, ResumeVariant>()
              .Ignore(d => d.Id).Ignore(d => d.IsDefault)
              .Ignore(d => d.CreatedAtUtc).Ignore(d => d.UpdatedAtUtc);
        config.NewConfig<UpdateResumeVariantRequest, ResumeVariant>()
              .Ignore(d => d.Id).Ignore(d => d.IsDefault)
              .Ignore(d => d.CreatedAtUtc).Ignore(d => d.UpdatedAtUtc);
    }
}
```
`Application/ResumeVariants/ResumeVariantRequestValidators.cs`:
```csharp
using FluentValidation;

namespace CareerOps.Application.ResumeVariants;

public sealed class CreateResumeVariantRequestValidator : AbstractValidator<CreateResumeVariantRequest>
{
    public CreateResumeVariantRequestValidator()
    {
        RuleFor(r => r.Name).NotEmpty().MaximumLength(200);
        RuleFor(r => r.TargetRole).MaximumLength(200);
    }
}

public sealed class UpdateResumeVariantRequestValidator : AbstractValidator<UpdateResumeVariantRequest>
{
    public UpdateResumeVariantRequestValidator()
    {
        RuleFor(r => r.Name).NotEmpty().MaximumLength(200);
        RuleFor(r => r.TargetRole).MaximumLength(200);
    }
}
```

- [ ] **Step 3: Service**

`Application/ResumeVariants/ResumeVariantService.cs`:
```csharp
using CareerOps.Application.Common;
using CareerOps.Domain.ResumeVariants;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.ResumeVariants;

public sealed class ResumeVariantService(IAppDbContext db)
{
    public async Task<IReadOnlyList<ResumeVariantDto>> ListAsync(CancellationToken ct = default) =>
        (await db.ResumeVariants.OrderByDescending(v => v.IsDefault).ThenBy(v => v.Name).ToListAsync(ct))
            .Adapt<List<ResumeVariantDto>>();

    public async Task<ResumeVariantDto?> GetAsync(int id, CancellationToken ct = default) =>
        (await db.ResumeVariants.FirstOrDefaultAsync(v => v.Id == id, ct))?.Adapt<ResumeVariantDto>();

    public async Task<ResumeVariantDto> CreateAsync(CreateResumeVariantRequest request, CancellationToken ct = default)
    {
        var variant = request.Adapt<ResumeVariant>();
        variant.IsDefault = !await db.ResumeVariants.AnyAsync(ct); // first variant becomes default
        db.ResumeVariants.Add(variant);
        await db.SaveChangesAsync(ct);
        return variant.Adapt<ResumeVariantDto>();
    }

    public async Task<ResumeVariantDto?> UpdateAsync(int id, UpdateResumeVariantRequest request, CancellationToken ct = default)
    {
        var variant = await db.ResumeVariants.FirstOrDefaultAsync(v => v.Id == id, ct);
        if (variant is null) return null;
        request.Adapt(variant);
        await db.SaveChangesAsync(ct);
        return variant.Adapt<ResumeVariantDto>();
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var variant = await db.ResumeVariants.FirstOrDefaultAsync(v => v.Id == id, ct);
        if (variant is null) return false;
        db.ResumeVariants.Remove(variant); // referenced-by-Application delete is blocked by FK Restrict (Task 6)
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<ResumeVariantDto?> MakeDefaultAsync(int id, CancellationToken ct = default)
    {
        var target = await db.ResumeVariants.FirstOrDefaultAsync(v => v.Id == id, ct);
        if (target is null) return null;
        var others = await db.ResumeVariants.Where(v => v.IsDefault && v.Id != id).ToListAsync(ct);
        foreach (var v in others) v.IsDefault = false;
        target.IsDefault = true;
        await db.SaveChangesAsync(ct);
        return target.Adapt<ResumeVariantDto>();
    }
}
```

- [ ] **Step 4: Wire DbSet + DI**

In `Application/Common/IAppDbContext.cs` add `using CareerOps.Domain.ResumeVariants;` and `DbSet<ResumeVariant> ResumeVariants { get; }`.
In `Infrastructure/Persistence/CareerOpsDbContext.cs` add the using and `public DbSet<ResumeVariant> ResumeVariants => Set<ResumeVariant>();`.
In `Application/DependencyInjection.cs` add `using CareerOps.Application.ResumeVariants;` and `services.AddScoped<ResumeVariantService>();`.

`Infrastructure/Persistence/Configurations/ResumeVariantConfiguration.cs`:
```csharp
using CareerOps.Domain.ResumeVariants;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class ResumeVariantConfiguration : IEntityTypeConfiguration<ResumeVariant>
{
    public void Configure(EntityTypeBuilder<ResumeVariant> b)
    {
        b.ToTable("resume_variants");
        b.HasKey(v => v.Id);
        b.Property(v => v.Name).HasMaxLength(200).IsRequired();
        b.Property(v => v.TargetRole).HasMaxLength(200);
        b.Property(v => v.Summary).HasMaxLength(4000);
        b.Property(v => v.Notes).HasMaxLength(4000);
        b.HasIndex(v => v.IsDefault);
    }
}
```

- [ ] **Step 5: Write the failing tests**

`backend/tests/CareerOps.UnitTests/ResumeVariants/ResumeVariantServiceTests.cs`:
```csharp
using CareerOps.Application.Common;
using CareerOps.Application.ResumeVariants;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.UnitTests.ResumeVariants;

public class ResumeVariantServiceTests
{
    private sealed class FixedClock : IClock
    {
        public DateTime UtcNow => new(2026, 6, 20, 12, 0, 0, DateTimeKind.Utc);
        public DateOnly Today => new(2026, 6, 20);
    }

    private static CareerOpsDbContext NewDb() =>
        new(new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase($"careerops-{Guid.NewGuid()}").Options, new FixedClock());

    [Fact]
    public async Task First_variant_becomes_default()
    {
        await using var db = NewDb();
        var dto = await new ResumeVariantService(db).CreateAsync(new("Backend .NET", "Backend Engineer", null, null));
        Assert.True(dto.IsDefault);
    }

    [Fact]
    public async Task MakeDefault_clears_previous_default()
    {
        await using var db = NewDb();
        var svc = new ResumeVariantService(db);
        var first = await svc.CreateAsync(new("Backend .NET", null, null, null));
        var second = await svc.CreateAsync(new("Platform", null, null, null));

        await svc.MakeDefaultAsync(second.Id);

        var all = await svc.ListAsync();
        Assert.Single(all, v => v.IsDefault);
        Assert.True(all.Single(v => v.Id == second.Id).IsDefault);
        Assert.False(all.Single(v => v.Id == first.Id).IsDefault);
    }
}
```
`backend/tests/CareerOps.UnitTests/ResumeVariants/ResumeVariantRequestValidatorTests.cs`:
```csharp
using CareerOps.Application.ResumeVariants;
using FluentValidation.TestHelper;

namespace CareerOps.UnitTests.ResumeVariants;

public class ResumeVariantRequestValidatorTests
{
    private readonly CreateResumeVariantRequestValidator _validator = new();

    [Fact]
    public void Name_is_required() =>
        _validator.TestValidate(new CreateResumeVariantRequest("", null, null, null))
                  .ShouldHaveValidationErrorFor(r => r.Name);

    [Fact]
    public void Valid_request_passes() =>
        _validator.TestValidate(new CreateResumeVariantRequest("Backend .NET", "Backend Engineer", null, null))
                  .ShouldNotHaveAnyValidationErrors();
}
```

- [ ] **Step 6: Run tests, verify pass, generate migration, commit**

```
dotnet test backend/CareerOps.slnx --filter ResumeVariant
just migrate name="ResumeVariant"
dotnet build backend/CareerOps.slnx
```
Expected: tests PASS; a migration `Persistence/Migrations/*_ResumeVariant.cs` is created; build succeeds.
```
git add backend/src backend/tests
git commit -m "feat(api): ResumeVariant entity, service, make-default + migration (S3.1)"
```

---

## Task 2: ResumeVariant endpoints + client

**Files:**
- Create: `Api/Endpoints/ResumeVariantEndpoints.cs`
- Modify: `Api/Program.cs`
- Test: `backend/tests/CareerOps.IntegrationTests/ResumeVariantEndpointTests.cs`

**Interfaces — Consumes:** `ResumeVariantService` (Task 1). **Produces:** REST `/api/resume-variants` (operationIds `GetResumeVariants`, `GetResumeVariant`, `CreateResumeVariant`, `UpdateResumeVariant`, `DeleteResumeVariant`, `MakeResumeVariantDefault`); orval hooks `useGetResumeVariants` etc.

- [ ] **Step 1: Endpoints module**

`Api/Endpoints/ResumeVariantEndpoints.cs`:
```csharp
using CareerOps.Api.Filters;
using CareerOps.Application.ResumeVariants;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CareerOps.Api.Endpoints;

public static class ResumeVariantEndpoints
{
    public static RouteGroupBuilder MapResumeVariants(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (ResumeVariantService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.ListAsync(ct)))
             .WithName("GetResumeVariants");

        group.MapGet("/{id:int}", async Task<Results<Ok<ResumeVariantDto>, NotFound>> (
                int id, ResumeVariantService svc, CancellationToken ct) =>
                await svc.GetAsync(id, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("GetResumeVariant");

        group.MapPost("/", async (CreateResumeVariantRequest req, ResumeVariantService svc, CancellationToken ct) =>
            {
                var dto = await svc.CreateAsync(req, ct);
                return TypedResults.Created($"/api/resume-variants/{dto.Id}", dto);
            })
             .WithName("CreateResumeVariant")
             .AddEndpointFilter<ValidationFilter<CreateResumeVariantRequest>>()
             .ProducesValidationProblem();

        group.MapPut("/{id:int}", async Task<Results<Ok<ResumeVariantDto>, NotFound>> (
                int id, UpdateResumeVariantRequest req, ResumeVariantService svc, CancellationToken ct) =>
                await svc.UpdateAsync(id, req, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("UpdateResumeVariant")
             .AddEndpointFilter<ValidationFilter<UpdateResumeVariantRequest>>()
             .ProducesValidationProblem();

        group.MapDelete("/{id:int}", async Task<Results<NoContent, NotFound>> (
                int id, ResumeVariantService svc, CancellationToken ct) =>
                await svc.DeleteAsync(id, ct) ? TypedResults.NoContent() : TypedResults.NotFound())
             .WithName("DeleteResumeVariant");

        group.MapPost("/{id:int}/make-default", async Task<Results<Ok<ResumeVariantDto>, NotFound>> (
                int id, ResumeVariantService svc, CancellationToken ct) =>
                await svc.MakeDefaultAsync(id, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("MakeResumeVariantDefault");

        return group;
    }
}
```

- [ ] **Step 2: Register group in Program.cs**

In `Api/Program.cs`, after the `job-leads` MapGroup line add:
```csharp
app.MapGroup("/api/resume-variants").WithTags("ResumeVariants").MapResumeVariants();
```

- [ ] **Step 3: Integration test (validation 400)**

`backend/tests/CareerOps.IntegrationTests/ResumeVariantEndpointTests.cs`:
```csharp
using System.Net;
using System.Net.Http.Json;

namespace CareerOps.IntegrationTests;

public class ResumeVariantEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Create_with_blank_name_returns_400()
    {
        var res = await _client.PostAsJsonAsync("/api/resume-variants", new { name = "", targetRole = "x" });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }
}
```

- [ ] **Step 4: Build, test, regenerate client, commit**

```
dotnet build backend/CareerOps.slnx && dotnet test backend/CareerOps.slnx --filter ResumeVariant
just up            # ensure API is live on :8080
just gen-client
cd frontend && npm run typecheck
```
Expected: build + tests PASS; `frontend/src/lib/api/resume-variants/` generated; typecheck clean.
```
git add backend frontend/src/lib/api
git commit -m "feat(api): resume-variants endpoints + regenerate client (S3.1)"
```

---

## Task 3: ResumeVariant frontend (page + nav)

**Files:**
- Create: `src/features/resumeVariants/{ResumeVariantForm,ResumeVariantsTable,ResumeVariantDialog}.tsx`, `src/pages/ResumeVariantsPage.tsx`
- Modify: `src/app/router.tsx`, `src/components/AppLayout.tsx`

**Interfaces — Consumes:** generated `useGetResumeVariants`, `useCreateResumeVariant`, `useUpdateResumeVariant`, `useDeleteResumeVariant`, `useMakeResumeVariantDefault` from `@/lib/api/resume-variants/resume-variants`; `ResumeVariantDto` from `@/lib/api/model`. Mirrors the Companies dialog/table/form pattern.

- [ ] **Step 1: Form** — `src/features/resumeVariants/ResumeVariantForm.tsx`:
```tsx
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/form/Field";
import { FormErrors } from "@/components/form/FormErrors";
import type { ResumeVariantDto, CreateResumeVariantRequest } from "@/lib/api/model";

type Props = { variant?: ResumeVariantDto; pending: boolean; errors: string[]; onSubmit: (r: CreateResumeVariantRequest) => void };

export function ResumeVariantForm({ variant, pending, errors, onSubmit }: Props) {
  const { register, handleSubmit } = useForm<CreateResumeVariantRequest>({
    defaultValues: {
      name: variant?.name ?? "", targetRole: variant?.targetRole ?? "",
      summary: variant?.summary ?? "", notes: variant?.notes ?? "",
    },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Name"><Input {...register("name")} /></Field>
      <Field label="Target role"><Input {...register("targetRole")} /></Field>
      <Field label="Summary"><Textarea rows={3} {...register("summary")} /></Field>
      <Field label="Notes"><Textarea rows={3} {...register("notes")} /></Field>
      <FormErrors errors={errors} />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
    </form>
  );
}
```

- [ ] **Step 2: Dialog (create/edit + save hook inline)** — `src/features/resumeVariants/ResumeVariantDialog.tsx`:
```tsx
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useCreateResumeVariant, useUpdateResumeVariant, getGetResumeVariantsQueryKey,
} from "@/lib/api/resume-variants/resume-variants";
import type { ResumeVariantDto, CreateResumeVariantRequest } from "@/lib/api/model";
import { ResumeVariantForm } from "./ResumeVariantForm";

const readErrors = (e: unknown): string[] => {
  const p = (e as { data?: { errors?: Record<string, string[]> } }).data;
  return p?.errors ? Object.values(p.errors).flat() : ["Save failed."];
};

type Props = { open: boolean; variant?: ResumeVariantDto; onOpenChange: (o: boolean) => void };

export function ResumeVariantDialog({ open, variant, onOpenChange }: Props) {
  const qc = useQueryClient();
  const create = useCreateResumeVariant();
  const update = useUpdateResumeVariant();
  const [errors, setErrors] = useState<string[]>([]);

  const onSubmit = async (req: CreateResumeVariantRequest) => {
    setErrors([]);
    try {
      if (variant) await update.mutateAsync({ id: Number(variant.id), data: req });
      else await create.mutateAsync({ data: req });
      qc.invalidateQueries({ queryKey: getGetResumeVariantsQueryKey() });
      toast.success(variant ? "Variant updated" : "Variant added");
      onOpenChange(false);
    } catch (e) { setErrors(readErrors(e)); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{variant ? "Edit resume variant" : "Add resume variant"}</DialogTitle></DialogHeader>
        <ResumeVariantForm key={variant?.id ?? "new"} variant={variant} pending={create.isPending || update.isPending} errors={errors} onSubmit={onSubmit} />
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Table** — `src/features/resumeVariants/ResumeVariantsTable.tsx`:
```tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ResumeVariantDto } from "@/lib/api/model";

type Props = { variants: ResumeVariantDto[]; onEdit: (v: ResumeVariantDto) => void; onMakeDefault: (v: ResumeVariantDto) => void; onDelete: (v: ResumeVariantDto) => void };

export function ResumeVariantsTable({ variants, onEdit, onMakeDefault, onDelete }: Props) {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Target role</TableHead><TableHead /><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
      <TableBody>
        {variants.map((v) => (
          <TableRow key={v.id} className="cursor-pointer" onClick={() => onEdit(v)}>
            <TableCell className="font-medium">{v.name}</TableCell>
            <TableCell>{v.targetRole ?? "—"}</TableCell>
            <TableCell>{v.isDefault && <Badge variant="secondary">Default</Badge>}</TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
              {!v.isDefault && <Button variant="ghost" size="sm" onClick={() => onMakeDefault(v)}>Make default</Button>}
              <Button variant="ghost" size="sm" onClick={() => onDelete(v)}>Delete</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 4: Page** — `src/pages/ResumeVariantsPage.tsx`:
```tsx
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetResumeVariants, useDeleteResumeVariant, useMakeResumeVariantDefault, getGetResumeVariantsQueryKey,
} from "@/lib/api/resume-variants/resume-variants";
import type { ResumeVariantDto } from "@/lib/api/model";
import { ResumeVariantsTable } from "@/features/resumeVariants/ResumeVariantsTable";
import { ResumeVariantDialog } from "@/features/resumeVariants/ResumeVariantDialog";

export default function ResumeVariantsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useGetResumeVariants();
  const remove = useDeleteResumeVariant();
  const makeDefault = useMakeResumeVariantDefault();
  const variants = data?.data ?? [];

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ResumeVariantDto | undefined>();
  const invalidate = () => qc.invalidateQueries({ queryKey: getGetResumeVariantsQueryKey() });

  const onMakeDefault = async (v: ResumeVariantDto) => { await makeDefault.mutateAsync({ id: Number(v.id) }); invalidate(); toast.success(`"${v.name}" is now default`); };
  const onDelete = async (v: ResumeVariantDto) => {
    if (!confirm(`Delete "${v.name}"?`)) return;
    try { await remove.mutateAsync({ id: Number(v.id) }); invalidate(); toast.success("Variant deleted"); }
    catch { toast.error("Cannot delete — variant is used by an application."); }
  };

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Resume Variants</h1>
        <Button onClick={() => { setEditing(undefined); setOpen(true); }}>Add variant</Button>
      </div>
      <ResumeVariantsTable variants={variants} onEdit={(v) => { setEditing(v); setOpen(true); }} onMakeDefault={onMakeDefault} onDelete={onDelete} />
      <ResumeVariantDialog open={open} variant={editing} onOpenChange={setOpen} />
    </div>
  );
}
```

- [ ] **Step 5: Route + nav**

In `src/app/router.tsx` add import `import ResumeVariantsPage from "@/pages/ResumeVariantsPage";` and child route `{ path: "resume-variants", element: <ResumeVariantsPage /> },`.
In `src/components/AppLayout.tsx` add `FileText` to the lucide import and a nav entry `{ to: "/resume-variants", label: "Resume Variants", icon: FileText },` (place after Companies).

- [ ] **Step 6: Typecheck, build, commit**

```
cd frontend && npm run typecheck && npm run build
```
Expected: clean. Manual check: add a variant, mark default, edit, delete.
```
git add frontend/src
git commit -m "feat(web): Resume Variants page + nav (S3.1)"
```

---

## Task 4: JobLead auto-advance function (D6)

**Files:**
- Create: `Domain/JobLeads/ApplicationTrigger.cs`, `Domain/JobLeads/JobLeadStatusTransitions.cs`
- Test: `backend/tests/CareerOps.UnitTests/JobLeads/JobLeadStatusTransitionsTests.cs`

**Interfaces — Produces:** `enum ApplicationTrigger { Created, EnteredInterviewStage, Offer, Rejected, Ghosted, Withdrawn }`; `static JobLeadStatus JobLeadStatusTransitions.Advance(JobLeadStatus current, ApplicationTrigger trigger)`.

- [ ] **Step 1: Write the failing tests**

`backend/tests/CareerOps.UnitTests/JobLeads/JobLeadStatusTransitionsTests.cs`:
```csharp
using CareerOps.Domain.JobLeads;

namespace CareerOps.UnitTests.JobLeads;

public class JobLeadStatusTransitionsTests
{
    [Theory]
    [InlineData(ApplicationTrigger.Created, JobLeadStatus.Applied)]
    [InlineData(ApplicationTrigger.EnteredInterviewStage, JobLeadStatus.Interviewing)]
    [InlineData(ApplicationTrigger.Offer, JobLeadStatus.Offer)]
    [InlineData(ApplicationTrigger.Rejected, JobLeadStatus.Rejected)]
    [InlineData(ApplicationTrigger.Ghosted, JobLeadStatus.Ghosted)]
    [InlineData(ApplicationTrigger.Withdrawn, JobLeadStatus.Withdrawn)]
    public void Advance_maps_trigger_to_status(ApplicationTrigger trigger, JobLeadStatus expected) =>
        Assert.Equal(expected, JobLeadStatusTransitions.Advance(JobLeadStatus.Discovered, trigger));

    [Theory]
    [InlineData(ApplicationTrigger.Created)]
    [InlineData(ApplicationTrigger.Offer)]
    [InlineData(ApplicationTrigger.Rejected)]
    public void Archived_is_terminal(ApplicationTrigger trigger) =>
        Assert.Equal(JobLeadStatus.Archived, JobLeadStatusTransitions.Advance(JobLeadStatus.Archived, trigger));
}
```

- [ ] **Step 2: Run, verify fail (type not defined), implement**

`Domain/JobLeads/ApplicationTrigger.cs`:
```csharp
namespace CareerOps.Domain.JobLeads;

public enum ApplicationTrigger
{
    Created = 0,
    EnteredInterviewStage = 1,
    Offer = 2,
    Rejected = 3,
    Ghosted = 4,
    Withdrawn = 5,
}
```
`Domain/JobLeads/JobLeadStatusTransitions.cs`:
```csharp
namespace CareerOps.Domain.JobLeads;

// D6: one source of truth mapping Application events to JobLead.Status.
// Keyed off the lead's current status, so it is idempotent. Archived is terminal.
public static class JobLeadStatusTransitions
{
    public static JobLeadStatus Advance(JobLeadStatus current, ApplicationTrigger trigger)
    {
        if (current == JobLeadStatus.Archived) return JobLeadStatus.Archived;
        return trigger switch
        {
            ApplicationTrigger.Created => JobLeadStatus.Applied,
            ApplicationTrigger.EnteredInterviewStage => JobLeadStatus.Interviewing,
            ApplicationTrigger.Offer => JobLeadStatus.Offer,
            ApplicationTrigger.Rejected => JobLeadStatus.Rejected,
            ApplicationTrigger.Ghosted => JobLeadStatus.Ghosted,
            ApplicationTrigger.Withdrawn => JobLeadStatus.Withdrawn,
            _ => current,
        };
    }
}
```

- [ ] **Step 3: Run tests, verify pass, commit**

```
dotnet test backend/CareerOps.slnx --filter JobLeadStatusTransitions
```
Expected: PASS.
```
git add backend
git commit -m "feat(domain): JobLead auto-advance transition map (D6, S3.2)"
```

---

## Task 5: Application domain (entity + enums + transition methods)

**Files:**
- Create: `Domain/Applications/{ApplicationStage,ApplicationStatus,Application}.cs`
- Test: `backend/tests/CareerOps.UnitTests/Applications/ApplicationEntityTests.cs`

**Interfaces — Produces:** `Application` entity with `ChangeStage(ApplicationStage)`, `MarkRejected(string?)`, `MarkOffer()`, `MarkGhosted()` and `ApplicationTrigger TriggerFor(...)` helpers (see below). Enums `ApplicationStage` (0–10), `ApplicationStatus` (0–4).

- [ ] **Step 1: Enums**

`Domain/Applications/ApplicationStage.cs`:
```csharp
namespace CareerOps.Domain.Applications;

public enum ApplicationStage
{
    Applied = 0,
    RecruiterScreen = 1,
    TechnicalScreen = 2,
    TakeHome = 3,
    SystemDesign = 4,
    HiringManager = 5,
    Final = 6,
    Offer = 7,
    Rejected = 8,
    Ghosted = 9,
    Withdrawn = 10,
}
```
`Domain/Applications/ApplicationStatus.cs`:
```csharp
namespace CareerOps.Domain.Applications;

public enum ApplicationStatus
{
    Active = 0,
    Paused = 1,
    Rejected = 2,
    Offer = 3,
    Withdrawn = 4,
}
```

- [ ] **Step 2: Write failing entity tests**

`backend/tests/CareerOps.UnitTests/Applications/ApplicationEntityTests.cs`:
```csharp
using CareerOps.Domain.Applications;
using CareerOps.Domain.JobLeads;

namespace CareerOps.UnitTests.Applications;

public class ApplicationEntityTests
{
    private static Application New() => new() { JobLeadId = 1, ResumeVariantId = 1, CurrentStage = ApplicationStage.Applied, Status = ApplicationStatus.Active };

    [Fact]
    public void MarkRejected_sets_stage_status_and_reason()
    {
        var app = New();
        app.MarkRejected("Position filled");
        Assert.Equal(ApplicationStage.Rejected, app.CurrentStage);
        Assert.Equal(ApplicationStatus.Rejected, app.Status);
        Assert.Equal("Position filled", app.RejectionReason);
        Assert.Equal(ApplicationTrigger.Rejected, app.LastTrigger);
    }

    [Fact]
    public void MarkOffer_sets_stage_and_status_offer()
    {
        var app = New();
        app.MarkOffer();
        Assert.Equal(ApplicationStage.Offer, app.CurrentStage);
        Assert.Equal(ApplicationStatus.Offer, app.Status);
        Assert.Equal(ApplicationTrigger.Offer, app.LastTrigger);
    }

    [Fact]
    public void ChangeStage_to_interview_round_signals_interview_trigger()
    {
        var app = New();
        app.ChangeStage(ApplicationStage.TechnicalScreen);
        Assert.Equal(ApplicationStage.TechnicalScreen, app.CurrentStage);
        Assert.Equal(ApplicationTrigger.EnteredInterviewStage, app.LastTrigger);
    }

    [Fact]
    public void ChangeStage_to_withdrawn_sets_status_and_trigger()
    {
        var app = New();
        app.ChangeStage(ApplicationStage.Withdrawn);
        Assert.Equal(ApplicationStatus.Withdrawn, app.Status);
        Assert.Equal(ApplicationTrigger.Withdrawn, app.LastTrigger);
    }
}
```

- [ ] **Step 3: Implement the entity**

`Domain/Applications/Application.cs`:
```csharp
using CareerOps.Domain.Common;
using CareerOps.Domain.JobLeads;
using CareerOps.Domain.ResumeVariants;

namespace CareerOps.Domain.Applications;

public sealed class Application : AuditableEntity
{
    public int Id { get; set; }
    public int JobLeadId { get; set; }
    public JobLead? JobLead { get; set; }
    public int ResumeVariantId { get; set; }
    public ResumeVariant? ResumeVariant { get; set; }
    public DateTime AppliedAtUtc { get; set; }
    public ApplicationStage CurrentStage { get; set; }
    public ApplicationStatus Status { get; set; }
    public decimal? ExpectedSalary { get; set; }
    public string? ExpectedSalaryCurrency { get; set; }
    public string? NoticePeriod { get; set; }
    public string? NextStep { get; set; }
    public DateTime? NextActionAtUtc { get; set; }
    public string? RejectionReason { get; set; }
    public string? Notes { get; set; }

    // The lead trigger produced by the last transition (consumed by ApplicationService; not persisted).
    public ApplicationTrigger? LastTrigger { get; private set; }

    private static readonly HashSet<ApplicationStage> InterviewStages =
    [
        ApplicationStage.RecruiterScreen, ApplicationStage.TechnicalScreen, ApplicationStage.TakeHome,
        ApplicationStage.SystemDesign, ApplicationStage.HiringManager, ApplicationStage.Final,
    ];

    public void ChangeStage(ApplicationStage stage)
    {
        CurrentStage = stage;
        if (stage == ApplicationStage.Withdrawn)
        {
            Status = ApplicationStatus.Withdrawn;
            LastTrigger = ApplicationTrigger.Withdrawn;
        }
        else if (InterviewStages.Contains(stage))
        {
            LastTrigger = ApplicationTrigger.EnteredInterviewStage;
        }
        else
        {
            LastTrigger = null; // Applied (no lead change beyond convert)
        }
    }

    public void MarkRejected(string? reason)
    {
        CurrentStage = ApplicationStage.Rejected;
        Status = ApplicationStatus.Rejected;
        RejectionReason = reason;
        LastTrigger = ApplicationTrigger.Rejected;
    }

    public void MarkOffer()
    {
        CurrentStage = ApplicationStage.Offer;
        Status = ApplicationStatus.Offer;
        LastTrigger = ApplicationTrigger.Offer;
    }

    public void MarkGhosted()
    {
        CurrentStage = ApplicationStage.Ghosted; // ApplicationStatus has no Ghosted; status unchanged
        LastTrigger = ApplicationTrigger.Ghosted;
    }
}
```
Note `LastTrigger` has a private setter and is set only by transition methods; `[NotMapped]` is applied in the EF config (Task 6) so it is not persisted.

- [ ] **Step 4: Run tests, verify pass, commit**

```
dotnet test backend/CareerOps.slnx --filter ApplicationEntity
```
Expected: PASS.
```
git add backend
git commit -m "feat(domain): Application entity + enums + transition methods (S3.2)"
```

---

## Task 6: Application service, convert, actions + persistence

**Files:**
- Create: `Application/Applications/{ConvertToApplicationRequest,ChangeStageRequest,MarkRejectedRequest,UpdateApplicationRequest,ApplicationDto,ConvertResult,ApplicationMappingConfig,ApplicationRequestValidators,ApplicationService}.cs`, `Infrastructure/Persistence/Configurations/ApplicationConfiguration.cs`
- Modify: `Application/Common/IAppDbContext.cs`, `Infrastructure/Persistence/CareerOpsDbContext.cs`, `Application/DependencyInjection.cs`
- Test: `backend/tests/CareerOps.UnitTests/Applications/ApplicationServiceTests.cs`

**Interfaces — Consumes:** `JobLeadStatusTransitions.Advance` (Task 4), `Application` entity (Task 5), `ResumeVariant`/`JobLead`. **Produces:** `ApplicationService(IAppDbContext)` with `ListAsync`, `GetAsync(int)`, `ConvertAsync(int leadId, ConvertToApplicationRequest)` → `ConvertResult`, `UpdateAsync(int, UpdateApplicationRequest)`, `ChangeStageAsync(int, ChangeStageRequest)`, `MarkRejectedAsync(int, MarkRejectedRequest)`, `MarkOfferAsync(int)`, `MarkGhostedAsync(int)`, `DeleteAsync(int)`. `ApplicationDto` includes `CompanyName`, `JobTitle`, `ResumeVariantName`. `enum ConvertOutcome { Created, LeadNotFound, AlreadyConverted }`.

- [ ] **Step 1: Requests, DTO, result, mapping, validators**

`Application/Applications/ConvertToApplicationRequest.cs`:
```csharp
namespace CareerOps.Application.Applications;

public sealed record ConvertToApplicationRequest(
    int ResumeVariantId, DateTime AppliedAtUtc, string? NextStep, DateTime? NextActionAtUtc, string? Notes);
```
`Application/Applications/UpdateApplicationRequest.cs`:
```csharp
namespace CareerOps.Application.Applications;

public sealed record UpdateApplicationRequest(
    int ResumeVariantId, DateTime AppliedAtUtc, decimal? ExpectedSalary, string? ExpectedSalaryCurrency,
    string? NoticePeriod, string? NextStep, DateTime? NextActionAtUtc, string? Notes);
```
`Application/Applications/ChangeStageRequest.cs`:
```csharp
using CareerOps.Domain.Applications;

namespace CareerOps.Application.Applications;

public sealed record ChangeStageRequest(ApplicationStage Stage);
```
`Application/Applications/MarkRejectedRequest.cs`:
```csharp
namespace CareerOps.Application.Applications;

public sealed record MarkRejectedRequest(string? RejectionReason);
```
`Application/Applications/ApplicationDto.cs`:
```csharp
using CareerOps.Domain.Applications;

namespace CareerOps.Application.Applications;

public sealed record ApplicationDto(
    int Id, int JobLeadId, string JobTitle, string CompanyName,
    int ResumeVariantId, string ResumeVariantName,
    DateTime AppliedAtUtc, ApplicationStage CurrentStage, ApplicationStatus Status,
    decimal? ExpectedSalary, string? ExpectedSalaryCurrency, string? NoticePeriod,
    string? NextStep, DateTime? NextActionAtUtc, string? RejectionReason, string? Notes,
    DateTime CreatedAtUtc, DateTime UpdatedAtUtc);
```
`Application/Applications/ConvertResult.cs`:
```csharp
namespace CareerOps.Application.Applications;

public enum ConvertOutcome { Created, LeadNotFound, AlreadyConverted }

public sealed record ConvertResult(ConvertOutcome Outcome, ApplicationDto? Application);
```
`Application/Applications/ApplicationMappingConfig.cs`:
```csharp
using CareerOps.Domain.Applications;
using Mapster;

namespace CareerOps.Application.Applications;

public sealed class ApplicationMappingConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<Application, ApplicationDto>()
              .Map(d => d.JobTitle, s => s.JobLead == null ? "" : s.JobLead.Title)
              .Map(d => d.CompanyName, s => s.JobLead == null || s.JobLead.Company == null ? "" : s.JobLead.Company.Name)
              .Map(d => d.ResumeVariantName, s => s.ResumeVariant == null ? "" : s.ResumeVariant.Name);
    }
}
```
`Application/Applications/ApplicationRequestValidators.cs`:
```csharp
using FluentValidation;

namespace CareerOps.Application.Applications;

public sealed class ConvertToApplicationRequestValidator : AbstractValidator<ConvertToApplicationRequest>
{
    public ConvertToApplicationRequestValidator()
    {
        RuleFor(r => r.ResumeVariantId).GreaterThan(0);
        RuleFor(r => r.AppliedAtUtc).NotEmpty();
    }
}

public sealed class UpdateApplicationRequestValidator : AbstractValidator<UpdateApplicationRequest>
{
    public UpdateApplicationRequestValidator()
    {
        RuleFor(r => r.ResumeVariantId).GreaterThan(0);
        RuleFor(r => r.AppliedAtUtc).NotEmpty();
        RuleFor(r => r.ExpectedSalaryCurrency).Length(3).When(r => !string.IsNullOrWhiteSpace(r.ExpectedSalaryCurrency));
    }
}

public sealed class ChangeStageRequestValidator : AbstractValidator<ChangeStageRequest>
{
    public ChangeStageRequestValidator() => RuleFor(r => r.Stage).IsInEnum();
}
```

- [ ] **Step 2: Service**

`Application/Applications/ApplicationService.cs`:
```csharp
using CareerOps.Application.Common;
using CareerOps.Domain.Applications;
using CareerOps.Domain.JobLeads;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Applications;

public sealed class ApplicationService(IAppDbContext db)
{
    private IQueryable<Application> WithRelations() =>
        db.Applications.Include(a => a.JobLead).ThenInclude(l => l!.Company).Include(a => a.ResumeVariant);

    public async Task<IReadOnlyList<ApplicationDto>> ListAsync(CancellationToken ct = default) =>
        (await WithRelations().OrderByDescending(a => a.UpdatedAtUtc).ToListAsync(ct)).Adapt<List<ApplicationDto>>();

    public async Task<ApplicationDto?> GetAsync(int id, CancellationToken ct = default) =>
        (await WithRelations().FirstOrDefaultAsync(a => a.Id == id, ct))?.Adapt<ApplicationDto>();

    public async Task<ConvertResult> ConvertAsync(int leadId, ConvertToApplicationRequest request, CancellationToken ct = default)
    {
        var lead = await db.JobLeads.FirstOrDefaultAsync(l => l.Id == leadId, ct);
        if (lead is null) return new(ConvertOutcome.LeadNotFound, null);
        if (await db.Applications.AnyAsync(a => a.JobLeadId == leadId, ct))
            return new(ConvertOutcome.AlreadyConverted, null);

        var app = new Application
        {
            JobLeadId = leadId,
            ResumeVariantId = request.ResumeVariantId,
            AppliedAtUtc = request.AppliedAtUtc,
            CurrentStage = ApplicationStage.Applied,
            Status = ApplicationStatus.Active,
            NextStep = request.NextStep,
            NextActionAtUtc = request.NextActionAtUtc,
            Notes = request.Notes,
        };
        db.Applications.Add(app);
        lead.Status = JobLeadStatusTransitions.Advance(lead.Status, ApplicationTrigger.Created);
        await db.SaveChangesAsync(ct);
        return new(ConvertOutcome.Created, (await GetAsync(app.Id, ct))!);
    }

    public async Task<ApplicationDto?> UpdateAsync(int id, UpdateApplicationRequest request, CancellationToken ct = default)
    {
        var app = await db.Applications.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (app is null) return null;
        app.ResumeVariantId = request.ResumeVariantId;
        app.AppliedAtUtc = request.AppliedAtUtc;
        app.ExpectedSalary = request.ExpectedSalary;
        app.ExpectedSalaryCurrency = request.ExpectedSalaryCurrency;
        app.NoticePeriod = request.NoticePeriod;
        app.NextStep = request.NextStep;
        app.NextActionAtUtc = request.NextActionAtUtc;
        app.Notes = request.Notes;
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public Task<ApplicationDto?> ChangeStageAsync(int id, ChangeStageRequest request, CancellationToken ct = default) =>
        ApplyAsync(id, app => app.ChangeStage(request.Stage), ct);

    public Task<ApplicationDto?> MarkRejectedAsync(int id, MarkRejectedRequest request, CancellationToken ct = default) =>
        ApplyAsync(id, app => app.MarkRejected(request.RejectionReason), ct);

    public Task<ApplicationDto?> MarkOfferAsync(int id, CancellationToken ct = default) =>
        ApplyAsync(id, app => app.MarkOffer(), ct);

    public Task<ApplicationDto?> MarkGhostedAsync(int id, CancellationToken ct = default) =>
        ApplyAsync(id, app => app.MarkGhosted(), ct);

    private async Task<ApplicationDto?> ApplyAsync(int id, Action<Application> mutate, CancellationToken ct)
    {
        var app = await db.Applications.Include(a => a.JobLead).FirstOrDefaultAsync(a => a.Id == id, ct);
        if (app is null) return null;
        mutate(app);
        if (app.LastTrigger is { } trigger && app.JobLead is { } lead)
            lead.Status = JobLeadStatusTransitions.Advance(lead.Status, trigger);
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var app = await db.Applications.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (app is null) return false;
        db.Applications.Remove(app); // FollowUpTask cascade-clean wired in Task 10
        await db.SaveChangesAsync(ct);
        return true;
    }
}
```

- [ ] **Step 3: Persistence config + DbSet + DI**

`Infrastructure/Persistence/Configurations/ApplicationConfiguration.cs`:
```csharp
using CareerOps.Domain.Applications;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class ApplicationConfiguration : IEntityTypeConfiguration<Application>
{
    public void Configure(EntityTypeBuilder<Application> b)
    {
        b.ToTable("applications");
        b.HasKey(a => a.Id);
        b.Ignore(a => a.LastTrigger);
        b.Property(a => a.ExpectedSalary).HasPrecision(18, 2);
        b.Property(a => a.ExpectedSalaryCurrency).HasMaxLength(3);
        b.Property(a => a.NoticePeriod).HasMaxLength(100);
        b.Property(a => a.NextStep).HasMaxLength(500);
        b.Property(a => a.RejectionReason).HasMaxLength(1000);
        b.Property(a => a.Notes).HasMaxLength(4000);

        b.HasOne(a => a.JobLead).WithMany().HasForeignKey(a => a.JobLeadId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(a => a.ResumeVariant).WithMany().HasForeignKey(a => a.ResumeVariantId).OnDelete(DeleteBehavior.Restrict);

        b.HasIndex(a => a.JobLeadId).IsUnique(); // one application per lead (D29)
        b.HasIndex(a => a.CurrentStage);
        b.HasIndex(a => a.Status);
    }
}
```
In `IAppDbContext.cs` add `using CareerOps.Domain.Applications;` and `DbSet<Application> Applications { get; }`.
In `CareerOpsDbContext.cs` add the using and `public DbSet<Application> Applications => Set<Application>();`.
In `Application/DependencyInjection.cs` add `using CareerOps.Application.Applications;` and `services.AddScoped<ApplicationService>();`.

- [ ] **Step 4: Write the failing service tests**

`backend/tests/CareerOps.UnitTests/Applications/ApplicationServiceTests.cs`:
```csharp
using CareerOps.Application.Applications;
using CareerOps.Application.Common;
using CareerOps.Domain.Applications;
using CareerOps.Domain.Companies;
using CareerOps.Domain.JobLeads;
using CareerOps.Domain.ResumeVariants;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.UnitTests.Applications;

public class ApplicationServiceTests
{
    private sealed class FixedClock : IClock
    {
        public DateTime UtcNow => new(2026, 6, 20, 12, 0, 0, DateTimeKind.Utc);
        public DateOnly Today => new(2026, 6, 20);
    }

    private static CareerOpsDbContext NewDb() =>
        new(new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase($"careerops-{Guid.NewGuid()}").Options, new FixedClock());

    private static async Task<(CareerOpsDbContext db, int leadId, int variantId)> SeedAsync()
    {
        var db = NewDb();
        var company = new Company { Name = "Equinor" };
        db.Companies.Add(company);
        var variant = new ResumeVariant { Name = "Backend .NET", IsDefault = true };
        db.ResumeVariants.Add(variant);
        await db.SaveChangesAsync();
        var lead = new JobLead { CompanyId = company.Id, Title = "Backend Engineer", Status = JobLeadStatus.Interested };
        db.JobLeads.Add(lead);
        await db.SaveChangesAsync();
        return (db, lead.Id, variant.Id);
    }

    private static ConvertToApplicationRequest Convert(int variantId) =>
        new(variantId, new DateTime(2026, 6, 20, 0, 0, 0, DateTimeKind.Utc), null, null, null);

    [Fact]
    public async Task Convert_creates_application_and_advances_lead_to_applied()
    {
        var (db, leadId, variantId) = await SeedAsync();
        var result = await new ApplicationService(db).ConvertAsync(leadId, Convert(variantId));

        Assert.Equal(ConvertOutcome.Created, result.Outcome);
        Assert.Equal(ApplicationStage.Applied, result.Application!.CurrentStage);
        Assert.Equal(JobLeadStatus.Applied, (await db.JobLeads.FindAsync(leadId))!.Status);
    }

    [Fact]
    public async Task Convert_twice_is_rejected()
    {
        var (db, leadId, variantId) = await SeedAsync();
        var svc = new ApplicationService(db);
        await svc.ConvertAsync(leadId, Convert(variantId));
        var second = await svc.ConvertAsync(leadId, Convert(variantId));
        Assert.Equal(ConvertOutcome.AlreadyConverted, second.Outcome);
    }

    [Fact]
    public async Task ChangeStage_to_interview_advances_lead_to_interviewing()
    {
        var (db, leadId, variantId) = await SeedAsync();
        var svc = new ApplicationService(db);
        var app = (await svc.ConvertAsync(leadId, Convert(variantId))).Application!;

        await svc.ChangeStageAsync(app.Id, new ChangeStageRequest(ApplicationStage.TechnicalScreen));

        Assert.Equal(JobLeadStatus.Interviewing, (await db.JobLeads.FindAsync(leadId))!.Status);
    }

    [Fact]
    public async Task MarkOffer_advances_lead_to_offer()
    {
        var (db, leadId, variantId) = await SeedAsync();
        var svc = new ApplicationService(db);
        var app = (await svc.ConvertAsync(leadId, Convert(variantId))).Application!;

        await svc.MarkOfferAsync(app.Id);

        Assert.Equal(JobLeadStatus.Offer, (await db.JobLeads.FindAsync(leadId))!.Status);
    }
}
```

- [ ] **Step 5: Run tests, build, generate migration, commit**

```
dotnet test backend/CareerOps.slnx --filter ApplicationService
just migrate name="Application"
dotnet build backend/CareerOps.slnx
```
Expected: tests PASS; migration `*_Application.cs` created (applications table, unique index on job_lead_id, FK restrict on resume_variant_id); build OK.
```
git add backend
git commit -m "feat(api): Application service, convert, stage/status actions + migration (S3.2)"
```

---

## Task 7: Application endpoints + client

**Files:**
- Create: `Api/Endpoints/ApplicationEndpoints.cs`
- Modify: `Api/Program.cs`
- Test: `backend/tests/CareerOps.IntegrationTests/ApplicationEndpointTests.cs`

**Interfaces — Consumes:** `ApplicationService` (Task 6). **Produces:** `/api/applications` CRUD + actions, `/api/job-leads/{id}/convert-to-application` (operationIds `GetApplications`, `GetApplication`, `ConvertToApplication`, `UpdateApplication`, `DeleteApplication`, `ChangeApplicationStage`, `MarkApplicationRejected`, `MarkApplicationOffer`, `MarkApplicationGhosted`).

- [ ] **Step 1: Endpoints module**

`Api/Endpoints/ApplicationEndpoints.cs`:
```csharp
using CareerOps.Api.Filters;
using CareerOps.Application.Applications;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CareerOps.Api.Endpoints;

public static class ApplicationEndpoints
{
    public static RouteGroupBuilder MapApplications(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (ApplicationService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.ListAsync(ct)))
             .WithName("GetApplications");

        group.MapGet("/{id:int}", async Task<Results<Ok<ApplicationDto>, NotFound>> (
                int id, ApplicationService svc, CancellationToken ct) =>
                await svc.GetAsync(id, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("GetApplication");

        group.MapPut("/{id:int}", async Task<Results<Ok<ApplicationDto>, NotFound>> (
                int id, UpdateApplicationRequest req, ApplicationService svc, CancellationToken ct) =>
                await svc.UpdateAsync(id, req, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("UpdateApplication")
             .AddEndpointFilter<ValidationFilter<UpdateApplicationRequest>>()
             .ProducesValidationProblem();

        group.MapDelete("/{id:int}", async Task<Results<NoContent, NotFound>> (
                int id, ApplicationService svc, CancellationToken ct) =>
                await svc.DeleteAsync(id, ct) ? TypedResults.NoContent() : TypedResults.NotFound())
             .WithName("DeleteApplication");

        group.MapPost("/{id:int}/change-stage", async Task<Results<Ok<ApplicationDto>, NotFound>> (
                int id, ChangeStageRequest req, ApplicationService svc, CancellationToken ct) =>
                await svc.ChangeStageAsync(id, req, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("ChangeApplicationStage")
             .AddEndpointFilter<ValidationFilter<ChangeStageRequest>>()
             .ProducesValidationProblem();

        group.MapPost("/{id:int}/mark-rejected", async Task<Results<Ok<ApplicationDto>, NotFound>> (
                int id, MarkRejectedRequest req, ApplicationService svc, CancellationToken ct) =>
                await svc.MarkRejectedAsync(id, req, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("MarkApplicationRejected");

        group.MapPost("/{id:int}/mark-offer", async Task<Results<Ok<ApplicationDto>, NotFound>> (
                int id, ApplicationService svc, CancellationToken ct) =>
                await svc.MarkOfferAsync(id, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("MarkApplicationOffer");

        group.MapPost("/{id:int}/mark-ghosted", async Task<Results<Ok<ApplicationDto>, NotFound>> (
                int id, ApplicationService svc, CancellationToken ct) =>
                await svc.MarkGhostedAsync(id, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("MarkApplicationGhosted");

        return group;
    }

    public static RouteGroupBuilder MapConvertToApplication(this RouteGroupBuilder group)
    {
        group.MapPost("/{id:int}/convert-to-application",
                async Task<Results<Created<ApplicationDto>, NotFound, Conflict<string>>> (
                int id, ConvertToApplicationRequest req, ApplicationService svc, CancellationToken ct) =>
            {
                var result = await svc.ConvertAsync(id, req, ct);
                return result.Outcome switch
                {
                    ConvertOutcome.Created => TypedResults.Created($"/api/applications/{result.Application!.Id}", result.Application),
                    ConvertOutcome.LeadNotFound => TypedResults.NotFound(),
                    _ => TypedResults.Conflict("This lead already has an application."),
                };
            })
             .WithName("ConvertToApplication")
             .AddEndpointFilter<ValidationFilter<ConvertToApplicationRequest>>()
             .ProducesValidationProblem();

        return group;
    }
}
```

- [ ] **Step 2: Register groups in Program.cs**

In `Api/Program.cs` add:
```csharp
app.MapGroup("/api/applications").WithTags("Applications").MapApplications();
app.MapGroup("/api/job-leads").WithTags("Applications").MapConvertToApplication();
```

- [ ] **Step 3: Integration test (convert flow)**

`backend/tests/CareerOps.IntegrationTests/ApplicationEndpointTests.cs`:
```csharp
using System.Net;
using System.Net.Http.Json;

namespace CareerOps.IntegrationTests;

public class ApplicationEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Convert_with_missing_resume_variant_returns_400()
    {
        // resumeVariantId omitted/0 -> validator fails before DB; no database needed in "Testing" env.
        var res = await _client.PostAsJsonAsync("/api/job-leads/1/convert-to-application",
            new { resumeVariantId = 0, appliedAtUtc = "2026-06-20T00:00:00Z" });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }
}
```

- [ ] **Step 4: Build, test, regenerate client, commit**

```
dotnet build backend/CareerOps.slnx && dotnet test backend/CareerOps.slnx --filter Application
just up && just gen-client
cd frontend && npm run typecheck
```
Expected: PASS; `frontend/src/lib/api/applications/` + convert hook generated; typecheck clean.
```
git add backend frontend/src/lib/api
git commit -m "feat(api): applications endpoints + convert + regenerate client (S3.2)"
```

---

## Task 8: Applications frontend (board + list + convert)

**Files:**
- Create: `src/features/applications/{applicationRequest.ts,useApplicationMutations.ts,ApplicationCard.tsx,ApplicationBoardColumn.tsx,ApplicationsBoard.tsx,ApplicationsTable.tsx,ApplicationForm.tsx,ApplicationSheet.tsx,ConvertLeadDialog.tsx}`, `src/pages/ApplicationsPage.tsx`
- Modify: `src/lib/enums.ts`, `src/app/router.tsx`, `src/components/AppLayout.tsx`, `src/features/jobLeads/JobLeadSheet.tsx`

**Interfaces — Consumes:** generated `useGetApplications`, `useUpdateApplication`, `useChangeApplicationStage`, `useMarkApplicationRejected`, `useMarkApplicationOffer`, `useMarkApplicationGhosted`, `useConvertToApplication`, `getGetApplicationsQueryKey` from `@/lib/api/applications/applications`; `ApplicationDto` from `@/lib/api/model`. Pattern mirror: `JobLeadsBoard`/`BoardColumn`/`LeadCard`/`useLeadMutations`.

- [ ] **Step 1: Enum maps + badge classes**

Append to `src/lib/enums.ts`:
```ts
export const applicationStage: EnumMap = {
  0: "Applied", 1: "Recruiter screen", 2: "Technical screen", 3: "Take-home",
  4: "System design", 5: "Hiring manager", 6: "Final", 7: "Offer",
  8: "Rejected", 9: "Ghosted", 10: "Withdrawn",
};

export const applicationStatus: EnumMap = {
  0: "Active", 1: "Paused", 2: "Rejected", 3: "Offer", 4: "Withdrawn",
};

export const applicationStatusBadgeClass: Record<number, string> = {
  0: "bg-blue-100 text-blue-700",   // Active
  1: "bg-amber-100 text-amber-800", // Paused
  2: "bg-red-100 text-red-700",     // Rejected
  3: "bg-green-100 text-green-700", // Offer
  4: "bg-zinc-100 text-zinc-600",   // Withdrawn
};

export const relatedEntityType: EnumMap = {
  0: "None", 1: "Job lead", 2: "Application", 3: "Interview", 4: "Contact",
};

export const followUpStatus: EnumMap = {
  0: "Pending", 1: "Completed", 2: "Skipped",
};
```

- [ ] **Step 2: applicationRequest helper** — `src/features/applications/applicationRequest.ts`:
```ts
import type { ApplicationDto, UpdateApplicationRequest } from "@/lib/api/model";

export const toUpdateRequest = (a: ApplicationDto): UpdateApplicationRequest => ({
  resumeVariantId: Number(a.resumeVariantId),
  appliedAtUtc: a.appliedAtUtc,
  expectedSalary: a.expectedSalary,
  expectedSalaryCurrency: a.expectedSalaryCurrency,
  noticePeriod: a.noticePeriod,
  nextStep: a.nextStep,
  nextActionAtUtc: a.nextActionAtUtc,
  notes: a.notes,
});
```

- [ ] **Step 3: Mutations (optimistic stage move)** — `src/features/applications/useApplicationMutations.ts`:
```ts
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useChangeApplicationStage, useMarkApplicationRejected, useMarkApplicationOffer,
  useMarkApplicationGhosted, getGetApplicationsQueryKey,
} from "@/lib/api/applications/applications";
import type { ApplicationDto } from "@/lib/api/model";

type Cache = { data: ApplicationDto[] };

// ApplicationStage ints: pipeline 0..6 -> change-stage; 7 Offer -> mark-offer;
// 8 Rejected -> mark-rejected; 9 Ghosted -> mark-ghosted; 10 Withdrawn -> change-stage.
export function useApplicationStageMove() {
  const qc = useQueryClient();
  const key = getGetApplicationsQueryKey();
  const changeStage = useChangeApplicationStage();
  const markRejected = useMarkApplicationRejected();
  const markOffer = useMarkApplicationOffer();
  const markGhosted = useMarkApplicationGhosted();

  const optimistic = (id: number, stage: number) => {
    qc.cancelQueries({ queryKey: key });
    const prev = qc.getQueryData<Cache>(key);
    qc.setQueryData<Cache>(key, (old) =>
      old ? { ...old, data: old.data.map((a) => (Number(a.id) === id ? { ...a, currentStage: stage } : a)) } : old);
    return prev;
  };
  const rollback = (prev?: Cache) => { if (prev) qc.setQueryData(key, prev); toast.error("Could not move — reverted."); };
  const settle = () => qc.invalidateQueries({ queryKey: key });

  const move = async (app: ApplicationDto, stage: number) => {
    if (stage === app.currentStage) return;
    const id = Number(app.id);
    const prev = optimistic(id, stage);
    try {
      if (stage <= 6 || stage === 10) await changeStage.mutateAsync({ id, data: { stage } });
      else if (stage === 7) await markOffer.mutateAsync({ id });
      else if (stage === 8) await markRejected.mutateAsync({ id, data: { rejectionReason: null } });
      else if (stage === 9) await markGhosted.mutateAsync({ id });
    } catch { rollback(prev); }
    finally { settle(); }
  };

  return { move };
}
```

- [ ] **Step 4: Card + column + board**

`src/features/applications/ApplicationCard.tsx`:
```tsx
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ApplicationDto } from "@/lib/api/model";
import { applicationStatus, applicationStatusBadgeClass, enumLabel } from "@/lib/enums";

type Props = { app: ApplicationDto; onEdit: (a: ApplicationDto) => void };

export function ApplicationCard({ app, onEdit }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `app-${app.id}`, data: { app } });
  return (
    <Card
      ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform) }}
      className={cn("cursor-grab space-y-1 p-3 text-sm", isDragging && "opacity-50")}
      onClick={() => onEdit(app)} {...listeners} {...attributes}
    >
      <div className="font-medium">{app.jobTitle}</div>
      <div className="text-muted-foreground">{app.companyName}</div>
      <Badge className={applicationStatusBadgeClass[app.status]}>{enumLabel(applicationStatus, app.status)}</Badge>
    </Card>
  );
}
```
`src/features/applications/ApplicationBoardColumn.tsx`:
```tsx
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { ApplicationDto } from "@/lib/api/model";
import { applicationStage, enumLabel } from "@/lib/enums";
import { ApplicationCard } from "./ApplicationCard";

type Props = { stage: number; apps: ApplicationDto[]; onEdit: (a: ApplicationDto) => void };

export function ApplicationBoardColumn({ stage, apps, onEdit }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `appcol-${stage}` });
  return (
    <div className="flex h-full w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1 text-sm font-medium">
        <span>{enumLabel(applicationStage, stage)}</span>
        <span className="text-muted-foreground">{apps.length}</span>
      </div>
      <div ref={setNodeRef}
        className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-md bg-muted/40 p-2", isOver && "ring-2 ring-primary/50")}>
        {apps.map((a) => <ApplicationCard key={a.id} app={a} onEdit={onEdit} />)}
      </div>
    </div>
  );
}
```
`src/features/applications/ApplicationsBoard.tsx`:
```tsx
import { useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import type { ApplicationDto } from "@/lib/api/model";
import { useApplicationStageMove } from "./useApplicationMutations";
import { ApplicationBoardColumn } from "./ApplicationBoardColumn";
import { ApplicationCard } from "./ApplicationCard";

const ACTIVE_STAGES = [0, 1, 2, 3, 4, 5, 6, 7]; // Applied..Offer
const CLOSED_STAGES = [8, 9, 10];               // Rejected, Ghosted, Withdrawn

type Props = { apps: ApplicationDto[]; onEdit: (a: ApplicationDto) => void; showClosed: boolean };

export function ApplicationsBoard({ apps, onEdit, showClosed }: Props) {
  const { move } = useApplicationStageMove();
  const [dragging, setDragging] = useState<ApplicationDto | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor));
  const columns = showClosed ? [...ACTIVE_STAGES, ...CLOSED_STAGES] : ACTIVE_STAGES;
  const byStage = (s: number) => apps.filter((a) => a.currentStage === s);

  const onDragStart = (e: DragStartEvent) => setDragging((e.active.data.current?.app as ApplicationDto) ?? null);
  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const app = e.active.data.current?.app as ApplicationDto | undefined;
    const overId = e.over?.id?.toString();
    if (!app || !overId?.startsWith("appcol-")) return;
    move(app, Number(overId.slice(7)));
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex h-full gap-4 overflow-x-auto pb-2">
        {columns.map((s) => <ApplicationBoardColumn key={s} stage={s} apps={byStage(s)} onEdit={onEdit} />)}
      </div>
      <DragOverlay>{dragging ? <ApplicationCard app={dragging} onEdit={() => {}} /> : null}</DragOverlay>
    </DndContext>
  );
}
```

- [ ] **Step 5: Table + form + sheet**

`src/features/applications/ApplicationsTable.tsx`:
```tsx
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ApplicationDto } from "@/lib/api/model";
import { applicationStage, applicationStatus, applicationStatusBadgeClass, enumLabel } from "@/lib/enums";

type Props = { apps: ApplicationDto[]; onEdit: (a: ApplicationDto) => void };

export function ApplicationsTable({ apps, onEdit }: Props) {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Role</TableHead><TableHead>Stage</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
      <TableBody>
        {apps.map((a) => (
          <TableRow key={a.id} className="cursor-pointer" onClick={() => onEdit(a)}>
            <TableCell className="font-medium">{a.companyName}</TableCell>
            <TableCell>{a.jobTitle}</TableCell>
            <TableCell>{enumLabel(applicationStage, a.currentStage)}</TableCell>
            <TableCell><Badge className={applicationStatusBadgeClass[a.status]}>{enumLabel(applicationStatus, a.status)}</Badge></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```
`src/features/applications/ApplicationForm.tsx` — edit-only (resume variant, applied date, salary, notice, next step/action, notes):
```tsx
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/form/Field";
import { FormErrors } from "@/components/form/FormErrors";
import type { ApplicationDto, UpdateApplicationRequest } from "@/lib/api/model";

type Props = { app: ApplicationDto; pending: boolean; errors: string[]; onSubmit: (r: UpdateApplicationRequest) => void };

export function ApplicationForm({ app, pending, errors, onSubmit }: Props) {
  const { register, handleSubmit } = useForm<UpdateApplicationRequest>({
    defaultValues: {
      resumeVariantId: Number(app.resumeVariantId), appliedAtUtc: app.appliedAtUtc?.slice(0, 10),
      expectedSalary: app.expectedSalary, expectedSalaryCurrency: app.expectedSalaryCurrency ?? "",
      noticePeriod: app.noticePeriod ?? "", nextStep: app.nextStep ?? "",
      nextActionAtUtc: app.nextActionAtUtc?.slice(0, 10), notes: app.notes ?? "",
    },
  });
  const submit = handleSubmit((v) => onSubmit({
    ...v,
    resumeVariantId: Number(v.resumeVariantId),
    appliedAtUtc: new Date(v.appliedAtUtc as string).toISOString(),
    nextActionAtUtc: v.nextActionAtUtc ? new Date(v.nextActionAtUtc as string).toISOString() : null,
  }));
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Applied date"><Input type="date" {...register("appliedAtUtc")} /></Field>
      <Field label="Notice period"><Input {...register("noticePeriod")} /></Field>
      <Field label="Next step"><Input {...register("nextStep")} /></Field>
      <Field label="Next action date"><Input type="date" {...register("nextActionAtUtc")} /></Field>
      <Field label="Notes"><Textarea rows={3} {...register("notes")} /></Field>
      <FormErrors errors={errors} />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
    </form>
  );
}
```
`src/features/applications/ApplicationSheet.tsx`:
```tsx
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUpdateApplication, getGetApplicationsQueryKey } from "@/lib/api/applications/applications";
import type { ApplicationDto, UpdateApplicationRequest } from "@/lib/api/model";
import { ApplicationForm } from "./ApplicationForm";

const readErrors = (e: unknown): string[] => {
  const p = (e as { data?: { errors?: Record<string, string[]> } }).data;
  return p?.errors ? Object.values(p.errors).flat() : ["Save failed."];
};

type Props = { app?: ApplicationDto; open: boolean; onOpenChange: (o: boolean) => void };

export function ApplicationSheet({ app, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const update = useUpdateApplication();
  const [errors, setErrors] = useState<string[]>([]);
  if (!app) return null;

  const onSubmit = async (data: UpdateApplicationRequest) => {
    setErrors([]);
    try {
      await update.mutateAsync({ id: Number(app.id), data });
      qc.invalidateQueries({ queryKey: getGetApplicationsQueryKey() });
      toast.success("Application updated");
      onOpenChange(false);
    } catch (e) { setErrors(readErrors(e)); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader><SheetTitle>{app.companyName} · {app.jobTitle}</SheetTitle></SheetHeader>
        <div className="p-4"><ApplicationForm key={app.id} app={app} pending={update.isPending} errors={errors} onSubmit={onSubmit} /></div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 6: Convert dialog (launched from Job Lead sheet)** — `src/features/applications/ConvertLeadDialog.tsx`:
```tsx
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form/Field";
import { FormErrors } from "@/components/form/FormErrors";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConvertToApplication, getGetApplicationsQueryKey } from "@/lib/api/applications/applications";
import { useGetResumeVariants } from "@/lib/api/resume-variants/resume-variants";
import { getGetJobLeadsQueryKey } from "@/lib/api/job-leads/job-leads";
import type { JobLeadDto } from "@/lib/api/model";

type Props = { lead: JobLeadDto; open: boolean; onOpenChange: (o: boolean) => void };

export function ConvertLeadDialog({ lead, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { data } = useGetResumeVariants();
  const variants = data?.data ?? [];
  const convert = useConvertToApplication();
  const [variantId, setVariantId] = useState<string>("");
  const [appliedAt, setAppliedAt] = useState(new Date().toISOString().slice(0, 10));
  const [errors, setErrors] = useState<string[]>([]);

  const defaultId = String(variants.find((v) => v.isDefault)?.id ?? variants[0]?.id ?? "");
  const selected = variantId || defaultId;

  const onConvert = async () => {
    setErrors([]);
    if (!selected) { setErrors(["Create a resume variant first."]); return; }
    try {
      await convert.mutateAsync({ id: Number(lead.id), data: {
        resumeVariantId: Number(selected),
        appliedAtUtc: new Date(appliedAt).toISOString(),
        nextStep: null, nextActionAtUtc: null, notes: null,
      } });
      qc.invalidateQueries({ queryKey: getGetApplicationsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetJobLeadsQueryKey() });
      toast.success("Converted to application");
      onOpenChange(false);
    } catch (e) {
      const status = (e as { status?: number }).status;
      setErrors([status === 409 ? "This lead already has an application." : "Convert failed."]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Convert "{lead.title}" to application</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label="Resume variant">
            <Select value={selected} onValueChange={setVariantId}>
              <SelectTrigger><SelectValue placeholder="Select a variant" /></SelectTrigger>
              <SelectContent>{variants.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Applied date"><Input type="date" value={appliedAt} onChange={(e) => setAppliedAt(e.target.value)} /></Field>
          <FormErrors errors={errors} />
          <Button onClick={onConvert} disabled={convert.isPending}>{convert.isPending ? "Converting…" : "Convert"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 7: Page** — `src/pages/ApplicationsPage.tsx`:
```tsx
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetApplications } from "@/lib/api/applications/applications";
import type { ApplicationDto } from "@/lib/api/model";
import { ApplicationsBoard } from "@/features/applications/ApplicationsBoard";
import { ApplicationsTable } from "@/features/applications/ApplicationsTable";
import { ApplicationSheet } from "@/features/applications/ApplicationSheet";

export default function ApplicationsPage() {
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "list" ? "list" : "board";
  const setView = (v: string) => setParams((p) => { p.set("view", v); return p; }, { replace: true });

  const { data, isLoading } = useGetApplications();
  const apps = useMemo(() => data?.data ?? [], [data]);
  const [showClosed, setShowClosed] = useState(false);
  const [editing, setEditing] = useState<ApplicationDto | undefined>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const openEdit = (a: ApplicationDto) => { setEditing(a); setSheetOpen(true); };

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Applications</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={view} onValueChange={setView}>
          <TabsList><TabsTrigger value="board">Board</TabsTrigger><TabsTrigger value="list">List</TabsTrigger></TabsList>
        </Tabs>
        {view === "board" && (
          <Button variant="outline" size="sm" onClick={() => setShowClosed((s) => !s)}>
            {showClosed ? "Hide closed" : "Show closed"}
          </Button>
        )}
        <span className="text-sm text-muted-foreground">{apps.length} total</span>
      </div>
      <div className="min-h-0 flex-1">
        {view === "board"
          ? <ApplicationsBoard apps={apps} onEdit={openEdit} showClosed={showClosed} />
          : <div className="h-full overflow-y-auto"><ApplicationsTable apps={apps} onEdit={openEdit} /></div>}
      </div>
      <ApplicationSheet app={editing} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
```

- [ ] **Step 8: Wire Convert into the Job Lead sheet**

In `src/features/jobLeads/JobLeadSheet.tsx` add, inside the sheet for an existing lead, a "Convert to application" button that opens `ConvertLeadDialog`:
```tsx
// add near other imports
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConvertLeadDialog } from "@/features/applications/ConvertLeadDialog";
// ...inside the component, when `lead` exists (edit mode):
const [convertOpen, setConvertOpen] = useState(false);
// render below the form (only when editing an existing lead):
{lead && (
  <>
    <Button variant="outline" className="mt-2 w-full" onClick={() => setConvertOpen(true)}>Convert to application</Button>
    <ConvertLeadDialog lead={lead} open={convertOpen} onOpenChange={setConvertOpen} />
  </>
)}
```
(If `JobLeadSheet` does not currently receive the full `lead` object, pass it through from `JobLeadsPage` — it already holds `editing`.)

- [ ] **Step 9: Route + nav**

In `src/app/router.tsx` add `import ApplicationsPage from "@/pages/ApplicationsPage";` and `{ path: "applications", element: <ApplicationsPage /> },` (after job-leads).
In `src/components/AppLayout.tsx` add `Send` to the lucide import and `{ to: "/applications", label: "Applications", icon: Send },` after Job Leads.

- [ ] **Step 10: Typecheck, build, commit**

```
cd frontend && npm run typecheck && npm run build
```
Expected: clean. Manual check: convert a lead (board card → sheet → Convert), see it appear on the Applications board, drag across stages, confirm the lead's status changed on the Job Leads board.
```
git add frontend/src
git commit -m "feat(web): Applications board + list, convert-to-application (S3.2)"
```

---

## Task 9: FollowUpTask backend (entity + service + persistence)

**Files:**
- Create: `Domain/FollowUpTasks/{RelatedEntityType,FollowUpStatus,FollowUpTask}.cs`, `Application/FollowUpTasks/{CreateFollowUpTaskRequest,UpdateFollowUpTaskRequest,FollowUpTaskDto,FollowUpTaskMappingConfig,FollowUpTaskRequestValidators,FollowUpTaskService}.cs`, `Infrastructure/Persistence/Configurations/FollowUpTaskConfiguration.cs`
- Modify: `Application/Common/IAppDbContext.cs`, `Infrastructure/Persistence/CareerOpsDbContext.cs`, `Application/DependencyInjection.cs`
- Test: `backend/tests/CareerOps.UnitTests/FollowUpTasks/{FollowUpTaskServiceTests,FollowUpTaskRequestValidatorTests}.cs`

**Interfaces — Produces:** `FollowUpTaskService(IAppDbContext, IClock)` with `ListAsync`, `GetDueAsync()`, `GetAsync(int)`, `CreateAsync`, `UpdateAsync`, `DeleteAsync`, `CompleteAsync(int)`, `SkipAsync(int)`. `FollowUpTaskDto(int Id, string Title, string? Description, RelatedEntityType RelatedEntityType, int? RelatedEntityId, DateTime DueAtUtc, FollowUpStatus Status, Priority Priority, DateTime CreatedAtUtc, DateTime UpdatedAtUtc)`. `IAppDbContext.FollowUpTasks`.

- [ ] **Step 1: Enums + entity**

`Domain/FollowUpTasks/RelatedEntityType.cs`:
```csharp
namespace CareerOps.Domain.FollowUpTasks;

public enum RelatedEntityType
{
    None = 0,
    JobLead = 1,
    Application = 2,
    Interview = 3,
    Contact = 4,
}
```
`Domain/FollowUpTasks/FollowUpStatus.cs`:
```csharp
namespace CareerOps.Domain.FollowUpTasks;

public enum FollowUpStatus
{
    Pending = 0,
    Completed = 1,
    Skipped = 2,
}
```
`Domain/FollowUpTasks/FollowUpTask.cs`:
```csharp
using CareerOps.Domain.Common;
using CareerOps.Domain.JobLeads;

namespace CareerOps.Domain.FollowUpTasks;

// Polymorphic reference (RelatedEntityType + RelatedEntityId) with NO FK (D12 loose-reference).
public sealed class FollowUpTask : AuditableEntity
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public RelatedEntityType RelatedEntityType { get; set; }
    public int? RelatedEntityId { get; set; }
    public DateTime DueAtUtc { get; set; }
    public FollowUpStatus Status { get; set; }
    public Priority Priority { get; set; }

    public void Complete() => Status = FollowUpStatus.Completed;
    public void Skip() => Status = FollowUpStatus.Skipped;
}
```

- [ ] **Step 2: App layer**

`Application/FollowUpTasks/CreateFollowUpTaskRequest.cs`:
```csharp
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.JobLeads;

namespace CareerOps.Application.FollowUpTasks;

public sealed record CreateFollowUpTaskRequest(
    string Title, string? Description, RelatedEntityType RelatedEntityType, int? RelatedEntityId,
    DateTime DueAtUtc, FollowUpStatus Status, Priority Priority);
```
`Application/FollowUpTasks/UpdateFollowUpTaskRequest.cs`:
```csharp
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.JobLeads;

namespace CareerOps.Application.FollowUpTasks;

public sealed record UpdateFollowUpTaskRequest(
    string Title, string? Description, RelatedEntityType RelatedEntityType, int? RelatedEntityId,
    DateTime DueAtUtc, FollowUpStatus Status, Priority Priority);
```
`Application/FollowUpTasks/FollowUpTaskDto.cs`:
```csharp
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.JobLeads;

namespace CareerOps.Application.FollowUpTasks;

public sealed record FollowUpTaskDto(
    int Id, string Title, string? Description, RelatedEntityType RelatedEntityType, int? RelatedEntityId,
    DateTime DueAtUtc, FollowUpStatus Status, Priority Priority, DateTime CreatedAtUtc, DateTime UpdatedAtUtc);
```
`Application/FollowUpTasks/FollowUpTaskMappingConfig.cs`:
```csharp
using CareerOps.Domain.FollowUpTasks;
using Mapster;

namespace CareerOps.Application.FollowUpTasks;

public sealed class FollowUpTaskMappingConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<CreateFollowUpTaskRequest, FollowUpTask>()
              .Ignore(d => d.Id).Ignore(d => d.CreatedAtUtc).Ignore(d => d.UpdatedAtUtc);
        config.NewConfig<UpdateFollowUpTaskRequest, FollowUpTask>()
              .Ignore(d => d.Id).Ignore(d => d.CreatedAtUtc).Ignore(d => d.UpdatedAtUtc);
    }
}
```
`Application/FollowUpTasks/FollowUpTaskRequestValidators.cs`:
```csharp
using FluentValidation;

namespace CareerOps.Application.FollowUpTasks;

public sealed class CreateFollowUpTaskRequestValidator : AbstractValidator<CreateFollowUpTaskRequest>
{
    public CreateFollowUpTaskRequestValidator()
    {
        RuleFor(r => r.Title).NotEmpty().MaximumLength(300);
        RuleFor(r => r.DueAtUtc).NotEmpty();
        RuleFor(r => r.Status).IsInEnum();
        RuleFor(r => r.Priority).IsInEnum();
        RuleFor(r => r.RelatedEntityType).IsInEnum();
    }
}

public sealed class UpdateFollowUpTaskRequestValidator : AbstractValidator<UpdateFollowUpTaskRequest>
{
    public UpdateFollowUpTaskRequestValidator()
    {
        RuleFor(r => r.Title).NotEmpty().MaximumLength(300);
        RuleFor(r => r.DueAtUtc).NotEmpty();
        RuleFor(r => r.Status).IsInEnum();
        RuleFor(r => r.Priority).IsInEnum();
        RuleFor(r => r.RelatedEntityType).IsInEnum();
    }
}
```

- [ ] **Step 3: Service (with IClock for due)**

`Application/FollowUpTasks/FollowUpTaskService.cs`:
```csharp
using CareerOps.Application.Common;
using CareerOps.Domain.FollowUpTasks;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.FollowUpTasks;

public sealed class FollowUpTaskService(IAppDbContext db, IClock clock)
{
    public async Task<IReadOnlyList<FollowUpTaskDto>> ListAsync(CancellationToken ct = default) =>
        (await db.FollowUpTasks.OrderBy(t => t.DueAtUtc).ToListAsync(ct)).Adapt<List<FollowUpTaskDto>>();

    public async Task<IReadOnlyList<FollowUpTaskDto>> GetDueAsync(CancellationToken ct = default)
    {
        var now = clock.UtcNow;
        return (await db.FollowUpTasks
            .Where(t => t.Status == FollowUpStatus.Pending && t.DueAtUtc <= now)
            .OrderBy(t => t.DueAtUtc).ToListAsync(ct)).Adapt<List<FollowUpTaskDto>>();
    }

    public async Task<FollowUpTaskDto?> GetAsync(int id, CancellationToken ct = default) =>
        (await db.FollowUpTasks.FirstOrDefaultAsync(t => t.Id == id, ct))?.Adapt<FollowUpTaskDto>();

    public async Task<FollowUpTaskDto> CreateAsync(CreateFollowUpTaskRequest request, CancellationToken ct = default)
    {
        var task = request.Adapt<FollowUpTask>();
        db.FollowUpTasks.Add(task);
        await db.SaveChangesAsync(ct);
        return task.Adapt<FollowUpTaskDto>();
    }

    public async Task<FollowUpTaskDto?> UpdateAsync(int id, UpdateFollowUpTaskRequest request, CancellationToken ct = default)
    {
        var task = await db.FollowUpTasks.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (task is null) return null;
        request.Adapt(task);
        await db.SaveChangesAsync(ct);
        return task.Adapt<FollowUpTaskDto>();
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var task = await db.FollowUpTasks.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (task is null) return false;
        db.FollowUpTasks.Remove(task);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public Task<FollowUpTaskDto?> CompleteAsync(int id, CancellationToken ct = default) => SetStatusAsync(id, t => t.Complete(), ct);
    public Task<FollowUpTaskDto?> SkipAsync(int id, CancellationToken ct = default) => SetStatusAsync(id, t => t.Skip(), ct);

    private async Task<FollowUpTaskDto?> SetStatusAsync(int id, Action<FollowUpTask> mutate, CancellationToken ct)
    {
        var task = await db.FollowUpTasks.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (task is null) return null;
        mutate(task);
        await db.SaveChangesAsync(ct);
        return task.Adapt<FollowUpTaskDto>();
    }
}
```

- [ ] **Step 4: DbSet + DI + config**

In `IAppDbContext.cs` add `using CareerOps.Domain.FollowUpTasks;` and `DbSet<FollowUpTask> FollowUpTasks { get; }`.
In `CareerOpsDbContext.cs` add the using and `public DbSet<FollowUpTask> FollowUpTasks => Set<FollowUpTask>();`.
In `Application/DependencyInjection.cs` add `using CareerOps.Application.FollowUpTasks;` and `services.AddScoped<FollowUpTaskService>();`.
`Infrastructure/Persistence/Configurations/FollowUpTaskConfiguration.cs`:
```csharp
using CareerOps.Domain.FollowUpTasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class FollowUpTaskConfiguration : IEntityTypeConfiguration<FollowUpTask>
{
    public void Configure(EntityTypeBuilder<FollowUpTask> b)
    {
        b.ToTable("follow_up_tasks");
        b.HasKey(t => t.Id);
        b.Property(t => t.Title).HasMaxLength(300).IsRequired();
        b.Property(t => t.Description).HasMaxLength(2000);
        b.HasIndex(t => new { t.Status, t.DueAtUtc });
        b.HasIndex(t => new { t.RelatedEntityType, t.RelatedEntityId });
    }
}
```

- [ ] **Step 5: Write the failing tests**

`backend/tests/CareerOps.UnitTests/FollowUpTasks/FollowUpTaskServiceTests.cs`:
```csharp
using CareerOps.Application.Common;
using CareerOps.Application.FollowUpTasks;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.JobLeads;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.UnitTests.FollowUpTasks;

public class FollowUpTaskServiceTests
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

    private static CreateFollowUpTaskRequest Task(DateTime due, FollowUpStatus status = FollowUpStatus.Pending) =>
        new("Email recruiter", null, RelatedEntityType.JobLead, 1, due, status, Priority.High);

    [Fact]
    public async Task GetDue_returns_pending_tasks_at_or_before_now()
    {
        await using var db = NewDb();
        var svc = new FollowUpTaskService(db, Clock);
        await svc.CreateAsync(Task(Clock.UtcNow.AddHours(-1)));            // due
        await svc.CreateAsync(Task(Clock.UtcNow.AddDays(1)));             // future, not due
        await svc.CreateAsync(Task(Clock.UtcNow.AddHours(-1), FollowUpStatus.Completed)); // done, excluded

        var due = await svc.GetDueAsync();

        Assert.Single(due);
    }

    [Fact]
    public async Task Complete_sets_status_completed()
    {
        await using var db = NewDb();
        var svc = new FollowUpTaskService(db, Clock);
        var created = await svc.CreateAsync(Task(Clock.UtcNow));

        var done = await svc.CompleteAsync(created.Id);

        Assert.Equal(FollowUpStatus.Completed, done!.Status);
    }
}
```
`backend/tests/CareerOps.UnitTests/FollowUpTasks/FollowUpTaskRequestValidatorTests.cs`:
```csharp
using CareerOps.Application.FollowUpTasks;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.JobLeads;
using FluentValidation.TestHelper;

namespace CareerOps.UnitTests.FollowUpTasks;

public class FollowUpTaskRequestValidatorTests
{
    private readonly CreateFollowUpTaskRequestValidator _validator = new();

    [Fact]
    public void Title_is_required() =>
        _validator.TestValidate(new CreateFollowUpTaskRequest(
            "", null, RelatedEntityType.None, null, new DateTime(2026, 6, 20, 0, 0, 0, DateTimeKind.Utc),
            FollowUpStatus.Pending, Priority.Medium)).ShouldHaveValidationErrorFor(r => r.Title);
}
```

- [ ] **Step 6: Run tests, build, migrate, commit**

```
dotnet test backend/CareerOps.slnx --filter FollowUpTask
just migrate name="FollowUpTask"
dotnet build backend/CareerOps.slnx
```
Expected: PASS; migration created; build OK.
```
git add backend
git commit -m "feat(api): FollowUpTask entity, service, due query + migration (S3.3)"
```

---

## Task 10: Delete cascade-clean for loose-reference tasks (D12)

**Files:**
- Modify: `Application/JobLeads/JobLeadService.cs`, `Application/Applications/ApplicationService.cs`
- Test: `backend/tests/CareerOps.UnitTests/FollowUpTasks/CascadeCleanTests.cs`

**Interfaces — Consumes:** `IAppDbContext.FollowUpTasks`, `RelatedEntityType`. Modifies the existing `DeleteAsync` of both services to remove matching follow-up rows in the same operation.

- [ ] **Step 1: Write the failing test**

`backend/tests/CareerOps.UnitTests/FollowUpTasks/CascadeCleanTests.cs`:
```csharp
using CareerOps.Application.Common;
using CareerOps.Application.JobLeads;
using CareerOps.Domain.Companies;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.JobLeads;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.UnitTests.FollowUpTasks;

public class CascadeCleanTests
{
    private sealed class FixedClock : IClock
    {
        public DateTime UtcNow => new(2026, 6, 20, 12, 0, 0, DateTimeKind.Utc);
        public DateOnly Today => new(2026, 6, 20);
    }

    private static CareerOpsDbContext NewDb() =>
        new(new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase($"careerops-{Guid.NewGuid()}").Options, new FixedClock());

    [Fact]
    public async Task Deleting_lead_removes_its_follow_up_tasks()
    {
        await using var db = NewDb();
        var company = new Company { Name = "Equinor" };
        db.Companies.Add(company);
        await db.SaveChangesAsync();
        var lead = new JobLead { CompanyId = company.Id, Title = "Backend" };
        db.JobLeads.Add(lead);
        await db.SaveChangesAsync();
        db.FollowUpTasks.Add(new FollowUpTask
        {
            Title = "Follow up", RelatedEntityType = RelatedEntityType.JobLead,
            RelatedEntityId = lead.Id, DueAtUtc = new DateTime(2026, 6, 20, 0, 0, 0, DateTimeKind.Utc),
            Status = FollowUpStatus.Pending, Priority = Priority.High,
        });
        await db.SaveChangesAsync();

        await new JobLeadService(db).DeleteAsync(lead.Id);

        Assert.Empty(await db.FollowUpTasks.ToListAsync());
    }
}
```

- [ ] **Step 2: Run, verify fail (task still present), implement cleanup**

In `Application/JobLeads/JobLeadService.cs` add `using CareerOps.Domain.FollowUpTasks;` and replace `DeleteAsync`:
```csharp
public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
{
    var lead = await db.JobLeads.FirstOrDefaultAsync(l => l.Id == id, ct);
    if (lead is null) return false;

    // D12: applications cascade via FK; loose-reference follow-up tasks are cleaned here (no orphans).
    var tasks = await db.FollowUpTasks
        .Where(t => t.RelatedEntityType == RelatedEntityType.JobLead && t.RelatedEntityId == id)
        .ToListAsync(ct);
    db.FollowUpTasks.RemoveRange(tasks);

    db.JobLeads.Remove(lead);
    await db.SaveChangesAsync(ct);
    return true;
}
```
In `Application/Applications/ApplicationService.cs` add `using CareerOps.Domain.FollowUpTasks;` and replace `DeleteAsync`:
```csharp
public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
{
    var app = await db.Applications.FirstOrDefaultAsync(a => a.Id == id, ct);
    if (app is null) return false;

    var tasks = await db.FollowUpTasks
        .Where(t => t.RelatedEntityType == RelatedEntityType.Application && t.RelatedEntityId == id)
        .ToListAsync(ct);
    db.FollowUpTasks.RemoveRange(tasks);

    db.Applications.Remove(app);
    await db.SaveChangesAsync(ct);
    return true;
}
```

- [ ] **Step 3: Run tests, commit**

```
dotnet test backend/CareerOps.slnx --filter CascadeClean
```
Expected: PASS.
```
git add backend
git commit -m "feat(api): cascade-clean follow-up tasks on lead/application delete (D12, S3.3)"
```

---

## Task 11: FollowUpTask endpoints + client

**Files:**
- Create: `Api/Endpoints/FollowUpTaskEndpoints.cs`
- Modify: `Api/Program.cs`
- Test: `backend/tests/CareerOps.IntegrationTests/FollowUpTaskEndpointTests.cs`

**Interfaces — Consumes:** `FollowUpTaskService` (Task 9). **Produces:** `/api/follow-up-tasks` CRUD + `/due` + `complete` + `skip` (operationIds `GetFollowUpTasks`, `GetDueFollowUpTasks`, `CreateFollowUpTask`, `UpdateFollowUpTask`, `DeleteFollowUpTask`, `CompleteFollowUpTask`, `SkipFollowUpTask`).

- [ ] **Step 1: Endpoints module**

`Api/Endpoints/FollowUpTaskEndpoints.cs`:
```csharp
using CareerOps.Api.Filters;
using CareerOps.Application.FollowUpTasks;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CareerOps.Api.Endpoints;

public static class FollowUpTaskEndpoints
{
    public static RouteGroupBuilder MapFollowUpTasks(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (FollowUpTaskService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.ListAsync(ct)))
             .WithName("GetFollowUpTasks");

        group.MapGet("/due", async (FollowUpTaskService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.GetDueAsync(ct)))
             .WithName("GetDueFollowUpTasks");

        group.MapPost("/", async (CreateFollowUpTaskRequest req, FollowUpTaskService svc, CancellationToken ct) =>
            {
                var dto = await svc.CreateAsync(req, ct);
                return TypedResults.Created($"/api/follow-up-tasks/{dto.Id}", dto);
            })
             .WithName("CreateFollowUpTask")
             .AddEndpointFilter<ValidationFilter<CreateFollowUpTaskRequest>>()
             .ProducesValidationProblem();

        group.MapPut("/{id:int}", async Task<Results<Ok<FollowUpTaskDto>, NotFound>> (
                int id, UpdateFollowUpTaskRequest req, FollowUpTaskService svc, CancellationToken ct) =>
                await svc.UpdateAsync(id, req, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("UpdateFollowUpTask")
             .AddEndpointFilter<ValidationFilter<UpdateFollowUpTaskRequest>>()
             .ProducesValidationProblem();

        group.MapDelete("/{id:int}", async Task<Results<NoContent, NotFound>> (
                int id, FollowUpTaskService svc, CancellationToken ct) =>
                await svc.DeleteAsync(id, ct) ? TypedResults.NoContent() : TypedResults.NotFound())
             .WithName("DeleteFollowUpTask");

        group.MapPost("/{id:int}/complete", async Task<Results<Ok<FollowUpTaskDto>, NotFound>> (
                int id, FollowUpTaskService svc, CancellationToken ct) =>
                await svc.CompleteAsync(id, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("CompleteFollowUpTask");

        group.MapPost("/{id:int}/skip", async Task<Results<Ok<FollowUpTaskDto>, NotFound>> (
                int id, FollowUpTaskService svc, CancellationToken ct) =>
                await svc.SkipAsync(id, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("SkipFollowUpTask");

        return group;
    }
}
```

- [ ] **Step 2: Register group in Program.cs**

```csharp
app.MapGroup("/api/follow-up-tasks").WithTags("FollowUpTasks").MapFollowUpTasks();
```

- [ ] **Step 3: Integration test (validation 400)**

`backend/tests/CareerOps.IntegrationTests/FollowUpTaskEndpointTests.cs`:
```csharp
using System.Net;
using System.Net.Http.Json;

namespace CareerOps.IntegrationTests;

public class FollowUpTaskEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Create_with_blank_title_returns_400()
    {
        var res = await _client.PostAsJsonAsync("/api/follow-up-tasks", new
        {
            title = "", relatedEntityType = 0, dueAtUtc = "2026-06-20T00:00:00Z", status = 0, priority = 1,
        });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }
}
```

- [ ] **Step 4: Build, test, regenerate client, commit**

```
dotnet build backend/CareerOps.slnx && dotnet test backend/CareerOps.slnx --filter FollowUpTask
just up && just gen-client
cd frontend && npm run typecheck
```
Expected: PASS; `frontend/src/lib/api/follow-up-tasks/` generated; typecheck clean.
```
git add backend frontend/src/lib/api
git commit -m "feat(api): follow-up-tasks endpoints + regenerate client (S3.3)"
```

---

## Task 12: Tasks page + dashboard today's-actions

**Files:**
- Create: `src/features/followUpTasks/{FollowUpTaskForm,FollowUpTaskDialog,FollowUpTasksTable}.tsx`, `src/pages/TasksPage.tsx`, `src/features/dashboard/TodaysActions.tsx`
- Modify: `src/app/router.tsx`, `src/components/AppLayout.tsx`, `src/pages/DashboardPage.tsx`

**Interfaces — Consumes:** generated `useGetFollowUpTasks`, `useGetDueFollowUpTasks`, `useCreateFollowUpTask`, `useUpdateFollowUpTask`, `useDeleteFollowUpTask`, `useCompleteFollowUpTask`, `useSkipFollowUpTask` from `@/lib/api/follow-up-tasks/follow-up-tasks`; `FollowUpTaskDto`. Reuses `EnumSelect` for status/priority/relatedEntityType and `priority`/`followUpStatus`/`relatedEntityType` maps.

- [ ] **Step 1: Form** — `src/features/followUpTasks/FollowUpTaskForm.tsx`:
```tsx
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/form/Field";
import { FormErrors } from "@/components/form/FormErrors";
import { EnumSelect } from "@/components/form/EnumSelect";
import { priority, followUpStatus, relatedEntityType } from "@/lib/enums";
import type { FollowUpTaskDto, CreateFollowUpTaskRequest } from "@/lib/api/model";

type Props = { task?: FollowUpTaskDto; pending: boolean; errors: string[]; onSubmit: (r: CreateFollowUpTaskRequest) => void };

export function FollowUpTaskForm({ task, pending, errors, onSubmit }: Props) {
  const { register, handleSubmit, control } = useForm<CreateFollowUpTaskRequest>({
    defaultValues: {
      title: task?.title ?? "", description: task?.description ?? "",
      relatedEntityType: task?.relatedEntityType ?? 0, relatedEntityId: task?.relatedEntityId ?? null,
      dueAtUtc: task?.dueAtUtc?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      status: task?.status ?? 0, priority: task?.priority ?? 1,
    },
  });
  const submit = handleSubmit((v) => onSubmit({
    ...v,
    relatedEntityId: v.relatedEntityId ? Number(v.relatedEntityId) : null,
    dueAtUtc: new Date(v.dueAtUtc as string).toISOString(),
  }));
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Title"><Input {...register("title")} /></Field>
      <Field label="Description"><Textarea rows={3} {...register("description")} /></Field>
      <Field label="Due date"><Input type="date" {...register("dueAtUtc")} /></Field>
      <EnumSelect control={control} name="priority" label="Priority" map={priority} />
      <EnumSelect control={control} name="status" label="Status" map={followUpStatus} />
      <EnumSelect control={control} name="relatedEntityType" label="Linked to" map={relatedEntityType} />
      <Field label="Linked entity id (optional)"><Input type="number" {...register("relatedEntityId")} /></Field>
      <FormErrors errors={errors} />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
    </form>
  );
}
```

- [ ] **Step 2: Dialog** — `src/features/followUpTasks/FollowUpTaskDialog.tsx`:
```tsx
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useCreateFollowUpTask, useUpdateFollowUpTask,
  getGetFollowUpTasksQueryKey, getGetDueFollowUpTasksQueryKey,
} from "@/lib/api/follow-up-tasks/follow-up-tasks";
import type { FollowUpTaskDto, CreateFollowUpTaskRequest } from "@/lib/api/model";
import { FollowUpTaskForm } from "./FollowUpTaskForm";

const readErrors = (e: unknown): string[] => {
  const p = (e as { data?: { errors?: Record<string, string[]> } }).data;
  return p?.errors ? Object.values(p.errors).flat() : ["Save failed."];
};

type Props = { open: boolean; task?: FollowUpTaskDto; onOpenChange: (o: boolean) => void };

export function FollowUpTaskDialog({ open, task, onOpenChange }: Props) {
  const qc = useQueryClient();
  const create = useCreateFollowUpTask();
  const update = useUpdateFollowUpTask();
  const [errors, setErrors] = useState<string[]>([]);
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetFollowUpTasksQueryKey() });
    qc.invalidateQueries({ queryKey: getGetDueFollowUpTasksQueryKey() });
  };

  const onSubmit = async (req: CreateFollowUpTaskRequest) => {
    setErrors([]);
    try {
      if (task) await update.mutateAsync({ id: Number(task.id), data: req });
      else await create.mutateAsync({ data: req });
      invalidate();
      toast.success(task ? "Task updated" : "Task added");
      onOpenChange(false);
    } catch (e) { setErrors(readErrors(e)); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{task ? "Edit task" : "Add task"}</DialogTitle></DialogHeader>
        <FollowUpTaskForm key={task?.id ?? "new"} task={task} pending={create.isPending || update.isPending} errors={errors} onSubmit={onSubmit} />
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Table** — `src/features/followUpTasks/FollowUpTasksTable.tsx`:
```tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import type { FollowUpTaskDto } from "@/lib/api/model";
import { followUpStatus, relatedEntityType, enumLabel } from "@/lib/enums";

type Props = {
  tasks: FollowUpTaskDto[]; onEdit: (t: FollowUpTaskDto) => void;
  onComplete: (t: FollowUpTaskDto) => void; onSkip: (t: FollowUpTaskDto) => void;
};

export function FollowUpTasksTable({ tasks, onEdit, onComplete, onSkip }: Props) {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Status</TableHead><TableHead>Title</TableHead><TableHead>Linked</TableHead><TableHead>Due</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
      <TableBody>
        {tasks.map((t) => (
          <TableRow key={t.id} className="cursor-pointer" onClick={() => onEdit(t)}>
            <TableCell><Badge variant="secondary">{enumLabel(followUpStatus, t.status)}</Badge></TableCell>
            <TableCell className="font-medium">{t.title}</TableCell>
            <TableCell>{enumLabel(relatedEntityType, t.relatedEntityType)}</TableCell>
            <TableCell>{format(new Date(t.dueAtUtc), "dd.MM.yyyy")}</TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
              {t.status === 0 && (<>
                <Button variant="ghost" size="sm" onClick={() => onComplete(t)}>Done</Button>
                <Button variant="ghost" size="sm" onClick={() => onSkip(t)}>Skip</Button>
              </>)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 4: Tasks page** — `src/pages/TasksPage.tsx`:
```tsx
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useGetFollowUpTasks, useCompleteFollowUpTask, useSkipFollowUpTask, useDeleteFollowUpTask,
  getGetFollowUpTasksQueryKey, getGetDueFollowUpTasksQueryKey,
} from "@/lib/api/follow-up-tasks/follow-up-tasks";
import type { FollowUpTaskDto } from "@/lib/api/model";
import { FollowUpTasksTable } from "@/features/followUpTasks/FollowUpTasksTable";
import { FollowUpTaskDialog } from "@/features/followUpTasks/FollowUpTaskDialog";

export default function TasksPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useGetFollowUpTasks();
  const complete = useCompleteFollowUpTask();
  const skip = useSkipFollowUpTask();
  const all = useMemo(() => data?.data ?? [], [data]);

  const [filter, setFilter] = useState("pending");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FollowUpTaskDto | undefined>();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetFollowUpTasksQueryKey() });
    qc.invalidateQueries({ queryKey: getGetDueFollowUpTasksQueryKey() });
  };
  const tasks = filter === "all" ? all : all.filter((t) => (filter === "pending" ? t.status === 0 : t.status !== 0));

  const onComplete = async (t: FollowUpTaskDto) => { await complete.mutateAsync({ id: Number(t.id) }); invalidate(); toast.success("Done"); };
  const onSkip = async (t: FollowUpTaskDto) => { await skip.mutateAsync({ id: Number(t.id) }); invalidate(); toast.success("Skipped"); };

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <Button onClick={() => { setEditing(undefined); setOpen(true); }}>Add task</Button>
      </div>
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="done">Completed / skipped</SelectItem>
          <SelectItem value="all">All</SelectItem>
        </SelectContent>
      </Select>
      <FollowUpTasksTable tasks={tasks} onEdit={(t) => { setEditing(t); setOpen(true); }} onComplete={onComplete} onSkip={onSkip} />
      <FollowUpTaskDialog open={open} task={editing} onOpenChange={setOpen} />
    </div>
  );
}
```

- [ ] **Step 5: Dashboard today's-actions** — `src/features/dashboard/TodaysActions.tsx`:
```tsx
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useGetDueFollowUpTasks, useCompleteFollowUpTask, useSkipFollowUpTask,
  getGetDueFollowUpTasksQueryKey, getGetFollowUpTasksQueryKey,
} from "@/lib/api/follow-up-tasks/follow-up-tasks";
import type { FollowUpTaskDto } from "@/lib/api/model";

function startOfTodayIso(): number {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
}

export function TodaysActions() {
  const qc = useQueryClient();
  const { data } = useGetDueFollowUpTasks();
  const complete = useCompleteFollowUpTask();
  const skip = useSkipFollowUpTask();
  const due = data?.data ?? [];
  const overdue = due.filter((t) => new Date(t.dueAtUtc).getTime() < startOfTodayIso());
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetDueFollowUpTasksQueryKey() });
    qc.invalidateQueries({ queryKey: getGetFollowUpTasksQueryKey() });
  };
  const act = async (fn: Promise<unknown>, msg: string) => { await fn; invalidate(); toast.success(msg); };

  const Row = (t: FollowUpTaskDto) => (
    <div key={t.id} className="flex items-center justify-between gap-2 border-b py-2 last:border-0">
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
        <CardContent>{due.length === 0 ? <p className="text-sm text-muted-foreground">Nothing due.</p> : due.map(Row)}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Overdue</CardTitle></CardHeader>
        <CardContent>{overdue.length === 0 ? <p className="text-sm text-muted-foreground">Nothing overdue.</p> : overdue.map(Row)}</CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: Mount on Dashboard + route + nav**

In `src/pages/DashboardPage.tsx` import and render `<TodaysActions />` near the top of the dashboard grid.
In `src/app/router.tsx` add `import TasksPage from "@/pages/TasksPage";` and `{ path: "tasks", element: <TasksPage /> },`.
In `src/components/AppLayout.tsx` add `ListChecks` to the lucide import and `{ to: "/tasks", label: "Tasks", icon: ListChecks },` after Applications.

- [ ] **Step 7: Typecheck, build, commit**

```
cd frontend && npm run typecheck && npm run build
```
Expected: clean. Manual check: create a task due yesterday → appears under Today's actions + Overdue; complete it → disappears; Tasks page lists/filters/edits.
```
git add frontend/src
git commit -m "feat(web): Tasks page + dashboard today's actions/overdue (S3.3)"
```

---

## Task 13: Manual AI prompt export (frontend-only, D13)

**Files:**
- Create: `src/lib/aiPrompts.ts`, `src/features/ai/AiPromptDialog.tsx`
- Modify: `src/features/jobLeads/JobLeadSheet.tsx` (add "AI prompt" button)

**Interfaces — Consumes:** `JobLeadDto`, `UserProfileDto`, `ResumeVariantDto`; `useGetUserProfile`, `useGetResumeVariants`. **Produces:** `buildPrompt(preset, ctx)` pure assembler + a dialog with 3 preset tabs and a Copy button.

- [ ] **Step 1: Prompt templates (single source, reused Phase 6/7)** — `src/lib/aiPrompts.ts`:
```ts
export type AiPreset = "fit" | "bullets" | "topics";

export const aiPresetLabels: Record<AiPreset, string> = {
  fit: "Analyze fit",
  bullets: "Tailor resume bullets",
  topics: "Prepare interview topics",
};

export type PromptContext = {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  profileSummary: string;
  resumeVariantName: string;
  resumeVariantSummary: string;
};

const block = (label: string, value: string) => `## ${label}\n${value.trim() || "(not provided)"}\n`;

export function buildPrompt(preset: AiPreset, c: PromptContext): string {
  const context =
    block("Role", `${c.jobTitle} at ${c.companyName}`) +
    block("Job description", c.jobDescription) +
    block("Candidate profile", c.profileSummary) +
    block("Resume variant", `${c.resumeVariantName}\n${c.resumeVariantSummary}`);

  const instruction = {
    fit:
      "Act as a senior technical recruiter. Assess how well this candidate fits the role. " +
      "Return: a fit score 0–100, a short match summary, strong matches, missing keywords, " +
      "risk factors, and a suggested resume angle.",
    bullets:
      "Act as a resume coach. Rewrite the candidate's resume bullets to target this specific role. " +
      "Return 5–8 tailored, achievement-oriented bullets using keywords from the job description.",
    topics:
      "Act as an interview coach. Based on the role and the candidate, list the likely interview topics, " +
      "technical questions, system-design prompts, behavioral questions, and good questions to ask the interviewer.",
  }[preset];

  return `${instruction}\n\n${context}`;
}
```

- [ ] **Step 2: Dialog** — `src/features/ai/AiPromptDialog.tsx`:
```tsx
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useGetUserProfile } from "@/lib/api/settings/settings";
import { useGetResumeVariants } from "@/lib/api/resume-variants/resume-variants";
import type { JobLeadDto } from "@/lib/api/model";
import { buildPrompt, aiPresetLabels, type AiPreset } from "@/lib/aiPrompts";

type Props = { lead: JobLeadDto; open: boolean; onOpenChange: (o: boolean) => void };

export function AiPromptDialog({ lead, open, onOpenChange }: Props) {
  const { data: profileRes } = useGetUserProfile();
  const { data: variantsRes } = useGetResumeVariants();
  const [preset, setPreset] = useState<AiPreset>("fit");

  const profile = profileRes?.data && "fullName" in profileRes.data ? profileRes.data : undefined;
  const variant = (variantsRes?.data ?? []).find((v) => v.isDefault) ?? (variantsRes?.data ?? [])[0];

  const prompt = buildPrompt(preset, {
    jobTitle: lead.title,
    companyName: lead.companyName,
    jobDescription: lead.jobDescription ?? "",
    profileSummary: profile?.careerSummary ?? "",
    resumeVariantName: variant?.name ?? "",
    resumeVariantSummary: variant?.summary ?? "",
  });

  const copy = async () => { await navigator.clipboard.writeText(prompt); toast.success("Prompt copied — paste into Claude/ChatGPT"); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>AI prompt · {lead.title}</DialogTitle></DialogHeader>
        <Tabs value={preset} onValueChange={(v) => setPreset(v as AiPreset)}>
          <TabsList>
            {(Object.keys(aiPresetLabels) as AiPreset[]).map((p) => <TabsTrigger key={p} value={p}>{aiPresetLabels[p]}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <Textarea readOnly rows={14} value={prompt} className="font-mono text-xs" />
        <Button onClick={copy}>Copy prompt</Button>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Wire "AI prompt" button into the Job Lead sheet**

In `src/features/jobLeads/JobLeadSheet.tsx`, alongside the Convert button (Task 8), add (only when editing an existing `lead`):
```tsx
import { AiPromptDialog } from "@/features/ai/AiPromptDialog";
// ...
const [aiOpen, setAiOpen] = useState(false);
// ...render:
{lead && (
  <>
    <Button variant="outline" className="mt-2 w-full" onClick={() => setAiOpen(true)}>AI prompt</Button>
    <AiPromptDialog lead={lead} open={aiOpen} onOpenChange={setAiOpen} />
  </>
)}
```

- [ ] **Step 4: Typecheck, build, commit**

```
cd frontend && npm run typecheck && npm run build
```
Expected: clean. Manual check: open a lead with a pasted job description → AI prompt → switch presets → Copy → paste into Claude → useful output.
```
git add frontend/src
git commit -m "feat(web): manual AI prompt export — 3 presets, copy to clipboard (S3.4, D13)"
```

---

## Task 14: Log decisions + update delivery plan

**Files:**
- Modify: `docs/knowledge-base/03-decisions.md`, `docs/knowledge-base/02-delivery-plan.md`

- [ ] **Step 1: Append D27–D31 to `03-decisions.md`** (dated 2026-06-20), text per spec §13:
  - D27 Applications board+list mirrors Job Leads (columns by `ApplicationStage`; drag → `change-stage`/`mark-*`; auto-advances lead via D6; reuses D26 optimistic pattern; no new endpoint).
  - D28 Dedicated Tasks nav page (deviation from PRD §15.2) + dashboard due/overdue.
  - D29 Application creation convert-only (`POST /api/applications` omitted, YAGNI); `ResumeVariant→Application` delete `Restrict`; one application per lead (unique index on `job_lead_id`).
  - D30 Phase 3 dashboard stays client-side except `/api/follow-up-tasks/due`; real `/api/dashboard/summary` at Phase 5 (D24 escape hatch).
  - D31 Manual AI prompt export frontend-only; templates in `lib/aiPrompts.ts`; default resume variant; no `AiAnalysis` row.

- [ ] **Step 2: Mark S3.1–S3.4 delivered in `02-delivery-plan.md`** with a dated note (2026-06-20).

- [ ] **Step 3: Run full gate, commit**

```
just verify
```
Expected: backend build + all tests PASS; frontend typecheck + build PASS.
```
git add docs
git commit -m "docs: log D27-D31 and mark Phase 3 (S3.1-S3.4) delivered"
```

- [ ] **Step 4: Finish the branch** — use the **superpowers:finishing-a-development-branch** skill (verify tests → present merge/PR options → execute). User's standing preference: merge to `main` locally.

---

## Self-Review

**Spec coverage:** S3.1 ResumeVariant → T1–T3 ✓. S3.2 Application (entity/enums/convert/actions/auto-advance/board+list) → T4–T8 ✓. S3.3 FollowUpTask (entity/due/complete-skip/Tasks page/dashboard/cascade-clean) → T9–T12 ✓. S3.4 manual AI prompt → T13 ✓. Decisions D27–D31 + delivery-plan update → T14 ✓. PRD endpoints §14.5/§14.8/§14.9 all mapped; validation §20 in validators; dashboard rules §21 (due/overdue, high-priority already Phase 2; stale deferred to Phase 5 per D30). All four AI presets reuse the §16.3/§16.4 output shapes via templates.

**Placeholder scan:** No TBD/“implement later”; every code step shows full code; commands have expected output.

**Type consistency:** `ApplicationTrigger` (T4) consumed by `Application.LastTrigger` (T5) and `ApplicationService.ApplyAsync` (T6). `ApplicationDto` denormalized fields (`JobTitle`/`CompanyName`/`ResumeVariantName`) defined in T6, mapped in T6, consumed by T8 components. Board stage ints (0–10) match enum (T5) and frontend maps (T8). `getGetApplicationsQueryKey`/`getGetFollowUpTasksQueryKey`/`getGetDueFollowUpTasksQueryKey` are orval-generated names used consistently. `confirm()` deletes match the existing JobLeads pattern (AlertDialog upgrade remains a separate backlog item).

**Known soft spots flagged for the implementer:** (1) `JobLeadSheet` may need `lead` threaded from `JobLeadsPage` if it doesn't already hold the full DTO — noted in T8 Step 8. (2) `EnumSelect` `relatedEntityId` is a free int input in the baseline (no entity picker) — acceptable for personal use; an entity picker is a later polish. (3) orval may type new identity ids as `number | string`; coerce with `Number(...)` at the call sites shown.
