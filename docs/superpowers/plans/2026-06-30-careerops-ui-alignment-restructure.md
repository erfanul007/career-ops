# CareerOps UI Alignment & Layout Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce consistent layout/alignment/spacing/density across the whole CareerOps frontend via a shared page shell, locale formatters, design-token cleanup, and shared list/empty primitives.

**Architecture:** Introduce a single `PageShell`/`PageHeader` pair that owns page padding, width, and rhythm; `AppLayout` stops padding so it can't double up. Replace ad-hoc colors with design tokens, bare `toLocale*` with one `format.ts`, and the duplicated bordered row with a `ListRow`. Refactors are mechanical; new components are small and unit-tested.

**Tech Stack:** React 19, TypeScript 6 (`verbatimModuleSyntax` → `import type` mandatory), Tailwind v4, shadcn/Radix (`radix-ui`), lucide-react@1.22, date-fns@4, Vitest + @testing-library/react.

## Global Constraints

- Frontend-only. No backend, API, or contract changes. **Never edit generated `frontend/src/lib/api/**`.**
- **No new dependencies.** Use only Tailwind, shadcn/Radix, lucide-react, date-fns.
- **Colors: design tokens only** (`text-muted-foreground`, `bg-muted`, `bg-secondary`, `text-destructive`, `border`, etc.). No raw palette (`text-red-500`, `bg-yellow-100`, `bg-blue-100`, …). **Exception:** the 9-way status-dot legend (`STATUS_DOT`/`STATUS_ACCENT` in `jobPresentation.ts`) is an intentional categorical encoding and is retained as-is (logged decision, not silent).
- **Dates/numbers: locale-driven via `format.ts`** — never hardcode separators; inputs are ISO strings.
- **Control height (toolbar/header rows): `h-8`** = Button default, Input default, SelectTrigger default. Do not mix `sm` (h-7) controls into a toolbar row.
- **Spacing scale:** page `px-6 py-6` + section rhythm `space-y-6` (PageShell owns both); form `space-y-4`; field label→control `space-y-2`; field grid `gap-4`; toolbar/button group `gap-2`.
- **Heading:** page title `text-xl font-semibold` (via PageHeader only).
- Clean code: KISS/YAGNI, no dead code, no needless comments, small focused files; comment only the non-obvious why.
- Include a Vitest test with each new component/util (dev-only harness, decision D57). Refactor-only tasks verify via typecheck + lint + existing suite + manual.
- Per-task verification (run from repo root): `npm --prefix frontend run typecheck && npm --prefix frontend run lint && npm --prefix frontend run test`. Full `npm --prefix frontend run build` at the final task.
- English only.

---

## File Structure

**New:**
- `frontend/src/lib/format.ts` — locale date/number/salary formatters (+ `format.test.ts`).
- `frontend/src/components/layout/PageShell.tsx` — page container: width, padding, rhythm, board/contained variants (+ `PageShell.test.tsx`).
- `frontend/src/components/layout/PageHeader.tsx` — page title + description + actions slot (+ `PageHeader.test.tsx`).
- `frontend/src/components/EmptyState.tsx` — icon + title + hint empty state (+ `EmptyState.test.tsx`).
- `frontend/src/components/ListRow.tsx` — the repeated bordered link row (+ `ListRow.test.tsx`).

**Modified:** `AppLayout.tsx`; pages `DashboardPage`, `TasksPage`, `CompaniesPage`, `SettingsProfilePage`, `JobsPage`, `JobDetailPage`; `jobPresentation.ts`; `JobsTable`, `CompaniesTable`, `JobFilterBar`, `JobQuickAdd`, `drawer/PropertiesTab`, `companies/CompanyDetailSheet`, `settings/ProfileForm`, `components/form/Field`.

**Off-limits:** `frontend/src/lib/api/**`, backend, the status-dot legend, the just-polished board card/drawer internals (touched only where this plan names them).

---

## Task 1: Locale formatters (`format.ts`)

**Files:**
- Create: `frontend/src/lib/format.ts`
- Test: `frontend/src/lib/format.test.ts`
- Modify: `frontend/src/features/jobs/jobPresentation.ts:14-31` (delegate `formatShortDate`/`formatMoneyRange` to `format.ts`)

**Interfaces:**
- Produces: `formatDate(value?: string | Date | null): string | null`, `formatDateTime(value?: string | Date | null): string | null`, `formatNumber(value?: number | string | null): string | null`, `formatSalary(min?, max?, currency?, period?): string | null` (all args `number | string | null | undefined`). `formatSalary` output must equal the current `formatMoneyRange` output so existing callers/tests are unaffected.

- [ ] **Step 1: Write the failing test**

