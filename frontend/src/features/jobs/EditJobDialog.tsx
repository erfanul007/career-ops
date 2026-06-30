import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/form/Field';
import { Skeleton } from '@/components/ui/skeleton';
import { useJob } from '@/lib/api/jobs/hooks';
import { useJobMutations } from './useJobMutations';
import type { JobDetailDto, UpdateJobRequest } from '@/lib/api/model';

const SOURCES = [
  'LinkedIn', 'Indeed', 'Glassdoor', 'Wellfound', 'Otta', 'StepStone',
  'Bdjobs', 'Monster', 'CompanySite', 'Recruiter', 'Referral', 'Other',
] as const;
const REMOTE_MODES = ['OnSite', 'Hybrid', 'Remote'] as const;
const EMPLOYMENT_TYPES = ['FullTime', 'PartTime', 'Contract', 'Freelance', 'Internship'] as const;
const SALARY_PERIODS = ['Annual', 'Monthly', 'Hourly'] as const;
const PRIORITIES = ['Low', 'Medium', 'High'] as const;

const schema = z.object({
  title: z.string().min(1, 'Title required').max(300),
  priority: z.enum(PRIORITIES),
  source: z.enum(SOURCES),
  sourceUrl: z.string().url('Must be a URL').optional().or(z.literal('')),
  country: z.string(),
  city: z.string(),
  locationText: z.string(),
  remoteMode: z.enum(REMOTE_MODES),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  salaryMin: z.string(),
  salaryMax: z.string(),
  salaryCurrency: z.string(),
  salaryPeriod: z.enum(SALARY_PERIODS),
  deadlineAtUtc: z.string(),
  appliedAtUtc: z.string(),
  nextActionAtUtc: z.string(),
  fitScore: z.string(),
  notes: z.string(),
});

type FormValues = z.infer<typeof schema>;

const fromIsoDate = (v: string | null): string => (v ? v.slice(0, 10) : '');
const toIsoDate = (v: string): string | null => (v ? new Date(`${v}T00:00:00Z`).toISOString() : null);
const str = (v: number | string | null): string => (v == null ? '' : String(v));

function jobToForm(job: JobDetailDto): FormValues {
  return {
    title: job.title,
    priority: job.priority,
    source: job.source,
    sourceUrl: job.sourceUrl ?? '',
    country: job.country ?? '',
    city: job.city ?? '',
    locationText: job.locationText ?? '',
    remoteMode: job.remoteMode,
    employmentType: job.employmentType,
    salaryMin: str(job.salaryMin),
    salaryMax: str(job.salaryMax),
    salaryCurrency: job.salaryCurrency ?? '',
    salaryPeriod: job.salaryPeriod,
    deadlineAtUtc: fromIsoDate(job.deadlineAtUtc),
    appliedAtUtc: fromIsoDate(job.appliedAtUtc),
    nextActionAtUtc: fromIsoDate(job.nextActionAtUtc),
    fitScore: str(job.fitScore),
    notes: job.notes ?? '',
  };
}

function buildPayload(job: JobDetailDto, v: FormValues): UpdateJobRequest {
  return {
    companyId: job.companyId,
    title: v.title,
    priority: v.priority,
    source: v.source,
    sourceUrl: v.sourceUrl || null,
    jobDescription: job.jobDescription,
    country: v.country || null,
    city: v.city || null,
    locationText: v.locationText || null,
    remoteMode: v.remoteMode,
    employmentType: v.employmentType,
    salaryMin: v.salaryMin || null,
    salaryMax: v.salaryMax || null,
    salaryCurrency: v.salaryCurrency || null,
    salaryPeriod: v.salaryPeriod,
    deadlineAtUtc: toIsoDate(v.deadlineAtUtc),
    appliedAtUtc: toIsoDate(v.appliedAtUtc),
    lastContactedAtUtc: job.lastContactedAtUtc,
    nextActionAtUtc: toIsoDate(v.nextActionAtUtc),
    fitScore: v.fitScore || null,
    resumeLabel: job.resumeLabel,
    resumeAngle: job.resumeAngle,
    coverLetterNotes: job.coverLetterNotes,
    offerSalary: job.offerSalary,
    offerCurrency: job.offerCurrency,
    offerDeadlineAtUtc: job.offerDeadlineAtUtc,
    offerNotes: job.offerNotes,
    rejectionReason: job.rejectionReason,
    notes: v.notes || null,
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: number;
}

export function EditJobDialog({ open, onOpenChange, jobId }: Props) {
  const { data: job, isLoading } = useJob(open ? jobId : null);
  const { update } = useJobMutations();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (job) form.reset(jobToForm(job));
  }, [job, form]);

  const onSubmit = async (values: FormValues) => {
    if (!job) return;
    await update.mutateAsync({ id: jobId, data: buildPayload(job, values) });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit job</DialogTitle>
        </DialogHeader>

        {isLoading || !job ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Company">
              <Input value={job.companyName} disabled readOnly />
            </Field>
            <Field label="Title" error={form.formState.errors.title?.message}>
              <Input {...form.register('title')} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Priority">
                <Select value={form.watch('priority')} onValueChange={v => form.setValue('priority', v as FormValues['priority'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Source">
                <Select value={form.watch('source')} onValueChange={v => form.setValue('source', v as FormValues['source'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Source URL" error={form.formState.errors.sourceUrl?.message}>
              <Input {...form.register('sourceUrl')} placeholder="https://..." />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="City"><Input {...form.register('city')} /></Field>
              <Field label="Country"><Input {...form.register('country')} /></Field>
            </div>
            <Field label="Location text"><Input {...form.register('locationText')} placeholder="e.g. Remote (EU)" /></Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Remote mode">
                <Select value={form.watch('remoteMode')} onValueChange={v => form.setValue('remoteMode', v as FormValues['remoteMode'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REMOTE_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Employment type">
                <Select value={form.watch('employmentType')} onValueChange={v => form.setValue('employmentType', v as FormValues['employmentType'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Salary min"><Input inputMode="numeric" {...form.register('salaryMin')} /></Field>
              <Field label="Salary max"><Input inputMode="numeric" {...form.register('salaryMax')} /></Field>
              <Field label="Currency"><Input {...form.register('salaryCurrency')} placeholder="e.g. NOK" /></Field>
              <Field label="Salary period">
                <Select value={form.watch('salaryPeriod')} onValueChange={v => form.setValue('salaryPeriod', v as FormValues['salaryPeriod'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SALARY_PERIODS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Deadline"><Input type="date" {...form.register('deadlineAtUtc')} /></Field>
              <Field label="Applied"><Input type="date" {...form.register('appliedAtUtc')} /></Field>
              <Field label="Next action"><Input type="date" {...form.register('nextActionAtUtc')} /></Field>
            </div>

            <Field label="Fit score (1–10)"><Input inputMode="numeric" {...form.register('fitScore')} /></Field>
            <Field label="Notes"><Textarea rows={3} {...form.register('notes')} /></Field>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={update.isPending}>Save</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
