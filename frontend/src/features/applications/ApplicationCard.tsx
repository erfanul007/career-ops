import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ApplicationDto } from "@/lib/api/model";
import { applicationStatus, applicationStatusBadgeClass, enumLabel } from "@/lib/enums";

type Props = { app: ApplicationDto; onEdit: (a: ApplicationDto) => void };

export function ApplicationCard({ app, onEdit }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `app-${app.id}`, data: { app } });
  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn("cursor-grab space-y-1 p-3 text-sm active:cursor-grabbing", isDragging && "opacity-50")}
      onClick={() => onEdit(app)}
      {...listeners}
      {...attributes}
    >
      <div className="font-medium">{app.jobTitle}</div>
      <div className="text-muted-foreground">{app.companyName}</div>
      <Badge className={applicationStatusBadgeClass[app.status]}>
        {enumLabel(applicationStatus, app.status)}
      </Badge>
    </Card>
  );
}
