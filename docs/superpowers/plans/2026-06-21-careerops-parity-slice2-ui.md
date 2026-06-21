# Capability Parity — Slice 2: UI + Data Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the UI/data gaps so every operation is doable from the UI: make the JobLead AI fields writable (form + agent), wire the three unwired deletes, and add read-only detail sheets for Company/ResumeVariant/Interview.

**Architecture:** One small backend change (add 3 nullable AI string fields to the JobLead create/update requests — Mapster auto-maps; the entity already has them), a client regen, then frontend work following existing patterns (RHF forms, shadcn Sheet/Dialog, the canonical delete-with-confirm+toast).

**Tech Stack:** .NET 10 / Mapster / FluentValidation; React 19 + RHF + shadcn/ui + TanStack Query + orval + sonner.

## Global Constraints

- **No new domain logic, no migration** — the `JobLead` entity already has `AiSummary`, `MissingKeywords`, `SuggestedResumeAngle` (nullable strings); we only expose them on the request DTOs + UI.
- Frontend feature paths are camelCase: `features/jobLeads/`, `features/companies/`, `features/resumeVariants/`, `features/interviews/`, `features/applications/`, `features/followUpTasks/`.
- **Delete UX = the canonical pattern:** `if (!confirm("…?")) return;` → `await remove.mutateAsync({ id: Number(x.id) })` → `invalidate()` → `toast.success("… deleted")`; wrap in try/catch with `toast.error(...)` where a delete can be server-rejected. IDs are `string|number` → always `Number(x.id)`. Delete buttons inside a clickable row use `onClick={(e) => e.stopPropagation()}` on the cell.
- Reuse existing generated hooks (all confirmed present): `useDeleteApplication`, `useDeleteFollowUpTask`, `useDeleteJobLead`, `useGetCompany`, `useGetResumeVariant`, `useGetInterview`, `useUpdateJobLead`.
- Gates: backend `dotnet build` 0 errors + `dotnet test`; frontend `npm run typecheck && npm run build`.
- The global `MutationCache.onSettled` (D37) already refetches all queries on any write — page-level `invalidate()` calls are belt-and-suspenders, keep the existing style.

---

## Task 1: Backend — make JobLead AI fields writable

**Files:**
- Modify: `backend/src/CareerOps.Application/JobLeads/CreateJobLeadRequest.cs`, `backend/src/CareerOps.Application/JobLeads/UpdateJobLeadRequest.cs`
- Test: `backend/tests/CareerOps.UnitTests/JobLeads/JobLeadServiceTests.cs` (add one test)

**Interfaces:**
- Produces: both request records gain `string? AiSummary, string? MissingKeywords, string? SuggestedResumeAngle` (after `FitScore`). `JobLeadService.UpdateAsync`/`CreateAsync` already use `request.Adapt(...)` — Mapster maps the new same-named fields onto the entity automatically; **no service change**.

- [ ] **Step 1: Add the fields to `UpdateJobLeadRequest.cs`**

```csharp
public sealed record UpdateJobLeadRequest(
    int CompanyId, string Title,
    JobSource Source, string? SourceUrl, string? JobDescription, string? Location,
    RemoteMode RemoteMode, EmploymentType EmploymentType,
    decimal? SalaryMin, decimal? SalaryMax, string? SalaryCurrency, SalaryPeriod SalaryPeriod,
    Priority Priority, JobLeadStatus Status,
    int? FitScore, string? AiSummary, string? MissingKeywords, string? SuggestedResumeAngle,
    DateTime? NextActionAtUtc, DateTime? DeadlineAtUtc, string? Notes);
```

- [ ] **Step 2: Add the same fields to `CreateJobLeadRequest.cs`** (the UI form submits one shared shape; create may also set them). Insert `string? AiSummary, string? MissingKeywords, string? SuggestedResumeAngle` immediately after `int? FitScore,`:

```csharp
public sealed record CreateJobLeadRequest(
    int? CompanyId, string? NewCompanyName, string Title,
    JobSource Source, string? SourceUrl, string? JobDescription, string? Location,
    RemoteMode RemoteMode, EmploymentType EmploymentType,
    decimal? SalaryMin, decimal? SalaryMax, string? SalaryCurrency, SalaryPeriod SalaryPeriod,
    Priority Priority, JobLeadStatus Status,
    int? FitScore, string? AiSummary, string? MissingKeywords, string? SuggestedResumeAngle,
    DateTime? NextActionAtUtc, DateTime? DeadlineAtUtc, string? Notes);
```

No FluentValidation rule is needed (nullable free-text). The validators in `JobLeadRequestValidators.cs` are unchanged.

- [ ] **Step 3: Add a round-trip test**

