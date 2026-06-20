import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/features/settings/ProfileForm";

export default function SettingsProfilePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent><ProfileForm /></CardContent>
      </Card>
    </div>
  );
}
