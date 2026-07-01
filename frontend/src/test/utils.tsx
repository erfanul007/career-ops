import { render, type RenderResult } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import type { ReactElement, ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

export function renderWithProviders(ui: ReactElement): RenderResult {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TooltipProvider>{children}</TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return render(ui, { wrapper: Wrapper });
}
