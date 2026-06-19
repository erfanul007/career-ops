import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany,
  getGetCompaniesQueryKey,
} from "@/lib/api/companies/companies";
import type { CompanyDto, CreateCompanyRequest } from "@/lib/api/model";
import { CompanyForm } from "@/features/companies/CompanyForm";
import { CompaniesTable } from "@/features/companies/CompaniesTable";

export default function CompaniesPage() {
  const queryClient = useQueryClient();
  const { data: response, isLoading } = useGetCompanies();
  const create = useCreateCompany();
  const update = useUpdateCompany();
  const remove = useDeleteCompany();
  const [editing, setEditing] = useState<CompanyDto | undefined>();
  const [errors, setErrors] = useState<string[]>([]);

  const companies = response?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetCompaniesQueryKey() });

  const readErrors = (e: unknown): string[] => {
    const problem = (e as { data?: { errors?: Record<string, string[]> } }).data;
    return problem?.errors ? Object.values(problem.errors).flat() : ["Save failed."];
  };

  const onSubmit = async (req: CreateCompanyRequest) => {
    setErrors([]);
    try {
      if (editing) await update.mutateAsync({ id: Number(editing.id), data: req });
      else await create.mutateAsync({ data: req });
      setEditing(undefined);
      invalidate();
    } catch (e) {
      setErrors(readErrors(e));
    }
  };

  const onDelete = async (c: CompanyDto) => {
    if (!confirm(`Delete ${c.name}? This also deletes its job leads.`)) return;
    await remove.mutateAsync({ id: Number(c.id) });
    if (editing?.id === c.id) setEditing(undefined);
    invalidate();
  };

  if (isLoading) return <p>Loading…</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Companies</h1>
      <section className="rounded border p-4">
        <h2 className="mb-4 text-lg font-medium">{editing ? `Edit ${editing.name}` : "Add company"}</h2>
        <CompanyForm
          initial={editing}
          pending={create.isPending || update.isPending}
          errors={errors}
          onSubmit={onSubmit}
          onCancel={editing ? () => { setEditing(undefined); setErrors([]); } : undefined}
        />
      </section>
      <CompaniesTable companies={companies} onEdit={setEditing} onDelete={onDelete} />
    </div>
  );
}
