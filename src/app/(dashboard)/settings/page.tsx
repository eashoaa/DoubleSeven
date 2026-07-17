import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { RequisitionThresholdForm } from "@/components/settings/requisition-threshold-form";
import { CashAccountsForm } from "@/components/settings/cash-accounts-form";
import { PenaltySettingsForm } from "@/components/settings/penalty-settings-form";
import { ResourcesForm } from "@/components/settings/resources-form";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { getCashAccountsAction } from "@/server/actions/cash-accounts";
import { getPenaltySettingsAction } from "@/server/actions/penalties";
import { getResourcesAction } from "@/server/actions/resources";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const [{ data }, accounts, penaltySettings, resources] = await Promise.all([
    supabase.from("requisition_settings").select("threshold_cents").eq("id", true).single(),
    getCashAccountsAction(),
    getPenaltySettingsAction(),
    getResourcesAction(),
  ]);
  const thresholdCents = data?.threshold_cents ?? 5_000_000;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader titleKey="page.settings.title" descriptionKey="page.settings.desc" />
      {user.role === "admin" ? (
        <>
          <RequisitionThresholdForm thresholdCents={thresholdCents} />
          <PenaltySettingsForm
            ratePercent={penaltySettings.rate_percent}
            gracePeriodDays={penaltySettings.grace_period_days}
          />
          <CashAccountsForm accounts={accounts} />
          <ResourcesForm resources={resources} />
        </>
      ) : null}
      <SettingsForm />
    </div>
  );
}
