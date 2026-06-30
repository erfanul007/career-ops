import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useJobMutations } from './useJobMutations';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: number;
  jobLabel: string;
  onDeleted?: () => void;
}

export function DeleteJobDialog({ open, onOpenChange, jobId, jobLabel, onDeleted }: Props) {
  const { remove } = useJobMutations();

  const confirm = () => {
    remove.mutate(
      { id: jobId },
      {
        onSuccess: () => {
          toast.success('Job deleted');
          onOpenChange(false);
          onDeleted?.();
        },
      },
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {jobLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the job and its follow-up tasks. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            className={cn(buttonVariants({ variant: 'destructive' }))}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
