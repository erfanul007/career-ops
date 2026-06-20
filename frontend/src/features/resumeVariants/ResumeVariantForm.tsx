import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/form/Field";
import { FormErrors } from "@/components/form/FormErrors";
import type { ResumeVariantDto, CreateResumeVariantRequest } from "@/lib/api/model";

type Props = { variant?: ResumeVariantDto; pending: boolean; errors: string[]; onSubmit: (r: CreateResumeVariantRequest) => void };

export function ResumeVariantForm({ variant, pending, errors, onSubmit }: Props) {
  const { register, handleSubmit } = useForm<CreateResumeVariantRequest>({
    defaultValues: {
      name: variant?.name ?? "", targetRole: variant?.targetRole ?? "",
      summary: variant?.summary ?? "", notes: variant?.notes ?? "",
    },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Name"><Input {...register("name")} /></Field>
      <Field label="Target role"><Input {...register("targetRole")} /></Field>
      <Field label="Summary"><Textarea rows={3} {...register("summary")} /></Field>
      <Field label="Notes"><Textarea rows={3} {...register("notes")} /></Field>
      <FormErrors errors={errors} />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
    </form>
  );
}
