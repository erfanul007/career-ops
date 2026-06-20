export type EnumMap = Record<number, string>;
export type EnumOption = { value: number; label: string };

export const enumOptions = (map: EnumMap): EnumOption[] =>
  Object.entries(map).map(([value, label]) => ({ value: Number(value), label }));

export const enumLabel = (map: EnumMap, value: number | null | undefined): string =>
  value == null ? "" : (map[value] ?? String(value));

export const companyType: EnumMap = {
  0: "Unknown", 1: "Product", 2: "Outsourcing", 3: "Startup", 4: "Enterprise", 5: "Agency",
};

export const marketType: EnumMap = {
  0: "Unknown", 1: "Local", 2: "Remote", 3: "Hybrid", 4: "International",
};

export const compensationFit: EnumMap = {
  0: "Unknown", 1: "Low", 2: "Medium", 3: "High",
};

export const jobSource: EnumMap = {
  0: "Unknown", 1: "LinkedIn", 2: "Referral", 3: "Recruiter", 4: "Company website",
  5: "BDJobs", 6: "Wellfound", 7: "RemoteOK", 8: "Email", 9: "Other",
};

export const remoteMode: EnumMap = {
  0: "Unknown", 1: "Onsite", 2: "Hybrid", 3: "Remote", 4: "Flexible",
};

export const employmentType: EnumMap = {
  0: "Unknown", 1: "Full-time", 2: "Contract", 3: "Part-time", 4: "Freelance",
};

export const salaryPeriod: EnumMap = {
  0: "Unknown", 1: "Monthly", 2: "Yearly", 3: "Hourly",
};

export const priority: EnumMap = {
  0: "Low", 1: "Medium", 2: "High", 3: "Critical",
};

export const jobLeadStatus: EnumMap = {
  0: "Discovered", 1: "Interested", 2: "Applied", 3: "Interviewing", 4: "Offer",
  5: "Rejected", 6: "Ghosted", 7: "Withdrawn", 8: "Archived",
};

// Tailwind tint classes per enum value (badge coloring). Kept here per 04-conventions.
export const statusBadgeClass: Record<number, string> = {
  0: "bg-slate-100 text-slate-700",     // Discovered
  1: "bg-blue-100 text-blue-700",       // Interested
  2: "bg-amber-100 text-amber-800",     // Applied
  3: "bg-violet-100 text-violet-700",   // Interviewing
  4: "bg-green-100 text-green-700",     // Offer
  5: "bg-red-100 text-red-700",         // Rejected
  6: "bg-zinc-100 text-zinc-600",       // Ghosted
  7: "bg-zinc-100 text-zinc-600",       // Withdrawn
  8: "bg-zinc-200 text-zinc-700",       // Archived
};

export const priorityBadgeClass: Record<number, string> = {
  0: "bg-zinc-100 text-zinc-600",       // Low
  1: "bg-sky-100 text-sky-700",         // Medium
  2: "bg-orange-100 text-orange-800",   // High
  3: "bg-red-100 text-red-700",         // Critical
};

export const applicationStage: EnumMap = {
  0: "Applied", 1: "Recruiter screen", 2: "Technical screen", 3: "Take-home",
  4: "System design", 5: "Hiring manager", 6: "Final", 7: "Offer",
  8: "Rejected", 9: "Ghosted", 10: "Withdrawn",
};

export const applicationStatus: EnumMap = {
  0: "Active", 1: "Paused", 2: "Rejected", 3: "Offer", 4: "Withdrawn",
};

export const applicationStatusBadgeClass: Record<number, string> = {
  0: "bg-blue-100 text-blue-700",   // Active
  1: "bg-amber-100 text-amber-800", // Paused
  2: "bg-red-100 text-red-700",     // Rejected
  3: "bg-green-100 text-green-700", // Offer
  4: "bg-zinc-100 text-zinc-600",   // Withdrawn
};

export const relatedEntityType: EnumMap = {
  0: "None", 1: "Job lead", 2: "Application", 3: "Interview", 4: "Contact",
};

export const followUpStatus: EnumMap = {
  0: "Pending", 1: "Completed", 2: "Skipped",
};

export const interviewRoundType: EnumMap = {
  0: "Recruiter screen", 1: "Technical", 2: "Live coding", 3: "System design",
  4: "Take-home discussion", 5: "AI engineering", 6: "Behavioral", 7: "Hiring manager",
  8: "Final", 9: "Other",
};
export const interviewStatus: EnumMap = { 0: "Scheduled", 1: "Completed", 2: "Cancelled", 3: "Rescheduled" };
export const interviewOutcome: EnumMap = { 0: "Unknown", 1: "Passed", 2: "Failed", 3: "Waiting" };

export const interviewStatusBadgeClass: Record<number, string> = {
  0: "bg-sky-100 text-sky-700",      // Scheduled
  1: "bg-emerald-100 text-emerald-700", // Completed
  2: "bg-zinc-100 text-zinc-600",    // Cancelled
  3: "bg-amber-100 text-amber-800",  // Rescheduled
};
export const interviewOutcomeBadgeClass: Record<number, string> = {
  0: "bg-zinc-100 text-zinc-600",    // Unknown
  1: "bg-emerald-100 text-emerald-700", // Passed
  2: "bg-red-100 text-red-700",      // Failed
  3: "bg-amber-100 text-amber-800",  // Waiting
};
