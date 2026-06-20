import type { JobLeadDto, UpdateJobLeadRequest } from "@/lib/api/model";

export const toUpdateRequest = (
  l: JobLeadDto,
  overrides: Partial<UpdateJobLeadRequest> = {},
): UpdateJobLeadRequest => ({
  companyId: Number(l.companyId),
  title: l.title,
  source: l.source,
  sourceUrl: l.sourceUrl,
  jobDescription: l.jobDescription,
  location: l.location,
  remoteMode: l.remoteMode,
  employmentType: l.employmentType,
  salaryMin: l.salaryMin,
  salaryMax: l.salaryMax,
  salaryCurrency: l.salaryCurrency,
  salaryPeriod: l.salaryPeriod,
  priority: l.priority,
  status: l.status,
  fitScore: l.fitScore,
  nextActionAtUtc: l.nextActionAtUtc,
  deadlineAtUtc: l.deadlineAtUtc,
  notes: l.notes,
  ...overrides,
});
