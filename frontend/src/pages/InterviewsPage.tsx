import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetInterviews, useDeleteInterview } from "@/lib/api/interviews/interviews";
import type { InterviewDto } from "@/lib/api/model";
import { InterviewItem } from "@/features/interviews/InterviewItem";
import { InterviewSheet } from "@/features/interviews/InterviewSheet";
import { CompleteInterviewDialog } from "@/features/interviews/CompleteInterviewDialog";
import { InterviewDetailSheet } from "@/features/interviews/InterviewDetailSheet";

export default function InterviewsPage() {
  const { data, isLoading } = useGetInterviews();
  const remove = useDeleteInterview();
  const all = data?.data ?? [];

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<InterviewDto | undefined>();
  const [completing, setCompleting] = useState<InterviewDto | null>(null);
  const [detail, setDetail] = useState<InterviewDto | undefined>();
  const [detailOpen, setDetailOpen] = useState(false);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const isUpcoming = (i: InterviewDto) => i.status === 0 && new Date(i.scheduledAtUtc).getTime() >= now;
    const up = all.filter(isUpcoming).sort((a, b) => +new Date(a.scheduledAtUtc) - +new Date(b.scheduledAtUtc));
    const pa = all.filter((i) => !isUpcoming(i)).sort((a, b) => +new Date(b.scheduledAtUtc) - +new Date(a.scheduledAtUtc));
    return { upcoming: up, past: pa };
  }, [all]);

  const openCreate = () => { setEditing(undefined); setSheetOpen(true); };
  const openEdit = (i: InterviewDto) => { setEditing(i); setSheetOpen(true); };
  const openDetail = (i: InterviewDto) => { setDetail(i); setDetailOpen(true); };
  const onDelete = async (i: InterviewDto) => {
    if (!confirm("Delete this interview?")) return;
    await remove.mutateAsync({ id: Number(i.id) });
    toast.success("Interview deleted");
  };

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Interviews</h1>
        <Button onClick={openCreate}>Add interview</Button>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Upcoming</h2>
        {upcoming.length === 0
          ? <p className="text-sm text-muted-foreground">No upcoming interviews.</p>
          : upcoming.map((i) => <InterviewItem key={i.id} interview={i} onEdit={openEdit} onComplete={setCompleting} onDelete={onDelete} onView={openDetail} />)}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Completed &amp; past</h2>
        {past.length === 0
          ? <p className="text-sm text-muted-foreground">Nothing yet.</p>
          : past.map((i) => <InterviewItem key={i.id} interview={i} onEdit={openEdit} onComplete={setCompleting} onDelete={onDelete} onView={openDetail} />)}
      </section>

      <InterviewDetailSheet
        interview={detail}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(i) => { setDetailOpen(false); openEdit(i); }}
      />
      <InterviewSheet open={sheetOpen} interview={editing} onOpenChange={setSheetOpen} />
      <CompleteInterviewDialog open={completing !== null} interview={completing} onOpenChange={(o) => !o && setCompleting(null)} />
    </div>
  );
}
