"use client";

import { PageHint } from "@/components/shared/page-hint";
import { useLanguage } from "@/lib/i18n/language-context";

export function OverdueHint() {
  const { t } = useLanguage();
  return (
    <PageHint>
      <p>{t("overdue.hint.reminder")}</p>
      <p>{t("overdue.hint.defaulted")}</p>
    </PageHint>
  );
}
