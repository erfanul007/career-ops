import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useChangeApplicationStage, useMarkApplicationRejected, useMarkApplicationOffer,
  useMarkApplicationGhosted, getGetApplicationsQueryKey,
} from "@/lib/api/applications/applications";
import type { ApplicationDto } from "@/lib/api/model";

type Cache = { data: ApplicationDto[] };

// ApplicationStage ints: pipeline 0..6 -> change-stage; 7 Offer -> mark-offer;
// 8 Rejected -> mark-rejected; 9 Ghosted -> mark-ghosted; 10 Withdrawn -> change-stage.
export function useApplicationStageMove() {
  const qc = useQueryClient();
  const key = getGetApplicationsQueryKey();
  const changeStage = useChangeApplicationStage();
  const markRejected = useMarkApplicationRejected();
  const markOffer = useMarkApplicationOffer();
  const markGhosted = useMarkApplicationGhosted();

  const optimistic = (id: number, stage: number) => {
    qc.cancelQueries({ queryKey: key });
    const prev = qc.getQueryData<Cache>(key);
    qc.setQueryData<Cache>(key, (old) =>
      old ? { ...old, data: old.data.map((a) => (Number(a.id) === id ? { ...a, currentStage: stage } : a)) } : old,
    );
    return prev;
  };
  const rollback = (prev?: Cache) => {
    if (prev) qc.setQueryData(key, prev);
    toast.error("Could not move — reverted.");
  };
  const settle = () => qc.invalidateQueries({ queryKey: key });

  const move = async (app: ApplicationDto, stage: number) => {
    if (stage === app.currentStage) return;
    const id = Number(app.id);
    const prev = optimistic(id, stage);
    try {
      if (stage <= 6 || stage === 10) await changeStage.mutateAsync({ id, data: { stage } });
      else if (stage === 7) await markOffer.mutateAsync({ id });
      else if (stage === 8) await markRejected.mutateAsync({ id, data: { rejectionReason: null } });
      else if (stage === 9) await markGhosted.mutateAsync({ id });
    } catch {
      rollback(prev);
    } finally {
      settle();
    }
  };

  return { move };
}
