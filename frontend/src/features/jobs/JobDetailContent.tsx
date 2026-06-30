import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewTab } from './drawer/OverviewTab';
import { ActivitiesTab } from './drawer/ActivitiesTab';
import { TimelineTab } from './drawer/TimelineTab';
import type { JobDetailDto } from '@/lib/api/model';

interface Props { job: JobDetailDto }

export function JobDetailContent({ job }: Props) {
  return (
    <Tabs defaultValue="overview" className="gap-3 p-5 pt-3">
      <TabsList variant="line" className="w-full justify-start">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activity">Activity ({job.activities?.length ?? 0})</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
      </TabsList>
      <TabsContent value="overview"><OverviewTab job={job} /></TabsContent>
      <TabsContent value="activity"><ActivitiesTab job={job} /></TabsContent>
      <TabsContent value="timeline"><TimelineTab jobId={job.id as number} /></TabsContent>
    </Tabs>
  );
}
