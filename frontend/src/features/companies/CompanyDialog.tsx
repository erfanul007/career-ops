import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { CompanyDto, CreateCompanyRequest } from "@/lib/api/model";
import { CompanyForm } from "./CompanyForm";

type Props = {
  open: boolean;
  initial?: CompanyDto;
  pending: boolean;
  errors: string[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (req: CreateCompanyRequest) => void;
};

export function CompanyDialog({ open, initial, pending, errors, onOpenChange, onSubmit }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{initial ? `Edit ${initial.name}` : "Add company"}</DialogTitle></DialogHeader>
        <CompanyForm initial={initial} pending={pending} errors={errors} onSubmit={onSubmit} />
      </DialogContent>
    </Dialog>
  );
}
