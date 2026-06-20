import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useGetCompanies } from "@/lib/api/companies/companies";

type Props = {
  mode: "existing" | "new";
  companyId: string;
  newCompanyName: string;
  onModeChange: (m: "existing" | "new") => void;
  onCompanyIdChange: (id: string) => void;
  onNewCompanyNameChange: (name: string) => void;
};

export function CompanySelect({
  mode, companyId, newCompanyName, onModeChange, onCompanyIdChange, onNewCompanyNameChange,
}: Props) {
  const { data: response } = useGetCompanies();
  const companies = response?.data ?? [];

  return (
    <div className="space-y-2">
      <Label>Company</Label>
      <Tabs value={mode} onValueChange={(v) => onModeChange(v as "existing" | "new")}>
        <TabsList>
          <TabsTrigger value="existing">Existing</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
        </TabsList>
      </Tabs>
      {mode === "existing" ? (
        <Select value={companyId || undefined} onValueChange={onCompanyIdChange}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Select a company…" /></SelectTrigger>
          <SelectContent>
            {companies.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      ) : (
        <Input
          placeholder="New company name"
          value={newCompanyName}
          onChange={(e) => onNewCompanyNameChange(e.target.value)}
        />
      )}
    </div>
  );
}
