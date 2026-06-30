# CareerOps UI Alignment & Layout Restructure — Design

**Date:** 2026-06-30
**Status:** Approved (foundation + component plan) — pending spec review
**Scope:** Full restructure of layout/alignment/spacing/density across the frontend, repo-wide. Frontend-only; no backend/API/contract changes; no new dependencies.

## 1. Problem / Current Assessment

The app "feels misaligned" because there is **no shared page shell** — each of the 5 pages invents its own container, width, padding, heading size, and vertical rhythm. On top of that, color, control-height, form-spacing, table-density, and date/number formatting are applied ad hoc per file.

### Container inconsistency (root cause)

| Page | Padding | Max width | Heading | Rhythm |
|------|---------|-----------|---------|--------|
| `AppLayout` (outer `Outlet` wrapper) | `p-6` | — | — | — |
| Dashboard | **+`p-6` again** (double inset) | `max-w-5xl` | `text-xl` | `space-y-6` |
| Tasks | **+`p-6` again** (double inset) | `max-w-3xl` | `text-xl` | `space-y-4` |
| Jobs | none | none (full) | `text-xl` | `gap-4` |
| Companies | none | none (full) | `text-2xl` | `space-y-6` |
| Settings | none | `max-w-2xl` centered | none (card title) | — |

Dashboard/Tasks render visibly more inset than the other pages (double `p-6`); every page uses a different width and rhythm; heading size is `xl` on three pages, `2xl` on Companies, absent on Settings.

### Cross-cutting issues (from audit)

1. **Raw palette colors instead of tokens** (~5 files): `JobsTable` `PRIORITY_COLOR` (`bg-slate-100`/`bg-blue-100`/`bg-red-100`), `text-red-500`/`⚠` for overdue; `TasksPage` `STATUS_BADGE` (`bg-yellow-100`/`green`/`gray`); Dashboard `text-red-500`/`text-orange-500`. Break dark mode, contradict the calm-neutral direction.
2. **Control-height mismatches in the same row**: JobsPage header mixes `h-8` filter controls with the default `h-9` Add button; `JobFilterBar` badge close button `h-4 w-4 p-0`; `PropertiesTab` `h-7 w-32` inputs.
3. **Bare `toLocale*` formatting** (5 files: JobsTable, TasksPage, DashboardPage, +): `new Date(x).toLocaleDateString()`, `.toLocaleString()` — not locale-driven, duplicated.
4. **Form spacing fragmentation**: `Field` `space-y-1` vs form root `space-y-4` vs nested grid `gap-4` vs button row `gap-2` — no single scale.
5. **Ad-hoc input height/width overrides** instead of size variants (PropertiesTab, JobFilterBar).
6. **Table cell/header density mismatch**: `TableCell p-2` vs `TableHead h-10`.
7. **Modal/sheet padding drift**: CompanyDetailSheet custom `p-4` wrapper, CompanyDialog `max-h-[85vh]`, JobQuickAdd relies on defaults.
8. **Repeated list-row pattern** (`flex items-center justify-between p-3 rounded-md border text-sm`) copy-pasted 4× (Dashboard ×3, Tasks variant).
9. **Inconsistent empty/loading/error states** per page (Companies bare `<p>`, others differ).

## 2. Target UX Direction

Calm, dense-but-readable, Jira/Linear-feel. Consistent container, one heading level, one spacing scale, neutral surfaces with a single accent reserved for risk (overdue/urgent). No new colors, no heavy animation, no new dependencies. Alignment is enforced **structurally** (a shell + shared primitives) so it cannot drift again, not page-by-page.

### Decisions (locked this session)

- **Scope:** full restructure (shell + tokens + component cleanup + page-level layout).
- **Page width:** centered consistent container for reading pages (Dashboard/Tasks/Settings/Companies); Jobs board stays full-bleed.
- **Status colors:** calm neutral/muted badges; one `destructive` accent reserved for overdue/urgent only.

## 3. Component-by-Component Plan

