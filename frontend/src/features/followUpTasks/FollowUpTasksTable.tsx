import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import type { FollowUpTaskDto } from "@/lib/api/model";
import { followUpStatus, relatedEntityType, enumLabel } from "@/lib/enums";

type Props = {
  tasks: FollowUpTaskDto[];
  onEdit: (t: FollowUpTaskDto) => void;
  onComplete: (t: FollowUpTaskDto) => void;
  onSkip: (t: FollowUpTaskDto) => void;
};

export function FollowUpTasksTable({ tasks, onEdit, onComplete, onSkip }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Linked</TableHead>
          <TableHead>Due</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((t) => (
          <TableRow key={String(t.id)} className="cursor-pointer" onClick={() => onEdit(t)}>
            <TableCell><Badge variant="secondary">{enumLabel(followUpStatus, t.status)}</Badge></TableCell>
            <TableCell className="font-medium">{t.title}</TableCell>
            <TableCell>{enumLabel(relatedEntityType, t.relatedEntityType)}</TableCell>
            <TableCell>{format(new Date(t.dueAtUtc), "dd.MM.yyyy")}</TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
              {t.status === 0 && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => onComplete(t)}>Done</Button>
                  <Button variant="ghost" size="sm" onClick={() => onSkip(t)}>Skip</Button>
                </>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
