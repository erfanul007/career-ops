import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/form/Field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { JobActivityDto } from '@/lib/api/model';

const TYPES = ['Screening', 'Interview', 'Technical', 'SystemDesign', 'Behavioral', 'TakeHome', 'Assessment', 'OfferDiscussion', 'Other'] as const;
const STATUSES = ['Planned', 'Scheduled', 'Completed', 'Cancelled'] as const;

const schema = z.object({
  label: z.string().min(1),
  type: z.enum(TYPES),
  status: z.enum(STATUSES),
  scheduledAtUtc: z.string().optional(),
  contactName: z.string().optional(),
  meetingUrl: z.string().url().optional().or(z.literal('')),
  prepNotes: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  jobId: number;
  activity?: JobActivityDto;
  onSave: (values: FormValues) => Promise<void>;
  onCancel: () => void;
}

export function ActivityForm({ activity, onSave, onCancel }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: activity?.label ?? '',
      type: activity?.type ?? 'Interview',
      status: activity?.status ?? 'Planned',
      scheduledAtUtc: activity?.scheduledAtUtc?.slice(0, 16) ?? '',
      contactName: activity?.contactName ?? '',
      meetingUrl: activity?.meetingUrl ?? '',
      prepNotes: activity?.prepNotes ?? '',
      notes: activity?.notes ?? '',
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSave)} className="space-y-3">
      <Field label="Label" error={form.formState.errors.label?.message}>
        <Input {...form.register('label')} placeholder="e.g. Technical Round 1" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Type">
          <Select defaultValue={form.getValues('type')} onValueChange={v => form.setValue('type', v as typeof TYPES[number])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select defaultValue={form.getValues('status')} onValueChange={v => form.setValue('status', v as typeof STATUSES[number])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Scheduled (UTC)">
        <Input type="datetime-local" {...form.register('scheduledAtUtc')} />
      </Field>
      <Field label="Contact name">
        <Input {...form.register('contactName')} />
      </Field>
      <Field label="Meeting URL">
        <Input {...form.register('meetingUrl')} placeholder="https://meet..." />
      </Field>
      <Field label="Prep notes">
        <Input {...form.register('prepNotes')} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>Save</Button>
      </div>
    </form>
  );
}
