export type AiPreset = "fit" | "bullets" | "topics";

export const aiPresetLabels: Record<AiPreset, string> = {
  fit: "Analyze fit",
  bullets: "Tailor resume bullets",
  topics: "Prepare interview topics",
};

export type PromptContext = {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  profileSummary: string;
  resumeVariantName: string;
  resumeVariantSummary: string;
};

const block = (label: string, value: string) =>
  `## ${label}\n${value.trim() || "(not provided)"}\n`;

export function buildPrompt(preset: AiPreset, c: PromptContext): string {
  const context =
    block("Role", `${c.jobTitle} at ${c.companyName}`) +
    block("Job description", c.jobDescription) +
    block("Candidate profile", c.profileSummary) +
    block("Resume variant", `${c.resumeVariantName}\n${c.resumeVariantSummary}`);

  const instruction = {
    fit:
      "Act as a senior technical recruiter. Assess how well this candidate fits the role. " +
      "Return: a fit score 0–100, a short match summary, strong matches, missing keywords, " +
      "risk factors, and a suggested resume angle.",
    bullets:
      "Act as a resume coach. Rewrite the candidate's resume bullets to target this specific role. " +
      "Return 5–8 tailored, achievement-oriented bullets using keywords from the job description.",
    topics:
      "Act as an interview coach. Based on the role and the candidate, list the likely interview topics, " +
      "technical questions, system-design prompts, behavioral questions, and good questions to ask the interviewer.",
  }[preset];

  return `${instruction}\n\n${context}`;
}
