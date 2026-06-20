import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetApplications } from "@/lib/api/applications/applications";
import type { ApplicationDto } from "@/lib/api/model";
import { ApplicationsBoard } from "@/features/applications/ApplicationsBoard";
import { ApplicationsTable } from "@/features/applications/ApplicationsTable";
import { ApplicationSheet } from "@/features/applications/ApplicationSheet";

export default function ApplicationsPage() {
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "list" ? "list" : "board";
  const setView = (v: string) =>
    setParams((p) => { p.set("view", v); return p; }, { replace: true });

  const { data, isLoading } = useGetApplications();
  const apps = useMemo(() => data?.data ?? [], [data]);
  const [showClosed, setShowClosed] = useState(false);
  const [editing, setEditing] = useState<ApplicationDto | undefined>();
  const [sheetOpen, setSheetOpen] = useState(false);

  const openEdit = (a: ApplicationDto) => {
    setEditing(a);
    setSheetOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Applications</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>
        </Tabs>
        {view === "board" && (
          <Button variant="outline" size="sm" onClick={() => setShowClosed((s) => !s)}>
            {showClosed ? "Hide closed" : "Show closed"}
          </Button>
        )}
        <span className="text-sm text-muted-foreground">{apps.length} total</span>
      </div>
      <div className="min-h-0 flex-1">
        {view === "board" ? (
          <ApplicationsBoard apps={apps} onEdit={openEdit} showClosed={showClosed} />
        ) : (
          <div className="h-full overflow-y-auto">
            <ApplicationsTable apps={apps} onEdit={openEdit} />
          </div>
        )}
      </div>
      <ApplicationSheet app={editing} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
