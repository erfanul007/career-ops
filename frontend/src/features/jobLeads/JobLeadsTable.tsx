import { Link } from "react-router";
import { priority, jobLeadStatus, remoteMode, enumLabel } from "@/lib/enums";
import type { JobLeadDto } from "@/lib/api/model";

type Props = { leads: JobLeadDto[]; onDelete: (l: JobLeadDto) => void };

export function JobLeadsTable({ leads, onDelete }: Props) {
  if (leads.length === 0) return <p className="text-muted-foreground">No job leads match.</p>;
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b text-left">
          <th className="p-2">Title</th><th className="p-2">Company</th>
          <th className="p-2">Status</th><th className="p-2">Priority</th>
          <th className="p-2">Remote</th><th className="p-2"></th>
        </tr>
      </thead>
      <tbody>
        {leads.map((l) => (
          <tr key={l.id} className="border-b">
            <td className="p-2 font-medium">
              <Link to={`/job-leads/${l.id}`} className="text-primary hover:underline">{l.title}</Link>
            </td>
            <td className="p-2">{l.companyName}</td>
            <td className="p-2">{enumLabel(jobLeadStatus, l.status)}</td>
            <td className="p-2">{enumLabel(priority, l.priority)}</td>
            <td className="p-2">{enumLabel(remoteMode, l.remoteMode)}</td>
            <td className="p-2 text-right">
              <button onClick={() => onDelete(l)} className="text-destructive">Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
