import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { CompanyDto } from "@/lib/api/model";
import { companyType, marketType, compensationFit, enumLabel } from "@/lib/enums";

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-3 gap-2 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 break-words">{value}</dd>
    </div>
  );
}

type Props = { company?: CompanyDto; open: boolean; onOpenChange: (o: boolean) => void; onEdit: (c: CompanyDto) => void };

export function CompanyDetailSheet({ company, open, onOpenChange, onEdit }: Props) {
  if (!company) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>{company.name}</SheetTitle></SheetHeader>
        <div className="p-4">
          <dl>
            <Row label="Type" value={enumLabel(companyType, company.companyType)} />
            <Row label="Market" value={enumLabel(marketType, company.marketType)} />
            <Row label="Compensation fit" value={enumLabel(compensationFit, company.compensationFit)} />
            <Row label="Website" value={company.websiteUrl} />
            <Row label="LinkedIn" value={company.linkedInUrl} />
            <Row label="Country" value={company.country} />
            <Row label="City" value={company.city} />
            <Row label="Notes" value={company.notes} />
          </dl>
          <Button className="mt-6 w-full" onClick={() => onEdit(company)}>Edit</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
