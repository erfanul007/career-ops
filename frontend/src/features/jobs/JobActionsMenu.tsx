import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { DeleteJobDialog } from './DeleteJobDialog';

interface Props {
  jobId: number;
  jobLabel: string;
  onDeleted?: () => void;
}

export function JobActionsMenu({ jobId, jobLabel, onDeleted }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" aria-label="Job actions">
            <MoreVertical aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setConfirmOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
