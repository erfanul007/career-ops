import type { JobDetailDto } from '@/lib/api/model';

interface Props { job: JobDetailDto }

export function OverviewTab({ job }: Props) {
  const fields: Array<[string, string | number | null | undefined]> = [
    ['Source', job.source],
    ['Source URL', job.sourceUrl],
    ['Location', [job.city, job.country].filter(Boolean).join(', ') || null],
    ['Remote', job.remoteMode],
    ['Employment', job.employmentType],
    ['Salary', job.salaryMin ? `${job.salaryCurrency ?? ''} ${(job.salaryMin as number).toLocaleString()}–${job.salaryMax ? (job.salaryMax as number).toLocaleString() : '+'} / ${job.salaryPeriod}` : null],
    ['Applied', job.appliedAtUtc ? new Date(job.appliedAtUtc).toLocaleDateString() : null],
    ['Deadline', job.deadlineAtUtc ? new Date(job.deadlineAtUtc).toLocaleDateString() : null],
    ['Next action', job.nextActionAtUtc ? new Date(job.nextActionAtUtc).toLocaleDateString() : null],
    ['Fit score', job.fitScore ? `${job.fitScore}/10` : null],
    ['Resume angle', job.resumeAngle],
    ['Offer salary', job.offerSalary ? `${job.offerCurrency ?? ''} ${(job.offerSalary as number).toLocaleString()}` : null],
    ['Offer notes', job.offerNotes],
    ['Rejection reason', job.rejectionReason],
  ];

  return (
    <div className="space-y-3 py-2">
      {job.notes && (
        <div className="rounded-md bg-muted p-3 text-sm">{job.notes}</div>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {fields.filter(([, v]) => v != null && v !== '').map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-medium truncate">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
