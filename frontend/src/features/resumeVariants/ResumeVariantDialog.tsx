import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useCreateResumeVariant, useUpdateResumeVariant, getGetResumeVariantsQueryKey,
} from "@/lib/api/resume-variants/resume-variants";
import type { ResumeVariantDto, CreateResumeVariantRequest } from "@/lib/api/model";
import { ResumeVariantForm } from "./ResumeVariantForm";

const readErrors = (e: unknown): string[] => {
  const p = (e as { data?: { errors?: Record<string, string[]> } }).data;
  return p?.errors ? Object.values(p.errors).flat() : ["Save failed."];
};

type Props = { open: boolean; variant?: ResumeVariantDto; onOpenChange: (o: boolean) => void };

export function ResumeVariantDialog({ open, variant, onOpenChange }: Props) {
  const qc = useQueryClient();
  const create = useCreateResumeVariant();
  const update = useUpdateResumeVariant();
  const [errors, setErrors] = useState<string[]>([]);

  const onSubmit = async (req: CreateResumeVariantRequest) => {
    setErrors([]);
    try {
      if (variant) await update.mutateAsync({ id: Number(variant.id), data: req });
      else await create.mutateAsync({ data: req });
      qc.invalidateQueries({ queryKey: getGetResumeVariantsQueryKey() });
      toast.success(variant ? "Variant updated" : "Variant added");
      onOpenChange(false);
    } catch (e) { setErrors(readErrors(e)); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{variant ? "Edit resume variant" : "Add resume variant"}</DialogTitle></DialogHeader>
        <ResumeVariantForm key={variant?.id ?? "new"} variant={variant} pending={create.isPending || update.isPending} errors={errors} onSubmit={onSubmit} />
      </DialogContent>
    </Dialog>
  );
}
