"use client";

import Link from "next/link";
import { UserPlus, Wallet, ShieldAlert, Mail, Search, LandPlot } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import type { LangKey } from "@/lib/i18n/dictionary";

const cardClass =
  "shadow-card flex items-start gap-3 rounded-2xl border border-hairline bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-ring/40 hover:shadow-lg";
const iconWrapClass = "flex size-10 shrink-0 items-center justify-center rounded-xl bg-chip-indigo-bg text-chip-indigo-fg";

function CardBody({ icon: Icon, label, desc }: { icon: LucideIcon; label: string; desc: string }) {
  return (
    <>
      <div className={iconWrapClass}>
        <Icon className="size-5" strokeWidth={2} />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{desc}</span>
      </div>
    </>
  );
}

function ActionCard({
  icon,
  labelKey,
  descKey,
  href,
}: {
  icon: LucideIcon;
  labelKey: LangKey;
  descKey: LangKey;
  href: string;
}) {
  const { t } = useLanguage();
  return (
    <Link href={href} className={cardClass}>
      <CardBody icon={icon} label={t(labelKey)} desc={t(descKey)} />
    </Link>
  );
}

export function QuickActions() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-hairline bg-accent/30 p-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">{t("quickActions.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("quickActions.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <NewClientDialog className={cardClass}>
          <CardBody icon={UserPlus} label={t("quickActions.addClient.label")} desc={t("quickActions.addClient.desc")} />
        </NewClientDialog>
        <ActionCard
          icon={Wallet}
          labelKey="quickActions.logPayment.label"
          descKey="quickActions.logPayment.desc"
          href="/collections"
        />
        <ActionCard
          icon={ShieldAlert}
          labelKey="quickActions.markDefaulted.label"
          descKey="quickActions.markDefaulted.desc"
          href="/overdue"
        />
        <ActionCard
          icon={Mail}
          labelKey="quickActions.sendReminder.label"
          descKey="quickActions.sendReminder.desc"
          href="/overdue"
        />
        <ActionCard
          icon={Search}
          labelKey="quickActions.findSomeone.label"
          descKey="quickActions.findSomeone.desc"
          href="/clients"
        />
        <ActionCard
          icon={LandPlot}
          labelKey="quickActions.viewAllLots.label"
          descKey="quickActions.viewAllLots.desc"
          href="/lots"
        />
      </div>
    </div>
  );
}
