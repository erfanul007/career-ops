import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetJobLead, useCreateJobLead, useUpdateJobLead, getGetJobLeadsQueryKey,
} from "@/lib/api/job-leads/job-leads";
import type { CreateJobLeadRequest, UpdateJobLeadRequest } from "@/lib/api/model";
import { JobLeadForm } from "@/features/jobLeads/JobLeadForm";

export default function JobLeadDetailsPage() {
  const { id } = useParams();
  const isNew = id === undefined;
  const leadId = isNew ? 0 : Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: response, isLoading } = useGetJobLead(leadId, { query: { enabled: !isNew } });
  const create = useCreateJobLead();
  const update = useUpdateJobLead();
  const [errors, setErrors] = useState<string[]>([]);

  const lead = response?.data && "id" in response.data ? response.data : undefined;

  const readErrors = (e: unknown): string[] => {
    const problem = (e as { data?: { errors?: Record<string, string[]> } }).data;
    return problem?.errors ? Object.values(problem.errors).flat() : ["Save failed."];
  };

  const onSubmit = async (req: CreateJobLeadRequest) => {
    setErrors([]);
    try {
      if (isNew) {
        await create.mutateAsync({ data: req });
      } else {
        const updateReq: UpdateJobLeadRequest = {
          companyId: Number(req.companyId),
          title: req.title, source: req.source, sourceUrl: req.sourceUrl,
          jobDescription: req.jobDescription, location: req.location,
          remoteMode: req.remoteMode, employmentType: req.employmentType,
          salaryMin: req.salaryMin, salaryMax: req.salaryMax, salaryCurrency: req.salaryCurrency,
          salaryPeriod: req.salaryPeriod, priority: req.priority, status: req.status,
          fitScore: req.fitScore, nextActionAtUtc: req.nextActionAtUtc,
          deadlineAtUtc: req.deadlineAtUtc, notes: req.notes,
        };
        await update.mutateAsync({ id: leadId, data: updateReq });
      }
      queryClient.invalidateQueries({ queryKey: getGetJobLeadsQueryKey() });
      navigate("/job-leads");
    } catch (e) {
      setErrors(readErrors(e));
    }
  };

  if (!isNew && isLoading) return <p>Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{isNew ? "Add job lead" : lead?.title ?? "Job lead"}</h1>
      <JobLeadForm
        initial={lead}
        pending={create.isPending || update.isPending}
        errors={errors}
        onSubmit={onSubmit}
      />
    </div>
  );
}