`frontend/src/lib/format.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime, formatNumber, formatSalary } from "./format";

describe("format", () => {
  it("returns null for empty/invalid input", () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate("")).toBeNull();
    expect(formatDate("not-a-date")).toBeNull();
    expect(formatNumber(null)).toBeNull();
    expect(formatSalary(null)).toBeNull();
  });

  it("formats an ISO date to a locale date string", () => {
    const out = formatDate("2026-06-30T00:00:00Z");
    expect(out).toBeTypeOf("string");
    expect(out).toMatch(/2026/);
  });

  it("formats a date-time with 24h time", () => {
    const out = formatDateTime("2026-06-30T13:45:00Z");
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/45/);
  });

  it("groups large numbers via the runtime locale", () => {
    expect(formatNumber(1500)).toBe((1500).toLocaleString());
  });

  it("formats a salary range matching the legacy money format", () => {
    expect(formatSalary(800000, 950000, "NOK", "Annual"))
      .toBe(`NOK ${(800000).toLocaleString()}–${(950000).toLocaleString()} / Annual`);
    expect(formatSalary(800000, null, "NOK", null))
      .toBe(`NOK ${(800000).toLocaleString()}+`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- format`
Expected: FAIL — `format.ts` does not exist.

- [ ] **Step 3: Write the implementation**

`frontend/src/lib/format.ts`:
```ts
// Locale-driven display formatters. Inputs are ISO strings (or numbers);
// output follows the runtime locale (no hardcoded separators). A future
// i18n layer can thread an explicit locale through `LOCALE`.
const LOCALE: string | undefined = undefined;

function toDate(value?: string | Date | null): Date | null {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value?: string | Date | null): string | null {
  const d = toDate(value);
  return d ? d.toLocaleDateString(LOCALE, { year: "numeric", month: "2-digit", day: "2-digit" }) : null;
}

export function formatDateTime(value?: string | Date | null): string | null {
  const d = toDate(value);
  return d
    ? d.toLocaleString(LOCALE, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
    : null;
}

export function formatNumber(value?: number | string | null): string | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n.toLocaleString(LOCALE);
}

export function formatSalary(
  min?: number | string | null,
  max?: number | string | null,
  currency?: string | null,
  period?: string | null,
): string | null {
  if (min == null) return null;
  const cur = currency ?? "";
  const lo = formatNumber(min);
  const hi = max != null ? `–${formatNumber(max)}` : "+";
  const per = period ? ` / ${period}` : "";
  return `${cur} ${lo}${hi}${per}`.trim();
}
```

- [ ] **Step 4: Delegate the jobs helpers to `format.ts`**

In `frontend/src/features/jobs/jobPresentation.ts`, add `import { formatDate, formatSalary } from "@/lib/format";` at the top, then replace the bodies of `formatShortDate` and `formatMoneyRange` (lines 14-31):
```ts
export function formatShortDate(value?: string | null): string | null {
  return formatDate(value);
}

export function formatMoneyRange(
  min?: number | string | null,
  max?: number | string | null,
  currency?: string | null,
  period?: string | null,
): string | null {
  return formatSalary(min, max, currency, period);
}
```
Leave `formatRelativeDate` (date-fns), `isOverdue`, `formatLocation`, and the presentation helpers untouched.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm --prefix frontend run typecheck && npm --prefix frontend run test`
Expected: PASS — new `format` tests green; existing suite (48) still green.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/format.ts frontend/src/lib/format.test.ts frontend/src/features/jobs/jobPresentation.ts
git commit -m "feat(frontend): add locale formatters and route job helpers through them"
```

---

## Task 2: `PageShell` + `PageHeader`

**Files:**
- Create: `frontend/src/components/layout/PageShell.tsx`, `frontend/src/components/layout/PageHeader.tsx`
- Test: `frontend/src/components/layout/PageShell.test.tsx`, `frontend/src/components/layout/PageHeader.test.tsx`

**Interfaces:**
- Produces:
  - `PageShell({ children, variant?: 'contained' | 'full', width?: 'default' | 'narrow', className? })` — `contained` (default): vertically scrollable, centered, `space-y-6` rhythm; `full`: `flex h-full min-h-0 flex-col gap-4` for the board. `width`: `default` = `max-w-5xl`, `narrow` = `max-w-2xl` (ignored when `variant="full"`).
  - `PageHeader({ title: string, description?: string, actions?: ReactNode, className? })` — `h1` is `text-xl font-semibold`.

- [ ] **Step 1: Write the failing tests**

