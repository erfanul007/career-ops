# Dark Mode Theme Toggle — Design Spec

**Date:** 2026-07-01
**Status:** Approved (design)
**Branch:** `feat/jobs-filter-group-toolbar` (stacked on the unmerged sort/filter/group work, by user choice)

## Problem

The frontend ships a complete dark palette but cannot reach it. `index.css` defines a full
`.dark {}` token block (lines 86–118) alongside `:root` (light), and the Tailwind v4 dark variant
`@custom-variant dark (&:is(.dark *))` is wired. `next-themes@0.4.6` is a dependency and
`sonner.tsx` already calls `useTheme()`. But **no `ThemeProvider` is mounted**, so the `.dark`
class is never applied to `<html>`, the app is permanently light, and `sonner`'s `useTheme()` is a
no-op. There is no toggle control.

## Goal

Make dark mode reachable and switchable:
- Mount a `next-themes` `ThemeProvider` with **Light / Dark / System** support.
- Add a **header toggle** (top-right) driving `setTheme`.
- Persist the choice and follow OS preference (both free from next-themes).
- Reuse the existing shadcn `.dark` palette — **no new colors**.

## Users

Single user (personal job tracker). No multi-user/auth concerns.

## Current state (as-built)

- `index.css:6` — `@custom-variant dark (&:is(.dark *))`; `.dark` block complete (86–118).
- `app/providers.tsx` — wraps app in `QueryClientProvider` + `TooltipProvider` + `Toaster`. **No
  ThemeProvider.**
- `components/ui/sonner.tsx:3,8` — imports `useTheme` from `next-themes`; returns default
  `"system"` today (no provider), so the toaster never tracks a real theme.
- `components/AppLayout.tsx:57–59` — header holds only `<SidebarTrigger />`.
- `components/Logo.tsx` — already theme-aware (uses `fill-primary` / `fill-primary-foreground`).
- Tokens are shadcn `radix-nova`, baseColor **neutral**: semantic (`primary`, `secondary`,
  `accent`, `muted`, `destructive`, `card`, `popover`, `border`, `input`, `ring`, `chart-1..5`,
  `sidebar-*`). No "tertiary" — the model is primary + secondary + accent + muted.

## Decisions (from brainstorming, locked)

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Light / Dark / System** (3-way) via next-themes | next-themes default; `System` follows OS. `sonner` already expects a `"system"` value. Zero extra cost. |
| 2 | **Header top-right** placement | Most discoverable; standard pattern. Header currently holds only the sidebar trigger — room on the right. |
| 3 | **Same branch** (`feat/jobs-filter-group-toolbar`) | User choice. Trade-off noted: couples dark mode with the unrelated sort work in one PR; they cannot be merged independently. |
| 4 | **Reuse shadcn `.dark` palette** — no new colors | The dark palette is already complete; authoring new colors is out of scope. |
| 5 | **Fix stray `.dark --sidebar-primary`** (blue → neutral) | The neutral palette has one leftover non-neutral token (`oklch(0.488 0.243 264.376)`); align it with the neutral scheme. One-line cleanup, in scope. |

## Architecture

### 1. Theme provider wrapper

New `components/theme-provider.tsx` — a thin wrapper re-exporting next-themes' provider so
`providers.tsx` stays clean and the defaults live in one place:

```tsx
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
```

- `attribute="class"` → toggles `.dark` on `<html>` (matches `@custom-variant dark`).
- `defaultTheme="system"` + `enableSystem` → 3-way; System resolves to OS.
- `disableTransitionOnChange` → no color transition bleed on flip.

Mounted in `providers.tsx` as the **outermost** provider (wrapping `QueryClientProvider`) so the
class is set before anything renders and `Toaster`/`useTheme` sit inside it.

### 2. Mode toggle

New `components/ModeToggle.tsx` — the shadcn-canonical pattern using existing `Button` +
`dropdown-menu`:
- Trigger: `<Button variant="ghost" size="icon">` with a `Sun` icon that rotates/scales out and a
  `Moon` icon that scales in under the `dark:` variant (icon crossfade), plus `sr-only` label
  "Toggle theme".
- Content: three `DropdownMenuItem`s — **Light**, **Dark**, **System** — each calling
  `setTheme('light' | 'dark' | 'system')`.
- Uses `useTheme()` from next-themes.

### 3. Header mount

`AppLayout.tsx` header: add `<ModeToggle />` after `<SidebarTrigger />`, pushed right with
`ml-auto` on the toggle (or a spacer). Header is `flex items-center`.

### 4. Palette fix

`index.css` `.dark` block: `--sidebar-primary` from `oklch(0.488 0.243 264.376)` → neutral
`oklch(0.922 0 0)` (mirrors `--primary` in dark, matching the light block's neutral intent) and
`--sidebar-primary-foreground` stays consistent (`oklch(0.205 0 0)` in dark to contrast the light
neutral). This removes the lone non-neutral token from a neutral palette.

## Data flow

```
ThemeProvider (localStorage key "theme" + OS media listener)
  ├─ useTheme() ─▶ ModeToggle ─ setTheme(light | dark | system)
  │                                   └─▶ .dark class on <html> ─▶ every token flips
  └─ Toaster (sonner) already reads useTheme() ─▶ toast colors follow theme
```

## Edge cases

- **No stored preference** → `defaultTheme="system"` → follows OS.
- **System theme changes at runtime** (OS light↔dark) → next-themes media listener updates
  `resolvedTheme` live while mode is `system`.
- **FOUC (CSR):** a one-frame default-theme flash is possible before next-themes reads
  localStorage on mount. Accepted for a personal single-user tool; no pre-hydration inline script
  (YAGNI). Documented, not fixed.
- **SSR:** not applicable (Vite CSR SPA).

## Out of scope

- New/brand colors or a custom dark palette (reuse shadcn's).
- Per-component dark overrides beyond the token system.
- Pre-hydration anti-FOUC inline script.
- Backend, API, orval, migrations (client-only; no audit-trail / approval-workflow /
  document-control impact).
- Theme choice synced to the user profile / backend.

## Testing

- `ModeToggle.test.tsx` — render inside `ThemeProvider`; trigger opens the menu; **Light / Dark /
  System** items present; clicking **Dark** adds the `dark` class to `document.documentElement`;
  clicking **Light** removes it. (next-themes operates on `document.documentElement` in jsdom.)
- Existing suites stay green — mounting `ThemeProvider` in `providers.tsx` must not break any test
  that renders `Providers` or components under it.
- `just verify` green at the end (frontend vitest + typecheck + build; backend unchanged).

## Open questions

None. All decisions locked above.
