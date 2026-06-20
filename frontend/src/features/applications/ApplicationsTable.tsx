import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { ApplicationDto } from "@/lib/api/model";
import { applicationStage, applicationStatus, applicationStatusBadgeClass, enumLabel } from "@/lib/enums";

type Props = { apps: ApplicationDto[]; onEdit: (a: ApplicationDto) => void };

export function ApplicationsTable({ apps, onEdit }: Props) {
  if (apps.length === 0) return <p className="text-muted-foreground">No applications yet.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Company</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {apps.map((a) => (
          <TableRow key={a.id} className="cursor-pointer" onClick={() => onEdit(a)}>
            <TableCell className="font-medium">{a.companyName}</TableCell>
            <TableCell>{a.jobTitle}</TableCell>
            <TableCell>{enumLabel(applicationStage, a.currentStage)}</TableCell>
            <TableCell>
              <Badge className={applicationStatusBadgeClass[a.status]}>
                {enumLabel(applicationStatus, a.status)}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
