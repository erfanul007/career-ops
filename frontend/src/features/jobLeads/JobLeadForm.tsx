import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  jobSource, remoteMode, employmentType, salaryPeriod, priority, jobLeadStatus, type EnumMap,
} from "@/lib/enums";
import type { CreateJobLeadRequest, JobLeadDto } from "@/lib/api/model";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/form/Field";
import { FormErrors } from "@/components/form/FormErrors";
import { EnumSelect } from "@/components/form/EnumSelect";
import { CompanySelect } from "./CompanySelect";

type FormValues = {
  title: string; source: number; sourceUrl: string; jobDescription: string; location: string;
  remoteMode: number; employmentType: number;
  salaryMin: string; salaryMax: string; salaryCurrency: string; salaryPeriod: number;
  priority: number; status: number; fitScore: string;
  nextActionAtUtc: string; deadlineAtUtc: string; notes: string;
  aiSummary: string; missingKeywords: string; suggestedResumeAngle: string;
};

const EMPTY: FormValues = {
  title: "", source: 0, sourceUrl: "", jobDescription: "", location: "",
  remoteMode: 0, employmentType: 0, salaryMin: "", salaryMax: "", salaryCurrency: "", salaryPeriod: 0,
  priority: 1, status: 0, fitScore: "", nextActionAtUtc: "", deadlineAtUtc: "", notes: "",
  aiSummary: "", missingKeywords: "", suggestedResumeAngle: "",
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
  aiSummary: l.aiSummary ?? "", missingKeywords: l.missingKeywords ?? "", suggestedResumeAngle: l.suggestedResumeAngle ?? "",
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

export function JobLeadForm({ initial, pending, errors, onSubmit }: Props) {
  const { register, handleSubmit, reset, control } = useForm<FormValues>({ defaultValues: EMPTY });
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
      aiSummary: trimToNull(v.aiSummary),
      missingKeywords: trimToNull(v.missingKeywords),
      suggestedResumeAngle: trimToNull(v.suggestedResumeAngle),
      nextActionAtUtc: dateToUtc(v.nextActionAtUtc),
      deadlineAtUtc: dateToUtc(v.deadlineAtUtc),
      notes: trimToNull(v.notes),
    }),
  );

  const selects: { name: keyof FormValues; label: string; map: EnumMap }[] = [
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
        <p className="text-sm"><span className="font-medium">Company:</span> {initial.companyName}</p>
      ) : (
        <CompanySelect
          mode={companyMode} companyId={companyId} newCompanyName={newCompanyName}
          onModeChange={setCompanyMode} onCompanyIdChange={setCompanyId}
          onNewCompanyNameChange={setNewCompanyName}
        />
      )}

      <Field label="Title"><Input {...register("title")} /></Field>

      <div className="grid grid-cols-2 gap-4">
        {selects.map((s) => (
          <Field key={s.name} label={s.label}>
            <EnumSelect control={control} name={s.name} map={s.map} />
          </Field>
        ))}
        <Field label="Location"><Input {...register("location")} /></Field>
        <Field label="Source URL"><Input type="url" {...register("sourceUrl")} /></Field>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="Salary min"><Input type="number" step="any" {...register("salaryMin")} /></Field>
        <Field label="Salary max"><Input type="number" step="any" {...register("salaryMax")} /></Field>
        <Field label="Currency"><Input {...register("salaryCurrency")} /></Field>
        <Field label="Fit score"><Input type="number" min="0" max="100" {...register("fitScore")} /></Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Next action"><Input type="date" {...register("nextActionAtUtc")} /></Field>
        <Field label="Deadline"><Input type="date" {...register("deadlineAtUtc")} /></Field>
      </div>

      <Field label="Job description"><Textarea rows={6} {...register("jobDescription")} /></Field>
      <Field label="Notes"><Textarea rows={3} {...register("notes")} /></Field>
      <Field label="AI summary"><Textarea rows={3} {...register("aiSummary")} /></Field>
      <Field label="Missing keywords"><Textarea rows={2} {...register("missingKeywords")} /></Field>
      <Field label="Suggested resume angle"><Textarea rows={2} {...register("suggestedResumeAngle")} /></Field>

      <FormErrors errors={errors} />

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : initial ? "Update lead" : "Add lead"}
      </Button>
    </form>
  );
}
