import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useGetUserProfile } from "@/lib/api/settings/settings";
import { useGetResumeVariants } from "@/lib/api/resume-variants/resume-variants";
import type { JobLeadDto } from "@/lib/api/model";
import { buildPrompt, aiPresetLabels, type AiPreset } from "@/lib/aiPrompts";

type Props = { lead: JobLeadDto; open: boolean; onOpenChange: (o: boolean) => void };

export function AiPromptDialog({ lead, open, onOpenChange }: Props) {
  const { data: profileRes } = useGetUserProfile();
  const { data: variantsRes } = useGetResumeVariants();
  const [preset, setPreset] = useState<AiPreset>("fit");

  const profile =
    profileRes?.data && "fullName" in profileRes.data ? profileRes.data : undefined;
  const variants = variantsRes?.data ?? [];
  const variant = variants.find((v) => v.isDefault) ?? variants[0];

  const prompt = buildPrompt(preset, {
    jobTitle: lead.title,
    companyName: lead.companyName,
    jobDescription: lead.jobDescription ?? "",
    profileSummary: profile?.careerSummary ?? "",
    resumeVariantName: variant?.name ?? "",
    resumeVariantSummary: variant?.summary ?? "",
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success("Prompt copied — paste into Claude/ChatGPT");
    } catch {
      toast.error("Couldn't copy — select the text and copy manually.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI prompt · {lead.title}</DialogTitle>
        </DialogHeader>
        <Tabs value={preset} onValueChange={(v) => setPreset(v as AiPreset)}>
          <TabsList>
            {(Object.keys(aiPresetLabels) as AiPreset[]).map((p) => (
              <TabsTrigger key={p} value={p}>
                {aiPresetLabels[p]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Textarea readOnly rows={14} value={prompt} className="font-mono text-xs" />
        <Button onClick={copy}>Copy prompt</Button>
      </DialogContent>
    </Dialog>
  );
}
