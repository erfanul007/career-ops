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
