import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useJobs } from '@/lib/api/jobs/hooks';
import { JobsBoard } from '@/features/jobs/JobsBoard';
import { JobsTable } from '@/features/jobs/JobsTable';
import { JobFilterBar } from '@/features/jobs/JobFilterBar';
import { DEFAULT_FILTERS, type JobFilters } from '@/features/jobs/jobFilters';
import { JobQuickAdd } from '@/features/jobs/JobQuickAdd';
import { JobDetailDrawer } from '@/features/jobs/JobDetailDrawer';
import type { JobDto, ListJobsParams } from '@/lib/api/model';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';

export default function JobsPage() {
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const params: ListJobsParams = {
    ...(filters.status ? { Statuses: [filters.status] } : {}),
    ...(filters.countries.length > 0 ? { Countries: filters.countries } : {}),
    ...(filters.companySearch ? { CompanySearch: filters.companySearch } : {}),
  };

  const { data: jobsData, isLoading, isError } = useJobs(params);

  const filtered = useMemo(() => {
    const jobs: JobDto[] = jobsData ?? [];
    if (!filters.search) return jobs;
    const s = filters.search.toLowerCase();
    return jobs.filter(j =>
      j.title.toLowerCase().includes(s) ||
      j.companyName.toLowerCase().includes(s) ||
      j.sourceUrl?.toLowerCase().includes(s) ||
      j.notes?.toLowerCase().includes(s),
    );
  }, [jobsData, filters.search]);

  return (
    <PageShell variant="full">
      <PageHeader
        title="Jobs"
        actions={<><JobFilterBar filters={filters} onChange={setFilters} /><JobQuickAdd /></>}
      />
      <Tabs defaultValue="board" className="flex min-h-0 flex-1 flex-col">
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>
        <TabsContent value="board" className="min-h-0 flex-1">
          {isError ? (
            <div className="py-8 text-center text-sm text-destructive">Failed to load jobs. Check your connection.</div>
          ) : isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <JobsBoard jobs={filtered} groupBy={filters.groupBy} listParams={params} onJobClick={setSelectedJobId} />
          )}
        </TabsContent>
        <TabsContent value="table" className="min-h-0 flex-1 overflow-y-auto">
          <JobsTable jobs={filtered} onJobClick={setSelectedJobId} />
        </TabsContent>
      </Tabs>
      <JobDetailDrawer jobId={selectedJobId} onClose={() => setSelectedJobId(null)} />
    </PageShell>
  );
}
