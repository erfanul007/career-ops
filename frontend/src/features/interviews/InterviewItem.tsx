import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { interviewRoundType, interviewStatus, interviewOutcome, interviewStatusBadgeClass, interviewOutcomeBadgeClass, enumLabel } from "@/lib/enums";
import type { InterviewDto } from "@/lib/api/model";

type Props = { interview: InterviewDto; onEdit: (i: InterviewDto) => void; onComplete: (i: InterviewDto) => void; onDelete: (i: InterviewDto) => void };

export function InterviewItem({ interview, onEdit, onComplete, onDelete }: Props) {
  const when = new Date(interview.scheduledAtUtc);
  const completed = interview.status === 1;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{enumLabel(interviewRoundType, interview.roundType)}</span>
          <Badge className={interviewStatusBadgeClass[interview.status]}>{enumLabel(interviewStatus, interview.status)}</Badge>
          {completed && <Badge className={interviewOutcomeBadgeClass[interview.outcome]}>{enumLabel(interviewOutcome, interview.outcome)}</Badge>}
        </div>
        <div className="truncate text-sm text-muted-foreground">{interview.companyName} · {interview.jobTitle}</div>
        <div className="text-xs text-muted-foreground">
          {when.toLocaleString()} · {formatDistanceToNow(when, { addSuffix: true })}
          {interview.interviewerName ? ` · ${interview.interviewerName}` : ""}
        </div>
        {interview.meetingUrl && <a href={interview.meetingUrl} target="_blank" rel="noreferrer" className="text-xs text-sky-600 hover:underline">Meeting link</a>}
      </div>
      <div className="flex shrink-0 gap-1">
        {!completed && <Button variant="ghost" size="sm" onClick={() => onComplete(interview)}>Complete</Button>}
        <Button variant="ghost" size="sm" onClick={() => onEdit(interview)}>Edit</Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(interview)}>Delete</Button>
      </div>
    </div>
  );
}
