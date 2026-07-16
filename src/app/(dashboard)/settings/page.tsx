import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "@/components/settings/settings-form";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader titleKey="page.settings.title" descriptionKey="page.settings.desc" />
      <SettingsForm />
    </div>
  );
}
