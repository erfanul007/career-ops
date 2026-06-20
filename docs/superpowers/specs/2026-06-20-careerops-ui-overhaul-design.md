# CareerOps — UI/UX Overhaul Design ("Phase 2.5")

- **Status:** Approved (2026-06-20).
- **Author:** Brainstormed with Claude Code.
- **Scope owner:** This is a **frontend-only** slice inserted after Phase 2 and before Phase 3.
  No backend, API contract, or migration changes.
- **Source of truth for product scope:** `docs/CareerOps-PRD.md` (esp. §15 Frontend, §22 UI Design Direction).
- **Governs build conventions:** `docs/knowledge-base/` (esp. `04-conventions.md` frontend rules) and `03-decisions.md`.

---

## 1. Goal

Give CareerOps a modern, simple, recruiter-grade UI: a **Jira/Linear/Trello-style** workspace
where job leads are managed like tasks on a **kanban board**, inside a clean **sidebar app
shell**, built on the project's existing **shadcn/ui** design system. Deliver a cohesive look
across every page that exists today (Dashboard, Job Leads, Companies, Settings) without changing
any backend behaviour.

Two explicit targets: (1) the board makes day-to-day lead triage fast (drag to advance status);
(2) the shell + component system make the app look finished now, so Phase 8 polish (`S8.1`)
becomes a thin top-up rather than a rebuild.

## 2. Why now / sequencing (intentional deviation)

The PRD sequences UX polish into Phase 8 (`S8.1`) and charts/seed there too. This slice pulls the
**non-chart** polish forward for the pages that already exist and adds the board paradigm, by
explicit user direction. Consequences, logged as **D26**:

- Phase 8 `S8.1` shrinks to: charts (Recharts), responsive edge-cases, empty/error-state audit,
  and applying the same shell/components to whatever Phase 3–7 added.
- Recharts and dark-mode toggle stay **deferred** (see §10 Out of scope).
- No scope is added to the product domain — this is presentation only.

## 3. Current frontend state (baseline)

- shadcn/ui v4, style `radix-nova`, base color `neutral`, lucide icons, `tsx`, CSS-variables theme
  in `src/index.css` — which **already contains sidebar (`--sidebar-*`) and chart (`--chart-1..5`)
  tokens** and a `.dark` variant.
- Tailwind v4, Geist variable font, `tw-animate-css`, TanStack Query, React Hook Form, react-router v8,
  orval-generated client, date-fns, Zod.
- **No `components/ui/` yet** — current pages (`DashboardPage`, `JobLeadsPage`, `JobLeadDetailsPage`,
  `CompaniesPage`, `SettingsProfilePage`, `AppLayout`) are hand-rolled Tailwind. This slice replaces
  that markup with real shadcn components.
- Routes today: `/dashboard`, `/job-leads`, `/job-leads/new`, `/job-leads/:id`, `/companies`,
  `/settings/profile`, under a flat top-nav `AppLayout`.

## 4. App shell

Replace the top-nav `AppLayout` with a shadcn **Sidebar** layout:

- Collapsible sidebar (icon-rail when collapsed; drawer on mobile). Nav: **Dashboard · Job Leads ·
  Companies · Settings** with lucide icons; app name/logo at top; profile name (from `UserProfile`)
  at the bottom.
- Content region: a header row (page title + primary action button, e.g. "Add lead") above the
  routed `<Outlet/>`.
- Active-route highlighting via `NavLink`. Keyboard accessible (shadcn/radix defaults).
- Responsive: `max-w` content, sidebar auto-collapses below `md`.

## 5. Component system

Adopt the shadcn component set (added with the `shadcn` CLI — `npx shadcn@latest add …` — which
reuses the already-installed `radix-ui` primitives; **never hand-author** these files, per D19):

`sidebar, button, card, badge, table, tabs, dialog, sheet, select, input, textarea, label,
dropdown-menu, separator, tooltip, skeleton, sonner`.

- **Loading states:** `skeleton` placeholders replace the `Loading…` text.
- **Feedback:** `sonner` toasts for save success / failure. Server-authoritative validation (D23)
  is unchanged — 400 `ProblemDetails` field errors still surface (in the form and/or a toast).
- Generated client + TanStack Query hooks remain the only data path (`04-conventions.md`).

## 6. Job Leads — board + list

A single page with a **Tabs** toggle, persisted in the URL query (`?view=board` | `?view=list`),
defaulting to board.

### 6.1 Board (kanban)
- **Columns = `JobLeadStatus`.** Default shows the 5 active columns — Discovered, Interested,
  Applied, Interviewing, Offer. A **"Show closed" toggle** appends the 4 terminal columns —
  Rejected, Ghosted, Withdrawn, Archived. (All 9 at once is too wide.)
- **Card** shows: title (link/opens edit), company name, a priority dot/badge, remote-mode badge,
  and (if set) deadline. Column header shows its count.
