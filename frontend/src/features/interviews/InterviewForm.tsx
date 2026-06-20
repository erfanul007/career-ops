import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EnumSelect } from "@/components/form/EnumSelect";
import { interviewRoundType, interviewStatus } from "@/lib/enums";
import type { ApplicationDto, InterviewDto } from "@/lib/api/model";

const dtLocal = (iso?: string) => (iso ? iso.slice(0, 16) : new Date().toISOString().slice(0, 16));
const toNull = (s?: string | null) => { const t = s?.trim(); return t ? t : null; };

export type InterviewFormValues = {
  applicationId: number; roundType: number; scheduledAtUtc: string; durationMinutes: string;
  interviewerName: string; interviewerRole: string; meetingUrl: string; status: number; prepNotes: string;
};

type Props = {
  interview?: InterviewDto;
  fixedApplicationId?: number;
  applications?: ApplicationDto[];   // shown as a picker only when no fixedApplicationId
  pending: boolean;
  errors: string[];
  onSubmit: (v: {
    applicationId: number; roundType: number; scheduledAtUtc: string; durationMinutes: number | null;
    interviewerName: string | null; interviewerRole: string | null; meetingUrl: string | null;
    status: number; prepNotes: string | null;
  }) => void;
};

export function InterviewForm({ interview, fixedApplicationId, applications = [], pending, errors, onSubmit }: Props) {
  const { register, handleSubmit, control } = useForm<InterviewFormValues>({
    defaultValues: {
      applicationId: Number(interview?.applicationId ?? fixedApplicationId ?? applications[0]?.id ?? 0),
      roundType: interview?.roundType ?? 0,
      scheduledAtUtc: dtLocal(interview?.scheduledAtUtc),
      durationMinutes: interview?.durationMinutes != null ? String(interview.durationMinutes) : "",
      interviewerName: interview?.interviewerName ?? "",
      interviewerRole: interview?.interviewerRole ?? "",
      meetingUrl: interview?.meetingUrl ?? "",
      status: interview?.status ?? 0,
      prepNotes: interview?.prepNotes ?? "",
    },
  });

  const submit = handleSubmit((v) => onSubmit({
    applicationId: Number(v.applicationId),
    roundType: Number(v.roundType),
    scheduledAtUtc: new Date(v.scheduledAtUtc).toISOString(),
    durationMinutes: v.durationMinutes ? Number(v.durationMinutes) : null,
    interviewerName: toNull(v.interviewerName),
    interviewerRole: toNull(v.interviewerRole),
    meetingUrl: toNull(v.meetingUrl),
    status: Number(v.status),
    prepNotes: toNull(v.prepNotes),
  }));

  const applicationOptions = applications.map((a) => ({ value: Number(a.id), label: `${a.companyName} · ${a.jobTitle}` }));

  return (
    <form onSubmit={submit} className="space-y-4">
      {!fixedApplicationId && applications.length > 0 && (
        <EnumSelect control={control} name="applicationId" label="Application"
          options={applicationOptions} />
      )}
      <EnumSelect control={control} name="roundType" label="Round" map={interviewRoundType} />
      <label className="block space-y-1">
        <span className="text-sm font-medium">Scheduled</span>
        <Input type="datetime-local" {...register("scheduledAtUtc")} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Duration (minutes)</span>
        <Input type="number" min={1} {...register("durationMinutes")} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Interviewer</span>
        <Input {...register("interviewerName")} placeholder="Name" />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Role</span>
        <Input {...register("interviewerRole")} placeholder="Role" />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Meeting URL</span>
        <Input {...register("meetingUrl")} placeholder="https://…" />
      </label>
      {interview && <EnumSelect control={control} name="status" label="Status" map={interviewStatus} />}
      <label className="block space-y-1">
        <span className="text-sm font-medium">Prep notes</span>
        <Textarea {...register("prepNotes")} rows={3} />
      </label>
      {errors.length > 0 && (
        <ul className="text-sm text-red-600">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
      )}
      <Button type="submit" disabled={pending}>{interview ? "Save" : "Add interview"}</Button>
    </form>
  );
}
