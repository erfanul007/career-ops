import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useJobs } from '@/lib/api/jobs/hooks';
import { JobsBoard } from '@/features/jobs/JobsBoard';
import { JobsTable } from '@/features/jobs/JobsTable';
import { JobToolbar } from '@/features/jobs/JobToolbar';
import { FilterChips } from '@/features/jobs/FilterChips';
import { useJobFilters } from '@/features/jobs/useJobFilters';
import { useHiddenStatuses, ALL_STATUSES } from '@/features/jobs/useHiddenStatuses';
import { useHiddenTableColumns } from '@/features/jobs/useHiddenTableColumns';
import { useJobsView, type JobsView } from '@/features/jobs/useJobsView';
import { facets, applyFilters } from '@/features/jobs/jobFilters';
import { TABLE_COLUMNS, type TableColumnKey } from '@/features/jobs/jobTableColumns';
import type { ColumnsSection } from '@/features/jobs/GroupPopover';
import { JobDetailDrawer } from '@/features/jobs/JobDetailDrawer';
import type { JobDto, JobStatus } from '@/lib/api/model';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';

export default function JobsPage() {
  const { filters, setFilters } = useJobFilters();
  const { hiddenStatuses, toggleStatus, reset: resetStatuses } = useHiddenStatuses();
  const { hiddenColumns, toggleColumn, reset: resetColumns } = useHiddenTableColumns();
  const { view, setView } = useJobsView();
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const { data: jobsData, isLoading, isError } = useJobs();
  const jobs: JobDto[] = useMemo(() => jobsData ?? [], [jobsData]);

  const facetModel = useMemo(() => facets(jobs), [jobs]);
  const filtered = useMemo(() => applyFilters(jobs, filters), [jobs, filters]);

  const columnsSection: ColumnsSection = useMemo(
    () =>
      view === 'table'
        ? {
            title: 'Table columns',
            options: TABLE_COLUMNS.map(c => ({ value: c.key, label: c.label })),
            hidden: hiddenColumns,
            onToggle: v => toggleColumn(v as TableColumnKey),
            onReset: resetColumns,
          }
        : {
            title: 'Board columns',
            options: ALL_STATUSES.map(s => ({ value: s, label: s })),
            hidden: hiddenStatuses,
            onToggle: v => toggleStatus(v as JobStatus),
            onReset: resetStatuses,
          },
    [view, hiddenColumns, toggleColumn, resetColumns, hiddenStatuses, toggleStatus, resetStatuses],
  );

  return (
    <PageShell variant="full">
      <PageHeader
        title="Jobs"
        actions={<JobToolbar filters={filters} facets={facetModel} onChange={setFilters} columns={columnsSection} />}
      />
      <FilterChips filters={filters} facets={facetModel} onChange={setFilters} />
      <Tabs value={view} onValueChange={v => setView(v as JobsView)} className="flex min-h-0 flex-1 flex-col">
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
            <JobsBoard jobs={filtered} groupBy={filters.groupBy} hiddenStatuses={hiddenStatuses} onJobClick={setSelectedJobId} />
          )}
        </TabsContent>
        <TabsContent value="table" className="min-h-0 flex-1 overflow-y-auto">
          <JobsTable jobs={filtered} groupBy={filters.groupBy} hiddenColumns={hiddenColumns} onJobClick={setSelectedJobId} />
        </TabsContent>
      </Tabs>
      <JobDetailDrawer jobId={selectedJobId} onClose={() => setSelectedJobId(null)} />
    </PageShell>
  );
}
