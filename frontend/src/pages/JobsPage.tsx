import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useListJobs } from '@/lib/api/jobs/jobs';
import { JobsBoard } from '@/features/jobs/JobsBoard';
import { JobsTable } from '@/features/jobs/JobsTable';
import { JobFilterBar, DEFAULT_FILTERS, type JobFilters } from '@/features/jobs/JobFilterBar';
import { JobQuickAdd } from '@/features/jobs/JobQuickAdd';
import { JobDetailDrawer } from '@/features/jobs/JobDetailDrawer';
import type { JobDto, ListJobsParams } from '@/lib/api/model';

export default function JobsPage() {
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const params: ListJobsParams = {
    ...(filters.status ? { Statuses: [filters.status] } : {}),
    ...(filters.countries.length > 0 ? { Countries: filters.countries } : {}),
    ...(filters.companySearch ? { CompanySearch: filters.companySearch } : {}),
  };

  const { data: response, isLoading, isError } = useListJobs(params);
  const jobs: JobDto[] = (response?.data as unknown as JobDto[] | undefined) ?? [];

  const filtered = useMemo(() => {
    if (!filters.search) return jobs;
    const s = filters.search.toLowerCase();
    return jobs.filter(j =>
      j.title.toLowerCase().includes(s) ||
      j.companyName.toLowerCase().includes(s) ||
      j.sourceUrl?.toLowerCase().includes(s) ||
      j.notes?.toLowerCase().includes(s)
    );
  }, [jobs, filters.search]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold">Jobs</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <JobFilterBar filters={filters} onChange={setFilters} />
          <JobQuickAdd />
        </div>
      </div>

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>
        <TabsContent value="board">
          {isError ? (
            <div className="py-8 text-center text-sm text-destructive">Failed to load jobs. Check your connection.</div>
          ) : isLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
          ) : (
            <JobsBoard jobs={filtered} groupBy={filters.groupBy} listParams={params} onJobClick={setSelectedJobId} />
          )}
        </TabsContent>
        <TabsContent value="table">
          <JobsTable jobs={filtered} onJobClick={setSelectedJobId} />
        </TabsContent>
      </Tabs>

      <JobDetailDrawer jobId={selectedJobId} onClose={() => setSelectedJobId(null)} />
    </div>
  );
}
