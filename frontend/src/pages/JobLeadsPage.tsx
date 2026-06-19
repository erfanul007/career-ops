import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useGetJobLeads, useDeleteJobLead, getGetJobLeadsQueryKey } from "@/lib/api/job-leads/job-leads";
import type { JobLeadDto } from "@/lib/api/model";
import { JobLeadsTable } from "@/features/jobLeads/JobLeadsTable";

export default function JobLeadsPage() {
  const queryClient = useQueryClient();
  const { data: response, isLoading } = useGetJobLeads();
  const remove = useDeleteJobLead();
  const leads = response?.data ?? [];

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
        <Link to="/job-leads/new" className="rounded bg-primary px-4 py-2 text-primary-foreground">
          Add lead
        </Link>
      </div>
      <JobLeadsTable leads={leads} onDelete={onDelete} />
    </div>
  );
}
