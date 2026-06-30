import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany, getGetCompaniesQueryKey,
} from "@/lib/api/companies/companies";
import type { CompanyDto, CreateCompanyRequest } from "@/lib/api/model";
import { CompaniesTable } from "@/features/companies/CompaniesTable";
import { CompanyDialog } from "@/features/companies/CompanyDialog";
import { CompanyDetailSheet } from "@/features/companies/CompanyDetailSheet";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";

export default function CompaniesPage() {
  const qc = useQueryClient();
  const { data: response, isLoading } = useGetCompanies();
  const create = useCreateCompany();
  const update = useUpdateCompany();
  const remove = useDeleteCompany();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyDto | undefined>();
  const [errors, setErrors] = useState<string[]>([]);
  const [detail, setDetail] = useState<CompanyDto | undefined>();
  const [detailOpen, setDetailOpen] = useState(false);

  const companies = response?.data ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: getGetCompaniesQueryKey() });
  const readErrors = (e: unknown): string[] => {
    const p = (e as { data?: { errors?: Record<string, string[]> } }).data;
    return p?.errors ? Object.values(p.errors).flat() : ["Save failed."];
  };

  const onSubmit = async (req: CreateCompanyRequest) => {
    setErrors([]);
    try {
      if (editing) await update.mutateAsync({ id: Number(editing.id), data: req });
      else await create.mutateAsync({ data: req });
      setOpen(false); invalidate(); toast.success(editing ? "Company updated" : "Company added");
    } catch (e) { setErrors(readErrors(e)); }
  };

  const onDelete = async (c: CompanyDto) => {
    if (!confirm(`Delete ${c.name}? This also deletes its job leads.`)) return;
    await remove.mutateAsync({ id: Number(c.id) });
    invalidate(); toast.success("Company deleted");
  };

  if (isLoading) return <PageShell><Skeleton className="h-64 w-full" /></PageShell>;

  return (
    <PageShell>
      <PageHeader
        title="Companies"
        actions={<Button onClick={() => { setEditing(undefined); setErrors([]); setOpen(true); }}>Add company</Button>}
      />
      <CompaniesTable
        companies={companies}
        onEdit={(c) => { setDetail(c); setDetailOpen(true); }}
        onDelete={onDelete}
      />
      <CompanyDetailSheet
        company={detail}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(c) => { setDetailOpen(false); setEditing(c); setErrors([]); setOpen(true); }}
      />
      <CompanyDialog
        open={open} initial={editing} pending={create.isPending || update.isPending}
        errors={errors} onOpenChange={setOpen} onSubmit={onSubmit}
      />
    </PageShell>
  );
}