`frontend/src/components/layout/PageHeader.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders the title as a level-1 heading", () => {
    render(<PageHeader title="Jobs" />);
    expect(screen.getByRole("heading", { level: 1, name: "Jobs" })).toBeInTheDocument();
  });

  it("renders description and actions when provided", () => {
    render(<PageHeader title="Jobs" description="All roles" actions={<button>Add</button>} />);
    expect(screen.getByText("All roles")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });
});
```

`frontend/src/components/layout/PageShell.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageShell } from "./PageShell";

describe("PageShell", () => {
  it("renders children", () => {
    render(<PageShell><p>content</p></PageShell>);
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("uses the narrow width when requested", () => {
    const { container } = render(<PageShell width="narrow"><p>x</p></PageShell>);
    expect(container.querySelector(".max-w-2xl")).not.toBeNull();
  });

  it("uses a full-height flex column for the board variant", () => {
    const { container } = render(<PageShell variant="full"><p>x</p></PageShell>);
    expect(container.querySelector(".h-full.min-h-0")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --prefix frontend run test -- PageShell PageHeader`
Expected: FAIL — components do not exist.

- [ ] **Step 3: Implement `PageHeader`**

`frontend/src/components/layout/PageHeader.tsx`:
```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: Props) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="space-y-0.5">
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Implement `PageShell`**

`frontend/src/components/layout/PageShell.tsx`:
```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  variant?: "contained" | "full";
  width?: "default" | "narrow";
  className?: string;
}

const WIDTH = { default: "max-w-5xl", narrow: "max-w-2xl" } as const;