- **Drag-and-drop** via **dnd-kit** (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`).
  Accessible by design (pointer + keyboard sensors). Dragging a card to another column = a manual
  status change.

### 6.2 Drag → status update (no new endpoint)
- On drop into a new column, **optimistically** move the card, then call
  `PUT /api/job-leads/{id}` with an `UpdateJobLeadRequest` assembled from the card's current
  `JobLeadDto` plus the new `status`. On error: roll back the optimistic move and show an error toast.
- Implemented with TanStack Query's optimistic-update pattern (`onMutate`/`onError`/`onSettled`
  invalidating `getGetJobLeadsQueryKey()`).
- **No backend change** (reuses the Phase-2 PUT, per D24/YAGNI). Manual drag is always permitted;
  it is independent of the Phase-3 application-driven auto-advance (D6), which governs a different path.

### 6.3 List
- The existing table, restyled with shadcn `Table` + `Badge` status/priority pills, retaining the
  S2.3 client-side search + status + priority filters. Row click opens the edit Sheet (§7).

## 7. Forms as slide-overs

- **Create / edit a job lead** opens a right-side **Sheet** (scrollable; ~16 fields; the existing
  RHF logic + inline company find-or-create from S2.2, unchanged). Keeps board/list context — no
  navigation away.
- **Removes** the full-page routes `/job-leads/new` and `/job-leads/:id`; the Sheet serves create
  and view/edit. (Deep-linkable detail is not required for the personal-use baseline; can be added
  later by opening the Sheet from a `:id` route if wanted.)
- **Company create/edit** → a `Dialog` launched from the Companies page (replaces the always-visible
  inline form).
- **Settings/Profile** stays a normal page (single singleton record), restyled with Card/Input/Label.

## 8. Dashboard

Client-side over the fetched `/api/job-leads` list (D24 — no dashboard endpoint, no chart library):

- A row of stat **Cards**: Total leads · High-priority · Applied · Interviewing.
- A **CSS stacked "pipeline" bar**: segments sized by count per active status, colored via theme
  tokens, with a legend — a lightweight pipeline visualization without a chart dep.
- **High-priority action list** (PRD §21 rule: priority ∈ {High, Critical} and status ∈ {Discovered,
  Interested}).
- **Recently updated** list (top N by `updatedAtUtc`), each linking to the lead's edit Sheet.

## 9. Status & priority colors

Extend `src/lib/enums.ts` with a `status → badge color` and `priority → color` map (the convention
in `04-conventions.md`: "`lib/enums.ts` maps integer enum values → display labels and badge
colors"). Colors come from theme semantic + `chart-1..5` tokens, so they adapt to the theme and the
`.dark` variant automatically. A small `<StatusBadge>` / `<PriorityBadge>` wraps shadcn `Badge`.

## 10. Out of scope (this slice)

- **Recharts / real charts** — stays Phase 8.
- **Dark-mode toggle** — tokens exist and components are theme-safe, but no UI toggle now
  (post-MVP backlog).
- **Applications board** — Applications don't exist until Phase 3; they inherit this board paradigm then.
- **Any backend/API/DB change** — none.
- **New domain features, auth, multi-user** — none (PRD §7.3 guardrails hold).

## 11. Dependencies

- Add (runtime): `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`; `sonner`.
- Add shadcn components via the `shadcn` CLI (pull existing radix primitives) — committed as generated.
- Installed via `npm`/`npx` only (D19). No Recharts.

## 12. Data flow & architecture (unchanged contracts)

```
React pages/features ──TanStack Query hooks (orval)──▶ /api/companies, /api/job-leads (Phase 2)
        │                                                     ▲
        ├─ board drag ─ optimistic cache update ─ PUT /api/job-leads/{id} ─┘  (rollback on error)
        └─ lib/enums.ts: int enum → label + badge color (display only)
```

- All reads/writes go through the existing generated hooks. The only new client behaviour is the
  optimistic cache update on drag. Validation remains server-authoritative (D23).

## 13. Definition of Done

1. Sidebar shell renders; nav works; responsive collapse works.
2. shadcn component set installed and used; no hand-rolled inputs/tables remain on touched pages.
3. Job Leads board: drag between columns persists the new status (survives reload / `just down && up`);
   optimistic update rolls back on a forced error; list view + filters still work; board/list toggle
   persists in the URL.
4. Create/edit lead via Sheet works (incl. inline new company); Companies dialog works; Settings restyled.
5. Dashboard cards + pipeline bar + lists reflect live data.
6. Loading = skeletons; save feedback = toasts; server validation errors still display.
7. `just verify` green (frontend typecheck + build; backend untouched but still builds + tests pass).
8. Manual usability check: board drag, fast lead entry, and navigation feel like a modern task manager.

## 14. Decisions to log (in `03-decisions.md` during implementation)

- **D26 — UI/UX overhaul ("Phase 2.5"): shadcn app shell + kanban board.**
  Adopt a shadcn Sidebar app shell and the shadcn component set; Job Leads gets a dnd-kit kanban
  board (+ list toggle) where dragging a card issues an optimistic `PUT /api/job-leads/{id}` status
  change (no new endpoint); create/edit moves into Sheet/Dialog slide-overs (removing the full-page
  lead detail/new routes). Recharts and a dark-mode toggle stay deferred; this slice pulls the
  remaining Phase-8 polish forward for current pages (so `S8.1` shrinks). Frontend-only; no backend,
  API, or schema change. *Rejected:* switching component libraries (shadcn already chosen, PRD §10.2);
  a dedicated status-PATCH endpoint (reuse PUT, D24/YAGNI); board-only with no list (loses dense scan).

## 15. Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Optimistic DnD rollback bugs (stale cache, double-PUT) | Med | TanStack Query optimistic pattern with `onError` rollback + `onSettled` invalidate; verify a forced-failure rollback by hand |
| Broad scope (all pages at once) | Med | Sequence: shell + component install first, then page-by-page (board → forms → dashboard → companies/settings) — each independently runnable |
| Pulling polish forward deviates from PRD sequencing | Low | Intentional, user-directed, logged as D26; Phase 8 `S8.1` scope updated in `02-delivery-plan.md` |
| 9 status columns make the board unwieldy | Low | Default to 5 active columns + "Show closed" toggle |
| shadcn CLI churn on Tailwind v4 / radix-nova | Low | Components are generated + committed; if the CLI misbehaves, the primitives (`radix-ui`) are already installed to hand-assemble a component |
