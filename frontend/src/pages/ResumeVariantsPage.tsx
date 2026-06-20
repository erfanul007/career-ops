import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetResumeVariants, useDeleteResumeVariant, useMakeResumeVariantDefault, getGetResumeVariantsQueryKey,
} from "@/lib/api/resume-variants/resume-variants";
import type { ResumeVariantDto } from "@/lib/api/model";
import { ResumeVariantsTable } from "@/features/resumeVariants/ResumeVariantsTable";
import { ResumeVariantDialog } from "@/features/resumeVariants/ResumeVariantDialog";

export default function ResumeVariantsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useGetResumeVariants();
  const remove = useDeleteResumeVariant();
  const makeDefault = useMakeResumeVariantDefault();
  const variants = data?.data ?? [];

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ResumeVariantDto | undefined>();
  const invalidate = () => qc.invalidateQueries({ queryKey: getGetResumeVariantsQueryKey() });

  const onMakeDefault = async (v: ResumeVariantDto) => { await makeDefault.mutateAsync({ id: Number(v.id) }); invalidate(); toast.success(`"${v.name}" is now default`); };
  const onDelete = async (v: ResumeVariantDto) => {
    if (!confirm(`Delete "${v.name}"?`)) return;
    try { await remove.mutateAsync({ id: Number(v.id) }); invalidate(); toast.success("Variant deleted"); }
    catch { toast.error("Cannot delete — variant is used by an application."); }
  };

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Resume Variants</h1>
        <Button onClick={() => { setEditing(undefined); setOpen(true); }}>Add variant</Button>
      </div>
      <ResumeVariantsTable variants={variants} onEdit={(v) => { setEditing(v); setOpen(true); }} onMakeDefault={onMakeDefault} onDelete={onDelete} />
      <ResumeVariantDialog open={open} variant={editing} onOpenChange={setOpen} />
    </div>
  );
}
