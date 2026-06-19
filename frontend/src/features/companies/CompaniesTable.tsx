import { companyType, marketType, compensationFit, enumLabel } from "@/lib/enums";
import type { CompanyDto } from "@/lib/api/model";

type Props = {
  companies: CompanyDto[];
  onEdit: (c: CompanyDto) => void;
  onDelete: (c: CompanyDto) => void;
};

export function CompaniesTable({ companies, onEdit, onDelete }: Props) {
  if (companies.length === 0) return <p className="text-muted-foreground">No companies yet.</p>;
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b text-left">
          <th className="p-2">Name</th><th className="p-2">Type</th>
          <th className="p-2">Market</th><th className="p-2">Comp.</th>
          <th className="p-2">Location</th><th className="p-2"></th>
        </tr>
      </thead>
      <tbody>
        {companies.map((c) => (
          <tr key={c.id} className="border-b">
            <td className="p-2 font-medium">{c.name}</td>
            <td className="p-2">{enumLabel(companyType, c.companyType)}</td>
            <td className="p-2">{enumLabel(marketType, c.marketType)}</td>
            <td className="p-2">{enumLabel(compensationFit, c.compensationFit)}</td>
            <td className="p-2">{[c.city, c.country].filter(Boolean).join(", ")}</td>
            <td className="p-2 text-right">
              <button onClick={() => onEdit(c)} className="mr-3 text-primary">Edit</button>
              <button onClick={() => onDelete(c)} className="text-destructive">Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
