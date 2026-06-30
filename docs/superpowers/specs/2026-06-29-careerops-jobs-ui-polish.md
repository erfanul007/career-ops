# CareerOps Jobs UI/UX Polish — Design Spec

Date: 2026-06-29
Status: Approved direction + review feedback incorporated, pre-implementation
Scope: Frontend only. Jobs board + job detail drawer. No backend, no API contract, no generated `lib/api/**` edits, no new design system, no Radix/shadcn replacement.

Design target: a calm, dense-but-readable Jira/Linear-style workflow board. Beautiful = simple, aligned, useful, fluid — not colorful or flashy.

## Locked decisions (from brainstorming)

- **Drawer = 3 tabs + rich Overview.** Tabs: `Overview · Activity · Timeline`. Follow-ups move into Overview as a "Next actions" block. Attachments and Properties become collapsible sections at the bottom of Overview.
- **Card status = compact quiet chip.** Replace the full-width `<Select>` with a small ghost chip (`● Applied ▾`) that opens the status menu. Kept on the card in all grouping modes.

---

## 1. Current UI assessment

Grounded in the current code. Priority: P0 (hurts the core 2-second scan / primary flow), P1 (clear friction), P2 (polish).

### Board — `JobsBoard.tsx`, `BoardColumn.tsx`

| # | Issue | Why it hurts | Change | Pri |
|---|-------|--------------|--------|-----|
| B1 | Board lives in the page's vertical scroll (`AppLayout` wraps `Outlet` in `overflow-y-auto p-6`); not full-height. | Columns can't use vertical space; whole page scrolls instead of columns. Doesn't feel like a board. | Make `JobsPage` a `flex h-full flex-col`; board region `flex-1 min-h-0`; the columns row owns horizontal scroll and each column scrolls vertically. | P1 |
| B2 | Column header count is plain text; header not sticky. | Counts read as afterthought; header scrolls away in tall columns. | Count pill; keep the existing colored top-accent; make header `sticky top-0` within the column scroll area. | P2 |
| B3 | `"Drop here"` dashed box renders **always** when a column is empty. | Permanent visual noise in normal (non-drag) state. | Show a calm per-column empty line normally; emphasize the dashed drop target only while a drag is active (`isOver` / dnd active state). | P1 |
| B4 | `DragOverlay` renders a plain `JobCard`. | Dragged card doesn't read as "lifted". | Overlay gets `shadow-xl`, `ring-1`, `scale-[1.01]`, full opacity (see Motion policy); source stays `opacity-40`. | P2 |
| B5 | Card hover = `shadow-md` only. | Weak affordance. | Add `hover:bg-muted/40` + border emphasis + `shadow-sm→md`. | P2 |
| B6 | Columns `w-64`, gap-3. | Slightly tight for the new metadata row. | Widen to `w-72` (288px), gap-3; keep density. | P2 |

### Card — `JobCard.tsx`

| # | Issue | Why it hurts | Change | Pri |
|---|-------|--------------|--------|-----|
| C1 | Hierarchy inverted: top row is `JOB-{id}` + priority badge; company is muted `text-xs`, title `text-sm`. | The least-important field (id) gets prime position; company/title under-weighted. Fails the 2-second scan. | Reorder per §5. Title strongest; company secondary; `JOB-{id}` de-emphasized. | P0 |
| C2 | Priority badge always shown, incl. `Low`, with colored background. | Color noise on every card; priority loses meaning when always lit. | Show priority as a single quiet indicator; only `High` gets an accent. Hide/neutralize `Low`. | P1 |
| C3 | Full-width status `<Select>` in every card. | Heavy control, redundant with column position, un-Jira-like. | Replace with compact quiet chip (decision). | P0 |
| C4 | Salary printed whenever present. | Often noisy; rarely needed at scan time. | Hide salary on the card (lives in drawer). | P1 |
| C5 | Next action = `"Next: {date} ⚠"` with raw emoji; no icons anywhere. | Crude; overdue not clearly but calmly signalled. | lucide icons (`Clock`/`CalendarClock`/`TriangleAlert`) at 12–14px; relative date via `date-fns`; overdue = muted `text-destructive`, not loud. | P1 |

### Drawer — `JobDetailDrawer.tsx`, `JobDetailContent.tsx`

