# Dark Mode Theme Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the already-defined dark palette reachable via a header Light/Dark/System toggle.

**Architecture:** Mount a `next-themes` `ThemeProvider` (thin wrapper) as the outermost app provider so it toggles the `.dark` class on `<html>`; add a shadcn-canonical `ModeToggle` dropdown in the `AppLayout` header driving `setTheme`. Reuse the existing shadcn `.dark` token block — no new colors. Fix one stray non-neutral token in the dark palette.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind v4, next-themes@0.4.6 (already a dependency), shadcn/ui (`Button`, `dropdown-menu`), lucide-react (`Sun`, `Moon`), Vitest + Testing Library + user-event.

## Global Constraints

- **No new dependencies.** `next-themes@0.4.6` is already installed; do not add packages.
- **Client-only.** No backend, API, orval, or migration changes. No audit-trail / approval-workflow / document-control impact.
- **Reuse the shadcn `.dark` palette** in `index.css` — do not author new colors.
- **Provider config (exact):** `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`. `{...props}` spread AFTER the defaults so callers can override.
- **`ThemeProvider` mounts OUTERMOST** in `providers.tsx` — wrapping `QueryClientProvider` — so the class is set before render and `Toaster` (which reads `useTheme`) sits inside it.
- **Copy strings (verbatim):** menu items `Light`, `Dark`, `System`; trigger `sr-only` label `Toggle theme`.
- **Toggle placement:** `AppLayout` header, pushed right (`ml-auto`), after `<SidebarTrigger />`.
- **Palette fix:** in the `.dark` block only, `--sidebar-primary` → `oklch(0.922 0 0)` and `--sidebar-primary-foreground` → `oklch(0.205 0 0)` (mirror the dark `--primary` / `--primary-foreground` neutrals). Do not touch the `:root` (light) block.
- Clean code: KISS/YAGNI, no dead code, no needless comments.
- Per-task gate = that task's own vitest suite (esbuild, no typecheck). Full typecheck + build + `just verify` at Task 3.
- Commit trailer on every commit: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: ThemeProvider wrapper + matchMedia test mock

**Files:**
- Modify: `frontend/src/test/setup.ts` (append a `window.matchMedia` mock)
- Create: `frontend/src/components/theme-provider.tsx`
- Test: `frontend/src/components/theme-provider.test.tsx`

**Interfaces:**
- Produces: `ThemeProvider` — `function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>): JSX.Element`. Applies `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`; forwards/overrides via `{...props}`.

- [ ] **Step 1: Add the matchMedia mock to the shared test setup**

next-themes with `enableSystem` calls `window.matchMedia`, which jsdom does not implement. Append to `frontend/src/test/setup.ts` (after the existing pointer/scroll mocks):

```ts
// next-themes (enableSystem) and use-mobile call matchMedia; jsdom lacks it.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
```

- [ ] **Step 2: Write the failing test**

Create `frontend/src/components/theme-provider.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { ThemeProvider } from './theme-provider';

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove('dark', 'light');
  localStorage.clear();
});

describe('ThemeProvider', () => {
  it('applies the theme as a class on the document element (attribute="class")', async () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <span>content</span>
      </ThemeProvider>,
    );
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/theme-provider.test.tsx`
Expected: FAIL — cannot resolve `./theme-provider` (module does not exist).

- [ ] **Step 4: Create the wrapper**

Create `frontend/src/components/theme-provider.tsx`:

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

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/theme-provider.test.tsx`
Expected: PASS (1 test). The `defaultTheme="dark"` override proves both the defaults forwarding and the `attribute="class"` wiring.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/test/setup.ts frontend/src/components/theme-provider.tsx frontend/src/components/theme-provider.test.tsx
git commit -m "feat(theme): add next-themes ThemeProvider wrapper + matchMedia test mock

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: ModeToggle component

**Files:**
- Create: `frontend/src/components/ModeToggle.tsx`
- Test: `frontend/src/components/ModeToggle.test.tsx`

**Interfaces:**
- Consumes: `ThemeProvider` from `@/components/theme-provider` (Task 1); `useTheme` from `next-themes`; `Button` from `@/components/ui/button` (`variant="ghost"`, `size="icon"`); `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` from `@/components/ui/dropdown-menu`; `Sun`, `Moon` from `lucide-react`.
- Produces: `ModeToggle` — `function ModeToggle(): JSX.Element`. Renders a ghost icon button (`sr-only` "Toggle theme") opening a menu with `Light` / `Dark` / `System` items calling `setTheme('light'|'dark'|'system')`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/ModeToggle.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from './theme-provider';
import { ModeToggle } from './ModeToggle';

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove('dark', 'light');
  localStorage.clear();
});

function renderToggle() {
  return render(
    <ThemeProvider>
      <ModeToggle />
    </ThemeProvider>,
  );
}

describe('ModeToggle', () => {
  it('offers Light, Dark, and System', async () => {
    renderToggle();
    await userEvent.click(screen.getByRole('button', { name: /toggle theme/i }));
    expect(await screen.findByRole('menuitem', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Dark' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'System' })).toBeInTheDocument();
  });

  it('switches to dark, then back to light', async () => {
    renderToggle();
    await userEvent.click(screen.getByRole('button', { name: /toggle theme/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Dark' }));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));

    await userEvent.click(screen.getByRole('button', { name: /toggle theme/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Light' }));
    await waitFor(() => expect(document.documentElement).not.toHaveClass('dark'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ModeToggle.test.tsx`
