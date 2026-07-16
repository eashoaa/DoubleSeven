import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { RequisitionThresholdForm } from "@/components/settings/requisition-threshold-form";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getRequisitionSettings } from "@/lib/server/local-store";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const { thresholdCents } = await getRequisitionSettings();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader titleKey="page.settings.title" descriptionKey="page.settings.desc" />
      {user.role === "admin" ? <RequisitionThresholdForm thresholdCents={thresholdCents} /> : null}
      <SettingsForm />
    </div>
  );
}
