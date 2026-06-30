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
