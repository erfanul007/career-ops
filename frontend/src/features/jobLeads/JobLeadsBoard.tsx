import { useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import type { JobLeadDto } from "@/lib/api/model";
import { useUpdateLeadStatus } from "./useLeadMutations";
import { BoardColumn } from "./BoardColumn";
import { LeadCard } from "./LeadCard";

const ACTIVE_STATUSES = [0, 1, 2, 3, 4];          // Discovered..Offer
const CLOSED_STATUSES = [5, 6, 7, 8];             // Rejected, Ghosted, Withdrawn, Archived

type Props = { leads: JobLeadDto[]; onEdit: (l: JobLeadDto) => void; showClosed: boolean };

export function JobLeadsBoard({ leads, onEdit, showClosed }: Props) {
  const { changeStatus } = useUpdateLeadStatus();
  const [dragging, setDragging] = useState<JobLeadDto | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const columns = showClosed ? [...ACTIVE_STATUSES, ...CLOSED_STATUSES] : ACTIVE_STATUSES;
  const byStatus = (status: number) => leads.filter((l) => l.status === status);

  const onDragStart = (e: DragStartEvent) =>
    setDragging((e.active.data.current?.lead as JobLeadDto) ?? null);

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const lead = e.active.data.current?.lead as JobLeadDto | undefined;
    const overId = e.over?.id?.toString();
    if (!lead || !overId?.startsWith("col-")) return;
    const target = Number(overId.slice(4));
    if (target !== lead.status) changeStatus(lead, target);
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex h-full gap-4 overflow-x-auto pb-2">
        {columns.map((s) => <BoardColumn key={s} status={s} leads={byStatus(s)} onEdit={onEdit} />)}
      </div>
      <DragOverlay>{dragging ? <LeadCard lead={dragging} onEdit={() => {}} /> : null}</DragOverlay>
    </DndContext>
  );
}