| # | Issue | Why it hurts | Change | Pri |
|---|-------|--------------|--------|-----|
| D1 | Width fixed `w-[640px]`, not responsive. | Overflows tablet/mobile; cramped on desktop. | `w-[min(860px,calc(100vw-2rem))]` + matching `sm:max-w`. | P1 |
| D2 | Whole `SheetContent` is one `overflow-y-auto`; header + tab list scroll away. | Lose context + status control while reading. | Sticky header (`shrink-0`); scroll only the body. | P0 |
| D3 | Header = title + company + status only. | No id, fit, next action, source link, or open-full-page. Weak work-item identity. | Rebuild per §6: id, title, company, status, fit, next-action summary, source/open links. | P1 |
| D4 | 6 tabs; tab list `overflow-x-auto` (scrolls). | Crowded; `Activities` vs `Timeline` overlap; low-freq tabs compete. | Collapse to 3 (decision). | P0 |
| D5 | Skeleton = 3 generic bars. | Layout shift; doesn't preview structure. | Skeleton mirrors header + metadata grid. | P2 |

### Tab content — `drawer/*`

| # | Issue | Why it hurts | Change | Pri |
|---|-------|--------------|--------|-----|
| O1 | `OverviewTab`: flat 14-field `<dl>`, `truncate` clips values, `sourceUrl` is plain text, `jobDescription`/`resumeLabel`/`coverLetterNotes`/`offerDeadlineAtUtc` never shown. | No meaning-grouping; data hidden by truncation; URL not clickable. | Grouped sections (§6); source as a link; show description + strategy fields; no blind truncation. | P1 |
| A1 | `ActivitiesTab`: bordered boxes; 3 always-visible ghost buttons (Edit/Complete/Delete); red Delete always loud. | Noisy; not timeline-like; destructive action shouts. | Timeline-style rows (reuse Timeline visual language); primary action inline, Edit/Delete in a quiet overflow menu; Delete quiet until opened. | P1 |
| F1 | `FollowUpsTab`: no overdue emphasis; date only. | Can't see what's late — the whole point of follow-ups. | Move into Overview "Next actions"; due/overdue/completed states via `date-fns` relative time + quiet color. | P1 |
| PR1 | `PropertiesTab`: raw key/value rows + loud red `×`. | Reads like a debug dump. | Restyle as a calm metadata/definition list inside Overview collapsible; delete quiet. | P2 |
| T1 | `TimelineTab`: already good (line + dots + kind colors). | — | Keep as the calm reference; minor spacing alignment with new tokens. | P2 |

---

## 2. Target UX direction

- **Card answers in 2 seconds:** company, role, stage (column), importance (priority), next action, deadline/overdue. Nothing else.
- **Drawer = focused work-item page:** strong sticky header, grouped metadata, clear next action, quiet edit/status actions, three meaningful tabs.
- **Calm neutral surface:** the existing oklch grayscale palette + `ring-1` borders + soft shadows. Single accent (`destructive`) only for overdue/high — no rainbow status backgrounds on cards.
- **Restraint:** this is not a "make it colorful" pass. Every visual element must earn its place.

### Motion policy

Polish, not decoration. No new animation library — only Tailwind transitions, shadcn/Radix `data-state` classes, `tw-animate-css`, and dnd-kit transforms/`DragOverlay`.

Durations: hover/focus `duration-150`; drawer/content/collapse `duration-200`; drag overlay = immediate transform/elevation. Prefer `transition-colors` / `transition-shadow` / `transition-transform`, `ease-out`, `transform-gpu`. Add `motion-reduce:transition-none` (or equivalent) on interactive transitions where practical.

Avoid: bouncing, large scale changes, long fade delays, constantly-animated elements, decorative motion that doesn't support an interaction.

| Surface | Motion |
|---------|--------|
| JobCard hover | `transition-colors`/`transition-shadow`: subtle bg shift + ring/border emphasis + `shadow-sm`→`shadow-md`. No movement, or at most a very subtle lift. |
| DragOverlay | `shadow-xl`, `ring-1`, `scale-[1.01]`, `transform-gpu`; `rotate-[0.5deg]` only if it reads natural — drop it if gimmicky. Overlay card is visual-only / `pointer-events-none` (see §12.3). |
| Droppable column active | background/ring transition only. No pulsing. |
| Status chip | hover background transition; chevron rotate only if the component exposes open state cheaply. |
| Collapsible | chevron rotate + mount/unmount of the panel (no height animation — the simple option, see plan Task 7). Accessible. |
| Tabs | optional light content fade/slide via existing utilities, only if it causes no layout jump. |
| Drawer | keep shadcn/Radix `Sheet` animation as-is; do not custom-build a drawer animation. |

