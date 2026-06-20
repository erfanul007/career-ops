import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { useUpdateApplication, getGetApplicationsQueryKey } from "@/lib/api/applications/applications";
import type { ApplicationDto, UpdateApplicationRequest } from "@/lib/api/model";
import { ApplicationForm } from "./ApplicationForm";

const readErrors = (e: unknown): string[] => {
  const p = (e as { data?: { errors?: Record<string, string[]> } }).data;
  return p?.errors ? Object.values(p.errors).flat() : ["Save failed."];
};

type Props = { app?: ApplicationDto; open: boolean; onOpenChange: (o: boolean) => void };

export function ApplicationSheet({ app, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const update = useUpdateApplication();
  const [errors, setErrors] = useState<string[]>([]);
  if (!app) return null;

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
        </div>
      </SheetContent>
    </Sheet>
  );
}
