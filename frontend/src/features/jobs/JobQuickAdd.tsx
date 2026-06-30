import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Field } from '@/components/form/Field';
import { useJobMutations } from './useJobMutations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
const SOURCES = [
  'LinkedIn', 'Indeed', 'Glassdoor', 'Wellfound', 'Otta',
  'StepStone', 'Bdjobs', 'Monster',
  'CompanySite', 'Recruiter', 'Referral', 'Other',
] as const;

const schema = z.object({
  companyName: z.string().min(1, 'Company required'),
  title: z.string().min(1, 'Title required').max(300),
  source: z.enum(SOURCES),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  priority: z.enum(['Low', 'Medium', 'High']),
});

type FormValues = z.infer<typeof schema>;

export function JobQuickAdd() {
  const [open, setOpen] = useState(false);
  const { create } = useJobMutations();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'Medium', source: 'LinkedIn' },
  });

  const onSubmit = async (values: FormValues) => {
    await create.mutateAsync({
      data: {
        companyId: null,
        companyName: values.companyName,
        title: values.title,
        status: 'Discovered',
        priority: values.priority,
        source: values.source,
        sourceUrl: values.sourceUrl || null,
        remoteMode: 'OnSite',
        employmentType: 'FullTime',
        salaryPeriod: 'Annual',
        jobDescription: null,
        country: null,
        city: null,
        locationText: null,
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null,
        deadlineAtUtc: null,
        fitScore: null,
        resumeLabel: null,
        resumeAngle: null,
        coverLetterNotes: null,
        notes: null,
      },
    });
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Add job</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add job</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Company" error={form.formState.errors.companyName?.message}>
            <Input {...form.register('companyName')} placeholder="e.g. Acme Corp" />
          </Field>
          <Field label="Title" error={form.formState.errors.title?.message}>
            <Input {...form.register('title')} placeholder="e.g. Senior Software Engineer" />
          </Field>
          <Field label="Source" error={form.formState.errors.source?.message}>
            <Select defaultValue="LinkedIn" onValueChange={v => form.setValue('source', v as FormValues['source'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Source URL">
            <Input {...form.register('sourceUrl')} placeholder="https://..." />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>Add</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
