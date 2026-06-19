import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useGetJobLeads, useDeleteJobLead, getGetJobLeadsQueryKey } from "@/lib/api/job-leads/job-leads";
import type { JobLeadDto } from "@/lib/api/model";
import { jobLeadStatus, priority, enumOptions } from "@/lib/enums";
import { JobLeadsTable } from "@/features/jobLeads/JobLeadsTable";

const ANY = "";
const inputClass = "rounded border border-input bg-background p-2 text-sm";

export default function JobLeadsPage() {
  const queryClient = useQueryClient();
  const { data: response, isLoading } = useGetJobLeads();
  const remove = useDeleteJobLead();
  const all = response?.data ?? [];

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ANY);
  const [prio, setPrio] = useState<string>(ANY);

  const leads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((l) =>
      (q === "" || l.title.toLowerCase().includes(q) || l.companyName.toLowerCase().includes(q)) &&
      (status === ANY || l.status === Number(status)) &&
      (prio === ANY || l.priority === Number(prio)),
    );
  }, [all, search, status, prio]);

  const onDelete = async (l: JobLeadDto) => {
    if (!confirm(`Delete "${l.title}"? Prefer Archive (set status) to keep history.`)) return;
    await remove.mutateAsync({ id: Number(l.id) });
    queryClient.invalidateQueries({ queryKey: getGetJobLeadsQueryKey() });
  };

  if (isLoading) return <p>Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Job Leads</h1>
        <Link to="/job-leads/new" className="rounded bg-primary px-4 py-2 text-primary-foreground">Add lead</Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className={inputClass} placeholder="Search title or company…"
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value={ANY}>All statuses</option>
          {enumOptions(jobLeadStatus).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className={inputClass} value={prio} onChange={(e) => setPrio(e.target.value)}>
          <option value={ANY}>All priorities</option>
          {enumOptions(priority).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="self-center text-sm text-muted-foreground">{leads.length} of {all.length}</span>
      </div>

      <JobLeadsTable leads={leads} onDelete={onDelete} />
    </div>
  );
}
