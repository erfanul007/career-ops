import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  jobSource, remoteMode, employmentType, salaryPeriod, priority, jobLeadStatus, enumOptions,
} from "@/lib/enums";
import type { CreateJobLeadRequest, JobLeadDto } from "@/lib/api/model";
import { CompanySelect } from "./CompanySelect";

type FormValues = {
  title: string; source: number; sourceUrl: string; jobDescription: string; location: string;
  remoteMode: number; employmentType: number;
  salaryMin: string; salaryMax: string; salaryCurrency: string; salaryPeriod: number;
  priority: number; status: number; fitScore: string;
  nextActionAtUtc: string; deadlineAtUtc: string; notes: string;
};

const EMPTY: FormValues = {
  title: "", source: 0, sourceUrl: "", jobDescription: "", location: "",
  remoteMode: 0, employmentType: 0, salaryMin: "", salaryMax: "", salaryCurrency: "", salaryPeriod: 0,
  priority: 1, status: 0, fitScore: "", nextActionAtUtc: "", deadlineAtUtc: "", notes: "",
};

const toFormValues = (l: JobLeadDto): FormValues => ({
  title: l.title ?? "", source: l.source, sourceUrl: l.sourceUrl ?? "",
  jobDescription: l.jobDescription ?? "", location: l.location ?? "",
  remoteMode: l.remoteMode, employmentType: l.employmentType,
  salaryMin: l.salaryMin != null ? String(l.salaryMin) : "",
  salaryMax: l.salaryMax != null ? String(l.salaryMax) : "",
  salaryCurrency: l.salaryCurrency ?? "", salaryPeriod: l.salaryPeriod,
  priority: l.priority, status: l.status,
  fitScore: l.fitScore != null ? String(l.fitScore) : "",
  nextActionAtUtc: l.nextActionAtUtc ? l.nextActionAtUtc.slice(0, 10) : "",
  deadlineAtUtc: l.deadlineAtUtc ? l.deadlineAtUtc.slice(0, 10) : "",
  notes: l.notes ?? "",
});

const trimToNull = (s: string): string | null => (s.trim() === "" ? null : s.trim());
const numOrNull = (s: string): number | null => (s.trim() === "" ? null : Number(s));
// Date-only → 09:00 local → UTC (matches the dashboard "due today" contract, 04-conventions.md).
const dateToUtc = (s: string): string | null => (s ? new Date(`${s}T09:00:00`).toISOString() : null);

type Props = {
  initial?: JobLeadDto;
  pending: boolean;
  errors: string[];
  onSubmit: (req: CreateJobLeadRequest) => void;
};

const inputClass = "mt-1 w-full rounded border border-input bg-background p-2";

export function JobLeadForm({ initial, pending, errors, onSubmit }: Props) {
  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: EMPTY });
  const [companyMode, setCompanyMode] = useState<"existing" | "new">("existing");
  const [companyId, setCompanyId] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");

  useEffect(() => {
    reset(initial ? toFormValues(initial) : EMPTY);
    if (initial) { setCompanyMode("existing"); setCompanyId(String(initial.companyId)); }
  }, [initial, reset]);

  const submit = handleSubmit((v) =>
    onSubmit({
      companyId: companyMode === "existing" && companyId ? Number(companyId) : null,
      newCompanyName: companyMode === "new" ? trimToNull(newCompanyName) : null,
      title: v.title.trim(),
      source: Number(v.source),
      sourceUrl: trimToNull(v.sourceUrl),
      jobDescription: trimToNull(v.jobDescription),
      location: trimToNull(v.location),
      remoteMode: Number(v.remoteMode),
      employmentType: Number(v.employmentType),
      salaryMin: numOrNull(v.salaryMin),
      salaryMax: numOrNull(v.salaryMax),
      salaryCurrency: trimToNull(v.salaryCurrency),
      salaryPeriod: Number(v.salaryPeriod),
      priority: Number(v.priority),
      status: Number(v.status),
      fitScore: numOrNull(v.fitScore),
      nextActionAtUtc: dateToUtc(v.nextActionAtUtc),
      deadlineAtUtc: dateToUtc(v.deadlineAtUtc),
      notes: trimToNull(v.notes),
    }),
  );

  const selects: { name: keyof FormValues; label: string; map: Record<number, string> }[] = [
    { name: "source", label: "Source", map: jobSource },
    { name: "remoteMode", label: "Remote mode", map: remoteMode },
    { name: "employmentType", label: "Employment", map: employmentType },
    { name: "salaryPeriod", label: "Salary period", map: salaryPeriod },
    { name: "priority", label: "Priority", map: priority },
    { name: "status", label: "Status", map: jobLeadStatus },
  ];

  return (
    <form onSubmit={submit} className="space-y-4">
      {initial ? (
        <p className="text-sm">
          <span className="font-medium">Company:</span> {initial.companyName}
        </p>
      ) : (
        <CompanySelect
          mode={companyMode} companyId={companyId} newCompanyName={newCompanyName}
          onModeChange={setCompanyMode} onCompanyIdChange={setCompanyId}
          onNewCompanyNameChange={setNewCompanyName}
        />
      )}

      <div>
        <label className="block text-sm font-medium">Title</label>
        <input className={inputClass} {...register("title")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {selects.map((s) => (
          <div key={s.name}>
            <label className="block text-sm font-medium">{s.label}</label>
            <select className={inputClass} {...register(s.name)}>
              {enumOptions(s.map).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium">Location</label>
          <input className={inputClass} {...register("location")} />
        </div>
        <div>
          <label className="block text-sm font-medium">Source URL</label>
          <input type="url" className={inputClass} {...register("sourceUrl")} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium">Salary min</label>
          <input type="number" step="any" className={inputClass} {...register("salaryMin")} />
        </div>
        <div>
          <label className="block text-sm font-medium">Salary max</label>
          <input type="number" step="any" className={inputClass} {...register("salaryMax")} />
        </div>
        <div>
          <label className="block text-sm font-medium">Currency</label>
          <input className={inputClass} {...register("salaryCurrency")} />
        </div>
        <div>
          <label className="block text-sm font-medium">Fit score</label>
          <input type="number" min="0" max="100" className={inputClass} {...register("fitScore")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Next action</label>
          <input type="date" className={inputClass} {...register("nextActionAtUtc")} />
        </div>
        <div>
          <label className="block text-sm font-medium">Deadline</label>
          <input type="date" className={inputClass} {...register("deadlineAtUtc")} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Job description</label>
        <textarea rows={6} className={inputClass} {...register("jobDescription")} />
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

      <button type="submit" disabled={pending}
        className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">
        {pending ? "Saving…" : initial ? "Update lead" : "Add lead"}
      </button>
    </form>
  );
}
