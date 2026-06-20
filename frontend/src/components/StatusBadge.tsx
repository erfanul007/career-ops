import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { jobLeadStatus, statusBadgeClass, enumLabel } from "@/lib/enums";

export function StatusBadge({ status }: { status: number }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", statusBadgeClass[status])}>
      {enumLabel(jobLeadStatus, status)}
    </Badge>
  );
}