Expected: FAIL — cannot resolve `./ModeToggle` (module does not exist).

- [ ] **Step 3: Create the component**

Create `frontend/src/components/ModeToggle.tsx`:

```tsx
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="size-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/ModeToggle.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ModeToggle.tsx frontend/src/components/ModeToggle.test.tsx
git commit -m "feat(theme): add ModeToggle light/dark/system dropdown

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Wire provider + header toggle + palette fix + full verify

**Files:**
- Modify: `frontend/src/app/providers.tsx` (wrap outermost in `ThemeProvider`)
- Modify: `frontend/src/components/AppLayout.tsx:57-59` (mount `<ModeToggle />` in header, right-aligned)
- Modify: `frontend/src/index.css:112-113` (`.dark` block sidebar-primary neutral fix)
- Test: `frontend/src/components/AppLayout.test.tsx` (smoke test: toggle present in header)

**Interfaces:**
- Consumes: `ThemeProvider` (Task 1), `ModeToggle` (Task 2).

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/AppLayout.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { screen, cleanup } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { AppLayout } from './AppLayout';

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove('dark', 'light');
  localStorage.clear();
});

describe('AppLayout', () => {
  it('renders the theme toggle in the header', async () => {
    renderWithProviders(
      <ThemeProvider>
        <AppLayout />
      </ThemeProvider>,
    );
    expect(await screen.findByRole('button', { name: /toggle theme/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/AppLayout.test.tsx`
Expected: FAIL — no button named "Toggle theme" (ModeToggle not yet mounted in AppLayout).

- [ ] **Step 3: Mount ModeToggle in the AppLayout header**

In `frontend/src/components/AppLayout.tsx`, add the import (with the other `@/components` imports near the top):

```tsx
import { ModeToggle } from "@/components/ModeToggle";
```

Replace the header block (currently lines 57-59):

```tsx
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
```

with:

```tsx
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-2">
            <ModeToggle />
          </div>
        </header>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/AppLayout.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Mount ThemeProvider outermost in providers.tsx**

Replace the full contents of `frontend/src/app/providers.tsx` with:

```tsx
import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

// Single cross-entity sync rule (D37): any write reconciles every mounted view.
// invalidateQueries() with no filter marks all queries stale and refetches the active ones.
const queryClient: QueryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSettled: () => queryClient.invalidateQueries(),
  }),
});

export function Providers({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 6: Fix the stray non-neutral token in the dark palette**

In `frontend/src/index.css`, inside the `.dark {}` block only (currently lines 112-113), change:

```css
    --sidebar-primary: oklch(0.488 0.243 264.376);
    --sidebar-primary-foreground: oklch(0.985 0 0);
```

to:

```css
    --sidebar-primary: oklch(0.922 0 0);
    --sidebar-primary-foreground: oklch(0.205 0 0);
```

Leave the `:root` (light) block untouched.

- [ ] **Step 7: Run the full frontend suite**

Run: `cd frontend && npm run test`
Expected: PASS — all suites green (prior 159 + Task 1's 1 + Task 2's 2 + Task 3's 1 = 163), no regressions from mounting the provider.

- [ ] **Step 8: Typecheck + build**

Run: `cd frontend && npm run build`
Expected: PASS (`tsc -b` clean, vite build succeeds).

- [ ] **Step 9: Full repo verify**

Run: `just verify`
Expected: PASS (backend unit + integration + frontend typecheck/build). Backend is untouched by this plan.

- [ ] **Step 10: Add decision log entry**

Append a dated decision entry to `docs/knowledge-base/03-decisions.md` (match the existing `### D<N> — Title (date)` prose convention of the latest entries). Record: dark mode enabled via next-themes ThemeProvider (Light/Dark/System), header toggle, reuse of the shipped shadcn `.dark` palette, and the sidebar-primary neutral fix. State explicitly: no audit-trail, approval-workflow, or document-control impact (client-only presentation change).

- [ ] **Step 11: Commit**

```bash
git add frontend/src/app/providers.tsx frontend/src/components/AppLayout.tsx frontend/src/components/AppLayout.test.tsx frontend/src/index.css docs/knowledge-base/03-decisions.md
git commit -m "feat(theme): wire dark mode toggle into app shell + neutral sidebar-primary

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Manual verification (after Task 3, before finishing)

- Run `cd frontend && npm run dev`; open the app.
- Click the header toggle (top-right): **Light**, **Dark**, **System** switch the whole UI; dark uses the neutral dark palette (no stray blue in the sidebar active item).
- Reload: the chosen theme persists (localStorage).
- Set mode to **System**, flip OS appearance: the UI follows.
- Toasts (trigger any create/edit) match the active theme.
