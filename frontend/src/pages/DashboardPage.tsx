import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetJobLeads } from "@/lib/api/job-leads/job-leads";
import type { JobLeadDto } from "@/lib/api/model";
import { StatusBadge } from "@/components/StatusBadge";
import { PipelineBar } from "@/features/dashboard/PipelineBar";
import { TodaysActions } from "@/features/dashboard/TodaysActions";
import { UpcomingInterviews } from "@/features/dashboard/UpcomingInterviews";

const HIGH_PRIORITY = [2, 3];
const ACTIONABLE = [0, 1];
const isHighPriority = (l: JobLeadDto) => HIGH_PRIORITY.includes(l.priority) && ACTIONABLE.includes(l.status);

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

export default function DashboardPage() {
  const { data: response, isLoading } = useGetJobLeads();
  const leads = response?.data ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
      </div>
    );
  }

  const counts = leads.reduce<Record<number, number>>((a, l) => { a[l.status] = (a[l.status] ?? 0) + 1; return a; }, {});
  const high = leads.filter(isHighPriority);
  const recent = [...leads].sort((a, b) => b.updatedAtUtc.localeCompare(a.updatedAtUtc)).slice(0, 5);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <TodaysActions />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat title="Total leads" value={leads.length} />
        <Stat title="High-priority" value={high.length} />
        <Stat title="Applied" value={counts[2] ?? 0} />
        <Stat title="Interviewing" value={counts[3] ?? 0} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Pipeline</CardTitle></CardHeader>
        <CardContent><PipelineBar counts={counts} total={leads.length} /></CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">High-priority to action</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {high.length === 0 ? <p className="text-muted-foreground">Nothing awaiting action.</p> :
              high.map((l) => (
                <div key={l.id} className="flex items-center justify-between">
                  <Link to="/job-leads" className="font-medium hover:underline">{l.title}</Link>
                  <span className="text-sm text-muted-foreground">{l.companyName}</span>
                </div>
              ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Recently updated</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recent.map((l) => (
              <div key={l.id} className="flex items-center justify-between">
                <span className="font-medium">{l.title}</span>
                <StatusBadge status={l.status} />
              </div>
            ))}
          </CardContent>
        </Card>
        <UpcomingInterviews />
      </div>
    </div>
  );
}
