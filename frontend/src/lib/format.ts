// Locale-driven display formatters. Inputs are ISO strings (or numbers);
// output follows the runtime locale (no hardcoded separators). A future
// i18n layer can thread an explicit locale through `LOCALE`.
const LOCALE: string | undefined = undefined;

function toDate(value?: string | Date | null): Date | null {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value?: string | Date | null): string | null {
  const d = toDate(value);
  return d ? d.toLocaleDateString(LOCALE, { year: "numeric", month: "2-digit", day: "2-digit" }) : null;
}

export function formatDateTime(value?: string | Date | null): string | null {
  const d = toDate(value);
  return d
    ? d.toLocaleString(LOCALE, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
    : null;
}

export function formatNumber(value?: number | string | null): string | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n.toLocaleString(LOCALE);
}

export function formatSalary(
  min?: number | string | null,
  max?: number | string | null,
  currency?: string | null,
  period?: string | null,
): string | null {
  if (min == null) return null;
  const cur = currency ?? "";
  const lo = formatNumber(min);
  const hi = max != null ? `–${formatNumber(max)}` : "+";
  const per = period ? ` / ${period}` : "";
  return `${cur} ${lo}${hi}${per}`.trim();
}
