import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useCreateFollowUpTask, useUpdateFollowUpTask,
  getGetFollowUpTasksQueryKey, getGetDueFollowUpTasksQueryKey,
} from "@/lib/api/follow-up-tasks/follow-up-tasks";
import type { FollowUpTaskDto, CreateFollowUpTaskRequest } from "@/lib/api/model";
import { FollowUpTaskForm } from "./FollowUpTaskForm";

const readErrors = (e: unknown): string[] => {
  const p = (e as { data?: { errors?: Record<string, string[]> } }).data;
  return p?.errors ? Object.values(p.errors).flat() : ["Save failed."];
};

type Props = { open: boolean; task?: FollowUpTaskDto; onOpenChange: (o: boolean) => void };

export function FollowUpTaskDialog({ open, task, onOpenChange }: Props) {
  const qc = useQueryClient();
  const create = useCreateFollowUpTask();
  const update = useUpdateFollowUpTask();
  const [errors, setErrors] = useState<string[]>([]);
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetFollowUpTasksQueryKey() });
    qc.invalidateQueries({ queryKey: getGetDueFollowUpTasksQueryKey() });
  };

  const onSubmit = async (req: CreateFollowUpTaskRequest) => {
    setErrors([]);
    try {
      if (task) await update.mutateAsync({ id: Number(task.id), data: req });
      else await create.mutateAsync({ data: req });
      invalidate();
      toast.success(task ? "Task updated" : "Task added");
      onOpenChange(false);
    } catch (e) { setErrors(readErrors(e)); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{task ? "Edit task" : "Add task"}</DialogTitle></DialogHeader>
        <FollowUpTaskForm key={task?.id ?? "new"} task={task} pending={create.isPending || update.isPending} errors={errors} onSubmit={onSubmit} />
      </DialogContent>
    </Dialog>
  );
}
