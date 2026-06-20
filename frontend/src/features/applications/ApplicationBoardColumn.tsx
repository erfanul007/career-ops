import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { ApplicationDto } from "@/lib/api/model";
import { applicationStage, enumLabel } from "@/lib/enums";
import { ApplicationCard } from "./ApplicationCard";

type Props = { stage: number; apps: ApplicationDto[]; onEdit: (a: ApplicationDto) => void };

export function ApplicationBoardColumn({ stage, apps, onEdit }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `appcol-${stage}` });
  return (
    <div className="flex h-full w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1 text-sm font-medium">
        <span>{enumLabel(applicationStage, stage)}</span>
        <span className="text-muted-foreground">{apps.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-md bg-muted/40 p-2",
          isOver && "ring-2 ring-primary/50",
        )}
      >
        {apps.map((a) => (
          <ApplicationCard key={a.id} app={a} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}
