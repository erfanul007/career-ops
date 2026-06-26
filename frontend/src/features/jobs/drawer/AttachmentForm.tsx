import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/form/Field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { JobAttachmentDto } from '@/lib/api/model';

const TYPES = ['Resume', 'CoverLetter', 'JobDescription', 'Email', 'Screenshot', 'Other'] as const;

const schema = z.object({
  type: z.enum(TYPES),
  title: z.string().min(1),
  url: z.string().url().optional().or(z.literal('')),
  fileName: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  attachment?: JobAttachmentDto;
  onSave: (values: FormValues) => Promise<void>;
  onCancel: () => void;
}

export function AttachmentForm({ attachment, onSave, onCancel }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: attachment?.type ?? 'Other',
      title: attachment?.title ?? '',
      url: attachment?.url ?? '',
      fileName: attachment?.fileName ?? '',
      notes: attachment?.notes ?? '',
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSave)} className="space-y-2">
      <Field label="Type">
        <Select defaultValue={form.getValues('type')} onValueChange={v => form.setValue('type', v as typeof TYPES[number])}>

          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Title" error={form.formState.errors.title?.message}>
        <Input {...form.register('title')} placeholder="e.g. Resume v3" />
      </Field>
      <Field label="URL"><Input {...form.register('url')} placeholder="https://..." /></Field>
      <Field label="File name"><Input {...form.register('fileName')} /></Field>
      <Field label="Notes"><Input {...form.register('notes')} /></Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm">Save</Button>
      </div>
    </form>
  );
}
