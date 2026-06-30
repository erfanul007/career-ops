# CareerOps Jobs UI/UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the CareerOps Jobs board and job-detail drawer into a calm, dense, Jira/Linear-style workflow surface — frontend only.

**Architecture:** React 19 + Vite + Tailwind v4 + shadcn/Radix. Centralize repeated presentation rules in a pure `jobPresentation.ts` helper module. Rebuild the card hierarchy, board layout, and drawer (3 tabs + rich Overview). New tests run on a newly-added Vitest + React Testing Library harness; visual/drag behavior is verified manually.

**Tech Stack:** TypeScript, React 19, Tailwind CSS v4, shadcn/Radix (`radix-ui`), `lucide-react@1.22`, `date-fns@4`, `@dnd-kit/core`, `sonner`, `tw-animate-css`. Tests: Vitest + `@testing-library/react` + `@testing-library/jest-dom` + jsdom (added in Task 1).

Source spec: `docs/superpowers/specs/2026-06-29-careerops-jobs-ui-polish.md`.

## Global Constraints

Every task implicitly includes these. Exact values copied from the spec + project rules:

- **Frontend only.** Do not touch backend, API contracts, or generated `frontend/src/lib/api/**` (orval output — read-only).
- **No design-system rewrite.** Consume `components/ui/*` primitives; do not replace shadcn/Radix.
- **No new runtime/UI/animation/icon packages.** Allowed deps: Tailwind, shadcn/Radix, `lucide-react`, `date-fns`, `@dnd-kit`, `sonner`, `tw-animate-css`. The ONLY new dependencies permitted are **dev-only test tooling** (Task 1): `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`. This consciously overrides the spec's "no additions" line for test infra (zero runtime/bundle impact) and is recorded as **D57** in `docs/knowledge-base/03-decisions.md` (already added during planning).
- **Use the CLI for deps** (project rule D19): `npm --prefix frontend install -D <pkg>` — never hand-edit `package.json` versions.
- **No git commits in this plan.** Tasks edit files only; the user handles all git. Each task ends with a verification gate, not a commit.
- **TypeScript strictness** (`tsconfig.app.json`): `verbatimModuleSyntax: true` → type-only imports MUST use `import type`. `noUnusedLocals`/`noUnusedParameters: true` → no unused symbols.
- **`IClock` analogue:** helpers that read "now" must accept an injected `now: Date = new Date()` parameter so tests are deterministic (the codebase forbids ambient time reads).
- **Motion policy:** Tailwind transitions only. Durations: hover/focus `duration-150`; content/collapse `duration-200`; drag overlay immediate. Prefer `transition-colors`/`transition-shadow`/`transition-transform`, `ease-out`, `transform-gpu`. Add `motion-reduce:transition-none` on interactive transitions. No bouncing, no large scale changes, no constant animation.
- **Icon policy:** `lucide-react` only. Card icons `size-3`/`size-3.5`; drawer `size-4`; header/action `size-4`–`size-5`. Decorative icons `aria-hidden`; icon-only buttons get `sr-only` labels.
- **Test design:** tests assert behavior, accessibility, and data presence — NOT Tailwind class strings or pixels. Drag, sticky-scroll, responsive widths, and motion are manual-QA only.
- **Per-phase visual report:** after each phase, produce a short report — screenshot(s), what changed, what was validated, what still feels rough.

**Canonical verification commands** (run from repo root):

```bash
npm --prefix frontend run test        # vitest run (added Task 1)
npm --prefix frontend run typecheck   # tsc -b
npm --prefix frontend run lint        # eslint .
npm --prefix frontend run build       # tsc -b && vite build
```

---

## File Structure

**New files**
- `frontend/src/features/jobs/jobPresentation.ts` — pure presentation helpers (dates, money, location, priority, status). No hooks, no query client, no mutations.
- `frontend/src/features/jobs/JobCardPreview.tsx` — visual-only card (no `useDraggable`, no interactive Link/chip) used by the drag overlay.
- `frontend/src/features/jobs/drawer/CollapsibleSection.tsx` — local collapsible (button trigger, `aria-expanded`, keyboard, chevron rotate).
- `frontend/src/features/jobs/drawer/MetadataSection.tsx` — labelled definition-grid group; hides empty rows/group.
- `frontend/src/features/jobs/drawer/NextActionsBlock.tsx` — follow-ups recomposed for Overview (due/overdue/completed/skipped).
- Test infra: `frontend/src/test/setup.ts`, `frontend/src/test/utils.tsx`, plus `*.test.ts(x)` colocated next to sources.

**Modified files**
- `frontend/vite.config.ts`, `frontend/tsconfig.app.json`, `frontend/package.json` (scripts/deps via CLI), `frontend/package-lock.json` (rewritten by `npm install`) — Task 1.
- `docs/knowledge-base/03-decisions.md` — D57 (test harness) added during planning; no further edit needed at execution.
- `frontend/src/features/jobs/JobCardPreview.tsx` — see New files (drag-overlay visual).
- `frontend/src/pages/JobsPage.tsx` — full-height shell.
- `frontend/src/features/jobs/JobsBoard.tsx` — board scroll, drag overlay elevation, drag-only drop affordance.
- `frontend/src/features/jobs/BoardColumn.tsx` — sticky header, count pill, calm empty state, width.
- `frontend/src/features/jobs/JobCard.tsx` — new hierarchy, icons, chip, accent bar, calm overdue, `role="button"`, salary removed.
- `frontend/src/features/jobs/JobStatusDropdown.tsx` — `variant="chip" | "default"`.
- `frontend/src/features/jobs/JobDetailDrawer.tsx` — responsive width, sticky header + summary, layout-matched skeleton.
- `frontend/src/features/jobs/JobDetailContent.tsx` — 3 tabs.
- `frontend/src/features/jobs/drawer/OverviewTab.tsx` — compose sections + next actions + collapsibles.
- `frontend/src/features/jobs/drawer/ActivitiesTab.tsx` — timeline rows + overflow menu.
- `frontend/src/features/jobs/drawer/PropertiesTab.tsx` — calm metadata styling.
- `frontend/src/features/jobs/drawer/AttachmentsTab.tsx` — quiet actions.
- `frontend/src/features/jobs/drawer/TimelineTab.tsx` — spacing/token alignment.
- Possibly `frontend/src/components/AppLayout.tsx` — only if the full-height board cannot own its scroll otherwise (Task 6).

**Orphaned after recomposition:** `frontend/src/features/jobs/drawer/FollowUpsTab.tsx` (replaced by `NextActionsBlock`) — delete in Task 14 once build is green.

---

## Test fixtures (shared)

Several tests need `JobDto` / `JobDetailDto` fixtures. Define them inline per test file (small, explicit) using this canonical shape. Use **synthetic data only** (GDPR rule — never real companies/people):

```ts
import type { JobDto } from '@/lib/api/model';

export const baseJob: JobDto = {
  id: 12, companyId: 1, companyName: 'Northwind Synthetics', title: 'Senior Backend Engineer',
  status: 'Applied', priority: 'Medium', source: 'CompanySite', sourceUrl: 'https://example.test/job/12',
  country: 'Norway', city: 'Oslo', locationText: null, remoteMode: 'Hybrid', employmentType: 'FullTime',
  salaryMin: 800000, salaryMax: 950000, salaryCurrency: 'NOK', salaryPeriod: 'Year',
  deadlineAtUtc: null, appliedAtUtc: null, lastContactedAtUtc: null, nextActionAtUtc: null,
  fitScore: 8, notes: null, createdAtUtc: '2026-06-01T00:00:00Z', updatedAtUtc: '2026-06-01T00:00:00Z',
};
```

> Note: enum string literals (`source: 'CompanySite'`, `employmentType: 'FullTime'`, `salaryPeriod: 'Year'`) must match the generated union types in `frontend/src/lib/api/model`. If `tsc` rejects a literal, open the matching `*.ts` in that folder and use a valid member — do not change the generated file.

---

## Task 1: Test infrastructure (Vitest + RTL)

**Files:**
- Modify: `frontend/package.json` (scripts only — deps via CLI)
- Modify: `frontend/package-lock.json` (rewritten by `npm install` — do not hand-edit)
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/tsconfig.app.json`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/test/utils.tsx`
- Create: `frontend/src/test/smoke.test.ts`
- Already done in planning: `docs/knowledge-base/03-decisions.md` D57 (test-harness decision) — no edit required here.

**Interfaces:**
- Produces: `renderWithProviders(ui: ReactElement): RenderResult` — wraps a component in `QueryClientProvider` + `MemoryRouter` (used by every component test).
- Produces: `npm run test` → `vitest run`.

- [ ] **Step 1: Install dev-only test deps via CLI**

```bash
npm --prefix frontend install -D vitest jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 2: Add test scripts to `package.json`**

In `frontend/package.json`, add to `"scripts"` (keep existing entries):

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: Configure Vitest in `vite.config.ts`**

Replace `frontend/vite.config.ts` with:

```ts
/// <reference types="vitest/config" />
import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5280,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
})
```

- [ ] **Step 4: Add Vitest globals types to `tsconfig.app.json`**

Change the `"types"` line in `frontend/tsconfig.app.json`:

```json
    "types": ["vite/client", "vitest/globals"],
```

- [ ] **Step 5: Create the test setup file**

`frontend/src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 6: Create the provider render helper**

`frontend/src/test/utils.tsx`:

```tsx
import { render, type RenderResult } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import type { ReactElement, ReactNode } from "react";

export function renderWithProviders(ui: ReactElement): RenderResult {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return render(ui, { wrapper: Wrapper });
}
```

- [ ] **Step 7: Write the smoke test**

`frontend/src/test/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("test infrastructure", () => {
  it("runs arithmetic", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 8: Run the smoke test**

Run: `npm --prefix frontend run test`
Expected: PASS — 1 test passed.

- [ ] **Step 9: Verify gate**

Run: `npm --prefix frontend run typecheck && npm --prefix frontend run lint`
Expected: both pass (test files typecheck cleanly with `vitest/globals`).

---

## Task 2: `jobPresentation.ts` pure helpers

**Files:**
- Create: `frontend/src/features/jobs/jobPresentation.ts`
- Test: `frontend/src/features/jobs/jobPresentation.test.ts`

**Interfaces:**
- Produces:
  - `isOverdue(value?: string | null, now?: Date): boolean`
  - `formatRelativeDate(value?: string | null, now?: Date): string | null`
  - `formatShortDate(value?: string | null): string | null`
  - `formatMoneyRange(min?: number | string | null, max?: number | string | null, currency?: string | null, period?: string | null): string | null`
  - `formatLocation(job: Pick<JobDto, "city" | "country" | "locationText">): string | null`
  - `getPriorityPresentation(priority: Priority): { label: string; show: boolean }`
  - `getStatusPresentation(status: JobStatus): { label: string; dotClassName: string; accentClassName: string }` — the single source for status dot **and** column top-accent colours (consumed by `JobStatusDropdown`, `JobCardPreview`, and `BoardColumn`).

- [ ] **Step 1: Write the failing tests**

`frontend/src/features/jobs/jobPresentation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  isOverdue, formatRelativeDate, formatShortDate,
  formatMoneyRange, formatLocation, getPriorityPresentation, getStatusPresentation,
} from "./jobPresentation";