### A. Page shell (foundation)
- **New** `src/components/layout/PageShell.tsx`:
  - `variant="contained"` (default): `mx-auto w-full`, `px-6 py-6`, `overflow-y-auto`, vertical `space-y-6`; width prop `default` = `max-w-5xl`, `narrow` = `max-w-2xl` (single-column forms like Settings).
  - `variant="full"` (board): `flex h-full min-h-0 flex-col px-6 py-6`; inner content owns horizontal scroll.
- **New** `src/components/layout/PageHeader.tsx`: `title` (`text-xl font-semibold`), optional `description`, right-aligned `actions` slot; consistent bottom spacing.
- **Modify** `AppLayout`: content div → `min-h-0 flex-1 overflow-hidden` (drop `p-6` + `overflow-y-auto`). PageShell becomes the single owner of page padding + scroll → the double-`p-6` bug is impossible by construction.
- **Refactor** all 5 pages onto `PageShell`/`PageHeader`. Companies heading normalizes `text-2xl` → `text-xl`; Settings gains a real header.

### B. Shared primitives (new)
- `src/lib/format.ts`: `formatDate(value)`, `formatDateTime(value)`, `formatSalary(min, max, currency)`, `formatNumber(value)` — locale-driven (no hardcoded separators), ISO inputs. `jobPresentation` date helpers re-export from here. Replaces every bare `toLocale*`.
- `src/components/EmptyState.tsx`: lucide icon + title + hint. Replaces Companies bare `<p>`; unifies Jobs/Tasks/Companies empty states.
- `src/components/ListRow.tsx`: the repeated bordered row → one component (leading title link + subtitle + meta; trailing slot). Applied in Dashboard (×3) and Tasks.
- Presentation tone helpers: keep jobs `getPriorityPresentation`/`getStatusPresentation`; add a follow-up/task tone map (Pending/Completed/Skipped → token classes + optional icon). All return tokens, never raw palette.

### C. Tables (`JobsTable`, `CompaniesTable`, `ui/table`)
- Tokenize `PRIORITY_COLOR` and status badges → muted default; subtle accent only for High/urgent.
- Overdue → `text-destructive` + `TriangleAlert` icon (drop `⚠` and `text-red-500`).
- Salary/dates via `formatSalary`/`formatDate`; right-align numeric columns.
- Align `TableHead` height with `TableCell` padding in `ui/table.tsx`; add width hints + truncation for long text.
- `CompaniesTable`: full header words (not "Comp."); shared `EmptyState`; density matches `JobsTable`.

### D. Forms (`Field`, `FormErrors`, `ProfileForm`, `CompanyForm`, `JobQuickAdd`, `PropertiesTab`)
- One rhythm: `Field` `space-y-1` → `space-y-2`; form root `space-y-4`; field grids `gap-4`; button rows `gap-2`.
- Replace ad-hoc `h-7 w-32` input overrides with size variants; standardize form control size.
- `FormErrors` padding aligned to form rhythm; loading skeletons match field heights.

### E. Modals / sheets (`CompanyDialog`, `CompanyDetailSheet`, `JobQuickAdd`)
- Drop custom `p-4` wrapper and `max-h-[85vh]` drift → rely on Dialog/Sheet defaults (or one shared sizing convention).
- Label/value grids → consistent `gap-3` matching forms.
- `JobDetailDrawer` internals left as-is (just polished); only token-align its label/value grid if it diverges from the shared scale.

### F. Toolbar control-height rule (`JobsPage`, `JobFilterBar`)
- Filter inputs/selects + the Add button all `sm` / `h-8` in the header row.
- Country chip remove → `size="icon-xs"` (not `h-4 w-4 p-0`); filter group gaps → `gap-2`.

### G. Empty / loading / error states
- Standardize across all pages: `EmptyState` for empty; consistent skeleton patterns (heights matching final layout); single error line `text-sm text-destructive`.

## 4. Files Likely to Change

**New:** `src/components/layout/PageShell.tsx`, `src/components/layout/PageHeader.tsx`, `src/components/EmptyState.tsx`, `src/components/ListRow.tsx`, `src/lib/format.ts` (+ unit tests for each).

