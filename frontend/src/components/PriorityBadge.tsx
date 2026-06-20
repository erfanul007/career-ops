import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { priority, priorityBadgeClass, enumLabel } from "@/lib/enums";

export function PriorityBadge({ priority: value }: { priority: number }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", priorityBadgeClass[value])}>
      {enumLabel(priority, value)}
    </Badge>
  );
}
