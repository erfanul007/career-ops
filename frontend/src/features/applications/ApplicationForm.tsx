import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/form/Field";
import { FormErrors } from "@/components/form/FormErrors";
import type { ApplicationDto, UpdateApplicationRequest } from "@/lib/api/model";

type Props = {
  app: ApplicationDto;
  pending: boolean;
  errors: string[];
  onSubmit: (r: UpdateApplicationRequest) => void;
};

export function ApplicationForm({ app, pending, errors, onSubmit }: Props) {
  const { register, handleSubmit } = useForm<UpdateApplicationRequest>({
    defaultValues: {
      resumeVariantId: Number(app.resumeVariantId),
      appliedAtUtc: app.appliedAtUtc?.slice(0, 10),
      expectedSalary: app.expectedSalary,
      expectedSalaryCurrency: app.expectedSalaryCurrency ?? "",
      noticePeriod: app.noticePeriod ?? "",
      nextStep: app.nextStep ?? "",
      nextActionAtUtc: app.nextActionAtUtc?.slice(0, 10),
      notes: app.notes ?? "",
    },
  });

  const submit = handleSubmit((v) =>
    onSubmit({
      ...v,
      resumeVariantId: Number(v.resumeVariantId),
      appliedAtUtc: new Date(v.appliedAtUtc as string).toISOString(),
      nextActionAtUtc: v.nextActionAtUtc ? new Date(v.nextActionAtUtc as string).toISOString() : null,
    }),
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Applied date">
        <Input type="date" {...register("appliedAtUtc")} />
      </Field>
      <Field label="Notice period">
        <Input {...register("noticePeriod")} />
      </Field>
      <Field label="Next step">
        <Input {...register("nextStep")} />
      </Field>
      <Field label="Next action date">
        <Input type="date" {...register("nextActionAtUtc")} />
      </Field>
      <Field label="Notes">
        <Textarea rows={3} {...register("notes")} />
      </Field>
      <FormErrors errors={errors} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
