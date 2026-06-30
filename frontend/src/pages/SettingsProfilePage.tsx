import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileForm } from "@/features/settings/ProfileForm";

export default function SettingsProfilePage() {
  return (
    <PageShell width="narrow">
      <PageHeader title="Profile" />
      <Card>
        <CardContent><ProfileForm /></CardContent>
      </Card>
    </PageShell>
  );
}