// Single owner of page padding, width, and vertical rhythm. AppLayout supplies
// no padding, so a page can never double-pad. `full` is for the board: a
// full-height flex column whose inner content owns horizontal scroll.
export function PageShell({ children, variant = "contained", width = "default", className }: Props) {
  if (variant === "full") {
    return <div className={cn("flex h-full min-h-0 flex-col gap-4 px-6 py-6", className)}>{children}</div>;
  }
  return (
    <div className="h-full overflow-y-auto">
      <div className={cn("mx-auto w-full space-y-6 px-6 py-6", WIDTH[width], className)}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm --prefix frontend run typecheck && npm --prefix frontend run test -- PageShell PageHeader`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/layout/
git commit -m "feat(frontend): add PageShell and PageHeader layout primitives"
```

---

## Task 3: Adopt the shell across AppLayout and all pages

**Files:**
- Modify: `frontend/src/components/AppLayout.tsx:56`
- Modify: `frontend/src/pages/DashboardPage.tsx`, `TasksPage.tsx`, `CompaniesPage.tsx`, `SettingsProfilePage.tsx`, `JobsPage.tsx`, `JobDetailPage.tsx`

**Interfaces:**
- Consumes: `PageShell`, `PageHeader` (Task 2).

This is one cohesive deliverable: AppLayout stops padding/scrolling and every page adopts `PageShell` in the same commit (an intermediate state would leave pages unpadded). No unit tests for pages — verified by typecheck/build/lint, the existing suite staying green, and manual checks.

- [ ] **Step 1: Drop padding/scroll from AppLayout**

`frontend/src/components/AppLayout.tsx` line 56 — replace:
```tsx
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
```
with:
```tsx
        <div className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
```

- [ ] **Step 2: DashboardPage onto the shell**

In `frontend/src/pages/DashboardPage.tsx`: `import { PageShell } from "@/components/layout/PageShell";` and `import { PageHeader } from "@/components/layout/PageHeader";`.
- Loading branch: wrap in `<PageShell>` and drop its `p-6`/`max-w-5xl`:
```tsx
  if (isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </PageShell>
    );
  }
  if (isError || !summary) {
    return <PageShell><p className="text-sm text-destructive">Failed to load dashboard.</p></PageShell>;
  }
```
- Main return: replace the outer `<div className="p-6 space-y-6 max-w-5xl">` + `<h1>` with:
```tsx
    <PageShell>
      <PageHeader title="Dashboard" />
      {/* existing <section> blocks unchanged */}
    </PageShell>
```
(Remove the old `<h1 className="text-xl font-semibold">Dashboard</h1>`. PageShell supplies `space-y-6`, so the inner `space-y-6` is gone with the wrapper.)

- [ ] **Step 3: TasksPage onto the shell**

In `frontend/src/pages/TasksPage.tsx`: import `PageShell`, `PageHeader`. Replace the outer `<div className="p-6 max-w-3xl space-y-4">` and the header `<div className="flex items-center justify-between flex-wrap gap-2"><h1>…</h1><div className="flex gap-2">…filters…</div></div>` with:
```tsx
    <PageShell>
      <PageHeader
        title="Tasks"
        actions={
          <>
            <Select value={due} onValueChange={v => setDue(v as DueFilter)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="today">Due today</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter ?? "all"} onValueChange={v => setStatusFilter(v === "all" ? undefined : v as FollowUpStatus)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
      {/* existing error / loading / list blocks unchanged */}
    </PageShell>
```
Note: the `SelectTrigger` `h-8` override is removed (default is already `h-8`); keep `w-32`. The list section keeps its own `space-y-2`.

- [ ] **Step 4: CompaniesPage onto the shell**

In `frontend/src/pages/CompaniesPage.tsx`: import `PageShell`, `PageHeader`. Replace the loading `return <Skeleton className="h-64 w-full" />;` with `return <PageShell><Skeleton className="h-64 w-full" /></PageShell>;`. Replace the outer `<div className="space-y-6">` + header block with:
```tsx
    <PageShell>
      <PageHeader
        title="Companies"
        actions={<Button onClick={() => { setEditing(undefined); setErrors([]); setOpen(true); }}>Add company</Button>}
      />
      <CompaniesTable … />
      <CompanyDetailSheet … />
      <CompanyDialog … />
    </PageShell>
```
(The `text-2xl` heading is gone — PageHeader standardizes to `text-xl`.)

- [ ] **Step 5: SettingsProfilePage onto the shell**

`frontend/src/pages/SettingsProfilePage.tsx` — full replace:
```tsx
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileForm } from "@/features/settings/ProfileForm";

export default function SettingsProfilePage() {
  return (
    <PageShell width="narrow">
      <PageHeader title="Profile" />
      <Card>
        <CardContent><ProfileForm /></CardContent>
      </Card>
    </PageShell>
  );
}
```
(Dropped the redundant `CardHeader`/`CardTitle` "Profile" — the page header now names it. Keep `CardContent`.)

- [ ] **Step 6: JobsPage onto the full-variant shell**

In `frontend/src/pages/JobsPage.tsx`: import `PageShell`, `PageHeader`. Replace the outer `<div className="flex h-full min-h-0 flex-col gap-4">` + the header `<div className="flex flex-wrap items-center justify-between gap-2"><h1>Jobs</h1><div…><JobFilterBar/><JobQuickAdd/></div></div>` with:
```tsx
    <PageShell variant="full">
      <PageHeader
        title="Jobs"
        actions={<><JobFilterBar filters={filters} onChange={setFilters} /><JobQuickAdd /></>}
      />
      <Tabs defaultValue="board" className="flex min-h-0 flex-1 flex-col">
        {/* unchanged */}
      </Tabs>
      <JobDetailDrawer jobId={selectedJobId} onClose={() => setSelectedJobId(null)} />
    </PageShell>
```

- [ ] **Step 7: JobDetailPage onto the shell**

In `frontend/src/pages/JobDetailPage.tsx`: import `PageShell`. Replace the loading branch `<div className="p-6 space-y-4">…</div>` with `<PageShell>…same skeletons…</PageShell>`, the error branch with `<PageShell><div className="text-sm text-destructive">Job not found.</div></PageShell>`, and the main `<div className="flex flex-col gap-4 p-6 max-w-4xl mx-auto">` with `<PageShell><div className="flex flex-col gap-4">…existing back-link, header, JobDetailContent…</div></PageShell>`. (PageShell centers at `max-w-5xl`; the inner `gap-4` is kept because this page is not on the `space-y-6` section rhythm.)

- [ ] **Step 8: Verify**

Run: `npm --prefix frontend run typecheck && npm --prefix frontend run lint && npm --prefix frontend run test`
Expected: PASS — all green (48 tests unchanged).
Manual: every page shares one inset/width; Dashboard/Tasks no longer over-inset; Companies heading matches others; board still fills height and scrolls horizontally; detail page centered.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/AppLayout.tsx frontend/src/pages/
git commit -m "refactor(frontend): adopt PageShell/PageHeader across all pages"
```

---

## Task 4: `EmptyState` component

**Files:**
- Create: `frontend/src/components/EmptyState.tsx`
- Test: `frontend/src/components/EmptyState.test.tsx`
- Modify: `frontend/src/features/companies/CompaniesTable.tsx:8`

**Interfaces:**
- Produces: `EmptyState({ icon?: LucideIcon, title: string, hint?: string, className? })`.

- [ ] **Step 1: Write the failing test**

`frontend/src/components/EmptyState.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Building2 } from "lucide-react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders title and hint", () => {
    render(<EmptyState icon={Building2} title="No companies yet" hint="Add one to start" />);
    expect(screen.getByText("No companies yet")).toBeInTheDocument();
    expect(screen.getByText("Add one to start")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- EmptyState`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement**

`frontend/src/components/EmptyState.tsx`:
```tsx
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  className?: string;
}

export function EmptyState({ icon: Icon, title, hint, className }: Props) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-12 text-center", className)}>
      {Icon && <Icon aria-hidden className="size-6 text-muted-foreground" />}
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
```
Note: `LucideIcon` is a type from `lucide-react@1.22`; import it with `import type`.

- [ ] **Step 4: Use it in CompaniesTable**

`frontend/src/features/companies/CompaniesTable.tsx` — replace line 8:
```tsx
  if (companies.length === 0) return <p className="text-muted-foreground">No companies yet.</p>;
```
with (add imports `import { EmptyState } from "@/components/EmptyState";` and `import { Building2 } from "lucide-react";`):
```tsx
  if (companies.length === 0) return <EmptyState icon={Building2} title="No companies yet" hint="Add a company to start tracking roles." />;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm --prefix frontend run typecheck && npm --prefix frontend run test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/EmptyState.tsx frontend/src/components/EmptyState.test.tsx frontend/src/features/companies/CompaniesTable.tsx
git commit -m "feat(frontend): add EmptyState and use it for the companies table"
```

---

## Task 5: `ListRow` + Dashboard deduplication

**Files:**
- Create: `frontend/src/components/ListRow.tsx`
- Test: `frontend/src/components/ListRow.test.tsx`
- Modify: `frontend/src/pages/DashboardPage.tsx` (the three `<section>` row maps)

**Interfaces:**
- Consumes: `react-router` `Link`.
- Produces: `ListRow({ to: string, title: string, subtitle?: string, meta?: ReactNode })` — renders `flex items-center justify-between p-3 rounded-md border text-sm`, with a title link, optional ` · subtitle` muted suffix, and a right-aligned `meta` slot.

Scope note: Dashboard has three byte-identical bordered rows → extract. TasksPage's row has a different shape (badge + two action buttons) and appears once → it is **not** forced into `ListRow` (YAGNI); it is only tokenized in Task 6.

- [ ] **Step 1: Write the failing test**

`frontend/src/components/ListRow.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ListRow } from "./ListRow";

describe("ListRow", () => {
  it("links the title and shows subtitle + meta", () => {
    render(
      <MemoryRouter>
        <ListRow to="/jobs/1" title="Backend Engineer" subtitle="Northwind Synthetics" meta={<span>2026</span>} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Backend Engineer" })).toHaveAttribute("href", "/jobs/1");
    expect(screen.getByText(/Northwind Synthetics/)).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- ListRow`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement**

`frontend/src/components/ListRow.tsx`:
```tsx
import type { ReactNode } from "react";
import { Link } from "react-router";

interface Props {
  to: string;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
}

export function ListRow({ to, title, subtitle, meta }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
      <div className="min-w-0">
        <Link to={to} className="font-medium hover:underline">{title}</Link>
        {subtitle && <span className="text-muted-foreground"> · {subtitle}</span>}
      </div>
      {meta && <div className="shrink-0 text-xs text-muted-foreground">{meta}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Replace the three Dashboard row maps**

In `frontend/src/pages/DashboardPage.tsx`, add `import { ListRow } from "@/components/ListRow";` and `import { formatDate } from "@/lib/format";`. Replace each of the three section row bodies:

Upcoming activities map →
```tsx
            {summary.upcomingActivities.map(a => (
              <ListRow
                key={a.activityId as number}
                to={`/jobs/${a.jobId}`}
                title={a.jobTitle}
                subtitle={`${a.companyName} — ${a.activityLabel}`}
                meta={formatDate(a.scheduledAtUtc)}
              />
            ))}
```
Stale jobs map →
```tsx
            {summary.staleJobs.map(j => (
              <ListRow key={j.id as number} to={`/jobs/${j.id}`} title={j.title} subtitle={j.companyName} meta={j.status} />
            ))}
```
Offer deadlines map →
```tsx
            {summary.offerDeadlines.map(o => (
              <ListRow
                key={o.jobId as number}
                to={`/jobs/${o.jobId}`}
                title={o.title}
                subtitle={o.companyName}
                meta={<span className="font-medium text-destructive">{formatDate(o.offerDeadlineAtUtc)}</span>}
              />
            ))}
```
(The offer-deadline accent moves from raw `text-orange-500` to the `text-destructive` risk token. The `activityLabel` that was a separate `<p>` is folded into the subtitle.)

- [ ] **Step 5: Verify**

Run: `npm --prefix frontend run typecheck && npm --prefix frontend run lint && npm --prefix frontend run test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ListRow.tsx frontend/src/components/ListRow.test.tsx frontend/src/pages/DashboardPage.tsx
git commit -m "refactor(frontend): extract ListRow and dedupe dashboard rows"
```

---

## Task 6: Color-token cleanup (calm + risk accent)

**Files:**
- Modify: `frontend/src/features/jobs/JobsTable.tsx:7-11,59,73-75`
- Modify: `frontend/src/pages/TasksPage.tsx:19-23,102-112`
- Modify: `frontend/src/pages/DashboardPage.tsx:62,73` (remaining raw colors)
- Test: `frontend/src/features/jobs/JobsTable.test.tsx` (new)

Replace every raw palette class with tokens. Priority/status badges become calm (muted/secondary/outline); `destructive` is the only accent, reserved for overdue/urgent. Overdue uses the `TriangleAlert` icon, not the `⚠` glyph. The status-dot legend is untouched.

- [ ] **Step 1: Write the failing test**

`frontend/src/features/jobs/JobsTable.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { JobsTable } from "./JobsTable";
import type { JobDto } from "@/lib/api/model";

const job = (over: Partial<JobDto> = {}): JobDto => ({
  id: 1, companyId: 1, companyName: "Northwind Synthetics", title: "Backend Engineer",
  status: "Applied", priority: "High", source: "CompanySite", sourceUrl: null,
  country: "Norway", city: "Oslo", locationText: null, remoteMode: "Remote", employmentType: "FullTime",
  salaryMin: 800000, salaryMax: 950000, salaryCurrency: "NOK", salaryPeriod: "Annual",
  deadlineAtUtc: null, appliedAtUtc: null, lastContactedAtUtc: null,
  nextActionAtUtc: "2000-01-01T00:00:00Z", fitScore: null, notes: null,
  createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z", ...over,
});

describe("JobsTable", () => {
  it("renders a row and an overdue alert icon (no ⚠ glyph)", () => {
    const { container } = renderWithProviders(<JobsTable jobs={[job()]} onJobClick={vi.fn()} />);
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
    expect(container.querySelector("[data-overdue]")).not.toBeNull();
    expect(container.textContent).not.toContain("⚠");
  });

  it("renders the priority with a token badge, not a raw palette class", () => {
    const { container } = renderWithProviders(<JobsTable jobs={[job({ priority: "High" })]} onJobClick={vi.fn()} />);
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(container.querySelector(".bg-red-100,.bg-blue-100,.bg-slate-100")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- JobsTable`
Expected: FAIL — current code has `bg-red-100`/`⚠`.

- [ ] **Step 3: Tokenize JobsTable**

In `frontend/src/features/jobs/JobsTable.tsx`:
- Replace imports/`PRIORITY_COLOR` (lines 1-11). Add `import { TriangleAlert } from "lucide-react";`, `import { formatDate, formatSalary } from "@/lib/format";`, `import { cn } from "@/lib/utils";`, and replace the `PRIORITY_COLOR` map with a token-based variant picker:
```ts
import type { Priority } from "@/lib/api/model";
const PRIORITY_VARIANT: Record<Priority, "secondary" | "outline" | "destructive"> = {
  Low: "outline",
  Medium: "secondary",
  High: "destructive",
};
```
- Priority cell (line 58-60):
```tsx
              <TableCell>
                <Badge variant={PRIORITY_VARIANT[job.priority]}>{job.priority}</Badge>
              </TableCell>
```
- Salary cell (line 65-69) → right-aligned, via `formatSalary`:
```tsx
              <TableCell className="text-right text-sm tabular-nums">
                {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency) ?? "—"}
              </TableCell>
```
- Applied cell (line 70-72): `{formatDate(job.appliedAtUtc) ?? "—"}`.
- Next-action cell (line 73-76) → token + icon:
```tsx
              <TableCell
                data-overdue={isOverdue || undefined}
                className={cn("text-sm", isOverdue ? "text-destructive" : "text-muted-foreground")}
              >
                <span className="inline-flex items-center gap-1">
                  {isOverdue && <TriangleAlert aria-hidden className="size-3.5 shrink-0" />}
                  {formatDate(job.nextActionAtUtc) ?? "—"}
                </span>
              </TableCell>
```
- The salary `TableHead` (line 29) → add `className="text-right"`.

- [ ] **Step 4: Tokenize TasksPage status badges**

In `frontend/src/pages/TasksPage.tsx` replace the `STATUS_BADGE` map (lines 19-23) with a token variant map:
```ts
const STATUS_VARIANT: Record<FollowUpStatus, "secondary" | "outline"> = {
  Pending: "secondary",
  Completed: "outline",
  Skipped: "outline",
};
```
Update the badge usage (lines 102-107):
```tsx
                    <Badge variant={STATUS_VARIANT[task.status]} className="text-[10px]">
                      {task.status}
                    </Badge>
```
Update the overdue/date span (lines 108-112) to the `destructive` token + `formatDate` (add `import { formatDate } from "@/lib/format";`):
```tsx
                    {task.dueAtUtc && (
                      <span className={`text-[11px] ${isOverdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                        {formatDate(task.dueAtUtc)}{isOverdue ? " · overdue" : ""}
                      </span>
                    )}
```

- [ ] **Step 5: Tokenize remaining DashboardPage colors**

In `frontend/src/pages/DashboardPage.tsx`:
- Overdue stat (line 62): `text-red-500` → `text-destructive`:
```tsx
              <p className={`text-2xl font-bold ${Number(summary.overdueFollowUps) > 0 ? "text-destructive" : ""}`}>
```
- Days-until-deadline stat (line 73): `text-orange-500` → `text-destructive`:
```tsx
              <p className={`text-2xl font-bold ${Number(summary.daysUntilSearchDeadline) <= 7 ? "text-destructive" : ""}`}>
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm --prefix frontend run typecheck && npm --prefix frontend run lint && npm --prefix frontend run test`
Expected: PASS — JobsTable tests green; existing suite green.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/jobs/JobsTable.tsx frontend/src/features/jobs/JobsTable.test.tsx frontend/src/pages/TasksPage.tsx frontend/src/pages/DashboardPage.tsx
git commit -m "refactor(frontend): replace raw palette colors with calm tokens + risk accent"
```

---

## Task 7: Table polish (CompaniesTable headers, formatters consistency)

**Files:**
- Modify: `frontend/src/features/companies/CompaniesTable.tsx:13-14`

CompaniesTable already uses `EmptyState` (Task 4). Remaining: replace the abbreviated header "Comp." with a full word and balance the header row. (JobsTable formatters/right-align were handled in Task 6. `ui/table.tsx` default density is the shadcn baseline and is left unchanged — no usage forces a change.)

- [ ] **Step 1: Full header words**

`frontend/src/features/companies/CompaniesTable.tsx` lines 13-14 — replace the header cells:
```tsx
          <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Market</TableHead>
          <TableHead>Compensation</TableHead><TableHead>Location</TableHead><TableHead className="w-0"></TableHead>
```
(The trailing actions column gets `w-0` so it hugs the Delete button.)

- [ ] **Step 2: Verify**

Run: `npm --prefix frontend run typecheck && npm --prefix frontend run lint && npm --prefix frontend run test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/companies/CompaniesTable.tsx
git commit -m "refactor(frontend): full-word companies table headers"
```

---

## Task 8: Form rhythm + toolbar control heights

**Files:**
- Modify: `frontend/src/components/form/Field.tsx:15`
- Modify: `frontend/src/features/jobs/JobQuickAdd.tsx:71,77`
- Modify: `frontend/src/features/jobs/JobFilterBar.tsx:39-98`
- Modify: `frontend/src/features/jobs/drawer/PropertiesTab.tsx:45-47`
- Modify: `frontend/src/features/companies/CompanyDetailSheet.tsx:8`

- [ ] **Step 1: Field label breathing room**

`frontend/src/components/form/Field.tsx` line 15 — `<div className="space-y-1">` → `<div className="space-y-2">`.

- [ ] **Step 2: JobQuickAdd — form rhythm + toolbar-height Add button**

`frontend/src/features/jobs/JobQuickAdd.tsx`:
- Line 71: `<Button size="sm">+ Add job</Button>` → `<Button>+ Add job</Button>` (default size `h-8` to match the `h-8` filter controls it sits beside).
- Line 77: form `className="space-y-3"` → `className="space-y-4"` (match other forms).

- [ ] **Step 3: JobFilterBar — drop redundant heights, normalize gaps, chip button variant**

`frontend/src/features/jobs/JobFilterBar.tsx`:
- Search Input (line 44): `className="h-8 w-52"` → `className="w-52"` (default is `h-8`).
- Status SelectTrigger (line 50): `className="h-8 w-36"` → `className="w-36"`.
- Country group wrapper (line 59): `className="flex items-center gap-1 flex-wrap"` → `className="flex flex-wrap items-center gap-2"`.
- Country chip remove Button (lines 63-66): replace ad-hoc sizing with the `icon-xs` variant:
```tsx
            <Button
              variant="ghost" size="icon-xs"
              aria-label={`Remove ${c}`}
              onClick={() => onChange({ ...filters, countries: filters.countries.filter(x => x !== c) })}
            >
              <X aria-hidden />
            </Button>
```
- Add-country Input (line 77): `className="h-8 w-32"` → `className="w-32"`.
- Company Input (line 86): `className="h-8 w-36"` → `className="w-36"`.
- Group-by SelectTrigger (line 92): `className="h-8 w-36"` → `className="w-36"`.

- [ ] **Step 4: PropertiesTab — drop redundant Button height override**

`frontend/src/features/jobs/drawer/PropertiesTab.tsx` lines 45-47 — the `Set` button is already `size="sm"` (h-7); drop the redundant `className="h-7"`:
```tsx
        <Button
          size="sm"
          disabled={!newKey}
```
(The two compact `Input className="h-7 …"` stay — Input has no size variant and `h-7` matches the `sm` button in this dense drawer row.)

- [ ] **Step 5: CompanyDetailSheet — align label/value gap**

`frontend/src/features/companies/CompanyDetailSheet.tsx` line 8 — `grid grid-cols-3 gap-2 py-1` → `grid grid-cols-3 gap-3 py-1`.

- [ ] **Step 6: Verify**

Run: `npm --prefix frontend run typecheck && npm --prefix frontend run lint && npm --prefix frontend run test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/form/Field.tsx frontend/src/features/jobs/JobQuickAdd.tsx frontend/src/features/jobs/JobFilterBar.tsx frontend/src/features/jobs/drawer/PropertiesTab.tsx frontend/src/features/companies/CompanyDetailSheet.tsx
git commit -m "refactor(frontend): unify form rhythm and toolbar control heights"
```

---

## Task 9: State consistency + final QA

**Files:**
- Modify: `frontend/src/pages/TasksPage.tsx` (empty state), `frontend/src/pages/JobsPage.tsx` (loading/error lines), `frontend/src/pages/JobDetailPage.tsx` (error line)

Standardize empty/error presentation and run the full validation pass.

- [ ] **Step 1: Tasks empty state via EmptyState**

`frontend/src/pages/TasksPage.tsx` — add `import { EmptyState } from "@/components/EmptyState";` and `import { CheckSquare } from "lucide-react";`. Replace the empty branch `<p className="text-sm text-muted-foreground py-4">No tasks found.</p>` with:
```tsx
        <EmptyState icon={CheckSquare} title="No tasks found" hint="Follow-ups you create on jobs show up here." />
```

- [ ] **Step 2: Consistent JobsPage board loading/error lines**

`frontend/src/pages/JobsPage.tsx` — the board `TabsContent` error/loading lines already use `text-sm text-destructive` / `text-sm text-muted-foreground`; leave the copy but ensure both are wrapped consistently (`py-8 text-center`). No structural change required if already matching; otherwise align to:
```tsx
            <div className="py-8 text-center text-sm text-destructive">Failed to load jobs. Check your connection.</div>
            …
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
```

- [ ] **Step 3: Full validation pass**

Run:
```
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
```
Expected: typecheck clean; lint clean; all tests pass; build succeeds (the pre-existing chunk-size warning is acceptable).

- [ ] **Step 4: Manual QA checklist**

- Every page shares one inset and centered width (board full-bleed).
- Dashboard/Tasks no longer over-inset; headings all `text-xl`.
- Dark mode: no raw-palette artifacts on badges/overdue/stat numbers.
- Toolbar rows align (filter controls + Add button same height).
- Board still fills height and scrolls horizontally; chip dropdown + Columns menu still work.
- Companies/Tasks empty states render via `EmptyState`.
- Forms: label spacing comfortable; control heights consistent.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/TasksPage.tsx frontend/src/pages/JobsPage.tsx frontend/src/pages/JobDetailPage.tsx
git commit -m "refactor(frontend): standardize empty/loading/error states + final QA"
```

---

## Self-Review Notes

- **Spec coverage:** §3 A→shell (T2/T3), B→format.ts (T1), EmptyState (T4), ListRow (T5), presentation tokens (T6); C→tables (T6/T7); D→forms (T8); E→sheet gap (T8), modal "drift" demoted as false positives (SheetContent has no body padding; CompanyDialog overrides are justified); F→toolbar heights (T8); G→states (T9). §5 conventions encoded in Global Constraints. §7 a11y preserved (semantic `h1`, `aria-hidden` icons, token contrast, icon+token for overdue). §8 no new deps.
- **Decision logged:** status-dot legend retained (not calmed) — categorical encoding; the calm rule targets badges/text accents only. Tasks row not folded into ListRow (single, distinct shape). These should be added to `docs/knowledge-base/03-decisions.md` during execution as dated entries.
- **Type consistency:** `formatSalary`/`formatDate` signatures match usages in T6/T5; `PRIORITY_VARIANT`/`STATUS_VARIANT` keyed by `Priority`/`FollowUpStatus`; `EmptyState` icon prop typed `LucideIcon`.