### Icon policy

`lucide-react` only — no second icon set. Sizes: card `size-3`/`size-3.5`; drawer `size-4`; header/action `size-4`–`size-5` only when needed. Use icons **only** for: location/work mode, next action/deadline, overdue warning, source/open-external link, activity/timeline type (if useful), collapsible chevron. No icon beside every label. Decorative icons `aria-hidden`; icon-only buttons get accessible/`sr-only` labels.

---

## 3. Component-by-component plan

**JobsPage** — full-height flex shell; header + view-tabs fixed on top; board region fills remaining height.

**JobsBoard** — board row `flex gap-3 overflow-x-auto h-full`; per-column vertical scroll; drag overlay elevation; drop affordance only during drag.

**BoardColumn** — sticky column header with count pill + top accent; calm empty state; widen to `w-72`.

**JobCard** — new hierarchy (§5); lucide icons 12–14px; compact status chip; priority as quiet indicator; drop salary; relative next-action with calm overdue.

**JobStatusDropdown** — one component, `variant="chip" | "default"` prop selects the trigger style (chip on the card, default in the drawer header). Mutation logic stays single-sourced — never duplicated.

**JobDetailDrawer** — responsive width; sticky header; body-only scroll; layout-matched skeleton.

**JobDetailContent** — 3 tabs (`Overview · Activity · Timeline`).

**OverviewTab** — composes `MetadataSection` groups (§6) + `NextActionsBlock` + Notes/Description + two `CollapsibleSection`s (Attachments, Properties). Header summary lives in the drawer header.

**ActivitiesTab → Activity tab** — timeline-styled rows; primary action visible only when useful; Edit/Delete in a quiet overflow menu (use an existing `dropdown-menu` primitive — `components/ui/dropdown-menu.tsx` exists). If a row has no overflow menu, keep quiet text buttons; Delete never visually loud.

**FollowUpsTab → `NextActionsBlock`** — recomposed into Overview; keep its existing mutation hooks (`useCreateJobFollowUp`, `useCompleteFollowUpTask`, `useSkipFollowUpTask`). Overdue/current obvious via relative date + icon/text (not color alone); completed/skipped rendered quieter.

**Attachments/Properties tabs** — folded into Overview `CollapsibleSection`s; keep their mutation hooks; quiet destructive actions; `PropertiesTab` becomes a calm metadata list.

**TimelineTab** — keep; align spacing/tokens.

### Shared presentation helpers — `features/jobs/jobPresentation.ts` (NEW)

Presentation-only. No server state, no API calls, no workflow logic. Centralizes the rules currently duplicated across card, overview, follow-ups, and status:

```ts
export function isOverdue(value?: string | null): boolean
export function formatRelativeDate(value?: string | null): string | null   // date-fns formatDistanceToNow
export function formatShortDate(value?: string | null): string | null      // date-fns format
export function formatMoneyRange(min, max, currency, period): string | null
export function formatLocation(job): string | null                         // city/country/remote
export function getPriorityPresentation(priority): { label: string; className: string; show: boolean }
export function getStatusPresentation(status): { label: string; dotClassName: string }
```

`getPriorityPresentation` drives "High only" accent (`show:false` for Low/Medium on the card). `getStatusPresentation` replaces the scattered status color maps in `JobCard`/`JobStatusDropdown`/`BoardColumn`.

### New / recomposed components

- `drawer/CollapsibleSection.tsx` — **check `components/ui` for a shadcn Collapsible first**; none exists today, so a tiny local component is acceptable: button trigger, `aria-expanded`, keyboard toggle, `ChevronDown` rotate, grid-rows height transition. Used 2× (Attachments, Properties). No new package.
- `drawer/MetadataSection.tsx` — small labelled definition-grid group (§6). Used for every Overview metadata group.
- `drawer/NextActionsBlock.tsx` — follow-ups recomposed (above).

---

## 4. Files likely to change

