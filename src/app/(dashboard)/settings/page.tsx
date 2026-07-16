import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { RequisitionThresholdForm } from "@/components/settings/requisition-threshold-form";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase.from("requisition_settings").select("threshold_cents").eq("id", true).single();
  const thresholdCents = data?.threshold_cents ?? 5_000_000;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader titleKey="page.settings.title" descriptionKey="page.settings.desc" />
      {user.role === "admin" ? <RequisitionThresholdForm thresholdCents={thresholdCents} /> : null}
      <SettingsForm />
    </div>
  );
}
