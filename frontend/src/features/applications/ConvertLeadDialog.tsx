import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form/Field";
import { FormErrors } from "@/components/form/FormErrors";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useConvertToApplication, getGetApplicationsQueryKey,
} from "@/lib/api/applications/applications";
import { useGetResumeVariants } from "@/lib/api/resume-variants/resume-variants";
import { getGetJobLeadsQueryKey } from "@/lib/api/job-leads/job-leads";
import type { JobLeadDto } from "@/lib/api/model";

type Props = { lead: JobLeadDto; open: boolean; onOpenChange: (o: boolean) => void };

export function ConvertLeadDialog({ lead, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { data } = useGetResumeVariants();
  const variants = data?.data ?? [];
  const convert = useConvertToApplication();
  const [variantId, setVariantId] = useState<string>("");
  const [appliedAt, setAppliedAt] = useState(new Date().toISOString().slice(0, 10));
  const [errors, setErrors] = useState<string[]>([]);

  const defaultId = String(variants.find((v) => v.isDefault)?.id ?? variants[0]?.id ?? "");
  const selected = variantId || defaultId;

  const onConvert = async () => {
    setErrors([]);
    if (!selected) {
      setErrors(["Create a resume variant first."]);
      return;
    }
    try {
      await convert.mutateAsync({
        id: Number(lead.id),
        data: {
          resumeVariantId: Number(selected),
          appliedAtUtc: new Date(appliedAt).toISOString(),
          nextStep: null,
          nextActionAtUtc: null,
          notes: null,
        },
      });
      qc.invalidateQueries({ queryKey: getGetApplicationsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetJobLeadsQueryKey() });
      toast.success("Converted to application");
      onOpenChange(false);
    } catch (e) {
      const status = (e as { status?: number }).status;
      setErrors([status === 409 ? "This lead already has an application." : "Convert failed."]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert "{lead.title}" to application</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Resume variant">
            <Select value={selected} onValueChange={setVariantId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a variant" />
              </SelectTrigger>
              <SelectContent>
                {variants.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Applied date">
            <Input
              type="date"
              value={appliedAt}
              onChange={(e) => setAppliedAt(e.target.value)}
            />
          </Field>
          <FormErrors errors={errors} />
          <Button onClick={onConvert} disabled={convert.isPending}>
            {convert.isPending ? "Converting…" : "Convert"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
