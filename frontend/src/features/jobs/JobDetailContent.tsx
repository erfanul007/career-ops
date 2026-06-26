import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewTab } from './drawer/OverviewTab';
import { ActivitiesTab } from './drawer/ActivitiesTab';
import { FollowUpsTab } from './drawer/FollowUpsTab';
import { AttachmentsTab } from './drawer/AttachmentsTab';
import { PropertiesTab } from './drawer/PropertiesTab';
import { TimelineTab } from './drawer/TimelineTab';
import type { JobDetailDto } from '@/lib/api/model';

interface Props { job: JobDetailDto }

export function JobDetailContent({ job }: Props) {
  return (
    <Tabs defaultValue="overview">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activities">Activities ({job.activities?.length ?? 0})</TabsTrigger>
        <TabsTrigger value="followups">Follow-ups</TabsTrigger>
        <TabsTrigger value="attachments">Attachments ({job.attachments?.length ?? 0})</TabsTrigger>
        <TabsTrigger value="properties">Properties</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
      </TabsList>
      <TabsContent value="overview"><OverviewTab job={job} /></TabsContent>
      <TabsContent value="activities"><ActivitiesTab job={job} /></TabsContent>
      <TabsContent value="followups"><FollowUpsTab job={job} /></TabsContent>
      <TabsContent value="attachments"><AttachmentsTab job={job} /></TabsContent>
      <TabsContent value="properties"><PropertiesTab job={job} /></TabsContent>
      <TabsContent value="timeline"><TimelineTab jobId={job.id as number} /></TabsContent>
    </Tabs>
  );
}
