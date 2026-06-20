import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCreateInterview, useUpdateInterview } from "@/lib/api/interviews/interviews";
import { useGetApplications } from "@/lib/api/applications/applications";
import type { InterviewDto } from "@/lib/api/model";
import { InterviewForm } from "./InterviewForm";

const readErrors = (e: unknown): string[] => {
  const p = (e as { data?: { errors?: Record<string, string[]> } }).data;
  return p?.errors ? Object.values(p.errors).flat() : ["Save failed."];
};

type Props = { open: boolean; interview?: InterviewDto; applicationId?: number; onOpenChange: (o: boolean) => void };

export function InterviewSheet({ open, interview, applicationId, onOpenChange }: Props) {
  const create = useCreateInterview();
  const update = useUpdateInterview();
  const { data: appsResp } = useGetApplications();
  const applications = appsResp?.data ?? [];
  const [errors, setErrors] = useState<string[]>([]);

  const onSubmit = async (v: Parameters<React.ComponentProps<typeof InterviewForm>["onSubmit"]>[0]) => {
    setErrors([]);
    try {
      if (interview) {
        const { applicationId: _ignored, ...data } = v;   // applicationId is immutable on update
        await update.mutateAsync({ id: Number(interview.id), data });
        toast.success("Interview updated");
      } else {
        const { status: _s, ...createData } = v;   // status is not part of CreateInterviewRequest
        await create.mutateAsync({ data: createData });
        toast.success("Interview added");
      }
      onOpenChange(false);
    } catch (e) {
      const status = (e as { status?: number }).status;
      setErrors(status === 404 ? ["That application no longer exists."] : readErrors(e));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader><SheetTitle>{interview ? "Edit interview" : "Add interview"}</SheetTitle></SheetHeader>
        <div className="p-4">
          <InterviewForm
            key={interview?.id ?? applicationId ?? "new"}
            interview={interview}
            fixedApplicationId={applicationId}
            applications={applications}
            pending={create.isPending || update.isPending}
            errors={errors}
            onSubmit={onSubmit}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
