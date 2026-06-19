import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { companyType, marketType, compensationFit, enumOptions } from "@/lib/enums";
import type { CompanyDto, CreateCompanyRequest } from "@/lib/api/model";

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

const inputClass = "mt-1 w-full rounded border border-input bg-background p-2";

export function CompanyForm({ initial, pending, errors, onSubmit, onCancel }: Props) {
  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: EMPTY });

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

  const selects: { name: keyof FormValues; label: string; map: Record<number, string> }[] = [
    { name: "companyType", label: "Type", map: companyType },
    { name: "marketType", label: "Market", map: marketType },
    { name: "compensationFit", label: "Compensation fit", map: compensationFit },
  ];

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Name</label>
        <input className={inputClass} {...register("name")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Website URL</label>
          <input type="url" className={inputClass} {...register("websiteUrl")} />
        </div>
        <div>
          <label className="block text-sm font-medium">LinkedIn URL</label>
          <input type="url" className={inputClass} {...register("linkedInUrl")} />
        </div>
        <div>
          <label className="block text-sm font-medium">Country</label>
          <input className={inputClass} {...register("country")} />
        </div>
        <div>
          <label className="block text-sm font-medium">City</label>
          <input className={inputClass} {...register("city")} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {selects.map((s) => (
          <div key={s.name}>
            <label className="block text-sm font-medium">{s.label}</label>
            <select className={inputClass} {...register(s.name)}>
              {enumOptions(s.map).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div>
        <label className="block text-sm font-medium">Notes</label>
        <textarea rows={3} className={inputClass} {...register("notes")} />
      </div>

      {errors.length > 0 && (
        <ul className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {errors.map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending}
          className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">
          {pending ? "Saving…" : initial ? "Update" : "Add company"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded border px-4 py-2">Cancel</button>
        )}
      </div>
    </form>
  );
}