**Modified:** `src/components/AppLayout.tsx`; `src/pages/{DashboardPage,TasksPage,CompaniesPage,SettingsProfilePage,JobsPage,JobDetailPage}.tsx`; `src/features/jobs/{JobsTable,JobFilterBar,JobQuickAdd,jobPresentation}.tsx`; `src/features/jobs/drawer/PropertiesTab.tsx`; `src/features/companies/{CompaniesTable,CompanyForm,CompanyDialog,CompanyDetailSheet}.tsx`; `src/features/settings/ProfileForm.tsx`; `src/components/form/{Field,FormErrors}.tsx`; `src/components/ui/{table,badge}.tsx` (variants only — do not rewrite the design system).

**Off-limits:** `src/lib/api/**` (generated), backend, API contracts.

## 5. Proposed Spacing / Token Conventions

- **Page:** padding `px-6 py-6` (PageShell only); section rhythm `space-y-6`; content width `max-w-5xl` (default) / `max-w-2xl` (forms).
- **Form:** form `space-y-4`; field label→control `space-y-2`; field grid `gap-4`; button row `gap-2`.
- **Toolbar:** control size `sm` (`h-8`); group gap `gap-2`.
- **Color:** tokens only (`text-muted-foreground`, `bg-muted`, `bg-secondary`, `text-destructive`). One accent (`destructive`) for risk; no raw palette.
- **Heading:** page `text-xl font-semibold`; section `text-sm font-medium text-muted-foreground`.
- **Icons:** lucide, ~`size-3`/`size-3.5` on dense rows, `size-4` default.

## 6. Responsive Behavior

- Reading pages: centered container shrinks with the viewport; grids collapse columns (`sm:grid-cols-*` patterns kept/normalized).
- Board: full-bleed, full-height, horizontal scroll preserved.
- Modals/sheets: rely on Dialog/Sheet responsive defaults (mobile = near-full-width).
- Tables: horizontal scroll on narrow viewports; truncation prevents wrap blowups.

## 7. Accessibility Checklist

- Keyboard focus + visible focus rings preserved on all interactive controls.
- Semantic buttons/links (no div-as-button regressions).
- Token colors keep readable contrast in light + dark.
- `EmptyState`/error text readable; icons `aria-hidden` with text labels.
- No reliance on color alone for state (overdue uses icon + token).

## 8. Package Decision

**Use the existing stack only.** No new dependencies. The work is two small layout components, one shared `ListRow`, one `EmptyState`, one `format.ts` util, plus token/spacing cleanup using Tailwind + shadcn/Radix + lucide-react + date-fns already present.

## 9. Execution Phases

1. **Foundation:** `PageShell`/`PageHeader`, `AppLayout` change, `format.ts`, token cleanup in presentation helpers; refactor all 5 pages onto the shell.
2. **Shared components:** `EmptyState`, `ListRow`; apply to Dashboard + Tasks.
3. **Tables + forms + modals:** density/tokens for `JobsTable`/`CompaniesTable`/`ui.table`, form rhythm + control sizes, modal/sheet padding.
4. **Toolbar heights + states + QA:** toolbar control-height rule; standardize empty/loading/error; full validation.

## 10. Validation Checklist

- `npm --prefix frontend run typecheck`
- `npm --prefix frontend run build`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run test` (new shared components get vitest coverage; existing suite stays green)
- Manual: every page shares one container width/inset; headings consistent; dark mode has no raw-palette artifacts; toolbar rows align; board still full-height + horizontally scrollable; modals/sheets open correctly on mobile width.

## 11. Open Questions / Gates

- **Pending uncommitted changes** (`JobCard.tsx`, `JobStatusDropdown.tsx`, `JobsBoard.tsx`, `JobsBoard.test.tsx`) — the chip-dropdown fix + Columns feature — must be verified+committed or reverted before implementation, since Phase 1/3/F edit the same files.
- **Branch:** implementation must not run on `main` — create a feature branch first.
