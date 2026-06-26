import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/form/Field';

const schema = z.object({
  title: z.string().min(1),
  dueAtUtc: z.string().min(1),
  priority: z.enum(['Low', 'Medium', 'High']),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSave: (values: FormValues) => Promise<void>;
  onCancel: () => void;
}

export function FollowUpForm({ onSave, onCancel }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'Medium' },
  });

  return (
    <form onSubmit={form.handleSubmit(onSave)} className="space-y-2">
      <Field label="Title" error={form.formState.errors.title?.message}>
        <Input {...form.register('title')} placeholder="e.g. Follow up with recruiter" />
      </Field>
      <Field label="Due date" error={form.formState.errors.dueAtUtc?.message}>
        <Input type="datetime-local" {...form.register('dueAtUtc')} />
      </Field>
      <Field label="Description">
        <Input {...form.register('description')} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm">Save</Button>
      </div>
    </form>
  );
}
