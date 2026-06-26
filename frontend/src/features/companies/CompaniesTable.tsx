import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { CompanyDto } from "@/lib/api/model";

type Props = { companies: CompanyDto[]; onEdit: (c: CompanyDto) => void; onDelete: (c: CompanyDto) => void };

export function CompaniesTable({ companies, onEdit, onDelete }: Props) {
  if (companies.length === 0) return <p className="text-muted-foreground">No companies yet.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Market</TableHead>
          <TableHead>Comp.</TableHead><TableHead>Location</TableHead><TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {companies.map((c) => (
          <TableRow key={c.id as number} className="cursor-pointer" onClick={() => onEdit(c)}>
            <TableCell className="font-medium">{c.name}</TableCell>
            <TableCell>{c.companyType}</TableCell>
            <TableCell>{c.marketType}</TableCell>
            <TableCell>{c.compensationFit}</TableCell>
            <TableCell>{[c.city, c.country].filter(Boolean).join(", ")}</TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" onClick={() => onDelete(c)}>Delete</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
