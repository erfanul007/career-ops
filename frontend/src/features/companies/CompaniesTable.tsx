import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { Building2 } from "lucide-react";
import type { CompanyDto } from "@/lib/api/model";

type Props = { companies: CompanyDto[]; onEdit: (c: CompanyDto) => void; onDelete: (c: CompanyDto) => void };

export function CompaniesTable({ companies, onEdit, onDelete }: Props) {
  if (companies.length === 0) return <EmptyState icon={Building2} title="No companies yet" hint="Add a company to start tracking roles." />;
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
