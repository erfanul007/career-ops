import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useCreateJobLead, useUpdateJobLead, getGetJobLeadsQueryKey,
} from "@/lib/api/job-leads/job-leads";
import type { CreateJobLeadRequest, JobLeadDto, UpdateJobLeadRequest } from "@/lib/api/model";
import { toUpdateRequest } from "./leadRequest";

type LeadsCache = { data: JobLeadDto[] };

const readErrors = (e: unknown): string[] => {
  const problem = (e as { data?: { errors?: Record<string, string[]> } }).data;
  return problem?.errors ? Object.values(problem.errors).flat() : ["Save failed."];
};

// CreateJobLeadRequest carries companyId XOR newCompanyName; UpdateJobLeadRequest takes only companyId.
const toUpdateData = (req: CreateJobLeadRequest): UpdateJobLeadRequest => ({
  companyId: Number(req.companyId),
  title: req.title,
  source: req.source,
  sourceUrl: req.sourceUrl,
  jobDescription: req.jobDescription,
  location: req.location,
  remoteMode: req.remoteMode,
  employmentType: req.employmentType,
  salaryMin: req.salaryMin,
  salaryMax: req.salaryMax,
  salaryCurrency: req.salaryCurrency,
  salaryPeriod: req.salaryPeriod,
  priority: req.priority,
  status: req.status,
  fitScore: req.fitScore,
  aiSummary: req.aiSummary,
  missingKeywords: req.missingKeywords,
  suggestedResumeAngle: req.suggestedResumeAngle,
  nextActionAtUtc: req.nextActionAtUtc,
  deadlineAtUtc: req.deadlineAtUtc,
  notes: req.notes,
});

export function useSaveLead() {
  const qc = useQueryClient();
  const create = useCreateJobLead();
  const update = useUpdateJobLead();
  const [errors, setErrors] = useState<string[]>([]);

  const save = async (req: CreateJobLeadRequest, editingId?: number) => {
    setErrors([]);
    try {
      if (editingId != null) await update.mutateAsync({ id: editingId, data: toUpdateData(req) });
      else await create.mutateAsync({ data: req });
      qc.invalidateQueries({ queryKey: getGetJobLeadsQueryKey() });
      toast.success(editingId != null ? "Lead updated" : "Lead added");
    } catch (e) {
      setErrors(readErrors(e));
      throw e;
    }
  };

  return { save, pending: create.isPending || update.isPending, errors };
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  const key = getGetJobLeadsQueryKey();
  const mutation = useUpdateJobLead({
    mutation: {
      onMutate: async ({ id, data }) => {
        await qc.cancelQueries({ queryKey: key });
        const prev = qc.getQueryData<LeadsCache>(key);
        qc.setQueryData<LeadsCache>(key, (old) =>
          old ? { ...old, data: old.data.map((l) => (Number(l.id) === id ? { ...l, status: data.status } : l)) } : old,
        );
        return { prev };
      },
      onError: (_e, _vars, ctx) => {
        const prev = (ctx as { prev?: LeadsCache } | undefined)?.prev;
        if (prev) qc.setQueryData(key, prev);
        toast.error("Could not move the lead — reverted.");
      },
      onSettled: () => { qc.invalidateQueries({ queryKey: key }); },
    },
  });

  const changeStatus = (lead: JobLeadDto, status: number) =>
    mutation.mutate({ id: Number(lead.id), data: toUpdateRequest(lead, { status }) });

  return { changeStatus };
}
