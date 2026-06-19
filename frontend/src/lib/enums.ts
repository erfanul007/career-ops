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
