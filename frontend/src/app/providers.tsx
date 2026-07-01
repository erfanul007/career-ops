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
