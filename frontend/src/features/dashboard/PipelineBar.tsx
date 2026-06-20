import { jobLeadStatus, enumLabel } from "@/lib/enums";

const SEGMENT_CLASS: Record<number, string> = {
  0: "bg-slate-400", 1: "bg-blue-400", 2: "bg-amber-400", 3: "bg-violet-400", 4: "bg-green-500",
};
const ACTIVE = [0, 1, 2, 3, 4];

export function PipelineBar({ counts, total }: { counts: Record<number, number>; total: number }) {
  if (total === 0) return <p className="text-muted-foreground">No leads yet.</p>;
  return (
    <div className="space-y-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {ACTIVE.map((s) => {
          const n = counts[s] ?? 0;
          return n === 0 ? null : (
            <div
              key={s}
              className={SEGMENT_CLASS[s]}
              style={{ width: `${(n / total) * 100}%` }}
              title={`${enumLabel(jobLeadStatus, s)}: ${n}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {ACTIVE.map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-full ${SEGMENT_CLASS[s]}`} />
            {enumLabel(jobLeadStatus, s)} ({counts[s] ?? 0})
          </span>
        ))}
      </div>
    </div>
  );
}
