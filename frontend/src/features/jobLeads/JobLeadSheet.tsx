import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import type { CreateJobLeadRequest, JobLeadDto } from "@/lib/api/model";
import { JobLeadForm } from "./JobLeadForm";
import { useSaveLead } from "./useLeadMutations";

type Props = {
  open: boolean;
  lead?: JobLeadDto;            // present = edit, absent = create
  onOpenChange: (open: boolean) => void;
};

export function JobLeadSheet({ open, lead, onOpenChange }: Props) {
  const { save, pending, errors } = useSaveLead();

  const onSubmit = async (req: CreateJobLeadRequest) => {
    try {
      await save(req, lead ? Number(lead.id) : undefined);
      onOpenChange(false);
    } catch {
      /* validation errors surfaced in the form via `errors` */
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{lead ? "Edit job lead" : "Add job lead"}</SheetTitle>
          <SheetDescription>{lead ? lead.companyName : "Track a new opportunity"}</SheetDescription>
        </SheetHeader>
        <div className="p-4">
          <JobLeadForm initial={lead} pending={pending} errors={errors} onSubmit={onSubmit} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
