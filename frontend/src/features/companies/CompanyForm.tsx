import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { CompanyDto, CreateCompanyRequest, CompanyType, MarketType, CompensationFit } from "@/lib/api/model";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/form/Field";
import { FormErrors } from "@/components/form/FormErrors";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COMPANY_TYPES: CompanyType[] = ['Unknown', 'Product', 'Outsourcing', 'Startup', 'Enterprise', 'Agency'];
const MARKET_TYPES: MarketType[] = ['Unknown', 'Local', 'Remote', 'Hybrid', 'International'];
const COMP_FITS: CompensationFit[] = ['Unknown', 'Low', 'Medium', 'High'];

type FormValues = {
  name: string; websiteUrl: string; linkedInUrl: string;
  country: string; city: string;
  companyType: CompanyType; marketType: MarketType; compensationFit: CompensationFit;
  notes: string;
};

const EMPTY: FormValues = {
  name: "", websiteUrl: "", linkedInUrl: "", country: "", city: "",
  companyType: 'Unknown', marketType: 'Unknown', compensationFit: 'Unknown', notes: "",
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
  const { register, handleSubmit, reset, setValue, getValues } = useForm<FormValues>({ defaultValues: EMPTY });

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
      companyType: v.companyType,
      marketType: v.marketType,
      compensationFit: v.compensationFit,
      notes: trimToNull(v.notes),
    }),
  );

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
        <Field label="Type">
          <Select defaultValue={getValues('companyType')} onValueChange={v => setValue('companyType', v as CompanyType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{COMPANY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Market">
          <Select defaultValue={getValues('marketType')} onValueChange={v => setValue('marketType', v as MarketType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{MARKET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Compensation fit">
          <Select defaultValue={getValues('compensationFit')} onValueChange={v => setValue('compensationFit', v as CompensationFit)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{COMP_FITS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
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
