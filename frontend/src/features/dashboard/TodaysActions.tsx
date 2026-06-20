import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCompleteFollowUpTask, useSkipFollowUpTask } from "@/lib/api/follow-up-tasks/follow-up-tasks";
import type { FollowUpTaskDto } from "@/lib/api/model";

export function TodaysActions({ due, overdue }: { due: FollowUpTaskDto[]; overdue: FollowUpTaskDto[] }) {
  const complete = useCompleteFollowUpTask();
  const skip = useSkipFollowUpTask();

  // No manual invalidation — the global MutationCache.onSettled rule (D37) refetches the summary.
  const act = async (fn: Promise<unknown>, msg: string) => {
    await fn;
    toast.success(msg);
  };

  const Row = (t: FollowUpTaskDto) => (
    <div key={String(t.id)} className="flex items-center justify-between gap-2 border-b py-2 last:border-0">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{t.title}</div>
        <div className="text-xs text-muted-foreground">{format(new Date(t.dueAtUtc), "dd.MM.yyyy")}</div>
      </div>
      <div className="shrink-0">
        <Button variant="ghost" size="sm" onClick={() => act(complete.mutateAsync({ id: Number(t.id) }), "Done")}>Done</Button>
        <Button variant="ghost" size="sm" onClick={() => act(skip.mutateAsync({ id: Number(t.id) }), "Skipped")}>Skip</Button>
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Today's actions</CardTitle></CardHeader>
        <CardContent>
          {due.length === 0
            ? <p className="text-sm text-muted-foreground">Nothing due.</p>
            : due.map(Row)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Overdue</CardTitle></CardHeader>
        <CardContent>
          {overdue.length === 0
            ? <p className="text-sm text-muted-foreground">Nothing overdue.</p>
            : overdue.map(Row)}
        </CardContent>
      </Card>
    </div>
  );
}