Open `backend/tests/CareerOps.UnitTests/JobLeads/JobLeadServiceTests.cs`, read its existing setup helpers (InMemory `CareerOpsDbContext`, how it seeds a company + builds a `CreateJobLeadRequest`/`UpdateJobLeadRequest`). Add one test mirroring that style: create a lead, then `UpdateAsync` with `AiSummary = "Strong fit"`, `MissingKeywords = "Kafka, gRPC"`, `SuggestedResumeAngle = "Lead with platform work"` (copy all other fields from the created lead), then assert `GetAsync` returns those three values. Use the file's existing helpers/patterns — do not invent new ones.

- [ ] **Step 4: Build + test**

```bash
dotnet build backend/CareerOps.slnx -v q --nologo
dotnet test backend/CareerOps.slnx -v q --nologo
```
Expected: 0 errors; suite green (106 = 105 + the new test).

- [ ] **Step 5: Commit**

```bash
git add backend/src/CareerOps.Application/JobLeads/CreateJobLeadRequest.cs backend/src/CareerOps.Application/JobLeads/UpdateJobLeadRequest.cs backend/tests/CareerOps.UnitTests/JobLeads/JobLeadServiceTests.cs
git commit -m "feat(api): make JobLead AI fields (AiSummary/MissingKeywords/SuggestedResumeAngle) writable (D50)"
```

---

## Task 2: Regenerate the orval client (controller-run)

- [ ] **Step 1:** `just up` (API rebuilt with the new request fields; Postgres healthy).
- [ ] **Step 2:** `just gen-client`. Expected: `createJobLeadRequest.ts` + `updateJobLeadRequest.ts` models gain `aiSummary`, `missingKeywords`, `suggestedResumeAngle`.
- [ ] **Step 3:** `cd frontend && npm run typecheck` → PASS.
- [ ] **Step 4:** Commit:
```bash
git add frontend/src/lib/api
git commit -m "chore(web): regenerate orval client for writable JobLead AI fields (D50)"
```

---

## Task 3: Frontend — JobLead AI fields in the form

**Files:** Modify `frontend/src/features/jobLeads/JobLeadForm.tsx`

The form submits a `CreateJobLeadRequest`; after Task 2 that type includes the three AI fields. Add them as editable textareas.

- [ ] **Step 1:** In `JobLeadForm.tsx`, add to the `FormValues` type: `aiSummary: string; missingKeywords: string; suggestedResumeAngle: string;`
- [ ] **Step 2:** Add to `EMPTY`: `aiSummary: "", missingKeywords: "", suggestedResumeAngle: "",`
- [ ] **Step 3:** Add to `toFormValues`: `aiSummary: l.aiSummary ?? "", missingKeywords: l.missingKeywords ?? "", suggestedResumeAngle: l.suggestedResumeAngle ?? "",`
- [ ] **Step 4:** Add to the `onSubmit` object (after `fitScore: numOrNull(v.fitScore),`):
```tsx
      aiSummary: trimToNull(v.aiSummary),
      missingKeywords: trimToNull(v.missingKeywords),
      suggestedResumeAngle: trimToNull(v.suggestedResumeAngle),
```
- [ ] **Step 5:** Render three textareas (place after the Notes field, in a labeled group so they read as the agent-analysis area):
```tsx
      <Field label="AI summary"><Textarea rows={3} {...register("aiSummary")} /></Field>
      <Field label="Missing keywords"><Textarea rows={2} {...register("missingKeywords")} /></Field>
      <Field label="Suggested resume angle"><Textarea rows={2} {...register("suggestedResumeAngle")} /></Field>
```
- [ ] **Step 6:** `cd frontend && npm run typecheck && npm run build` → PASS.
- [ ] **Step 7:** Commit:
```bash
git add frontend/src/features/jobLeads/JobLeadForm.tsx
git commit -m "feat(web): edit JobLead AI fields in the lead form (D50)"
```

---

## Task 4: Frontend — wire the three deletes

**Files:** Modify `JobLeadsPage.tsx` + `JobLeadsBoard.tsx` + `BoardColumn.tsx` + `LeadCard.tsx`; `ApplicationSheet.tsx`; `TasksPage.tsx` + `FollowUpTasksTable.tsx`.

- [ ] **Step 1: JobLead board delete.** The board passes `onEdit` page→board→column→card today; thread an `onDelete: (l: JobLeadDto) => void` the same way.
  - In `JobLeadsPage.tsx`: add `const remove = useDeleteJobLead();` (from `@/lib/api/job-leads/job-leads`) and an `onDelete` handler using the canonical pattern (`confirm` includes "this also deletes its application + interviews"); pass `onDelete` to the board (and the list view if it takes one).
  - Thread `onDelete` through `JobLeadsBoard` → `BoardColumn` → `LeadCard` (mirror the existing `onEdit` prop threading).
  - In `LeadCard.tsx`, add a small delete affordance that does NOT trigger the card's drag/edit: a `Button variant="ghost" size="icon"` with `onPointerDown={(e) => e.stopPropagation()}` and `onClick={(e) => { e.stopPropagation(); onDelete(lead); }}` (stopPropagation prevents the drag sensor + the card's `onClick` edit). Keep it visually subtle (e.g. a trash icon top-right).
