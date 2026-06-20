import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { useUpdateApplication, getGetApplicationsQueryKey } from "@/lib/api/applications/applications";
import type { ApplicationDto, InterviewDto, UpdateApplicationRequest } from "@/lib/api/model";
import { useGetInterviews, useDeleteInterview } from "@/lib/api/interviews/interviews";
import { ApplicationForm } from "./ApplicationForm";
import { InterviewItem } from "@/features/interviews/InterviewItem";
import { InterviewSheet } from "@/features/interviews/InterviewSheet";
import { CompleteInterviewDialog } from "@/features/interviews/CompleteInterviewDialog";
import { Button } from "@/components/ui/button";

const readErrors = (e: unknown): string[] => {
  const p = (e as { data?: { errors?: Record<string, string[]> } }).data;
  return p?.errors ? Object.values(p.errors).flat() : ["Save failed."];
};

type Props = { app?: ApplicationDto; open: boolean; onOpenChange: (o: boolean) => void };

export function ApplicationSheet({ app, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const update = useUpdateApplication();
  const [errors, setErrors] = useState<string[]>([]);
  const { data: interviewsResp } = useGetInterviews();
  const removeInterview = useDeleteInterview();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<InterviewDto | undefined>();
  const [completing, setCompleting] = useState<InterviewDto | null>(null);

  if (!app) return null;

  const interviews = (interviewsResp?.data ?? []).filter(
    (i) => Number(i.applicationId) === Number(app.id),
  );

  const onDeleteInterview = async (i: InterviewDto) => {
    await removeInterview.mutateAsync({ id: Number(i.id) });
    toast.success("Interview deleted");
  };

  const onSubmit = async (data: UpdateApplicationRequest) => {
    setErrors([]);
    try {
      await update.mutateAsync({ id: Number(app.id), data });
      qc.invalidateQueries({ queryKey: getGetApplicationsQueryKey() });
      toast.success("Application updated");
      onOpenChange(false);
    } catch (e) {
      setErrors(readErrors(e));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {app.companyName} · {app.jobTitle}
          </SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <ApplicationForm
            key={app.id}
            app={app}
            pending={update.isPending}
            errors={errors}
            onSubmit={onSubmit}
          />
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Interviews</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setEditing(undefined); setAddOpen(true); }}
              >
                Add
              </Button>
            </div>
            {interviews.length === 0
              ? <p className="text-sm text-muted-foreground">No interviews yet.</p>
              : interviews.map((i) => (
                <InterviewItem
                  key={i.id}
                  interview={i}
                  onEdit={(x) => { setEditing(x); setAddOpen(true); }}
                  onComplete={setCompleting}
                  onDelete={onDeleteInterview}
                />
              ))}
          </div>
          <InterviewSheet
            open={addOpen}
            interview={editing}
            applicationId={Number(app.id)}
            onOpenChange={setAddOpen}
          />
          <CompleteInterviewDialog
            open={completing !== null}
            interview={completing}
            onOpenChange={(o) => !o && setCompleting(null)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
