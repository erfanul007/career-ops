import { useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import type { ApplicationDto } from "@/lib/api/model";
import { useApplicationStageMove } from "./useApplicationMutations";
import { ApplicationBoardColumn } from "./ApplicationBoardColumn";
import { ApplicationCard } from "./ApplicationCard";

const ACTIVE_STAGES = [0, 1, 2, 3, 4, 5, 6, 7]; // Applied..Offer
const CLOSED_STAGES = [8, 9, 10];                // Rejected, Ghosted, Withdrawn

type Props = { apps: ApplicationDto[]; onEdit: (a: ApplicationDto) => void; showClosed: boolean };

export function ApplicationsBoard({ apps, onEdit, showClosed }: Props) {
  const { move } = useApplicationStageMove();
  const [dragging, setDragging] = useState<ApplicationDto | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );
  const columns = showClosed ? [...ACTIVE_STAGES, ...CLOSED_STAGES] : ACTIVE_STAGES;
  const byStage = (s: number) => apps.filter((a) => a.currentStage === s);

  const onDragStart = (e: DragStartEvent) =>
    setDragging((e.active.data.current?.app as ApplicationDto) ?? null);

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const app = e.active.data.current?.app as ApplicationDto | undefined;
    const overId = e.over?.id?.toString();
    if (!app || !overId?.startsWith("appcol-")) return;
    move(app, Number(overId.slice(7)));
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex h-full gap-4 overflow-x-auto pb-2">
        {columns.map((s) => (
          <ApplicationBoardColumn key={s} stage={s} apps={byStage(s)} onEdit={onEdit} />
        ))}
      </div>
      <DragOverlay>
        {dragging ? <ApplicationCard app={dragging} onEdit={() => {}} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
