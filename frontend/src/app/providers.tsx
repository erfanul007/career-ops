import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const queryClient = new QueryClient();

export function Providers({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
