import { ExternalLink } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { remoteMode, enumLabel } from "@/lib/enums";
import type { JobLeadDto } from "@/lib/api/model";

type Props = { leads: JobLeadDto[]; onEdit: (l: JobLeadDto) => void; onDelete: (l: JobLeadDto) => void };

export function JobLeadsTable({ leads, onEdit, onDelete }: Props) {
  if (leads.length === 0) return <p className="text-muted-foreground">No job leads match.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead><TableHead>Company</TableHead>
          <TableHead>Status</TableHead><TableHead>Priority</TableHead>
          <TableHead>Remote</TableHead><TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((l) => (
          <TableRow key={l.id} className="cursor-pointer" onClick={() => onEdit(l)}>
            <TableCell className="font-medium">{l.title}</TableCell>
            <TableCell>{l.companyName}</TableCell>
            <TableCell><StatusBadge status={l.status} /></TableCell>
            <TableCell><PriorityBadge priority={l.priority} /></TableCell>
            <TableCell>{enumLabel(remoteMode, l.remoteMode)}</TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
              {l.sourceUrl && (
                <Button asChild variant="ghost" size="icon-sm" aria-label="Open job posting">
                  <a href={l.sourceUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => onDelete(l)}>Delete</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
