import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useGetFollowUpTasks, useCompleteFollowUpTask, useSkipFollowUpTask, useDeleteFollowUpTask,
  getGetFollowUpTasksQueryKey, getGetDueFollowUpTasksQueryKey,
} from "@/lib/api/follow-up-tasks/follow-up-tasks";
import type { FollowUpTaskDto } from "@/lib/api/model";
import { FollowUpTasksTable } from "@/features/followUpTasks/FollowUpTasksTable";
import { FollowUpTaskDialog } from "@/features/followUpTasks/FollowUpTaskDialog";

export default function TasksPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useGetFollowUpTasks();
  const complete = useCompleteFollowUpTask();
  const skip = useSkipFollowUpTask();
  const remove = useDeleteFollowUpTask();
  const all = useMemo(() => data?.data ?? [], [data]);

  const [filter, setFilter] = useState("pending");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FollowUpTaskDto | undefined>();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetFollowUpTasksQueryKey() });
    qc.invalidateQueries({ queryKey: getGetDueFollowUpTasksQueryKey() });
  };

  const tasks = filter === "all" ? all : all.filter((t) => (filter === "pending" ? t.status === 0 : t.status !== 0));

  const onComplete = async (t: FollowUpTaskDto) => {
    await complete.mutateAsync({ id: Number(t.id) });
    invalidate();
    toast.success("Done");
  };
  const onSkip = async (t: FollowUpTaskDto) => {
    await skip.mutateAsync({ id: Number(t.id) });
    invalidate();
    toast.success("Skipped");
  };
  const onDelete = async (t: FollowUpTaskDto) => {
    if (!confirm("Delete this task?")) return;
    await remove.mutateAsync({ id: Number(t.id) });
    invalidate();
    toast.success("Task deleted");
  };

  if (isLoading) return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <Button onClick={() => { setEditing(undefined); setOpen(true); }}>Add task</Button>
      </div>
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="done">Completed / skipped</SelectItem>
          <SelectItem value="all">All</SelectItem>
        </SelectContent>
      </Select>
      <FollowUpTasksTable
        tasks={tasks}
        onEdit={(t) => { setEditing(t); setOpen(true); }}
        onComplete={onComplete}
        onSkip={onSkip}
        onDelete={onDelete}
      />
      <FollowUpTaskDialog open={open} task={editing} onOpenChange={setOpen} />
    </div>
  );
}
