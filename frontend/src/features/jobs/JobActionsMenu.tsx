import { useState } from 'react';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { DeleteJobDialog } from './DeleteJobDialog';
import { EditJobDialog } from './EditJobDialog';

interface Props {
  jobId: number;
  jobLabel: string;
  onDeleted?: () => void;
}

export function JobActionsMenu({ jobId, jobLabel, onDeleted }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" aria-label="Job actions">
            <MoreVertical aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil aria-hidden /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setConfirmOpen(true)}
          >
            <Trash2 aria-hidden /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditJobDialog open={editOpen} onOpenChange={setEditOpen} jobId={jobId} />
      <DeleteJobDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        jobId={jobId}
        jobLabel={jobLabel}
        onDeleted={onDeleted}
      />
    </>
  );
}
