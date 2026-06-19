import { ProfileForm } from "@/features/settings/ProfileForm";

export default function SettingsProfilePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Profile</h1>
      <ProfileForm />
    </div>
  );
}
