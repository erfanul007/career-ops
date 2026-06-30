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
