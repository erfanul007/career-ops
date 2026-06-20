import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useMarkInterviewCompleted } from "@/lib/api/interviews/interviews";
import { interviewOutcome, enumOptions } from "@/lib/enums";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InterviewDto } from "@/lib/api/model";

type Props = { open: boolean; interview: InterviewDto | null; onOpenChange: (o: boolean) => void };

export function CompleteInterviewDialog({ open, interview, onOpenChange }: Props) {
  const complete = useMarkInterviewCompleted();
  const [outcome, setOutcome] = useState("1");           // Passed
  const [feedback, setFeedback] = useState("");
  const [followUp, setFollowUp] = useState(false);
  const [followUpAt, setFollowUpAt] = useState(new Date().toISOString().slice(0, 10));
  const [errors, setErrors] = useState<string[]>([]);
  if (!interview) return null;

  const onSubmit = async () => {
    setErrors([]);
    try {
      await complete.mutateAsync({
        id: Number(interview.id),
        data: {
          outcome: Number(outcome),
          feedback: feedback.trim() || null,
          followUpRequired: followUp,
          followUpAtUtc: followUp ? new Date(`${followUpAt}T09:00:00`).toISOString() : null,
        },
      });
      toast.success("Interview completed");
      onOpenChange(false);
    } catch (e) {
      const p = (e as { data?: { errors?: Record<string, string[]> } }).data;
      setErrors(p?.errors ? Object.values(p.errors).flat() : ["Could not complete."]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Complete interview</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Outcome</span>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{enumOptions(interviewOutcome).map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Feedback</span>
            <Textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium">Create a follow-up task</span>
            <Switch checked={followUp} onCheckedChange={setFollowUp} />
          </label>
          {followUp && (
            <label className="block space-y-1">
              <span className="text-sm font-medium">Follow up on</span>
              <Input type="date" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} />
            </label>
          )}
          {errors.length > 0 && <ul className="text-sm text-red-600">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
          <Button onClick={onSubmit} disabled={complete.isPending}>Complete</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
