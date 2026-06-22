import { useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { CreateJobLeadRequest, JobLeadDto } from "@/lib/api/model";
import { ConvertLeadDialog } from "@/features/applications/ConvertLeadDialog";
import { AiPromptDialog } from "@/features/ai/AiPromptDialog";
import { JobLeadForm } from "./JobLeadForm";
import { useSaveLead } from "./useLeadMutations";

type Props = {
  open: boolean;
  lead?: JobLeadDto;            // present = edit, absent = create
  onOpenChange: (open: boolean) => void;
};

export function JobLeadSheet({ open, lead, onOpenChange }: Props) {
  const { save, pending, errors } = useSaveLead();
  const [convertOpen, setConvertOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

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
          {lead && (
            <>
              {lead.sourceUrl && (
                <Button asChild variant="outline" className="mt-4 w-full">
                  <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" /> Open job posting
                  </a>
                </Button>
              )}
              <Button
                variant="outline"
                className={lead.sourceUrl ? "mt-2 w-full" : "mt-4 w-full"}
                onClick={() => setConvertOpen(true)}
              >
                Convert to application
              </Button>
              <ConvertLeadDialog
                lead={lead}
                open={convertOpen}
                onOpenChange={setConvertOpen}
              />
              <Button
                variant="outline"
                className="mt-2 w-full"
                onClick={() => setAiOpen(true)}
              >
                AI prompt
              </Button>
              <AiPromptDialog lead={lead} open={aiOpen} onOpenChange={setAiOpen} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
