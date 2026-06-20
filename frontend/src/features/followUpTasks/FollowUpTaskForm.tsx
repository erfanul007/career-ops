import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/form/Field";
import { FormErrors } from "@/components/form/FormErrors";
import { EnumSelect } from "@/components/form/EnumSelect";
import { priority, followUpStatus, relatedEntityType } from "@/lib/enums";
import type { FollowUpTaskDto, CreateFollowUpTaskRequest } from "@/lib/api/model";

type Props = { task?: FollowUpTaskDto; pending: boolean; errors: string[]; onSubmit: (r: CreateFollowUpTaskRequest) => void };

export function FollowUpTaskForm({ task, pending, errors, onSubmit }: Props) {
  const { register, handleSubmit, control } = useForm<CreateFollowUpTaskRequest>({
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      relatedEntityType: task?.relatedEntityType ?? 0,
      relatedEntityId: task?.relatedEntityId ?? null,
      dueAtUtc: task?.dueAtUtc?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      status: task?.status ?? 0,
      priority: task?.priority ?? 1,
    },
  });
  const submit = handleSubmit((v) => onSubmit({
    ...v,
    relatedEntityId: v.relatedEntityId ? Number(v.relatedEntityId) : null,
    dueAtUtc: new Date(v.dueAtUtc as string).toISOString(),
  }));
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Title"><Input {...register("title")} /></Field>
      <Field label="Description"><Textarea rows={3} {...register("description")} /></Field>
      <Field label="Due date"><Input type="date" {...register("dueAtUtc")} /></Field>
      <Field label="Priority"><EnumSelect control={control} name="priority" map={priority} /></Field>
      <Field label="Status"><EnumSelect control={control} name="status" map={followUpStatus} /></Field>
      <Field label="Linked to"><EnumSelect control={control} name="relatedEntityType" map={relatedEntityType} /></Field>
      <Field label="Linked entity id (optional)"><Input type="number" {...register("relatedEntityId")} /></Field>
      <FormErrors errors={errors} />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
    </form>
  );
}
