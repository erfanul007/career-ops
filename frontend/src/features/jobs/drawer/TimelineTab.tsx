import { useGetJobTimeline } from '@/lib/api/jobs/jobs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { TimelineEventKind } from '@/lib/api/model';

const KIND_STYLES: Record<TimelineEventKind, { dot: string }> = {
  Transition: { dot: 'bg-indigo-500' },
  Activity:   { dot: 'bg-violet-500' },
  FollowUp:   { dot: 'bg-amber-500' },
};

interface Props { jobId: number }

export function TimelineTab({ jobId }: Props) {
  const { data: response, isLoading, isError } = useGetJobTimeline(jobId);
  const events = response?.data;

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-3 w-3 rounded-full mt-1 shrink-0" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-destructive py-4">Failed to load timeline.</p>;
  }

  if (!events?.length) {
    return <p className="text-sm text-muted-foreground py-4">No events yet.</p>;
  }

  return (
    <div className="relative py-2">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
      <div className="space-y-4 pl-6">
        {events.map(event => {
          const style = KIND_STYLES[event.kind] ?? KIND_STYLES.Transition;
          return (
            <div key={`${event.kind}-${event.id}`} className="relative">
              <div className={cn('absolute -left-6 top-1.5 h-3 w-3 rounded-full border-2 border-background', style.dot)} />
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{event.title}</span>
                  {event.actor && (
                    <span className="text-[10px] text-muted-foreground border rounded px-1">{event.actor}</span>
                  )}
                </div>
                {event.detail && (
                  <p className="text-xs text-muted-foreground">{event.detail}</p>
                )}
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                  {new Date(event.timestampUtc).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
