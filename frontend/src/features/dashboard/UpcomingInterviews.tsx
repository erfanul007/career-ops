import { Link } from "react-router";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InterviewDto } from "@/lib/api/model";
import { interviewRoundType, enumLabel } from "@/lib/enums";

export function UpcomingInterviews({ items }: { items: InterviewDto[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Upcoming interviews</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0
          ? <p className="text-sm text-muted-foreground">None in the next 7 days.</p>
          : items.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-2">
              <Link to="/interviews" className="min-w-0 truncate font-medium hover:underline">
                {i.companyName} · {enumLabel(interviewRoundType, i.roundType)}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(i.scheduledAtUtc), { addSuffix: true })}
              </span>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