const now = new Date("2026-06-30T12:00:00Z");

describe("isOverdue", () => {
  it("is false for null", () => expect(isOverdue(null, now)).toBe(false));
  it("is true for a past date", () => expect(isOverdue("2026-06-29T12:00:00Z", now)).toBe(true));
  it("is false for a future date", () => expect(isOverdue("2026-07-01T12:00:00Z", now)).toBe(false));
});

describe("formatRelativeDate", () => {
  it("returns null for null", () => expect(formatRelativeDate(null, now)).toBeNull());
  it("describes a future date with a suffix", () => {
    expect(formatRelativeDate("2026-07-02T12:00:00Z", now)).toContain("in");
  });
});

describe("formatMoneyRange", () => {
  it("returns null when min is absent", () => expect(formatMoneyRange(null, null, "NOK", "Year")).toBeNull());
  it("formats a range", () => {
    expect(formatMoneyRange(800000, 950000, "NOK", "Year")).toContain("NOK");
  });
  it("uses + when max absent", () => expect(formatMoneyRange(800000, null, "NOK", "Year")).toContain("+"));
});

describe("formatLocation", () => {
  it("joins city and country", () =>
    expect(formatLocation({ city: "Oslo", country: "Norway", locationText: null })).toBe("Oslo, Norway"));
  it("falls back to locationText", () =>
    expect(formatLocation({ city: null, country: null, locationText: "Remote (EU)" })).toBe("Remote (EU)"));
  it("returns null when empty", () =>
    expect(formatLocation({ city: null, country: null, locationText: null })).toBeNull());
});

describe("getPriorityPresentation", () => {
  it("shows only High", () => {
    expect(getPriorityPresentation("High").show).toBe(true);
    expect(getPriorityPresentation("Medium").show).toBe(false);
    expect(getPriorityPresentation("Low").show).toBe(false);
  });
});

describe("getStatusPresentation", () => {
  it("returns a label, a dot class, and an accent class", () => {
    const p = getStatusPresentation("Applied");
    expect(p.label).toBe("Applied");
    expect(p.dotClassName.length).toBeGreaterThan(0);
    expect(p.accentClassName.length).toBeGreaterThan(0);
  });
});

