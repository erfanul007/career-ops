import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { PriorityBadge } from "@/components/PriorityBadge";
import { remoteMode, enumLabel } from "@/lib/enums";
import type { JobLeadDto } from "@/lib/api/model";

export function LeadCard({ lead, onEdit }: { lead: JobLeadDto; onEdit: (l: JobLeadDto) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `lead-${lead.id}`,
    data: { lead },
  });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onEdit(lead)}
      className="cursor-grab space-y-1 p-3 active:cursor-grabbing"
    >
      <div className="text-sm font-medium">{lead.title}</div>
      <div className="text-xs text-muted-foreground">{lead.companyName}</div>
      <div className="flex items-center gap-2 pt-1">
        <PriorityBadge priority={lead.priority} />
        <span className="text-xs text-muted-foreground">{enumLabel(remoteMode, lead.remoteMode)}</span>
      </div>
    </Card>
  );
}