```
frontend/src/features/jobs/jobPresentation.ts        (NEW — shared presentation helpers)
frontend/src/pages/JobsPage.tsx                      (full-height shell)
frontend/src/features/jobs/JobsBoard.tsx             (board scroll, drag overlay)
frontend/src/features/jobs/BoardColumn.tsx           (sticky header, count pill, empty state, width)
frontend/src/features/jobs/JobCard.tsx               (hierarchy, icons, status chip, calm overdue, role=button)
frontend/src/features/jobs/JobStatusDropdown.tsx     (chip trigger variant)
frontend/src/features/jobs/JobDetailDrawer.tsx       (width, sticky header, skeleton, header summary)
frontend/src/features/jobs/JobDetailContent.tsx      (3 tabs)
frontend/src/features/jobs/drawer/OverviewTab.tsx    (compose sections + next actions + collapsibles)
frontend/src/features/jobs/drawer/ActivitiesTab.tsx  (timeline rows, quiet overflow actions)
frontend/src/features/jobs/drawer/FollowUpsTab.tsx   (recompose → NextActionsBlock, rendered in Overview)
frontend/src/features/jobs/drawer/PropertiesTab.tsx  (calm metadata styling, in collapsible)
frontend/src/features/jobs/drawer/AttachmentsTab.tsx (quiet actions, in collapsible)
frontend/src/features/jobs/drawer/TimelineTab.tsx    (token/spacing alignment only)
frontend/src/features/jobs/drawer/CollapsibleSection.tsx   (NEW, small)
frontend/src/features/jobs/drawer/MetadataSection.tsx      (NEW, small)
frontend/src/features/jobs/drawer/NextActionsBlock.tsx     (NEW — from FollowUpsTab)
```

Possible minimal touch: `frontend/src/components/AppLayout.tsx` — only if the full-height board can't own its scroll within the current `min-h-0 flex-1 overflow-y-auto p-6` wrapper. Make the smallest change that lets the Jobs page own its scroll without breaking other pages (Dashboard, Tasks). Verify the parent chain supports `h-full` before relying on it.

Not touched: `lib/api/**` (generated), `components/ui/*` primitives (consume only — `dropdown-menu` reused for activity overflow), backend.

---

## 5. Proposed JobCard visual hierarchy

```
┌────────────────────────────────────────┐
│ Acme Corp                     ▏ High    │  company (muted) · priority accent bar/dot (High only)
│ Senior Backend Engineer                 │  title — strongest line, 2-line clamp
│ [pin] Norway · Remote                    │  metadata row — country · remote (lucide MapPin, 12–14px)
│ [clock] Next: in 2 days       JOB-12     │  next action (relative, calm) · id de-emphasized
│ ● Applied ▾                              │  compact status chip (opens menu)
└────────────────────────────────────────┘
```

Rules:
- Title = `text-sm font-medium leading-snug line-clamp-2`. Company = `text-xs text-muted-foreground`.
- Priority: `High` → small accent (left bar or dot in `text-destructive`/amber); `Medium`/`Low` → none or a faint dot. No filled colored badges.
- Metadata row: only `country` + `remoteMode` (skip `OnSite`). Icons `size-3`/`size-3.5`.
- Next action: `date-fns` relative ("in 2 days" / "2 days ago"); overdue = `text-destructive` + `TriangleAlert` `size-3.5`, not bold-red shouting.
- `JOB-{id}`: `text-[10px] font-mono text-muted-foreground`, right-aligned, still links to `/jobs/{id}` in new tab.
- Max 1–2 quiet indicators. No salary.

Semantics & interaction (the card nests interactive elements, so it must **not** be a `<button>`):
- Container = `article`/`div` with `role="button"`, `tabIndex={0}`, visible focus ring, and `onKeyDown` opening the drawer on Enter/Space.
- Preserve `stopPropagation` + `onPointerDown` guards on `JOB-{id}` link, the status chip/menu trigger, and any overflow menu — so they never bubble to card-open or start a drag.
- Body click opens the drawer; the `JOB-{id}` link opens the full detail page in a new tab (not the drawer).

---

## 6. Proposed JobDetailDrawer layout

```
SheetContent  w-[min(860px,calc(100vw-2rem))]  flex flex-col p-0 overflow-hidden
├─ Header (shrink-0, sticky, border-b, px-5 py-4)
│   JOB-12 · source link · open-full-page ↗
│   Senior Backend Engineer            [ ● Applied ▾ ]
│   Acme Corp
│   ── summary row: Fit 8/10 · Next: in 2 days · Deadline 12 Jul
├─ Tabs (shrink-0, px-5)   Overview │ Activity │ Timeline
└─ Body (flex-1 overflow-y-auto px-5 py-4)
    Overview:
      • Role & source      (title, company, source, employment type)
      • Location           (city, country, remote mode)
      • Compensation       (salary range / period)
      • Strategy           (fit score, resume label/angle, cover-letter notes)
      • Dates              (applied, deadline, next action, last contacted)
      • Next actions       (follow-ups: due/overdue/completed, add)
      • Notes / Description (notes box + jobDescription)
      ▸ Attachments        (collapsible)
      ▸ Properties         (collapsible, calm metadata list)
```