describe("formatShortDate", () => {
  it("returns null for null", () => expect(formatShortDate(null)).toBeNull());
  it("returns a string for a date", () => expect(typeof formatShortDate("2026-06-30T00:00:00Z")).toBe("string"));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --prefix frontend run test -- jobPresentation`
Expected: FAIL — cannot resolve `./jobPresentation`.

> The `formatShortDate`/`formatMoneyRange` outputs are locale-dependent (`toLocaleString`/`toLocaleDateString`); the tests assert substrings/types, not exact strings, so they pass regardless of the runner's locale.

- [ ] **Step 3: Implement the helpers**

`frontend/src/features/jobs/jobPresentation.ts`:

```ts
import { formatDistance } from "date-fns";
import type { JobDto, JobStatus, Priority } from "@/lib/api/model";

export function isOverdue(value?: string | null, now: Date = new Date()): boolean {
  if (!value) return false;
  return new Date(value).getTime() < now.getTime();
}

export function formatRelativeDate(value?: string | null, now: Date = new Date()): string | null {
  if (!value) return null;
  return formatDistance(new Date(value), now, { addSuffix: true });
}

export function formatShortDate(value?: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString();
}

export function formatMoneyRange(
  min?: number | string | null,
  max?: number | string | null,
  currency?: string | null,
  period?: string | null,
): string | null {
  if (min == null) return null;
  const cur = currency ?? "";
  const lo = Number(min).toLocaleString();
  const hi = max != null ? `–${Number(max).toLocaleString()}` : "+";
  const per = period ? ` / ${period}` : "";
  return `${cur} ${lo}${hi}${per}`.trim();
}

export function formatLocation(
  job: Pick<JobDto, "city" | "country" | "locationText">,
): string | null {
  const parts = [job.city, job.country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return job.locationText ?? null;
}

export function getPriorityPresentation(priority: Priority): { label: string; show: boolean } {
  return { label: priority, show: priority === "High" };
}

const STATUS_DOT: Record<JobStatus, string> = {
  Discovered: "bg-slate-400",
  Interested: "bg-blue-400",
  Applied: "bg-indigo-400",
  Interviewing: "bg-violet-400",
  Offered: "bg-green-500",
  Rejected: "bg-red-400",
  Ghosted: "bg-orange-400",
  Withdrawn: "bg-yellow-500",
  Archived: "bg-gray-400",
};

const STATUS_ACCENT: Record<JobStatus, string> = {
  Discovered: "border-t-slate-300",
  Interested: "border-t-blue-300",
  Applied: "border-t-indigo-300",
  Interviewing: "border-t-violet-300",
  Offered: "border-t-green-400",
  Rejected: "border-t-red-300",
  Ghosted: "border-t-orange-300",
  Withdrawn: "border-t-yellow-300",
  Archived: "border-t-gray-300",
};

// Tolerant of non-status labels (country/company grouping passes arbitrary strings):
// falls back to neutral classes instead of `undefined`.
export function getStatusPresentation(status: JobStatus): { label: string; dotClassName: string; accentClassName: string } {
  return {
    label: status,
    dotClassName: STATUS_DOT[status] ?? "bg-slate-400",
    accentClassName: STATUS_ACCENT[status] ?? "border-t-slate-300",
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --prefix frontend run test -- jobPresentation`
Expected: PASS — all assertions green.

- [ ] **Step 5: Verify gate**

Run: `npm --prefix frontend run typecheck && npm --prefix frontend run lint`
Expected: pass.

---

## Task 3: `JobStatusDropdown` chip variant

**Files:**
- Modify: `frontend/src/features/jobs/JobStatusDropdown.tsx`
- Test: `frontend/src/features/jobs/JobStatusDropdown.test.tsx`

**Interfaces:**
- Consumes: `getStatusPresentation` (Task 2).
- Produces: `JobStatusDropdown` now accepts `variant?: "default" | "chip"` (default `"default"`). Mutation logic unchanged/single-sourced via `useJobMutations`.

- [ ] **Step 1: Write the failing test**

`frontend/src/features/jobs/JobStatusDropdown.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { JobStatusDropdown } from "./JobStatusDropdown";

describe("JobStatusDropdown", () => {
  it("renders the current status label in chip variant", () => {
    renderWithProviders(<JobStatusDropdown jobId={1} currentStatus="Applied" variant="chip" />);
    expect(screen.getByText("Applied")).toBeInTheDocument();
  });

  it("renders a combobox trigger", () => {
    renderWithProviders(<JobStatusDropdown jobId={1} currentStatus="Applied" />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- JobStatusDropdown`
Expected: FAIL — `variant` not accepted / chip label not rendered.

- [ ] **Step 3: Implement the variant**

Replace `frontend/src/features/jobs/JobStatusDropdown.tsx`:

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useJobMutations } from './useJobMutations';
import { getStatusPresentation } from './jobPresentation';
import { cn } from '@/lib/utils';
import type { JobStatus } from '@/lib/api/model';

const ALL_STATUSES: JobStatus[] = [
  'Discovered', 'Interested', 'Applied', 'Interviewing', 'Offered',
  'Rejected', 'Ghosted', 'Withdrawn', 'Archived',
];

interface Props {
  jobId: number;
  currentStatus: JobStatus;
  variant?: 'default' | 'chip';
}

export function JobStatusDropdown({ jobId, currentStatus, variant = 'default' }: Props) {
  const { transition } = useJobMutations();

  const handleChange = (value: string) => {
    const toStatus = value as JobStatus;
    if (toStatus === currentStatus) return;
    transition.mutate({ id: jobId, data: { toStatus, notes: null } });
  };

  const current = getStatusPresentation(currentStatus);

  return (
    <Select value={currentStatus} onValueChange={handleChange}>
      <SelectTrigger
        size="sm"
        className={cn(
          'text-xs transition-colors motion-reduce:transition-none',
          variant === 'chip'
            ? 'h-6 w-fit gap-1 border-transparent bg-transparent px-1.5 text-muted-foreground hover:bg-muted'
            : 'w-40',
        )}
      >
        {variant === 'chip' ? (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className={cn('size-2 rounded-full', current.dotClassName)} />
            {current.label}
          </span>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent>
        {ALL_STATUSES.map(s => {
          const p = getStatusPresentation(s);
          return (
            <SelectItem key={s} value={s}>
              <span className="flex items-center gap-2">
                <span aria-hidden className={cn('size-2 rounded-full', p.dotClassName)} />
                {s}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend run test -- JobStatusDropdown`
Expected: PASS.

- [ ] **Step 5: Verify gate**

Run: `npm --prefix frontend run typecheck && npm --prefix frontend run lint`
Expected: pass.

---

## Task 4: `JobCard` redesign + `JobCardPreview`

**Files:**
- Modify: `frontend/src/features/jobs/JobCard.tsx`
- Create: `frontend/src/features/jobs/JobCardPreview.tsx`
- Test: `frontend/src/features/jobs/JobCard.test.tsx`
- Test: `frontend/src/features/jobs/JobCardPreview.test.tsx`

**Interfaces:**
- Consumes: `isOverdue`, `formatRelativeDate`, `formatLocation`, `getPriorityPresentation`, `getStatusPresentation` (Task 2); `JobStatusDropdown` `variant="chip"` (Task 3).
- Produces: `JobCard` props unchanged (`{ job, onClick, isDragging? }`). Card is `role="button"`, Enter/Space opens.
- Produces: `JobCardPreview({ job: JobDto })` — a **visual-only** card: no `useDraggable` hook, no interactive `Link`, no status dropdown (static dot + label, JOB id as plain text). Used by the drag overlay in Task 6. (A separate component because `useDraggable` is a hook and cannot be conditionally skipped inside `JobCard`; the small layout overlap with `JobCard` is the accepted cost of that constraint.)

- [ ] **Step 1: Write the failing tests**

`frontend/src/features/jobs/JobCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { JobCard } from "./JobCard";
import type { JobDto } from "@/lib/api/model";

const baseJob: JobDto = {
  id: 12, companyId: 1, companyName: "Northwind Synthetics", title: "Senior Backend Engineer",
  status: "Applied", priority: "Medium", source: "CompanySite", sourceUrl: "https://example.test/job/12",
  country: "Norway", city: "Oslo", locationText: null, remoteMode: "Hybrid", employmentType: "FullTime",
  salaryMin: 800000, salaryMax: 950000, salaryCurrency: "NOK", salaryPeriod: "Year",
  deadlineAtUtc: null, appliedAtUtc: null, lastContactedAtUtc: null, nextActionAtUtc: null,
  fitScore: 8, notes: null, createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z",
};

describe("JobCard", () => {
  it("shows company and title", () => {
    renderWithProviders(<JobCard job={baseJob} onClick={() => {}} />);
    expect(screen.getByText("Northwind Synthetics")).toBeInTheDocument();
    expect(screen.getByText("Senior Backend Engineer")).toBeInTheDocument();
  });

  it("does NOT show salary on the card", () => {
    renderWithProviders(<JobCard job={baseJob} onClick={() => {}} />);
    expect(screen.queryByText(/800,?000/)).not.toBeInTheDocument();
  });

  it("links JOB-{id} to the detail page", () => {
    renderWithProviders(<JobCard job={baseJob} onClick={() => {}} />);
    expect(screen.getByRole("link", { name: /JOB-12/ })).toHaveAttribute("href", "/jobs/12");
  });

  it("is a keyboard-operable button that opens on Enter", () => {
    const onClick = vi.fn();
    renderWithProviders(<JobCard job={baseJob} onClick={onClick} />);
    const card = screen.getByRole("button", { name: /Northwind Synthetics/ });
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("flags an overdue next action with an alert", () => {
    renderWithProviders(
      <JobCard job={{ ...baseJob, nextActionAtUtc: "2000-01-01T00:00:00Z" }} onClick={() => {}} />,
    );
    expect(screen.getByText(/Next/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --prefix frontend run test -- JobCard`
Expected: FAIL — current card shows salary, has no `role="button"`, no keyboard handler.

- [ ] **Step 3: Implement the new card**

Replace `frontend/src/features/jobs/JobCard.tsx`:

```tsx
import type { KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { MapPin, CalendarClock, TriangleAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { JobStatusDropdown } from './JobStatusDropdown';
import { isOverdue, formatRelativeDate, formatLocation, getPriorityPresentation } from './jobPresentation';
import type { JobDto } from '@/lib/api/model';
import { cn } from '@/lib/utils';

interface Props {
  job: JobDto;
  onClick: () => void;
  isDragging?: boolean;
}

export function JobCard({ job, onClick, isDragging }: Props) {
  const overdue = isOverdue(job.nextActionAtUtc);
  const nextRelative = formatRelativeDate(job.nextActionAtUtc);
  const location = formatLocation(job);
  const priority = getPriorityPresentation(job.priority);
  const showMeta = Boolean(location) || job.remoteMode !== 'OnSite';

  const {
    attributes, listeners, setNodeRef, transform, isDragging: isBeingDragged,
  } = useDraggable({ id: job.id });

  const style = { transform: transform ? CSS.Translate.toString(transform) : undefined };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={`${job.companyName} — ${job.title}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative cursor-pointer select-none rounded-lg py-0 shadow-sm transition-[box-shadow,background-color] duration-150 ease-out motion-reduce:transition-none',
        'hover:bg-muted/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        (isDragging || isBeingDragged) && 'opacity-40',
      )}
    >
      {priority.show && (
        <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-destructive" />
      )}
      <CardContent className="space-y-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">{job.companyName}</p>
          {priority.show && (
            <span className="shrink-0 text-[10px] font-medium text-destructive">{priority.label}</span>
          )}
        </div>

        <p className="line-clamp-2 text-sm font-medium leading-snug">{job.title}</p>

        {showMeta && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin aria-hidden className="size-3 shrink-0" />
            {location && <span className="truncate">{location}</span>}
            {location && job.remoteMode !== 'OnSite' && <span aria-hidden>·</span>}
            {job.remoteMode !== 'OnSite' && <span>{job.remoteMode}</span>}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          {nextRelative ? (
            <span className={cn('flex items-center gap-1 text-[11px]', overdue ? 'text-destructive' : 'text-muted-foreground')}>
              {overdue
                ? <TriangleAlert aria-hidden className="size-3 shrink-0" />
                : <CalendarClock aria-hidden className="size-3 shrink-0" />}
              Next {nextRelative}
            </span>
          ) : (
            <span />
          )}
          <Link
            to={`/jobs/${job.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            className="shrink-0 font-mono text-[10px] text-muted-foreground hover:text-foreground hover:underline"
          >
            JOB-{job.id}
          </Link>
        </div>

        <div onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
          <JobStatusDropdown jobId={job.id as number} currentStatus={job.status} variant="chip" />
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --prefix frontend run test -- JobCard`
Expected: PASS.

- [ ] **Step 5: Write the failing `JobCardPreview` test**

`frontend/src/features/jobs/JobCardPreview.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobCardPreview } from "./JobCardPreview";
import type { JobDto } from "@/lib/api/model";

const baseJob: JobDto = {
  id: 12, companyId: 1, companyName: "Northwind Synthetics", title: "Senior Backend Engineer",
  status: "Applied", priority: "High", source: "CompanySite", sourceUrl: null,
  country: "Norway", city: "Oslo", locationText: null, remoteMode: "Hybrid", employmentType: "FullTime",
  salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: "Year",
  deadlineAtUtc: null, appliedAtUtc: null, lastContactedAtUtc: null, nextActionAtUtc: null,
  fitScore: null, notes: null, createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z",
};

describe("JobCardPreview", () => {
  it("renders company, title, and a static JOB id — no link, no interactive control", () => {
    render(<JobCardPreview job={baseJob} />);
    expect(screen.getByText("Senior Backend Engineer")).toBeInTheDocument();
    expect(screen.getByText("JOB-12")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the preview test to verify it fails**

Run: `npm --prefix frontend run test -- JobCardPreview`
Expected: FAIL — module missing.

- [ ] **Step 7: Implement `JobCardPreview` (visual-only)**

`frontend/src/features/jobs/JobCardPreview.tsx`:

```tsx
import { MapPin, CalendarClock, TriangleAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { isOverdue, formatRelativeDate, formatLocation, getPriorityPresentation, getStatusPresentation } from './jobPresentation';
import type { JobDto } from '@/lib/api/model';
import { cn } from '@/lib/utils';

export function JobCardPreview({ job }: { job: JobDto }) {
  const overdue = isOverdue(job.nextActionAtUtc);
  const nextRelative = formatRelativeDate(job.nextActionAtUtc);
  const location = formatLocation(job);
  const priority = getPriorityPresentation(job.priority);
  const status = getStatusPresentation(job.status);
  const showMeta = Boolean(location) || job.remoteMode !== 'OnSite';

  return (
    <Card className="relative select-none rounded-lg py-0 shadow-sm">
      {priority.show && (
        <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-destructive" />
      )}
      <CardContent className="space-y-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">{job.companyName}</p>
          {priority.show && <span className="shrink-0 text-[10px] font-medium text-destructive">{priority.label}</span>}
        </div>
        <p className="line-clamp-2 text-sm font-medium leading-snug">{job.title}</p>
        {showMeta && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin aria-hidden className="size-3 shrink-0" />
            {location && <span className="truncate">{location}</span>}
            {location && job.remoteMode !== 'OnSite' && <span aria-hidden>·</span>}
            {job.remoteMode !== 'OnSite' && <span>{job.remoteMode}</span>}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          {nextRelative ? (
            <span className={cn('flex items-center gap-1 text-[11px]', overdue ? 'text-destructive' : 'text-muted-foreground')}>
              {overdue
                ? <TriangleAlert aria-hidden className="size-3 shrink-0" />
                : <CalendarClock aria-hidden className="size-3 shrink-0" />}
              Next {nextRelative}
            </span>
          ) : (
            <span />
          )}
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">JOB-{job.id}</span>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden className={cn('size-2 rounded-full', status.dotClassName)} />
          {status.label}
        </span>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 8: Run the preview test to verify it passes**

Run: `npm --prefix frontend run test -- JobCardPreview`
Expected: PASS.

- [ ] **Step 9: Verify gate + manual**

Run: `npm --prefix frontend run typecheck && npm --prefix frontend run lint`
Manual: `npm --prefix frontend run dev`, open Jobs board — confirm card reads company → title → location → next action → chip; no salary; High cards show a left accent bar; Tab to a card and press Enter to open.

---

## Task 5: `BoardColumn` polish

**Files:**
- Modify: `frontend/src/features/jobs/BoardColumn.tsx`
- Test: `frontend/src/features/jobs/BoardColumn.test.tsx`

**Interfaces:**
- Consumes: `getStatusPresentation().accentClassName` (Task 2 — replaces the old local `COLUMN_ACCENT` map); `JobCard` (Task 4).
- Produces: `BoardColumn` gains `isDragActive?: boolean` prop (true while a board drag is in progress). Existing props unchanged: `{ label, jobs, onJobClick }`.

- [ ] **Step 1: Write the failing tests**

`frontend/src/features/jobs/BoardColumn.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { BoardColumn } from "./BoardColumn";

describe("BoardColumn", () => {
  it("renders label and a count", () => {
    renderWithProviders(<BoardColumn label="Applied" jobs={[]} onJobClick={() => {}} />);
    expect(screen.getByText("Applied")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("shows a calm empty message when not dragging", () => {
    renderWithProviders(<BoardColumn label="Applied" jobs={[]} onJobClick={() => {}} />);
    expect(screen.getByText(/No jobs/i)).toBeInTheDocument();
    expect(screen.queryByText(/Drop here/i)).not.toBeInTheDocument();
  });

  it("shows the drop target only while dragging", () => {
    renderWithProviders(<BoardColumn label="Applied" jobs={[]} onJobClick={() => {}} isDragActive />);
    expect(screen.getByText(/Drop here/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --prefix frontend run test -- BoardColumn`
Expected: FAIL — current column always shows "Drop here", no calm empty message, no count pill markup.

- [ ] **Step 3: Implement the column**

Replace `frontend/src/features/jobs/BoardColumn.tsx`:

```tsx
import type { JobDto, JobStatus } from '@/lib/api/model';
import { JobCard } from './JobCard';
import { useDroppable } from '@dnd-kit/core';
import { getStatusPresentation } from './jobPresentation';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  jobs: JobDto[];
  onJobClick: (id: number) => void;
  isDragActive?: boolean;
}

export function BoardColumn({ label, jobs, onJobClick, isDragActive }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: label });
  // Single source of column accent (status grouping); tolerant of non-status labels (country/company).
  const accentClassName = getStatusPresentation(label as JobStatus).accentClassName;

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className={cn(
        'sticky top-0 z-10 flex items-center justify-between rounded-t-md border-t-2 bg-muted/60 px-2.5 py-1.5 backdrop-blur',
        accentClassName,
      )}>
        <span className="text-sm font-medium">{label}</span>
        <span className="rounded-full bg-muted-foreground/10 px-1.5 text-[11px] tabular-nums text-muted-foreground">
          {jobs.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2 overflow-y-auto rounded-b-md bg-muted/20 p-2 transition-colors duration-150 motion-reduce:transition-none',
          isOver && 'bg-muted/50 ring-1 ring-ring/40',
        )}
      >
        {jobs.length === 0 && (
          isDragActive ? (
            <div className="rounded-md border-2 border-dashed border-ring/40 py-6 text-center text-xs text-muted-foreground">
              Drop here
            </div>
          ) : (
            <p className="px-1 py-4 text-center text-xs text-muted-foreground/70">No jobs in {label}.</p>
          )
        )}
        {jobs.map(job => (
          <JobCard key={job.id as number} job={job} onClick={() => onJobClick(job.id as number)} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --prefix frontend run test -- BoardColumn`
Expected: PASS.

- [ ] **Step 5: Verify gate**

Run: `npm --prefix frontend run typecheck && npm --prefix frontend run lint`
Expected: pass. (Visual sticky-header check happens in Task 6 once the board owns height.)

---

## Task 6: `JobsBoard` + `JobsPage` full-height shell & drag polish

**Files:**
- Modify: `frontend/src/features/jobs/JobsBoard.tsx`
- Modify: `frontend/src/pages/JobsPage.tsx`
- Modify (only if required): `frontend/src/components/AppLayout.tsx`
- Test: `frontend/src/features/jobs/JobsBoard.test.tsx`

**Interfaces:**
- Consumes: `BoardColumn` `isDragActive` (Task 5); `JobCardPreview` (Task 4) for the overlay.
- Produces: board fills available height; columns row owns horizontal scroll; drag overlay renders the visual-only `JobCardPreview` (no nested `useDraggable`), elevated and `pointer-events-none`; `isDragActive` is threaded to columns.

- [ ] **Step 1: Write the failing test**

`frontend/src/features/jobs/JobsBoard.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { JobsBoard } from "./JobsBoard";
import type { JobDto } from "@/lib/api/model";

const job = (id: number, status: JobDto["status"]): JobDto => ({
  id, companyId: 1, companyName: "Northwind Synthetics", title: `Role ${id}`,
  status, priority: "Medium", source: "CompanySite", sourceUrl: null,
  country: "Norway", city: null, locationText: null, remoteMode: "Remote", employmentType: "FullTime",
  salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: "Year",
  deadlineAtUtc: null, appliedAtUtc: null, lastContactedAtUtc: null, nextActionAtUtc: null,
  fitScore: null, notes: null, createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z",
});

describe("JobsBoard", () => {
  it("renders active status columns with their cards", () => {
    renderWithProviders(
      <JobsBoard jobs={[job(1, "Applied")]} groupBy="status" listParams={{}} onJobClick={() => {}} />,
    );
    expect(screen.getByText("Applied")).toBeInTheDocument();
    expect(screen.getByText("Role 1")).toBeInTheDocument();
  });

  it("shows an empty board message when there are no jobs", () => {
    renderWithProviders(<JobsBoard jobs={[]} groupBy="status" listParams={{}} onJobClick={() => {}} />);
    expect(screen.getByText(/No jobs found/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- JobsBoard`
Expected: FAIL — module behavior differs / `isDragActive` wiring absent (test still compiles against current export; if it passes by luck, proceed — the implementation step adds the drag-state wiring and height classes the manual check requires).

- [ ] **Step 3: Implement the board**

Replace `frontend/src/features/jobs/JobsBoard.tsx`:

```tsx
import { useState } from 'react';
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { BoardColumn } from './BoardColumn';
import { JobCardPreview } from './JobCardPreview';
import { useJobMutations } from './useJobMutations';
import { getListJobsQueryKey } from '@/lib/api/jobs/jobs';
import type { JobDto, JobStatus, ListJobsParams } from '@/lib/api/model';

export type GroupBy = 'status' | 'country' | 'company';

const ACTIVE_STATUSES: JobStatus[] = ['Discovered', 'Interested', 'Applied', 'Interviewing', 'Offered'];
const CLOSED_STATUSES: JobStatus[] = ['Rejected', 'Ghosted', 'Withdrawn', 'Archived'];

interface Props {
  jobs: JobDto[];
  groupBy: GroupBy;
  listParams: ListJobsParams;
  onJobClick: (id: number) => void;
}

function groupJobs(jobs: JobDto[], groupBy: GroupBy): { key: string; label: string; jobs: JobDto[] }[] {
  if (groupBy === 'country') {
    const keys = [...new Set(jobs.map(j => j.country ?? 'Unknown'))].sort();
    return keys.map(k => ({ key: k, label: k, jobs: jobs.filter(j => (j.country ?? 'Unknown') === k) }));
  }
  if (groupBy === 'company') {
    const keys = [...new Set(jobs.map(j => j.companyName))].sort();
    return keys.map(k => ({ key: k, label: k, jobs: jobs.filter(j => j.companyName === k) }));
  }
  return [...ACTIVE_STATUSES, ...CLOSED_STATUSES].map(s => ({
    key: s, label: s, jobs: jobs.filter(j => j.status === s),
  }));
}

export function JobsBoard({ jobs, groupBy, listParams, onJobClick }: Props) {
  const [showClosed, setShowClosed] = useState(false);
  const [activeJob, setActiveJob] = useState<JobDto | null>(null);
  const qc = useQueryClient();
  const { transition } = useJobMutations();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <p className="text-sm">No jobs found.</p>
        <p className="text-xs">Add a job to get started.</p>
      </div>
    );
  }

  const allGroups = groupJobs(jobs, groupBy);
  const visibleGroups = groupBy === 'status' && !showClosed
    ? allGroups.filter(g => ACTIVE_STATUSES.includes(g.key as JobStatus))
    : allGroups;

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveJob(jobs.find(j => j.id === active.id) ?? null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveJob(null);
    if (groupBy !== 'status' || !over) return;

    const job = jobs.find(j => j.id === active.id);
    const toStatus = over.id as JobStatus;
    if (!job || job.status === toStatus) return;

    const key = getListJobsQueryKey(listParams);
    const prevData = qc.getQueryData(key);
    qc.setQueryData(key, (old: { data?: JobDto[] } | undefined) =>
      old ? { ...old, data: old.data?.map(j => j.id === job.id ? { ...j, status: toStatus } : j) } : old,
    );

    transition.mutate(
      { id: job.id as number, data: { toStatus, notes: null } },
      { onError: () => qc.setQueryData(key, prevData) },
    );
  };

  const isDragActive = activeJob !== null;

  const columns = (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {groupBy === 'status' && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setShowClosed(v => !v)} className="text-xs">
            {showClosed ? 'Hide closed' : 'Show closed'}
          </Button>
        </div>
      )}
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
        {visibleGroups.map(group => (
          <BoardColumn
            key={group.key}
            label={group.label}
            jobs={group.jobs}
            onJobClick={onJobClick}
            isDragActive={isDragActive}
          />
        ))}
      </div>
    </div>
  );

  return groupBy === 'status' ? (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {columns}
      <DragOverlay>
        {activeJob && (
          <div className="pointer-events-none rotate-[0.5deg] scale-[1.01] rounded-lg shadow-xl ring-1 ring-ring/40 transform-gpu">
            <JobCardPreview job={activeJob} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  ) : columns;
}
```

> If the `rotate-[0.5deg]` reads gimmicky in the manual check, delete that one class (spec §12.3 / motion policy). Everything else stays.

- [ ] **Step 4: Make `JobsPage` a full-height shell**

Replace `frontend/src/pages/JobsPage.tsx`:

```tsx
import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useJobs } from '@/lib/api/jobs/hooks';
import { JobsBoard } from '@/features/jobs/JobsBoard';
import { JobsTable } from '@/features/jobs/JobsTable';
import { JobFilterBar } from '@/features/jobs/JobFilterBar';
import { DEFAULT_FILTERS, type JobFilters } from '@/features/jobs/jobFilters';
import { JobQuickAdd } from '@/features/jobs/JobQuickAdd';
import { JobDetailDrawer } from '@/features/jobs/JobDetailDrawer';
import type { JobDto, ListJobsParams } from '@/lib/api/model';

export default function JobsPage() {
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const params: ListJobsParams = {
    ...(filters.status ? { Statuses: [filters.status] } : {}),
    ...(filters.countries.length > 0 ? { Countries: filters.countries } : {}),
    ...(filters.companySearch ? { CompanySearch: filters.companySearch } : {}),
  };

  const { data: jobsData, isLoading, isError } = useJobs(params);

  const filtered = useMemo(() => {
    const jobs: JobDto[] = jobsData ?? [];
    if (!filters.search) return jobs;
    const s = filters.search.toLowerCase();
    return jobs.filter(j =>
      j.title.toLowerCase().includes(s) ||
      j.companyName.toLowerCase().includes(s) ||
      j.sourceUrl?.toLowerCase().includes(s) ||
      j.notes?.toLowerCase().includes(s),
    );
  }, [jobsData, filters.search]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Jobs</h1>
        <div className="flex flex-wrap items-center gap-3">
          <JobFilterBar filters={filters} onChange={setFilters} />
          <JobQuickAdd />
        </div>
      </div>

      <Tabs defaultValue="board" className="flex min-h-0 flex-1 flex-col">
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>
        <TabsContent value="board" className="min-h-0 flex-1">
          {isError ? (
            <div className="py-8 text-center text-sm text-destructive">Failed to load jobs. Check your connection.</div>
          ) : isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <JobsBoard jobs={filtered} groupBy={filters.groupBy} listParams={params} onJobClick={setSelectedJobId} />
          )}
        </TabsContent>
        <TabsContent value="table" className="min-h-0 flex-1 overflow-y-auto">
          <JobsTable jobs={filtered} onJobClick={setSelectedJobId} />
        </TabsContent>
      </Tabs>

      <JobDetailDrawer jobId={selectedJobId} onClose={() => setSelectedJobId(null)} />
    </div>
  );
}
```

- [ ] **Step 5: Run the board test**

Run: `npm --prefix frontend run test -- JobsBoard`
Expected: PASS.

- [ ] **Step 6: Manual height check; adjust `AppLayout` only if needed**

Run: `npm --prefix frontend run dev`. Open Jobs. The board's columns should fill the viewport height and scroll **horizontally** as a row, with each column scrolling **vertically** and its header staying stuck.

`AppLayout` currently wraps the outlet in `<div className="min-h-0 flex-1 overflow-y-auto p-6">`. The Jobs page's `h-full` resolves against that. If the board does NOT fill height (because the wrapper is height-auto under `overflow-y-auto`):
- Make the **smallest** change: in `frontend/src/components/AppLayout.tsx`, allow the page to own height for routes that need it. Simplest non-breaking edit — add `min-h-0` is already present; if still broken, change the wrapper to `className="flex min-h-0 flex-1 flex-col overflow-hidden p-6"` and let each page decide its own scroll.
- **Then verify Dashboard, Tasks, Companies, and Settings still scroll normally** (`npm run dev`, visit each route, confirm long content scrolls). If any regress, revert the `AppLayout` change and instead constrain only the Jobs board height locally (e.g. wrap the board in a `min-h-0 flex-1` container without touching the shared layout).

- [ ] **Step 7: Verify gate + Phase 1 visual report**

Run: `npm --prefix frontend run test && npm --prefix frontend run typecheck && npm --prefix frontend run lint && npm --prefix frontend run build`
Expected: all pass.
Produce the Phase 1 visual report: screenshot of the board, what changed (card/column/board/drag), what was validated, what still feels rough.

---

## Task 7: `CollapsibleSection` primitive

**Files:**
- Create: `frontend/src/features/jobs/drawer/CollapsibleSection.tsx`
- Test: `frontend/src/features/jobs/drawer/CollapsibleSection.test.tsx`

**Interfaces:**
- Produces: `CollapsibleSection({ title, count?, defaultOpen?, children })` — button trigger toggles `aria-expanded`; content shown/hidden; chevron rotates.

> First check: `ls frontend/src/components/ui/collapsible.tsx`. If it exists, use that shadcn primitive instead and skip the local component (adapt the test to it). As of this plan it does not exist.

> **Animation decision (simple option):** chevron rotation (`transition-transform`) + **mount/unmount** of the panel (`{open && …}`). **No** height/grid-rows animation — the spec motion table is updated to match. Rationale: a height transition needs measuring or a `grid-rows-[0fr]→[1fr]` wrapper and adds complexity for a low-value flourish; mount/unmount is correct, accessible, and KISS.

- [ ] **Step 1: Write the failing test**

`frontend/src/features/jobs/drawer/CollapsibleSection.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CollapsibleSection } from "./CollapsibleSection";

describe("CollapsibleSection", () => {
  it("is collapsed by default and toggles open", () => {
    render(
      <CollapsibleSection title="Attachments" count={2}>
        <p>panel body</p>
      </CollapsibleSection>,
    );
    const trigger = screen.getByRole("button", { name: /Attachments/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("panel body")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("panel body")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- CollapsibleSection`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the component**

`frontend/src/features/jobs/drawer/CollapsibleSection.tsx`:

```tsx
import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({ title, count, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border-t pt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none"
      >
        <ChevronDown
          aria-hidden
          className={cn('size-4 transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')}
        />
        <span>{title}</span>
        {typeof count === 'number' && (
          <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums">{count}</span>
        )}
      </button>
      {open && <div className="pt-2">{children}</div>}
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend run test -- CollapsibleSection`
Expected: PASS.

- [ ] **Step 5: Verify gate**

Run: `npm --prefix frontend run typecheck && npm --prefix frontend run lint`
Expected: pass.

---

## Task 8: `MetadataSection` component

**Files:**
- Create: `frontend/src/features/jobs/drawer/MetadataSection.tsx`
- Test: `frontend/src/features/jobs/drawer/MetadataSection.test.tsx`

**Interfaces:**
- Produces: `MetadataSection({ title, rows })` where `rows: Array<[label: string, value: ReactNode | null | undefined]>`. Renders only rows with a non-null/non-empty value; renders nothing (returns `null`) when no rows survive.

- [ ] **Step 1: Write the failing tests**

`frontend/src/features/jobs/drawer/MetadataSection.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetadataSection } from "./MetadataSection";

describe("MetadataSection", () => {
  it("renders only non-empty rows", () => {
    render(<MetadataSection title="Location" rows={[["Country", "Norway"], ["City", null]]} />);
    expect(screen.getByText("Country")).toBeInTheDocument();
    expect(screen.getByText("Norway")).toBeInTheDocument();
    expect(screen.queryByText("City")).not.toBeInTheDocument();
  });

  it("renders nothing when all rows are empty", () => {
    const { container } = render(<MetadataSection title="Location" rows={[["City", null], ["Country", ""]]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --prefix frontend run test -- MetadataSection`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the component**

`frontend/src/features/jobs/drawer/MetadataSection.tsx`:

```tsx
import type { ReactNode } from 'react';

type Row = [label: string, value: ReactNode | null | undefined];

interface Props {
  title: string;
  rows: Row[];
}

function isEmpty(value: ReactNode | null | undefined): boolean {
  return value == null || value === '';
}

export function MetadataSection({ title, rows }: Props) {
  const visible = rows.filter(([, value]) => !isEmpty(value));
  if (visible.length === 0) return null;

  return (
    <section className="space-y-1.5">
      <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
      <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-sm">
        {visible.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --prefix frontend run test -- MetadataSection`
Expected: PASS.

- [ ] **Step 5: Verify gate**

Run: `npm --prefix frontend run typecheck && npm --prefix frontend run lint`
Expected: pass.

---

## Task 9: `JobDetailDrawer` header, width, sticky scroll, skeleton

**Files:**
- Modify: `frontend/src/features/jobs/JobDetailDrawer.tsx`
- Test: `frontend/src/features/jobs/JobDetailDrawer.test.tsx`

**Interfaces:**
- Consumes: `JobStatusDropdown` default variant (Task 3); `formatRelativeDate`, `isOverdue` (Task 2); `JobDetailContent` (restructured to 3 tabs in Task 11). Props unchanged: `{ jobId, onClose }`.
- Produces: a sticky header (`shrink-0`) carrying JOB id + source/open links + title + company + status + summary row; a `flex-1 overflow-y-auto` body. Width `w-[min(860px,calc(100vw-2rem))]`.

> The drawer fetches via `useJob`. The component test mocks that hook so no network/provider is needed for the header assertions.

- [ ] **Step 1: Write the failing test**

`frontend/src/features/jobs/JobDetailDrawer.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";

// Inline the detail object INSIDE the factory. `vi.mock` is hoisted above all
// imports/consts, so referencing an outer `const detail` would throw
// "Cannot access 'detail' before initialization".
vi.mock("@/lib/api/jobs/hooks", () => ({
  useJob: () => ({
    data: {
      id: 12, companyId: 1, companyName: "Northwind Synthetics", title: "Senior Backend Engineer",
      status: "Applied", priority: "High", source: "CompanySite", sourceUrl: "https://example.test/job/12",
      jobDescription: "Build calm systems.", country: "Norway", city: "Oslo", locationText: null,
      remoteMode: "Hybrid", employmentType: "FullTime",
      salaryMin: 800000, salaryMax: 950000, salaryCurrency: "NOK", salaryPeriod: "Year",
      deadlineAtUtc: null, appliedAtUtc: null, lastContactedAtUtc: null, nextActionAtUtc: null,
      fitScore: 8, resumeLabel: null, resumeAngle: null, coverLetterNotes: null,
      offerSalary: null, offerCurrency: null, offerDeadlineAtUtc: null, offerNotes: null, rejectionReason: null,
      notes: null, createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z",
      activities: [], properties: [], attachments: [], followUps: [],
    },
    isLoading: false,
  }),
}));

import { JobDetailDrawer } from "./JobDetailDrawer";

describe("JobDetailDrawer", () => {
  it("renders the work-item header identity", () => {
    renderWithProviders(<JobDetailDrawer jobId={12} onClose={() => {}} />);
    expect(screen.getByText("Senior Backend Engineer")).toBeInTheDocument();
    expect(screen.getByText("Northwind Synthetics")).toBeInTheDocument();
    expect(screen.getByText(/JOB-12/)).toBeInTheDocument();
  });
});
```

> `renderWithProviders` supplies both the `QueryClientProvider` (the drawer's `JobDetailContent` children use react-query mutation hooks) and the `MemoryRouter` (the header's `Link`). `useJob` is mocked so no network fires and the loaded header renders synchronously.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- JobDetailDrawer`
Expected: FAIL — current header lacks `JOB-12`.

- [ ] **Step 3: Implement the drawer**

Replace `frontend/src/features/jobs/JobDetailDrawer.tsx`:

```tsx
import { Link } from 'react-router';
import { ExternalLink, Link2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useJob } from '@/lib/api/jobs/hooks';
import { JobStatusDropdown } from './JobStatusDropdown';
import { JobDetailContent } from './JobDetailContent';
import { isOverdue, formatRelativeDate } from './jobPresentation';
import { cn } from '@/lib/utils';

interface Props {
  jobId: number | null;
  onClose: () => void;
}

export function JobDetailDrawer({ jobId, onClose }: Props) {
  const { data: job, isLoading } = useJob(jobId);

  return (
    <Sheet open={jobId !== null} onOpenChange={open => !open && onClose()}>
      <SheetContent
        className="flex w-[min(860px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(860px,calc(100vw-2rem))]"
      >
        {isLoading || !job ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-40" />
            <div className="grid grid-cols-2 gap-3 pt-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          </div>
        ) : (
          <>
            <SheetHeader className="shrink-0 gap-1.5 border-b p-5 pr-12">
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <Link
                  to={`/jobs/${job.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono hover:text-foreground hover:underline"
                >
                  JOB-{job.id}<ExternalLink aria-hidden className="size-3" />
                </Link>
                {job.sourceUrl && (
                  <a
                    href={job.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                  >
                    <Link2 aria-hidden className="size-3" />Source
                  </a>
                )}
              </div>

              <div className="flex items-start justify-between gap-3">
                <SheetTitle className="text-lg leading-snug">{job.title}</SheetTitle>
                <div className="shrink-0">
                  <JobStatusDropdown jobId={job.id as number} currentStatus={job.status} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{job.companyName}</p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
                {job.fitScore != null && <span>Fit {job.fitScore}/10</span>}
                {job.nextActionAtUtc && (
                  <span className={cn(isOverdue(job.nextActionAtUtc) && 'text-destructive')}>
                    Next {formatRelativeDate(job.nextActionAtUtc)}
                  </span>
                )}
                {job.deadlineAtUtc && <span>Deadline {new Date(job.deadlineAtUtc).toLocaleDateString()}</span>}
              </div>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <JobDetailContent job={job} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend run test -- JobDetailDrawer`
Expected: PASS.

- [ ] **Step 5: Verify gate**

Run: `npm --prefix frontend run typecheck && npm --prefix frontend run lint`
Expected: pass. (`JobDetailContent` still has its current 6-tab body until Task 11 — that compiles fine.)

---

## Task 10: `NextActionsBlock` (follow-ups recomposed)

**Files:**
- Create: `frontend/src/features/jobs/drawer/NextActionsBlock.tsx`
- Test: `frontend/src/features/jobs/drawer/NextActionsBlock.test.tsx`

**Interfaces:**
- Consumes: existing hooks `useCreateJobFollowUp`, `getGetJobQueryKey` (from `@/lib/api/jobs/jobs`), `useCompleteFollowUpTask`, `useSkipFollowUpTask` (from `@/lib/api/follow-up-tasks/follow-up-tasks`); existing `FollowUpForm`; `isOverdue`, `formatRelativeDate` (Task 2).
- Produces: `NextActionsBlock({ job: JobDetailDto })` — lists follow-ups with overdue/pending/completed/skipped emphasis; add form. Consumed by `OverviewTab` in Task 11. (Built before Task 11 so the Overview wiring needs no stub.)

- [ ] **Step 1: Write the failing tests**

`frontend/src/features/jobs/drawer/NextActionsBlock.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { NextActionsBlock } from "./NextActionsBlock";
import type { JobDetailDto, FollowUpTaskDto } from "@/lib/api/model";

const followUp = (over: Partial<FollowUpTaskDto>): FollowUpTaskDto => ({
  id: 1, jobId: 12, jobTitle: null, jobActivityId: null, jobActivityLabel: null,
  title: "Send thank-you note", description: null, dueAtUtc: "2000-01-01T00:00:00Z",
  status: "Pending", priority: "Medium", createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z",
  ...over,
});

const job = (followUps: FollowUpTaskDto[]): JobDetailDto => ({
  id: 12, companyId: 1, companyName: "Northwind Synthetics", title: "Senior Backend Engineer",
  status: "Applied", priority: "High", source: "CompanySite", sourceUrl: null, jobDescription: null,
  country: "Norway", city: null, locationText: null, remoteMode: "Remote", employmentType: "FullTime",
  salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: "Year",
  deadlineAtUtc: null, appliedAtUtc: null, lastContactedAtUtc: null, nextActionAtUtc: null,
  fitScore: null, resumeLabel: null, resumeAngle: null, coverLetterNotes: null,
  offerSalary: null, offerCurrency: null, offerDeadlineAtUtc: null, offerNotes: null, rejectionReason: null,
  notes: null, createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z",
  activities: [], properties: [], attachments: [], followUps,
});

describe("NextActionsBlock", () => {
  it("renders a follow-up title and flags overdue ones", () => {
    renderWithProviders(<NextActionsBlock job={job([followUp({})])} />);
    expect(screen.getByText("Send thank-you note")).toBeInTheDocument();
    expect(screen.getByText(/Overdue/i)).toBeInTheDocument();
  });

  it("shows an empty hint when there are none", () => {
    renderWithProviders(<NextActionsBlock job={job([])} />);
    expect(screen.getByText(/No follow-ups/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --prefix frontend run test -- NextActionsBlock`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the block**

`frontend/src/features/jobs/drawer/NextActionsBlock.tsx`:

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TriangleAlert } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCreateJobFollowUp, getGetJobQueryKey } from '@/lib/api/jobs/jobs';
import { useCompleteFollowUpTask, useSkipFollowUpTask } from '@/lib/api/follow-up-tasks/follow-up-tasks';
import type { JobDetailDto, FollowUpTaskDto } from '@/lib/api/model';
import { FollowUpForm } from './FollowUpForm';
import { isOverdue, formatRelativeDate } from '../jobPresentation';
import { cn } from '@/lib/utils';

interface Props { job: JobDetailDto }

function rowTone(f: FollowUpTaskDto): string {
  if (f.status !== 'Pending') return 'opacity-60';
  return isOverdue(f.dueAtUtc) ? 'text-destructive' : '';
}

export function NextActionsBlock({ job }: Props) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const jobId = job.id as number;
  const invalidate = () => qc.invalidateQueries({ queryKey: getGetJobQueryKey(jobId) });

  const add = useCreateJobFollowUp({ mutation: { onSuccess: () => { invalidate(); setAdding(false); }, onError: () => toast.error('Failed') } });
  const complete = useCompleteFollowUpTask({ mutation: { onSuccess: invalidate, onError: () => toast.error('Failed') } });
  const skip = useSkipFollowUpTask({ mutation: { onSuccess: invalidate, onError: () => toast.error('Failed') } });

  const followUps = job.followUps ?? [];

  return (
    <section className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground">Next actions</h4>

      {followUps.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground/70">No follow-ups yet.</p>
      )}

      {followUps.map(f => {
        const overdue = f.status === 'Pending' && isOverdue(f.dueAtUtc);
        return (
          <div key={f.id as number} className="flex items-start justify-between gap-2 rounded-md border p-2.5">
            <div className={cn('min-w-0', rowTone(f))}>
              <p className="truncate text-sm font-medium">{f.title}</p>
              <p className="flex items-center gap-1 text-xs">
                {overdue && <TriangleAlert aria-hidden className="size-3 shrink-0" />}
                {overdue ? `Overdue · ${formatRelativeDate(f.dueAtUtc)}` : `Due ${formatRelativeDate(f.dueAtUtc)}`}
                {f.status !== 'Pending' && ` · ${f.status}`}
              </p>
            </div>
            {f.status === 'Pending' && (
              <div className="flex shrink-0 items-center gap-1">
                <Button size="xs" variant="ghost" onClick={() => complete.mutate({ id: f.id as number })}>Done</Button>
                <Button size="xs" variant="ghost" onClick={() => skip.mutate({ id: f.id as number })}>Skip</Button>
              </div>
            )}
          </div>
        );
      })}

      {adding ? (
        <div className="rounded-md border p-3">
          <FollowUpForm
            onSave={async vals => add.mutate({ id: jobId, data: { title: vals.title, dueAtUtc: vals.dueAtUtc, priority: vals.priority, description: vals.description ?? null, jobId, jobActivityId: null } })}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>+ Add follow-up</Button>
      )}
    </section>
  );
}
```

> Confirm `Button` supports `size="xs"` — it does (see `components/ui/button.tsx`). Confirm `FollowUpForm`'s `onSave` value shape matches `{ title, dueAtUtc, priority, description? }` — it does (the original `FollowUpsTab` uses the same call).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --prefix frontend run test -- NextActionsBlock`
Expected: PASS.

- [ ] **Step 5: Verify gate**

Run: `npm --prefix frontend run typecheck && npm --prefix frontend run lint`
Expected: pass. (`NextActionsBlock` is self-contained; it is wired into Overview in Task 11.)

---

## Task 11: 3 tabs + rich `OverviewTab`

**Files:**
- Modify: `frontend/src/features/jobs/JobDetailContent.tsx`
- Modify: `frontend/src/features/jobs/drawer/OverviewTab.tsx`
- Test: `frontend/src/features/jobs/JobDetailContent.test.tsx`
- Test: `frontend/src/features/jobs/drawer/OverviewTab.test.tsx`

**Interfaces:**
- Consumes: `MetadataSection` (Task 8), `CollapsibleSection` (Task 7), `NextActionsBlock` (Task 10), `AttachmentsTab`, `PropertiesTab`, `formatMoneyRange`, `formatShortDate`, `formatLocation`.
- Produces: drawer shows exactly 3 tabs (`Overview`, `Activity`, `Timeline`). Overview composes grouped metadata + next actions + notes/description + collapsible attachments/properties.

- [ ] **Step 1: Write the failing tests**

`frontend/src/features/jobs/JobDetailContent.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { JobDetailContent } from "./JobDetailContent";
import type { JobDetailDto } from "@/lib/api/model";

const detail: JobDetailDto = {
  id: 12, companyId: 1, companyName: "Northwind Synthetics", title: "Senior Backend Engineer",
  status: "Applied", priority: "High", source: "CompanySite", sourceUrl: "https://example.test/job/12",
  jobDescription: "Build calm systems.", country: "Norway", city: "Oslo", locationText: null,
  remoteMode: "Hybrid", employmentType: "FullTime",
  salaryMin: 800000, salaryMax: 950000, salaryCurrency: "NOK", salaryPeriod: "Year",
  deadlineAtUtc: null, appliedAtUtc: null, lastContactedAtUtc: null, nextActionAtUtc: null,
  fitScore: 8, resumeLabel: null, resumeAngle: null, coverLetterNotes: null,
  offerSalary: null, offerCurrency: null, offerDeadlineAtUtc: null, offerNotes: null, rejectionReason: null,
  notes: null, createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z",
  activities: [], properties: [], attachments: [], followUps: [],
};

describe("JobDetailContent", () => {
  it("shows exactly three primary tabs", () => {
    renderWithProviders(<JobDetailContent job={detail} />);
    expect(screen.getByRole("tab", { name: /Overview/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Activity/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Timeline/ })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });
});
```

`frontend/src/features/jobs/drawer/OverviewTab.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { OverviewTab } from "./OverviewTab";
import type { JobDetailDto } from "@/lib/api/model";

const detail: JobDetailDto = {
  id: 12, companyId: 1, companyName: "Northwind Synthetics", title: "Senior Backend Engineer",
  status: "Applied", priority: "High", source: "CompanySite", sourceUrl: "https://example.test/job/12",
  jobDescription: "Build calm systems.", country: "Norway", city: "Oslo", locationText: null,
  remoteMode: "Hybrid", employmentType: "FullTime",
  salaryMin: 800000, salaryMax: 950000, salaryCurrency: "NOK", salaryPeriod: "Year",
  deadlineAtUtc: null, appliedAtUtc: null, lastContactedAtUtc: null, nextActionAtUtc: null,
  fitScore: 8, resumeLabel: null, resumeAngle: null, coverLetterNotes: null,
  offerSalary: null, offerCurrency: null, offerDeadlineAtUtc: null, offerNotes: null, rejectionReason: null,
  notes: null, createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z",
  activities: [], properties: [], attachments: [], followUps: [],
};

describe("OverviewTab", () => {
  it("renders the source URL as a link", () => {
    renderWithProviders(<OverviewTab job={detail} />);
    expect(screen.getByRole("link", { name: /example\.test/ })).toHaveAttribute("href", "https://example.test/job/12");
  });

  it("shows the full job description (no truncation)", () => {
    renderWithProviders(<OverviewTab job={detail} />);
    expect(screen.getByText("Build calm systems.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --prefix frontend run test -- JobDetailContent OverviewTab`
Expected: FAIL — current content has 6 tabs; current Overview has no source link / no description.

- [ ] **Step 3: Implement `JobDetailContent` (3 tabs)**

Replace `frontend/src/features/jobs/JobDetailContent.tsx`:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewTab } from './drawer/OverviewTab';
import { ActivitiesTab } from './drawer/ActivitiesTab';
import { TimelineTab } from './drawer/TimelineTab';
import type { JobDetailDto } from '@/lib/api/model';

interface Props { job: JobDetailDto }

export function JobDetailContent({ job }: Props) {
  return (
    <Tabs defaultValue="overview" className="gap-3 p-5 pt-3">
      <TabsList variant="line" className="w-full justify-start">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activity">Activity ({job.activities?.length ?? 0})</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
      </TabsList>
      <TabsContent value="overview"><OverviewTab job={job} /></TabsContent>
      <TabsContent value="activity"><ActivitiesTab job={job} /></TabsContent>
      <TabsContent value="timeline"><TimelineTab jobId={job.id as number} /></TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 4: Implement the rich `OverviewTab`**

Replace `frontend/src/features/jobs/drawer/OverviewTab.tsx`:

```tsx
import type { JobDetailDto } from '@/lib/api/model';
import { MetadataSection } from './MetadataSection';
import { CollapsibleSection } from './CollapsibleSection';
import { NextActionsBlock } from './NextActionsBlock';
import { AttachmentsTab } from './AttachmentsTab';
import { PropertiesTab } from './PropertiesTab';
import { formatMoneyRange, formatShortDate, formatLocation } from '../jobPresentation';

interface Props { job: JobDetailDto }

export function OverviewTab({ job }: Props) {
  const salary = formatMoneyRange(job.salaryMin, job.salaryMax, job.salaryCurrency, job.salaryPeriod);
  const location = formatLocation(job);

  return (
    <div className="space-y-4 py-2">
      <MetadataSection
        title="Role & source"
        rows={[
          ['Company', job.companyName],
          ['Source', job.source],
          ['Source URL', job.sourceUrl
            ? <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2 break-all">{job.sourceUrl}</a>
            : null],
          ['Employment', job.employmentType],
        ]}
      />

      <MetadataSection
        title="Location"
        rows={[['Location', location], ['Remote', job.remoteMode]]}
      />

      <MetadataSection title="Compensation" rows={[['Salary', salary]]} />

      <MetadataSection
        title="Strategy"
        rows={[
          ['Fit score', job.fitScore != null ? `${job.fitScore}/10` : null],
          ['Resume', job.resumeLabel],
          ['Resume angle', job.resumeAngle],
          ['Cover letter', job.coverLetterNotes],
        ]}
      />

      <MetadataSection
        title="Dates"
        rows={[
          ['Applied', formatShortDate(job.appliedAtUtc)],
          ['Deadline', formatShortDate(job.deadlineAtUtc)],
          ['Next action', formatShortDate(job.nextActionAtUtc)],
          ['Last contacted', formatShortDate(job.lastContactedAtUtc)],
        ]}
      />

      <NextActionsBlock job={job} />

      {(job.notes || job.jobDescription) && (
        <section className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground">Notes</h4>
          {job.notes && <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{job.notes}</div>}
          {job.jobDescription && <p className="text-sm whitespace-pre-wrap text-muted-foreground">{job.jobDescription}</p>}
        </section>
      )}

      <CollapsibleSection title="Attachments" count={job.attachments?.length ?? 0}>
        <AttachmentsTab job={job} />
      </CollapsibleSection>

      <CollapsibleSection title="Properties" count={job.properties?.length ?? 0}>
        <PropertiesTab job={job} />
      </CollapsibleSection>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm --prefix frontend run test -- JobDetailContent OverviewTab`
Expected: PASS.

- [ ] **Step 6: Verify gate**

Run: `npm --prefix frontend run test && npm --prefix frontend run typecheck && npm --prefix frontend run lint`
Expected: pass. (`NextActionsBlock` already exists from Task 10, so Overview resolves it with no stub.)

---

## Task 12: `ActivitiesTab` → timeline rows + quiet overflow menu

**Files:**
- Modify: `frontend/src/features/jobs/drawer/ActivitiesTab.tsx`
- Test: `frontend/src/features/jobs/drawer/ActivitiesTab.test.tsx`

**Interfaces:**
- Consumes: existing activity hooks + `ActivityForm` (unchanged); `dropdown-menu` primitive (`DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`); `formatShortDate` (Task 2).
- Produces: activity rows styled as a calm list; Edit/Delete live in a quiet `⋮` overflow menu (hidden until opened); Delete uses the menu item `variant="destructive"`. Props unchanged: `{ job }`.

- [ ] **Step 1: Write the failing test**

`frontend/src/features/jobs/drawer/ActivitiesTab.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { ActivitiesTab } from "./ActivitiesTab";
import type { JobDetailDto, JobActivityDto } from "@/lib/api/model";

const activity: JobActivityDto = {
  id: 1, jobId: 12, label: "Technical Round 1", type: "Technical", status: "Planned", outcome: "Unknown",
  scheduledAtUtc: null, durationMinutes: null, contactName: null, contactRole: null, meetingUrl: null,
  prepNotes: null, feedback: null, notes: null, createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z",
};

const detail = { id: 12, activities: [activity], properties: [], attachments: [], followUps: [] } as unknown as JobDetailDto;

describe("ActivitiesTab", () => {
  it("renders the activity label", () => {
    renderWithProviders(<ActivitiesTab job={detail} />);
    expect(screen.getByText("Technical Round 1")).toBeInTheDocument();
  });

  it("keeps Delete out of view until the overflow menu is opened", () => {
    renderWithProviders(<ActivitiesTab job={detail} />);
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /actions/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- ActivitiesTab`
Expected: FAIL — current tab shows Delete inline (no overflow menu, no "actions" button).

- [ ] **Step 3: Implement the activity tab**

Replace `frontend/src/features/jobs/drawer/ActivitiesTab.tsx`:

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useAddJobActivity, useUpdateJobActivity, useDeleteJobActivity, useCompleteJobActivity, getGetJobQueryKey,
} from '@/lib/api/jobs/jobs';
import type { JobDetailDto, JobActivityOutcome } from '@/lib/api/model';
import { ActivityForm } from './ActivityForm';
import { formatShortDate } from '../jobPresentation';

const OUTCOME_COLOR: Record<JobActivityOutcome, string> = {
  Unknown: 'bg-muted text-muted-foreground',
  Waiting: 'bg-yellow-100 text-yellow-800',
  Passed: 'bg-green-100 text-green-800',
  Failed: 'bg-red-100 text-red-800',
};

interface Props { job: JobDetailDto }

export function ActivitiesTab({ job }: Props) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const jobId = job.id as number;
  const invalidate = () => qc.invalidateQueries({ queryKey: getGetJobQueryKey(jobId) });

  const add = useAddJobActivity({ mutation: { onSuccess: () => { invalidate(); setAdding(false); }, onError: () => toast.error('Failed') } });
  const update = useUpdateJobActivity({ mutation: { onSuccess: () => { invalidate(); setEditing(null); }, onError: () => toast.error('Failed') } });
  const remove = useDeleteJobActivity({ mutation: { onSuccess: invalidate, onError: () => toast.error('Failed') } });
  const complete = useCompleteJobActivity({ mutation: { onSuccess: invalidate, onError: () => toast.error('Failed') } });

  return (
    <div className="space-y-2 py-2">
      {job.activities?.map(a => (
        <div key={a.id as number} className="rounded-md border p-3">
          {editing === (a.id as number) ? (
            <ActivityForm
              activity={a}
              onSave={async vals => update.mutate({ id: jobId, activityId: a.id as number, data: {
                label: vals.label, type: vals.type, status: vals.status,
                scheduledAtUtc: vals.scheduledAtUtc || null, durationMinutes: null,
                contactName: vals.contactName || null, contactRole: null,
                meetingUrl: vals.meetingUrl || null, prepNotes: vals.prepNotes || null, notes: null,
              } })}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-sm font-medium">{a.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{a.type}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge variant="secondary" className={OUTCOME_COLOR[a.outcome]}>{a.outcome}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon-xs" variant="ghost" aria-label="Activity actions">
                        <MoreVertical aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing(a.id as number)}>Edit</DropdownMenuItem>
                      {a.status !== 'Completed' && (
                        <DropdownMenuItem
                          onClick={() => complete.mutate({ id: jobId, activityId: a.id as number, data: { outcome: 'Passed', feedback: null, notes: null, createFollowUp: false } })}
                        >
                          Mark complete
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => remove.mutate({ id: jobId, activityId: a.id as number })}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              {a.scheduledAtUtc && (
                <p className="text-xs text-muted-foreground">{formatShortDate(a.scheduledAtUtc)}</p>
              )}
              {a.feedback && <p className="text-sm text-muted-foreground">{a.feedback}</p>}
            </div>
          )}
        </div>
      ))}

      {adding ? (
        <div className="rounded-md border p-3">
          <ActivityForm
            onSave={async vals => add.mutate({ id: jobId, data: {
              label: vals.label, type: vals.type, status: vals.status,
              scheduledAtUtc: vals.scheduledAtUtc || null, durationMinutes: null,
              contactName: vals.contactName || null, contactRole: null,
              meetingUrl: vals.meetingUrl || null, prepNotes: vals.prepNotes || null, notes: null,
            } })}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>+ Add activity</Button>
      )}
    </div>
  );
}
```

> Confirm `Button` supports `size="icon-xs"` — it does (`components/ui/button.tsx`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend run test -- ActivitiesTab`
Expected: PASS.

- [ ] **Step 5: Verify gate**

Run: `npm --prefix frontend run typecheck && npm --prefix frontend run lint`
Expected: pass.

---

## Task 13: Calm styling for `PropertiesTab`, `AttachmentsTab`, `TimelineTab`

**Files:**
- Modify: `frontend/src/features/jobs/drawer/PropertiesTab.tsx`
- Modify: `frontend/src/features/jobs/drawer/AttachmentsTab.tsx`
- Modify: `frontend/src/features/jobs/drawer/TimelineTab.tsx`
- Test: `frontend/src/features/jobs/drawer/PropertiesTab.test.tsx`

**Interfaces:**
- Consumes: existing property/attachment hooks (unchanged).
- Produces: quieter destructive controls; properties read as a calm metadata list. No interface changes.

- [ ] **Step 1: Write the failing test**

`frontend/src/features/jobs/drawer/PropertiesTab.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { PropertiesTab } from "./PropertiesTab";
import type { JobDetailDto, JobPropertyDto } from "@/lib/api/model";

const prop: JobPropertyDto = {
  id: 1, jobId: 12, key: "ats_score", value: "82", valueType: "Text",
  createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z",
} as unknown as JobPropertyDto;

const detail = { id: 12, properties: [prop], activities: [], attachments: [], followUps: [] } as unknown as JobDetailDto;

describe("PropertiesTab", () => {
  it("renders a property key and value", () => {
    renderWithProviders(<PropertiesTab job={detail} />);
    expect(screen.getByText("ats_score")).toBeInTheDocument();
    expect(screen.getByText("82")).toBeInTheDocument();
  });

  it("uses an accessible label for the remove control", () => {
    renderWithProviders(<PropertiesTab job={detail} />);
    expect(screen.getByRole("button", { name: /remove ats_score/i })).toBeInTheDocument();
  });
});
```

> Open `frontend/src/lib/api/model/jobPropertyDto.ts` to confirm the property fields (`key`, `value`, `valueType`). Adjust the fixture if the generated names differ — do not edit the generated file.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- PropertiesTab`
Expected: FAIL — current remove button has no accessible name (renders only `×`).

- [ ] **Step 3: Implement `PropertiesTab` (calm metadata)**

Replace `frontend/src/features/jobs/drawer/PropertiesTab.tsx`:

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useUpsertJobProperty, useDeleteJobProperty, getGetJobQueryKey } from '@/lib/api/jobs/jobs';
import type { JobDetailDto } from '@/lib/api/model';

interface Props { job: JobDetailDto }

export function PropertiesTab({ job }: Props) {
  const qc = useQueryClient();
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const jobId = job.id as number;
  const invalidate = () => qc.invalidateQueries({ queryKey: getGetJobQueryKey(jobId) });

  const upsert = useUpsertJobProperty({ mutation: { onSuccess: () => { invalidate(); setNewKey(''); setNewVal(''); }, onError: () => toast.error('Failed') } });
  const remove = useDeleteJobProperty({ mutation: { onSuccess: invalidate, onError: () => toast.error('Failed') } });

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Agent notes and metadata.</p>
      <dl className="grid grid-cols-[8rem_1fr_auto] items-center gap-x-3 gap-y-1 text-sm">
        {job.properties?.map(p => (
          <div key={p.id as number} className="contents">
            <dt className="truncate font-medium">{p.key}</dt>
            <dd className="truncate text-muted-foreground">{p.value}</dd>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={`Remove ${p.key}`}
              className="text-muted-foreground hover:text-destructive"
              onClick={() => remove.mutate({ id: jobId, key: p.key })}
            >
              <X aria-hidden />
            </Button>
          </div>
        ))}
      </dl>
      <div className="flex gap-2 pt-1">
        <Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Key" className="h-7 w-32" />
        <Input value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="Value" className="h-7 flex-1" />
        <Button
          size="sm"
          className="h-7"
          disabled={!newKey}
          onClick={() => upsert.mutate({ id: jobId, key: newKey, data: { value: newVal, valueType: 'Text' } })}
        >
          Set
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Quiet the `AttachmentsTab` actions**

In `frontend/src/features/jobs/drawer/AttachmentsTab.tsx`, change the Delete button so it is quiet (no permanent red) and labelled. Replace the action buttons block (the `<div className="flex gap-1">…</div>` containing Edit/Delete) with:

```tsx
              <div className="flex shrink-0 gap-1">
                <Button size="xs" variant="ghost" onClick={() => setEditing(a.id as number)}>Edit</Button>
                <Button
                  size="xs"
                  variant="ghost"
                  aria-label={`Delete ${a.title}`}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => remove.mutate({ id: jobId, attachmentId: a.id as number })}
                >
                  Delete
                </Button>
              </div>
```

(Leave the rest of `AttachmentsTab` unchanged.)

- [ ] **Step 5: Align `TimelineTab` spacing (tokens only)**

In `frontend/src/features/jobs/drawer/TimelineTab.tsx`, no structural change is required (it is already the calm reference). Confirm it renders inside the Overview/Timeline tab without extra horizontal padding fighting the drawer body. If the left rule (`absolute left-[7px]`) misaligns under the new `p-5` drawer body, leave as-is — it is self-contained. No edit needed unless misalignment is observed in the manual check; if so, wrap its root in `className="px-0.5"`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm --prefix frontend run test -- PropertiesTab`
Expected: PASS.

- [ ] **Step 7: Verify gate + Phase 3 visual report**

Run: `npm --prefix frontend run test && npm --prefix frontend run typecheck && npm --prefix frontend run lint`
Expected: all pass.
Produce the Phase 3 visual report (drawer Activity + Overview collapsibles + Timeline).

---

## Task 14: Responsive, loading, empty states, cleanup & final QA

**Files:**
- Modify (if needed): drawer skeleton already in Task 9; verify only.
- Delete: `frontend/src/features/jobs/drawer/FollowUpsTab.tsx` (orphaned by Task 11).
- No new test file (manual QA + regression run).

- [ ] **Step 1: Confirm `FollowUpsTab` is dead, then delete it**

Run: `git grep -n "FollowUpsTab" -- frontend/src` (or `grep -rn FollowUpsTab frontend/src`).
Expected: no imports remain (only the file's own definition).
Then delete `frontend/src/features/jobs/drawer/FollowUpsTab.tsx`.

- [ ] **Step 2: Full regression run**

Run: `npm --prefix frontend run test && npm --prefix frontend run typecheck && npm --prefix frontend run lint && npm --prefix frontend run build`
Expected: all pass.

- [ ] **Step 3: Manual board QA** (`npm --prefix frontend run dev`)

- [ ] Drag a card between status columns — optimistic move; on a forced error it rolls back.
- [ ] Drop a card in its own column — no-op.
- [ ] Click the status chip on a card — changes status WITHOUT opening the drawer.
- [ ] Click `JOB-{id}` on a card — opens `/jobs/{id}` in a new tab WITHOUT opening the drawer.
- [ ] Click card body — opens the drawer. Tab to a card, press Enter and Space — opens (Space does not scroll the page).
- [ ] Group by Status / Country / Company — all render; Table view still works.
- [ ] Empty column reads "No jobs in {label}."; the dashed "Drop here" appears only while dragging.

- [ ] **Step 4: Manual drawer QA**

- [ ] Header (JOB id, title, company, status, summary) stays fixed; only the body scrolls; no fight with page scroll.
- [ ] Exactly 3 tabs (Overview, Activity, Timeline). Overview shows grouped metadata, clickable Source URL, full job description, Next actions with overdue emphasis, and collapsible Attachments/Properties that toggle (mouse + keyboard).
- [ ] Status change from the drawer header works.
- [ ] Resize to ~1440 / ~820 / ~390 px — drawer width is `min(860, 100vw-2rem)`; usable at each; summary row wraps.
- [ ] `prefers-reduced-motion` on — card/collapse transitions are suppressed.

- [ ] **Step 5: Console + diff hygiene**

- [ ] No console errors during the above.
- [ ] `git status` shows no changes under `frontend/src/lib/api/**`; no backend changes.

- [ ] **Step 6: Phase 4 visual report**

Produce the final report: before/after screenshots (board + drawer at desktop/tablet/mobile), what changed, what was validated, anything still rough or deferred.

---

## Self-Review (completed during planning)

- **Spec coverage:** Board full-height (T6), column header/pill/empty (T5), drag overlay via visual-only `JobCardPreview` (T4 → T6), hover/active (T4/T5), card hierarchy/icons/chip/overdue/salary (T2–T4), drawer width/sticky/header/skeleton (T9), Next actions / follow-ups (T10), 3 tabs + grouped Overview + source link + description (T11), Activity timeline + quiet actions (T12), Properties/Attachments/Timeline (T13), responsive/empty/loading/QA (T14), a11y (role=button T4, aria-expanded T7, labelled controls T12/T13, reduced-motion throughout), motion policy (T4/T5/T6/T7), icon policy (T4/T9/T12), helper DRY incl. centralized status dot+accent (T2, consumed T3/T4/T5), package decision incl. test-infra exception recorded as **D57** (T1 + Global Constraints). All §1–§12 spec items map to a task.
- **Placeholder scan:** none — every code step shows full, valid code (the earlier deliberate test typo was removed per review).
- **Type consistency:** `getPriorityPresentation` returns `{ label, show }` (T2) and is consumed as such (T4); `getStatusPresentation` returns `{ label, dotClassName, accentClassName }` (T2), consumed for the dot in T3/T4 and the column accent in T5; `JobCardPreview({ job: JobDto })` (T4) consumed by the overlay (T6); `BoardColumn` `isDragActive` defined (T5) and passed (T6); `CollapsibleSection`/`MetadataSection` (T7/T8) and `NextActionsBlock` (T10) signatures match their consumer `OverviewTab` (T11). Button sizes (`xs`, `icon-xs`, `sm`) and Select `size="sm"` verified against the primitives.

---

## Open questions

None blocking. `lastContactedAtUtc` is included (quiet) in the Overview "Dates" group per the spec default; remove that one row if it reads as low-signal during Task 10's manual check.
