import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLink, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/PriorityBadge";
import { remoteMode, enumLabel } from "@/lib/enums";
import type { JobLeadDto } from "@/lib/api/model";

type Props = { lead: JobLeadDto; onEdit: (l: JobLeadDto) => void; onDelete?: (l: JobLeadDto) => void };

export function LeadCard({ lead, onEdit, onDelete }: Props) {
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
      <div className="flex items-start justify-between gap-1">
        <div className="text-sm font-medium">{lead.title}</div>
        <div className="flex shrink-0 items-center gap-0.5">
          {lead.sourceUrl && (
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-primary"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              aria-label="Open job posting"
            >
              <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-destructive"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onDelete(lead); }}
              aria-label="Delete lead"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">{lead.companyName}</div>
      <div className="flex items-center gap-2 pt-1">
        <PriorityBadge priority={lead.priority} />
        <span className="text-xs text-muted-foreground">{enumLabel(remoteMode, lead.remoteMode)}</span>
      </div>
    </Card>
  );
}
