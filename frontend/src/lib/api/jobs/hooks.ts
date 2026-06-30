import type { JobDto, JobDetailDto, ListJobsParams } from '@/lib/api/model';
import { useListJobs, useGetJob } from '@/lib/api/jobs/jobs';

// Thin typed wrappers over the orval hooks. orval's mutator returns a
// { data, status, headers } envelope; `select` unwraps `data` so components
// receive the DTO directly — no `as unknown as` casts. The query cache still
// stores the envelope, so optimistic setQueryData elsewhere is unaffected.

export function useJobs(params?: ListJobsParams) {
  return useListJobs<JobDto[]>(params, { query: { select: r => r.data } });
}

export function useJob(jobId: number | null) {
  return useGetJob<JobDetailDto>(jobId ?? 0, {
    query: { enabled: jobId !== null, select: r => r.data },
  });
}
