import { Link } from "react-router";
import { useGetJobLeads } from "@/lib/api/job-leads/job-leads";
import { jobLeadStatus, enumLabel } from "@/lib/enums";
import type { JobLeadDto } from "@/lib/api/model";

const HIGH_PRIORITY = [2, 3];        // High, Critical
const ACTIONABLE_STATUS = [0, 1];    // Discovered, Interested

const isHighPriorityLead = (l: JobLeadDto) =>
  HIGH_PRIORITY.includes(l.priority) && ACTIONABLE_STATUS.includes(l.status);

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded border p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-3xl font-semibold">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: response, isLoading } = useGetJobLeads();
  const leads = response?.data ?? [];

  if (isLoading) return <p>Loading…</p>;

  const byStatus = leads.reduce<Record<number, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});
  const highPriority = leads.filter(isHighPriorityLead);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card title="Total leads" value={leads.length} />
        <Card title="High-priority" value={highPriority.length} />
        <Card title="Applied" value={byStatus[2] ?? 0} />
        <Card title="Interviewing" value={byStatus[3] ?? 0} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">High-priority leads to action</h2>
        {highPriority.length === 0 ? (
          <p className="text-muted-foreground">Nothing high-priority awaiting action.</p>
        ) : (
          <ul className="space-y-2">
            {highPriority.map((l) => (
              <li key={l.id} className="rounded border p-3">
                <Link to={`/job-leads/${l.id}`} className="font-medium text-primary hover:underline">{l.title}</Link>
                <span className="text-muted-foreground"> — {l.companyName} · {enumLabel(jobLeadStatus, l.status)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