- [ ] **Step 2: Application delete.** In `ApplicationSheet.tsx`, add `const remove = useDeleteApplication();` (from `@/lib/api/applications/applications`). After the interviews section, add a destructive "Delete application" button:
```tsx
          <Button
            variant="destructive"
            className="mt-6 w-full"
            onClick={async () => {
              if (!confirm(`Delete the application for ${app.companyName} · ${app.jobTitle}?`)) return;
              await remove.mutateAsync({ id: Number(app.id) });
              qc.invalidateQueries({ queryKey: getGetApplicationsQueryKey() });
              toast.success("Application deleted");
              onOpenChange(false);
            }}
          >
            Delete application
          </Button>
```
(`qc`, `getGetApplicationsQueryKey`, `toast` are already imported in this file.)
- [ ] **Step 3: FollowUpTask delete.** In `FollowUpTasksTable.tsx`, add `onDelete: (t: FollowUpTaskDto) => void` to `Props` and a Delete button in the Actions cell (visible for all statuses, alongside Done/Skip):
```tsx
              <Button variant="ghost" size="sm" onClick={() => onDelete(t)}>Delete</Button>
```
  In `TasksPage.tsx`: add `const remove = useDeleteFollowUpTask();` (import from `@/lib/api/follow-up-tasks/follow-up-tasks`), an `onDelete` handler (canonical pattern + `invalidate()`), and pass `onDelete` to `FollowUpTasksTable`.
- [ ] **Step 4:** `cd frontend && npm run typecheck && npm run build` → PASS. Manual: delete works from the board, the application sheet, and the tasks table; lists refresh.
- [ ] **Step 5:** Commit:
```bash
git add frontend/src/pages/JobLeadsPage.tsx frontend/src/features/jobLeads/JobLeadsBoard.tsx frontend/src/features/jobLeads/BoardColumn.tsx frontend/src/features/jobLeads/LeadCard.tsx frontend/src/features/applications/ApplicationSheet.tsx frontend/src/pages/TasksPage.tsx frontend/src/features/followUpTasks/FollowUpTasksTable.tsx
git commit -m "feat(web): wire deletes for job-lead board, application, follow-up task (parity)"
```

---

## Task 5: Frontend — read-only detail sheets (Company, ResumeVariant, Interview)

Add a read-only detail Sheet for each of the three resources that currently jump straight into an edit dialog. The detail sheet shows fields read-only (enum values via `enumLabel`) with an **Edit** button that opens the existing edit dialog/sheet. Wire each page so a row click opens the DETAIL sheet; the detail's Edit button opens the existing editor.

**Files:** Create `features/companies/CompanyDetailSheet.tsx`, `features/resumeVariants/ResumeVariantDetailSheet.tsx`, `features/interviews/InterviewDetailSheet.tsx`; modify `CompaniesPage.tsx`, `ResumeVariantsPage.tsx`, and the interviews page/list to open the detail sheet on row/item click.

- [ ] **Step 1: `CompanyDetailSheet.tsx`** (template — the other two mirror this):