Grouped metadata uses small section labels + a 2-col definition grid; values wrap (no blind `truncate`); empty groups hidden. `sourceUrl` rendered as a real link.

```tsx
// metadata group shape
<section className="space-y-1.5">
  <h4 className="text-xs font-medium text-muted-foreground">Location</h4>
  <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-sm">
    <dt className="text-muted-foreground">Country</dt><dd>{job.country}</dd>
    ...
  </dl>
</section>
```

---

## 7. Responsive behavior

- **Drawer width:** `w-[min(860px,calc(100vw-2rem))]` with matching `sm:max-w`. Desktop ≈ 860px side panel; tablet shrinks with viewport; mobile ≈ full-width minus gutter (effectively a near-full sheet). No layout fork needed — one width expression covers all.
- **Board:** desktop = multi-column horizontal scroll; tablet = same, fewer columns visible, swipe-scroll; mobile = horizontal scroll preserved (columns `w-72` keep cards readable without heavy wrapping). Board-vs-Table view tabs remain.
- **Header summary row:** wraps (`flex-wrap`) so fit/next/deadline stack on narrow widths.
- **Metadata grid:** `grid-cols-[7rem_1fr]` stays single definition column; fine down to mobile.

---

## 8. Accessibility checklist

- [ ] Card is a real focusable control (button semantics or `role`/`tabIndex`) with visible focus ring; opening drawer works via keyboard (Enter/Space).
- [ ] `JOB-{id}` link and status chip remain independently focusable; `stopPropagation` preserved so they don't trigger card open.
- [ ] Status chip = proper Radix Select/menu trigger; arrow-key navigation + `aria` intact.
- [ ] Drawer: Radix Dialog focus trap + Escape close (already via Sheet); sticky header doesn't break tab order.
- [ ] Collapsible sections: `aria-expanded` + button trigger, keyboard toggle.
- [ ] Overdue / priority never encoded by color alone — pair with icon or text label.
- [ ] Contrast: muted text stays ≥ 4.5:1 on card/popover surfaces (verify the lightest muted on `bg-muted/40`).
- [ ] Icons decorative → `aria-hidden`; icon-only actions get `sr-only` labels.
- [ ] Interactive transitions carry `motion-reduce:transition-none` (or equivalent) where practical.

---

## 9. Package decision

**Use existing packages.** No additions. Coverage:

- Layout/spacing/states → Tailwind.
- Primitives (Sheet, Select, Tabs, Badge, Button, Skeleton) → shadcn/Radix.
- Icons → `lucide-react` (`MapPin`, `CalendarClock`, `Clock`, `TriangleAlert`, `Link2`, `Briefcase`, `ChevronDown`, `ExternalLink`).
- Relative/short dates → `date-fns` (`formatDistanceToNow`, `format`).
- Drag → `dnd-kit` (already powering the board).
- Toasts → `sonner`. Simple animation → `tw-animate-css`.
- Collapsible → tiny local component (no new dep).

Explicitly **not** added this pass: Framer Motion / Motion, React Spring, Headless UI, a second icon set, or any new component library — none clear the "high ROI + avoids custom complexity" bar. Reconsider an animation library only in a later dedicated interaction pass that needs true layout/shared-element animation.

---

## 10. Execution phases

Motion policy + icon policy (§2) and the shared helpers apply across all phases.

**Phase 1 — Visual foundation + board/card polish**
- Create `jobPresentation.ts` (helpers consumed from here on).
- `JobsPage` full-height shell (verify parent chain; minimal `AppLayout` touch only if required); `JobsBoard` board scroll + drag overlay elevation (`shadow-xl`/`ring-1`/`scale-[1.01]`) + drag-only drop affordance; `BoardColumn` sticky header, count pill, calm empty state, `w-72`.
- `JobCard` new hierarchy + semantics (§5), lucide icons, compact status chip, calm overdue, drop salary; `JobStatusDropdown` chip trigger variant.
- Gate: `typecheck` + `build` + `lint` green; board interactions sane (drag, no-op same-column, chip, link, keyboard open).

