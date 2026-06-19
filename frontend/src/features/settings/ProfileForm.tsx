import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useGetUserProfile, useUpdateUserProfile } from "@/lib/api/settings/settings";
import type { UpdateUserProfileRequest, UserProfileDto } from "@/lib/api/model";

type FormValues = {
  fullName: string;
  email: string;
  phone: string;
  currentLocation: string;
  targetRoles: string;
  linkedInUrl: string;
  gitHubUrl: string;
  portfolioUrl: string;
  targetSalaryMin: string;
  targetSalaryCurrency: string;
  searchDeadlineUtc: string;
  preferredTechStack: string;
  careerSummary: string;
};

const EMPTY: FormValues = {
  fullName: "", email: "", phone: "", currentLocation: "", targetRoles: "",
  linkedInUrl: "", gitHubUrl: "", portfolioUrl: "", targetSalaryMin: "",
  targetSalaryCurrency: "", searchDeadlineUtc: "", preferredTechStack: "", careerSummary: "",
};

const TEXT_FIELDS: { name: keyof FormValues; label: string; type?: string }[] = [
  { name: "fullName", label: "Full name" },
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Phone" },
  { name: "currentLocation", label: "Location" },
  { name: "targetRoles", label: "Target roles" },
  { name: "linkedInUrl", label: "LinkedIn URL", type: "url" },
  { name: "gitHubUrl", label: "GitHub URL", type: "url" },
  { name: "portfolioUrl", label: "Portfolio URL", type: "url" },
  { name: "targetSalaryCurrency", label: "Salary currency (ISO, e.g. NOK)" },
  { name: "preferredTechStack", label: "Preferred tech stack" },
];

function toFormValues(p: UserProfileDto): FormValues {
  return {
    fullName: p.fullName ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    currentLocation: p.currentLocation ?? "",
    targetRoles: p.targetRoles ?? "",
    linkedInUrl: p.linkedInUrl ?? "",
    gitHubUrl: p.gitHubUrl ?? "",
    portfolioUrl: p.portfolioUrl ?? "",
    targetSalaryMin: p.targetSalaryMin != null ? String(p.targetSalaryMin) : "",
    targetSalaryCurrency: p.targetSalaryCurrency ?? "",
    searchDeadlineUtc: p.searchDeadlineUtc ? p.searchDeadlineUtc.slice(0, 10) : "",
    preferredTechStack: p.preferredTechStack ?? "",
    careerSummary: p.careerSummary ?? "",
  };
}

const trimToNull = (s: string): string | null => (s.trim() === "" ? null : s.trim());

export function ProfileForm() {
  const { data: response, isLoading } = useGetUserProfile();
  const update = useUpdateUserProfile();
  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: EMPTY });
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (response?.data) reset(toFormValues(response.data));
  }, [response, reset]);

  const onSubmit = handleSubmit(async (v) => {
    setErrors([]);
    setSaved(false);
    const req: UpdateUserProfileRequest = {
      fullName: v.fullName.trim(),
      email: trimToNull(v.email),
      phone: trimToNull(v.phone),
      linkedInUrl: trimToNull(v.linkedInUrl),
      gitHubUrl: trimToNull(v.gitHubUrl),
      portfolioUrl: trimToNull(v.portfolioUrl),
      currentLocation: trimToNull(v.currentLocation),
      targetRoles: trimToNull(v.targetRoles),
      targetSalaryMin: v.targetSalaryMin.trim() === "" ? null : Number(v.targetSalaryMin),
      targetSalaryCurrency: trimToNull(v.targetSalaryCurrency),
      searchDeadlineUtc: v.searchDeadlineUtc ? new Date(v.searchDeadlineUtc).toISOString() : null,
      preferredTechStack: trimToNull(v.preferredTechStack),
      careerSummary: trimToNull(v.careerSummary),
    };
    try {
      const res = await update.mutateAsync({ data: req });
      if (res.data && "id" in res.data) reset(toFormValues(res.data));
      setSaved(true);
    } catch (e) {
      const problem = (e as { data?: { errors?: Record<string, string[]> } }).data;
      setErrors(problem?.errors ? Object.values(problem.errors).flat() : ["Save failed."]);
    }
  });

  if (isLoading) return <p>Loading…</p>;

  const inputClass = "mt-1 w-full rounded border border-input bg-background p-2";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {TEXT_FIELDS.map((f) => (
        <div key={f.name}>
          <label className="block text-sm font-medium">{f.label}</label>
          <input type={f.type ?? "text"} className={inputClass} {...register(f.name)} />
        </div>
      ))}

      <div>
        <label className="block text-sm font-medium">Target salary (min)</label>
        <input type="number" step="any" min="0" className={inputClass} {...register("targetSalaryMin")} />
      </div>

      <div>
        <label className="block text-sm font-medium">Search deadline</label>
        <input type="date" className={inputClass} {...register("searchDeadlineUtc")} />
      </div>

      <div>
        <label className="block text-sm font-medium">Career summary</label>
        <textarea rows={4} className={inputClass} {...register("careerSummary")} />
      </div>

      {errors.length > 0 && (
        <ul className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {errors.map((msg) => <li key={msg}>{msg}</li>)}
        </ul>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={update.isPending}
          className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          {update.isPending ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-sm text-green-600">Saved.</span>}
      </div>
    </form>
  );
}
