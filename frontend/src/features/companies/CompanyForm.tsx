import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { companyType, marketType, compensationFit, type EnumMap } from "@/lib/enums";
import type { CompanyDto, CreateCompanyRequest } from "@/lib/api/model";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/form/Field";
import { FormErrors } from "@/components/form/FormErrors";
import { EnumSelect } from "@/components/form/EnumSelect";

type FormValues = {
  name: string; websiteUrl: string; linkedInUrl: string;
  country: string; city: string;
  companyType: number; marketType: number; compensationFit: number;
  notes: string;
};

const EMPTY: FormValues = {
  name: "", websiteUrl: "", linkedInUrl: "", country: "", city: "",
  companyType: 0, marketType: 0, compensationFit: 0, notes: "",
};

const toFormValues = (c: CompanyDto): FormValues => ({
  name: c.name ?? "", websiteUrl: c.websiteUrl ?? "", linkedInUrl: c.linkedInUrl ?? "",
  country: c.country ?? "", city: c.city ?? "",
  companyType: c.companyType, marketType: c.marketType, compensationFit: c.compensationFit,
  notes: c.notes ?? "",
});

const trimToNull = (s: string): string | null => (s.trim() === "" ? null : s.trim());

type Props = {
  initial?: CompanyDto;
  pending: boolean;
  errors: string[];
  onSubmit: (req: CreateCompanyRequest) => void;
  onCancel?: () => void;
};

export function CompanyForm({ initial, pending, errors, onSubmit, onCancel }: Props) {
  const { register, handleSubmit, reset, control } = useForm<FormValues>({ defaultValues: EMPTY });

  useEffect(() => {
    reset(initial ? toFormValues(initial) : EMPTY);
  }, [initial, reset]);

  const submit = handleSubmit((v) =>
    onSubmit({
      name: v.name.trim(),
      websiteUrl: trimToNull(v.websiteUrl),
      linkedInUrl: trimToNull(v.linkedInUrl),
      country: trimToNull(v.country),
      city: trimToNull(v.city),
      companyType: Number(v.companyType),
      marketType: Number(v.marketType),
      compensationFit: Number(v.compensationFit),
      notes: trimToNull(v.notes),
    }),
  );

  const selects: { name: keyof FormValues; label: string; map: EnumMap }[] = [
    { name: "companyType", label: "Type", map: companyType },
    { name: "marketType", label: "Market", map: marketType },
    { name: "compensationFit", label: "Compensation fit", map: compensationFit },
  ];

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Name"><Input {...register("name")} /></Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Website URL"><Input type="url" {...register("websiteUrl")} /></Field>
        <Field label="LinkedIn URL"><Input type="url" {...register("linkedInUrl")} /></Field>
        <Field label="Country"><Input {...register("country")} /></Field>
        <Field label="City"><Input {...register("city")} /></Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {selects.map((s) => (
          <Field key={s.name} label={s.label}>
            <EnumSelect control={control} name={s.name} map={s.map} />
          </Field>
        ))}
      </div>

      <Field label="Notes"><Textarea rows={3} {...register("notes")} /></Field>

      <FormErrors errors={errors} />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : initial ? "Update" : "Add company"}
        </Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}
