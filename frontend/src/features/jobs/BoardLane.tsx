import type { CSSProperties } from 'react';
import { ChevronRight } from 'lucide-react';
import type { JobStatus } from '@/lib/api/model';
import { BoardCell } from './BoardCell';
import type { Lane } from './jobGrouping';
import { cn } from '@/lib/utils';

interface Props {
  lane: Lane;
  statuses: JobStatus[];
  showBanner: boolean;
  collapsed: boolean;
  onToggle: (laneKey: string) => void;
  onJobClick: (id: number) => void;
  isDragActive?: boolean;
}

export function BoardLane({ lane, statuses, showBanner, collapsed, onToggle, onJobClick, isDragActive }: Props) {
  const gridStyle: CSSProperties = { gridTemplateColumns: `repeat(${statuses.length}, var(--board-col))` };

  return (
    <section className="flex flex-col gap-1.5">
      {showBanner && (
        <button
          type="button"
          onClick={() => onToggle(lane.key)}
          aria-expanded={!collapsed}
          className="flex w-full items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight aria-hidden className={cn('size-4 transition-transform motion-reduce:transition-none', !collapsed && 'rotate-90')} />
          <span className="text-sm font-medium">{lane.label}</span>
          <span className="rounded-full bg-muted-foreground/10 px-1.5 text-[11px] tabular-nums text-muted-foreground">
            {lane.jobs.length}
          </span>
        </button>
      )}
      {!collapsed && (
        <div className="grid gap-3" style={gridStyle}>
          {statuses.map(status => (
            <BoardCell
              key={status}
              laneKey={lane.key}
              status={status}
              jobs={lane.jobs.filter(j => j.status === status)}
              onJobClick={onJobClick}
              isDragActive={isDragActive}
            />
          ))}
        </div>
      )}
    </section>
  );
}
