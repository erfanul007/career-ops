import { useGetCompanies } from "@/lib/api/companies/companies";

type Props = {
  mode: "existing" | "new";
  companyId: string;
  newCompanyName: string;
  onModeChange: (m: "existing" | "new") => void;
  onCompanyIdChange: (id: string) => void;
  onNewCompanyNameChange: (name: string) => void;
};

const inputClass = "mt-1 w-full rounded border border-input bg-background p-2";

export function CompanySelect({
  mode, companyId, newCompanyName, onModeChange, onCompanyIdChange, onNewCompanyNameChange,
}: Props) {
  const { data: response } = useGetCompanies();
  const companies = response?.data ?? [];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Company</label>
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" checked={mode === "existing"} onChange={() => onModeChange("existing")} />
          Existing
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={mode === "new"} onChange={() => onModeChange("new")} />
          New
        </label>
      </div>
      {mode === "existing" ? (
        <select className={inputClass} value={companyId} onChange={(e) => onCompanyIdChange(e.target.value)}>
          <option value="">Select a company…</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      ) : (
        <input
          className={inputClass}
          placeholder="New company name"
          value={newCompanyName}
          onChange={(e) => onNewCompanyNameChange(e.target.value)}
        />
      )}
    </div>
  );
}
