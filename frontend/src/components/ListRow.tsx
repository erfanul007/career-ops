import type { ReactNode } from "react";
import { Link } from "react-router";

interface Props {
  to: string;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
}

export function ListRow({ to, title, subtitle, meta }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
      <div className="min-w-0">
        <Link to={to} className="font-medium hover:underline">{title}</Link>
        {subtitle && <span className="text-muted-foreground"> · {subtitle}</span>}
      </div>
      {meta && <div className="shrink-0 text-xs text-muted-foreground">{meta}</div>}
    </div>
  );
}
