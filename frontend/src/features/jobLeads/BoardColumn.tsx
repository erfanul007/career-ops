import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { JobLeadDto } from "@/lib/api/model";
import { jobLeadStatus, enumLabel } from "@/lib/enums";
import { LeadCard } from "./LeadCard";

type Props = { status: number; leads: JobLeadDto[]; onEdit: (l: JobLeadDto) => void; onDelete: (l: JobLeadDto) => void };

export function BoardColumn({ status, leads, onEdit, onDelete }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${status}` });
  return (
    <div className="flex h-full w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1 text-sm font-medium">
        <span>{enumLabel(jobLeadStatus, status)}</span>
        <span className="text-muted-foreground">{leads.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-md bg-muted/40 p-2", isOver && "ring-2 ring-primary/50")}
      >
        {leads.map((l) => <LeadCard key={l.id} lead={l} onEdit={onEdit} onDelete={onDelete} />)}
      </div>
    </div>
  );
}
