import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useGetJobLeads, useDeleteJobLead, getGetJobLeadsQueryKey } from "@/lib/api/job-leads/job-leads";
import type { JobLeadDto } from "@/lib/api/model";
import { jobLeadStatus, priority, enumOptions } from "@/lib/enums";
import { JobLeadsBoard } from "@/features/jobLeads/JobLeadsBoard";
import { JobLeadsTable } from "@/features/jobLeads/JobLeadsTable";
import { JobLeadSheet } from "@/features/jobLeads/JobLeadSheet";

const ANY = "all";

export default function JobLeadsPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "list" ? "list" : "board";
  const setView = (v: string) =>
    setParams((p) => { p.set("view", v); return p; }, { replace: true });

  const { data: response, isLoading } = useGetJobLeads();
  const remove = useDeleteJobLead();
  const all = response?.data ?? [];

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ANY);
  const [prio, setPrio] = useState(ANY);
  const [showClosed, setShowClosed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<JobLeadDto | undefined>();

  const leads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((l) =>
      (q === "" || l.title.toLowerCase().includes(q) || l.companyName.toLowerCase().includes(q)) &&
      (status === ANY || l.status === Number(status)) &&
      (prio === ANY || l.priority === Number(prio)),
    );
  }, [all, search, status, prio]);

  const openCreate = () => { setEditing(undefined); setSheetOpen(true); };
  const openEdit = (l: JobLeadDto) => { setEditing(l); setSheetOpen(true); };
  const onDelete = async (l: JobLeadDto) => {
    if (!confirm(`Delete "${l.title}"? Prefer Archive (set status) to keep history.`)) return;
    await remove.mutateAsync({ id: Number(l.id) });
    qc.invalidateQueries({ queryKey: getGetJobLeadsQueryKey() });
    toast.success("Lead deleted");
  };

  if (isLoading) {
    return <div className="space-y-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Job Leads</h1>
        <Button onClick={openCreate}>Add lead</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={view} onValueChange={setView}>
          <TabsList><TabsTrigger value="board">Board</TabsTrigger><TabsTrigger value="list">List</TabsTrigger></TabsList>
        </Tabs>
        <Input className="w-56" placeholder="Search title or company…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All statuses</SelectItem>
            {enumOptions(jobLeadStatus).map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={prio} onValueChange={setPrio}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All priorities</SelectItem>
            {enumOptions(priority).map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {view === "board" && (
          <Button variant="outline" size="sm" onClick={() => setShowClosed((s) => !s)}>
            {showClosed ? "Hide closed" : "Show closed"}
          </Button>
        )}
        <span className="text-sm text-muted-foreground">{leads.length} of {all.length}</span>
      </div>

      <div className="min-h-0 flex-1">
        {view === "board"
          ? <JobLeadsBoard leads={leads} onEdit={openEdit} onDelete={onDelete} showClosed={showClosed} />
          : <div className="h-full overflow-y-auto"><JobLeadsTable leads={leads} onEdit={openEdit} onDelete={onDelete} /></div>}
      </div>

      <JobLeadSheet open={sheetOpen} lead={editing} onOpenChange={setSheetOpen} />
    </div>
  );
}
