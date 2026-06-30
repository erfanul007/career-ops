import type { ReactNode } from 'react';

type Row = [label: string, value: ReactNode | null | undefined];

interface Props {
  title: string;
  rows: Row[];
}

function isEmpty(value: ReactNode | null | undefined): boolean {
  return value == null || value === '';
}

export function MetadataSection({ title, rows }: Props) {
  const visible = rows.filter(([, value]) => !isEmpty(value));
  if (visible.length === 0) return null;

  return (
    <section className="space-y-1.5">
      <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
      <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-sm">
        {visible.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
