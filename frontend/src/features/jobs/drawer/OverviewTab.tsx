import type { JobDetailDto } from '@/lib/api/model';
import { MetadataSection } from './MetadataSection';
import { CollapsibleSection } from './CollapsibleSection';
import { NextActionsBlock } from './NextActionsBlock';
import { AttachmentsTab } from './AttachmentsTab';
import { PropertiesTab } from './PropertiesTab';
import { formatMoneyRange, formatShortDate, formatLocation } from '../jobPresentation';

interface Props { job: JobDetailDto }

export function OverviewTab({ job }: Props) {
  const salary = formatMoneyRange(job.salaryMin, job.salaryMax, job.salaryCurrency, job.salaryPeriod);
  const location = formatLocation(job);

  return (
    <div className="space-y-4 py-2">
      <MetadataSection
        title="Role & source"
        rows={[
          ['Company', job.companyName],
          ['Source', job.source],
          ['Source URL', job.sourceUrl
            ? <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2 break-all">{job.sourceUrl}</a>
            : null],
          ['Employment', job.employmentType],
        ]}
      />

      <MetadataSection
        title="Location"
        rows={[['Location', location], ['Remote', job.remoteMode]]}
      />

      <MetadataSection title="Compensation" rows={[['Salary', salary]]} />

      <MetadataSection
        title="Strategy"
        rows={[
          ['Fit score', job.fitScore != null ? `${job.fitScore}/10` : null],
          ['Resume', job.resumeLabel],
          ['Resume angle', job.resumeAngle],
          ['Cover letter', job.coverLetterNotes],
        ]}
      />

      <MetadataSection
        title="Dates"
        rows={[
          ['Applied', formatShortDate(job.appliedAtUtc)],
          ['Deadline', formatShortDate(job.deadlineAtUtc)],
          ['Next action', formatShortDate(job.nextActionAtUtc)],
          ['Last contacted', formatShortDate(job.lastContactedAtUtc)],
        ]}
      />

      <NextActionsBlock job={job} />

      {(job.notes || job.jobDescription) && (
        <section className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground">Notes</h4>
          {job.notes && <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{job.notes}</div>}
          {job.jobDescription && <p className="text-sm whitespace-pre-wrap text-muted-foreground">{job.jobDescription}</p>}
        </section>
      )}

      <CollapsibleSection title="Attachments" count={job.attachments?.length ?? 0}>
        <AttachmentsTab job={job} />
      </CollapsibleSection>

      <CollapsibleSection title="Properties" count={job.properties?.length ?? 0}>
        <PropertiesTab job={job} />
      </CollapsibleSection>
    </div>
  );
}
