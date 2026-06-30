import { formatDistance } from "date-fns";
import { formatDate, formatSalary } from "@/lib/format";
import type { JobDto, JobStatus, Priority } from "@/lib/api/model";

export function isOverdue(value?: string | null, now: Date = new Date()): boolean {
  if (!value) return false;
  return new Date(value).getTime() < now.getTime();
}

export function formatRelativeDate(value?: string | null, now: Date = new Date()): string | null {
  if (!value) return null;
  return formatDistance(new Date(value), now, { addSuffix: true });
}

export function formatShortDate(value?: string | null): string | null {
  return formatDate(value);
}

export function formatMoneyRange(
  min?: number | string | null,
  max?: number | string | null,
  currency?: string | null,
  period?: string | null,
): string | null {
  return formatSalary(min, max, currency, period);
}

export function formatLocation(
  job: Pick<JobDto, "city" | "country" | "locationText">,
): string | null {
  const parts = [job.city, job.country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return job.locationText ?? null;
}

export function getPriorityPresentation(priority: Priority): { label: string; show: boolean } {
  return { label: priority, show: priority === "High" };
}

const STATUS_DOT: Record<JobStatus, string> = {
  Discovered: "bg-slate-400",
  Interested: "bg-blue-400",
  Applied: "bg-indigo-400",
  Interviewing: "bg-violet-400",
  Offered: "bg-green-500",
  Rejected: "bg-red-400",
  Ghosted: "bg-orange-400",
  Withdrawn: "bg-yellow-500",
  Archived: "bg-gray-400",
};

const STATUS_ACCENT: Record<JobStatus, string> = {
  Discovered: "border-t-slate-300",
  Interested: "border-t-blue-300",
  Applied: "border-t-indigo-300",
  Interviewing: "border-t-violet-300",
  Offered: "border-t-green-400",
  Rejected: "border-t-red-300",
  Ghosted: "border-t-orange-300",
  Withdrawn: "border-t-yellow-300",
  Archived: "border-t-gray-300",
};

// Tolerant of non-status labels (country/company grouping passes arbitrary strings):
// falls back to neutral classes instead of `undefined`.
export function getStatusPresentation(status: JobStatus): { label: string; dotClassName: string; accentClassName: string } {
  return {
    label: status,
    dotClassName: STATUS_DOT[status] ?? "bg-slate-400",
    accentClassName: STATUS_ACCENT[status] ?? "border-t-slate-300",
  };
}
