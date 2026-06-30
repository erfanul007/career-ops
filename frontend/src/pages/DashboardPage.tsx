import { useGetDashboardSummary } from '@/lib/api/dashboard/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { JobStatus } from '@/lib/api/model';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { ListRow } from '@/components/ListRow';
import { formatDate } from '@/lib/format';

const STATUS_ORDER: JobStatus[] = ['Discovered', 'Interested', 'Applied', 'Interviewing', 'Offered'];

export default function DashboardPage() {
  const { data: response, isLoading, isError } = useGetDashboardSummary();
  const summary = response?.data;

  if (isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </PageShell>
    );
  }

  if (isError || !summary) {
    return <PageShell><p className="text-sm text-destructive">Failed to load dashboard.</p></PageShell>;
  }

  const byStatus = summary.activeJobsByStatus;

  return (
    <PageShell>
      <PageHeader title="Dashboard" />

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-2">Active pipeline</h2>
        <div className="flex gap-3 flex-wrap">
          {STATUS_ORDER.map(status => (
            <Card key={status} className="flex-1 min-w-[100px]">
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold">{Number(byStatus[status] ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">{status}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Due today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Number(summary.followUpsDueToday)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${Number(summary.overdueFollowUps) > 0 ? 'text-destructive' : ''}`}>
              {Number(summary.overdueFollowUps)}
            </p>
          </CardContent>
        </Card>
        {summary.daysUntilSearchDeadline != null && (
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Days until deadline</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${Number(summary.daysUntilSearchDeadline) <= 7 ? 'text-destructive' : ''}`}>
                {Number(summary.daysUntilSearchDeadline)}
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {summary.upcomingActivities.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Upcoming activities (next 7 days)</h2>
          <div className="space-y-2">
            {summary.upcomingActivities.map(a => (
              <ListRow
                key={a.activityId as number}
                to={`/jobs/${a.jobId}`}
                title={a.jobTitle}
                subtitle={`${a.companyName} — ${a.activityLabel}`}
                meta={formatDate(a.scheduledAtUtc)}
              />
            ))}
          </div>
        </section>
      )}

      {summary.staleJobs.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Stale jobs</h2>
          <div className="space-y-2">
            {summary.staleJobs.map(j => (
              <ListRow key={j.id as number} to={`/jobs/${j.id}`} title={j.title} subtitle={j.companyName} meta={j.status} />
            ))}
          </div>
        </section>
      )}

      {summary.offerDeadlines.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Offer deadlines</h2>
          <div className="space-y-2">
            {summary.offerDeadlines.map(o => (
              <ListRow
                key={o.jobId as number}
                to={`/jobs/${o.jobId}`}
                title={o.title}
                subtitle={o.companyName}
                meta={<span className="font-medium text-destructive">{formatDate(o.offerDeadlineAtUtc)}</span>}
              />
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