```tsx
// frontend/src/features/companies/CompanyDetailSheet.tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { CompanyDto } from "@/lib/api/model";
import { companyType, marketType, compensationFit, enumLabel } from "@/lib/enums";

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-3 gap-2 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 break-words">{value}</dd>
    </div>
  );
}

type Props = { company?: CompanyDto; open: boolean; onOpenChange: (o: boolean) => void; onEdit: (c: CompanyDto) => void };

export function CompanyDetailSheet({ company, open, onOpenChange, onEdit }: Props) {
  if (!company) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>{company.name}</SheetTitle></SheetHeader>
        <div className="p-4">
          <dl>
            <Row label="Type" value={enumLabel(companyType, company.companyType)} />
            <Row label="Market" value={enumLabel(marketType, company.marketType)} />
            <Row label="Compensation fit" value={enumLabel(compensationFit, company.compensationFit)} />
            <Row label="Website" value={company.websiteUrl} />
            <Row label="LinkedIn" value={company.linkedInUrl} />
            <Row label="Country" value={company.country} />
            <Row label="City" value={company.city} />
            <Row label="Notes" value={company.notes} />
          </dl>
          <Button className="mt-6 w-full" onClick={() => onEdit(company)}>Edit</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Wire `CompaniesPage.tsx`** — the table's row click currently calls `onEdit` (opens the dialog). Change it to open the detail sheet: add `const [detail, setDetail] = useState<CompanyDto | undefined>(); const [detailOpen, setDetailOpen] = useState(false);`. Pass the table an `onEdit` that does `{ setDetail(c); setDetailOpen(true); }` (row click → detail). Render `<CompanyDetailSheet company={detail} open={detailOpen} onOpenChange={setDetailOpen} onEdit={(c) => { setDetailOpen(false); setEditing(c); setErrors([]); setOpen(true); }} />`. Keep the existing "Add company" button → edit dialog with `editing=undefined`. (Net: row → read-only detail → Edit → existing CompanyDialog. Delete stays on the row's Delete button.)

- [ ] **Step 3: `ResumeVariantDetailSheet.tsx`** — same template; fields: `Name` (title), `Target role` (`targetRole`), `Summary` (`summary`), `Notes` (`notes`), and `Default` (`variant.isDefault ? "Yes" : "No"`). Wire `ResumeVariantsPage.tsx` so row click opens the detail sheet; its Edit button opens the existing `ResumeVariantDialog` (set `editing` + `open`). Keep Make-default + Delete on the row.

- [ ] **Step 4: `InterviewDetailSheet.tsx`** — same template; fields via `enumLabel`: `Round` (`interviewRoundType`, `roundType`), `Status` (`interviewStatus`, `status`), `Outcome` (`interviewOutcome`, `outcome`), plus `Company`/`Job` (`companyName`/`jobTitle`), `Scheduled` (`format(new Date(scheduledAtUtc), "dd.MM.yyyy HH:mm")`), `Duration` (`durationMinutes` + " min"), `Interviewer` (`interviewerName`/`interviewerRole`), `Meeting URL` (`meetingUrl`), `Prep notes` (`prepNotes`), `Feedback` (`feedback`). Wire the interviews list (`InterviewItem` on `InterviewsPage.tsx`) so clicking an item opens the detail sheet; its Edit button opens the existing `InterviewSheet`. Keep the existing Edit/Complete/Delete controls on the item.

- [ ] **Step 5:** `cd frontend && npm run typecheck && npm run build` → PASS. Manual: each row opens a read-only detail; Edit opens the existing editor; data shows correctly.

- [ ] **Step 6:** Commit:
```bash
git add frontend/src/features/companies/CompanyDetailSheet.tsx frontend/src/features/resumeVariants/ResumeVariantDetailSheet.tsx frontend/src/features/interviews/InterviewDetailSheet.tsx frontend/src/pages/CompaniesPage.tsx frontend/src/pages/ResumeVariantsPage.tsx frontend/src/pages/InterviewsPage.tsx
git commit -m "feat(web): read-only detail sheets for company, resume variant, interview (parity)"
```

---

## Task 6: Docs

**Files:** `docs/knowledge-base/03-decisions.md` (append D50), `docs/knowledge-base/02-delivery-plan.md` (note).

- [ ] **Step 1:** Append **D50** to `03-decisions.md` (match the dated-entry format), verbatim intent from the spec §2 (`docs/superpowers/specs/2026-06-21-careerops-capability-parity-design.md`): the JobLead AI fields are plain writable data slots (REST + UI + MCP); no in-platform AI feature; the `AiAnalysis` write-back/AI-panel plan (D46) is cancelled. Add a one-line note that the fields were added to BOTH `CreateJobLeadRequest` and `UpdateJobLeadRequest` (shared UI form). Dated 2026-06-21.
- [ ] **Step 2:** Delivery-plan note under Phase 6:
```markdown
- **Note (2026-06-21):** UI + data parity done — JobLead AI fields writable (form + MCP), deletes wired (board / application / follow-up), read-only detail sheets for company/resume-variant/interview. D50 logged. Full UI=REST=MCP parity achieved for the 7 resources (Contacts still deferred).
```
- [ ] **Step 3:** Commit:
```bash
git add docs/knowledge-base/03-decisions.md docs/knowledge-base/02-delivery-plan.md
git commit -m "docs: log D50, delivery-plan UI+data parity note (parity slice 2)"
```

---

## Final verification
- `dotnet build backend/CareerOps.slnx` → 0 errors; `dotnet test` → 106 pass.
- `cd frontend && npm run typecheck && npm run build` → clean.
- Manual: edit a lead's AI fields and see them persist; delete from board/application/tasks; open read-only detail sheets and Edit from them.

## Suggested models
- Task 1 — sonnet (backend record + test).
- Task 2 — controller-run (gen-client).
- Task 3 — sonnet (form edits across 4 spots).
- Task 4 — sonnet (multi-file delete wiring, prop threading + drag-safe card button).
- Task 5 — sonnet (3 new components + 3 page rewirings).
- Task 6 — haiku (docs; copy D50 from spec).
- Final whole-branch review — opus.
