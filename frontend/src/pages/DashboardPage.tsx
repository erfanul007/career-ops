import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useGetDashboardSummary } from "@/lib/api/dashboard/dashboard";
import { PipelineBar } from "@/features/dashboard/PipelineBar";
import { TodaysActions } from "@/features/dashboard/TodaysActions";
import { UpcomingInterviews } from "@/features/dashboard/UpcomingInterviews";
import { applicationStage, enumLabel } from "@/lib/enums";

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-normal text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-3xl font-semibold">{value}</CardContent>
    </Card>
  );
}

function DeadlineChip({ daysRemaining }: { daysRemaining: number }) {
  const label =
    daysRemaining > 0 ? `⏳ ${daysRemaining} days left`
    : daysRemaining === 0 ? "⏳ due today"
    : `⚠ ${Math.abs(daysRemaining)} days over`;
  const tone = daysRemaining < 0 ? "bg-red-100 text-red-700" : "bg-sky-100 text-sky-700";
  return <Badge variant="secondary" className={`border-transparent ${tone}`}>{label}</Badge>;
}

export default function DashboardPage() {
  const { data, isLoading } = useGetDashboardSummary();
  const summary = data?.data;

  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
      </div>
    );
  }

  const leadCounts = summary.leadsByStatus.reduce<Record<number, number>>(
    (a, c) => { a[c.status] = Number(c.count); return a; }, {});
  const totalLeads = summary.leadsByStatus.reduce((sum, c) => sum + Number(c.count), 0);
  const stageTiles = summary.applicationsByStage.filter((s) => Number(s.count) > 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        {summary.searchDeadline && <DeadlineChip daysRemaining={Number(summary.searchDeadline.daysRemaining)} />}
      </div>

      <TodaysActions due={summary.followUpsDue} overdue={summary.overdueFollowUps} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat title="Total leads" value={totalLeads} />
        <Stat title="High-priority" value={summary.highPriorityLeads.length} />
        <Stat title="Active applications" value={Number(summary.activeApplicationCount)} />
        <Stat title="Interviewing" value={leadCounts[3] ?? 0} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Lead pipeline</CardTitle></CardHeader>
        <CardContent><PipelineBar counts={leadCounts} total={totalLeads} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Applications by stage</CardTitle></CardHeader>
        <CardContent>
          {stageTiles.length === 0
            ? <p className="text-sm text-muted-foreground">No applications yet.</p>
            : (
              <div className="flex flex-wrap gap-2">
                {stageTiles.map((s) => (
                  <span key={s.stage} className="rounded-md bg-muted px-3 py-1 text-sm">
                    {enumLabel(applicationStage, s.stage)} <span className="font-semibold">{Number(s.count)}</span>
                  </span>
                ))}
              </div>
            )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">High-priority to action</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {summary.highPriorityLeads.length === 0
              ? <p className="text-muted-foreground">Nothing awaiting action.</p>
              : summary.highPriorityLeads.map((l) => (
                <div key={l.id} className="flex items-center justify-between">
                  <Link to="/job-leads" className="min-w-0 truncate font-medium hover:underline">{l.title}</Link>
                  <span className="shrink-0 text-sm text-muted-foreground">{l.companyName}</span>
                </div>
              ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Stale applications</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {summary.staleApplications.length === 0
              ? <p className="text-muted-foreground">Nothing stale.</p>
              : summary.staleApplications.map((a) => (
                <div key={a.id} className="flex items-center justify-between">
                  <Link to="/applications" className="min-w-0 truncate font-medium hover:underline">{a.jobTitle}</Link>
                  <span className="shrink-0 text-sm text-muted-foreground">{a.companyName}</span>
                </div>
              ))}
          </CardContent>
        </Card>
        <UpcomingInterviews items={summary.upcomingInterviews} />
      </div>
    </div>
  );
}
