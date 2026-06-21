import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { InterviewDto } from "@/lib/api/model";
import { interviewRoundType, interviewStatus, interviewOutcome, enumLabel } from "@/lib/enums";

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-3 gap-2 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 break-words">{value}</dd>
    </div>
  );
}

type Props = { interview?: InterviewDto; open: boolean; onOpenChange: (o: boolean) => void; onEdit: (i: InterviewDto) => void };

export function InterviewDetailSheet({ interview, open, onOpenChange, onEdit }: Props) {
  if (!interview) return null;
  const i = interview;
  const scheduled = format(new Date(i.scheduledAtUtc), "dd.MM.yyyy HH:mm");
  const duration = i.durationMinutes ? `${i.durationMinutes} min` : null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>{i.companyName} · {i.jobTitle}</SheetTitle></SheetHeader>
        <div className="p-4">
          <dl>
            <Row label="Round" value={enumLabel(interviewRoundType, i.roundType)} />
            <Row label="Status" value={enumLabel(interviewStatus, i.status)} />
            <Row label="Outcome" value={enumLabel(interviewOutcome, i.outcome)} />
            <Row label="Company" value={i.companyName} />
            <Row label="Job" value={i.jobTitle} />
            <Row label="Scheduled" value={scheduled} />
            <Row label="Duration" value={duration} />
            <Row label="Interviewer" value={i.interviewerName} />
            <Row label="Interviewer role" value={i.interviewerRole} />
            <Row label="Meeting URL" value={i.meetingUrl} />
            <Row label="Prep notes" value={i.prepNotes} />
            <Row label="Feedback" value={i.feedback} />
          </dl>
          <Button className="mt-6 w-full" onClick={() => onEdit(i)}>Edit</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
