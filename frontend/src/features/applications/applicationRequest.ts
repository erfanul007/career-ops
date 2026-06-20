import type { ApplicationDto, UpdateApplicationRequest } from "@/lib/api/model";

export const toUpdateRequest = (a: ApplicationDto): UpdateApplicationRequest => ({
  resumeVariantId: Number(a.resumeVariantId),
  appliedAtUtc: a.appliedAtUtc,
  expectedSalary: a.expectedSalary,
  expectedSalaryCurrency: a.expectedSalaryCurrency,
  noticePeriod: a.noticePeriod,
  nextStep: a.nextStep,
  nextActionAtUtc: a.nextActionAtUtc,
  notes: a.notes,
});