**Phase 2 — Drawer header + Overview redesign**
- `JobDetailDrawer` responsive width, sticky header w/ summary, layout-matched skeleton.
- `JobDetailContent` → 3 tabs.
- Create `MetadataSection` + `CollapsibleSection`; `OverviewTab` composes grouped metadata, source link, description/strategy fields, no blind truncation.

**Phase 3 — Activity / follow-ups / timeline polish**
- `ActivitiesTab` → timeline-styled rows + quiet overflow actions (reuse `dropdown-menu`).
- Create `NextActionsBlock` from `FollowUpsTab`, rendered in Overview with due/overdue/completed states (relative date + icon/text, color not alone; completed/skipped quieter).
- Attachments + Properties into Overview `CollapsibleSection`s; quiet destructive actions; `PropertiesTab` calm metadata styling; `TimelineTab` token/spacing alignment.

**Phase 4 — Responsive, loading, empty, final QA**
- Verify drawer at desktop/tablet/mobile widths; board horizontal scroll on small screens.
- Skeletons + empty states across board and drawer tabs.
- Accessibility checklist pass; final visual sweep.

Each phase is independently shippable and must pass the validation checklist before the next. After each phase, produce a short visual report: screenshot(s), what changed, what was validated, what still feels rough.

---

## 11. Validation checklist

Per phase and before completion:

- [ ] `npm --prefix frontend run typecheck`
- [ ] `npm --prefix frontend run build`
- [ ] `npm --prefix frontend run lint`
Manual board:
- [ ] Drag between status columns works (optimistic update + rollback on error).
- [ ] Same-column drop is a no-op.
- [ ] Status chip changes status without opening the drawer.
- [ ] `JOB-{id}` link opens the full detail page (new tab) without opening the drawer.
- [ ] Card body click opens the drawer; Enter/Space on a focused card opens it too.
- [ ] Group by status / country / company all still work; table view still works.
- [ ] Empty columns are quiet normally; dashed drop target shows only while dragging.
- [ ] Hover/active/drag overlay states read as polish, not decoration.

Manual drawer:
- [ ] Status change from the header works.
- [ ] Header + tabs stay fixed; only the body scrolls; drawer scroll does not fight page scroll.
- [ ] Tabs switch; collapsibles toggle (mouse + keyboard).
- [ ] Responsive at desktop (~1440), tablet (~820), mobile (~390).
- [ ] `prefers-reduced-motion`: interactive transitions respect it where applied.

- [ ] No console errors; no `lib/api/**` diffs; no backend diffs.

---

## 12. Implementation notes (binding)

1. **AppLayout** — do not change it unless `JobsPage` cannot own height/scroll without it. If touched, verify Dashboard, Tasks, Companies, and Settings still scroll normally.
2. **Card keyboard** — on Space/Enter: `preventDefault` (stop Space from scrolling the page), `stopPropagation` if needed, then open the drawer.
3. **DragOverlay** — do not reuse a fully interactive card if links/status controls inside the overlay become focusable/clickable. Use a visual-only mode or `pointer-events-none` on the overlay card.
4. **Status chip** — single `JobStatusDropdown` with `variant="chip" | "default"`. Never duplicate the status mutation logic.
5. **`jobPresentation.ts`** — pure, presentation-only. No hooks, no query client, no mutations, no workflow decisions.
6. **CollapsibleSection** — first check for `components/ui/collapsible.tsx`; use it if present. Otherwise a local component is fine. (None exists today.)
7. **Activity overflow menu** — use the existing `dropdown-menu` primitive only if it exists; do not add a package. If missing, use quiet text actions for now. (`components/ui/dropdown-menu.tsx` exists today.)
8. **`line-clamp-2`** — if the Tailwind line-clamp utility isn't available in this version/config, use a small CSS class or fall back to normal wrapping. Do not add a package for it.
9. **Old tabs** — remove the deleted/low-frequency tabs from the visible drawer tabs, but keep their underlying components until recomposition is stable. Reuse/recompose first; delete only when clearly dead after lint/build.
10. **Per-phase report** — after each phase, include screenshots or a short visual report: what changed, what was validated, what still feels rough.

---

## Open questions

None blocking. Two minor calls to confirm during implementation:
- Priority indicator form — left accent bar vs. dot. (Will pick the quieter of the two against the live palette.)
- Whether `lastContactedAtUtc` belongs in the Dates group or is omitted as low-signal. (Default: include, quiet.)
