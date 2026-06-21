import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { ResumeVariantDto } from "@/lib/api/model";

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-3 gap-2 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 break-words">{value}</dd>
    </div>
  );
}

type Props = { variant?: ResumeVariantDto; open: boolean; onOpenChange: (o: boolean) => void; onEdit: (v: ResumeVariantDto) => void };

export function ResumeVariantDetailSheet({ variant, open, onOpenChange, onEdit }: Props) {
  if (!variant) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>{variant.name}</SheetTitle></SheetHeader>
        <div className="p-4">
          <dl>
            <Row label="Target role" value={variant.targetRole} />
            <Row label="Summary" value={variant.summary} />
            <Row label="Notes" value={variant.notes} />
            <Row label="Default" value={variant.isDefault ? "Yes" : "No"} />
          </dl>
          <Button className="mt-6 w-full" onClick={() => onEdit(variant)}>Edit</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
