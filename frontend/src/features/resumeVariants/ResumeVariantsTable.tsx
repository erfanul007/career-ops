import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ResumeVariantDto } from "@/lib/api/model";

type Props = { variants: ResumeVariantDto[]; onEdit: (v: ResumeVariantDto) => void; onMakeDefault: (v: ResumeVariantDto) => void; onDelete: (v: ResumeVariantDto) => void };

export function ResumeVariantsTable({ variants, onEdit, onMakeDefault, onDelete }: Props) {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Target role</TableHead><TableHead /><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
      <TableBody>
        {variants.map((v) => (
          <TableRow key={v.id} className="cursor-pointer" onClick={() => onEdit(v)}>
            <TableCell className="font-medium">{v.name}</TableCell>
            <TableCell>{v.targetRole ?? "—"}</TableCell>
            <TableCell>{v.isDefault && <Badge variant="secondary">Default</Badge>}</TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
              {!v.isDefault && <Button variant="ghost" size="sm" onClick={() => onMakeDefault(v)}>Make default</Button>}
              <Button variant="ghost" size="sm" onClick={() => onDelete(v)}>Delete</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
