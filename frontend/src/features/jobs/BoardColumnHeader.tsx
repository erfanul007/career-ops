import type { CSSProperties } from 'react';
import type { JobStatus } from '@/lib/api/model';
import { getStatusPresentation } from './jobPresentation';
import { cn } from '@/lib/utils';

interface Props {
  statuses: JobStatus[];
}

export function BoardColumnHeader({ statuses }: Props) {
  const style: CSSProperties = { gridTemplateColumns: `repeat(${statuses.length}, var(--board-col))` };
  return (
    <div
      className="sticky top-0 z-20 grid gap-3 bg-background/95 pb-2 backdrop-blur"
      style={style}
    >
      {statuses.map(status => {
        const { accentClassName } = getStatusPresentation(status);
        return (
          <div
            key={status}
            className={cn(
              'flex items-center justify-between rounded-md border-t-2 bg-muted/60 px-2.5 py-1.5',
              accentClassName,
            )}
          >
            <span className="text-sm font-medium">{status}</span>
          </div>
        );
      })}
    </div>
  );
}
