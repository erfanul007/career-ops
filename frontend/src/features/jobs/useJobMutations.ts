import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useCreateJob,
  useUpdateJob,
  useDeleteJob,
  useTransitionJob,
  getListJobsQueryKey,
  getGetJobQueryKey,
} from '@/lib/api/jobs/jobs';

export function useJobMutations() {
  const qc = useQueryClient();

  const invalidateJobs = () => {
    qc.invalidateQueries({ queryKey: getListJobsQueryKey() });
  };

  const create = useCreateJob({
    mutation: {
      onSuccess: invalidateJobs,
      onError: () => toast.error('Failed to create job'),
    },
  });

  const update = useUpdateJob({
    mutation: {
      onSuccess: (_, vars) => {
        invalidateJobs();
        qc.invalidateQueries({ queryKey: getGetJobQueryKey(vars.id) });
      },
      onError: () => toast.error('Failed to update job'),
    },
  });

  const remove = useDeleteJob({
    mutation: {
      onSuccess: invalidateJobs,
      onError: () => toast.error('Failed to delete job'),
    },
  });

  const transition = useTransitionJob({
    mutation: {
      onSuccess: (_, vars) => {
        invalidateJobs();
        qc.invalidateQueries({ queryKey: getGetJobQueryKey(vars.id) });
      },
      onError: () => toast.error('Failed to transition job'),
    },
  });

  return { create, update, remove, transition };
}
