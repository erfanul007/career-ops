import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useGetUserProfile, useUpdateUserProfile } from "@/lib/api/settings/settings";
import type { UpdateUserProfileRequest, UserProfileDto } from "@/lib/api/model";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Field } from "@/components/form/Field";
import { FormErrors } from "@/components/form/FormErrors";

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

  useEffect(() => {
    if (response?.data) reset(toFormValues(response.data));
  }, [response, reset]);

  const onSubmit = handleSubmit(async (v) => {
    setErrors([]);
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
      toast.success("Profile saved");
    } catch (e) {
      const problem = (e as { data?: { errors?: Record<string, string[]> } }).data;
      setErrors(problem?.errors ? Object.values(problem.errors).flat() : ["Save failed."]);
    }
  });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-24 w-full" /></div>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {TEXT_FIELDS.map((f) => (
        <Field key={f.name} label={f.label}>
          <Input type={f.type ?? "text"} {...register(f.name)} />
        </Field>
      ))}

      <Field label="Target salary (min)">
        <Input type="number" step="any" min="0" {...register("targetSalaryMin")} />
      </Field>

      <Field label="Search deadline">
        <Input type="date" {...register("searchDeadlineUtc")} />
      </Field>

      <Field label="Career summary">
        <Textarea rows={4} {...register("careerSummary")} />
      </Field>

      <FormErrors errors={errors} />

      <Button type="submit" disabled={update.isPending}>
        {update.isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
