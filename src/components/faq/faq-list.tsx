"use client";

import { HelpCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import type { LangKey } from "@/lib/i18n/dictionary";

const ENTRIES: { q: LangKey; a: LangKey }[] = [
  { q: "faq.addClient.q", a: "faq.addClient.a" },
  { q: "faq.markDefaulted.q", a: "faq.markDefaulted.a" },
  { q: "faq.logPayment.q", a: "faq.logPayment.a" },
  { q: "faq.difference.q", a: "faq.difference.a" },
  { q: "faq.viewLots.q", a: "faq.viewLots.a" },
  { q: "faq.language.q", a: "faq.language.a" },
  { q: "faq.collapse.q", a: "faq.collapse.a" },
  { q: "faq.appearance.q", a: "faq.appearance.a" },
  { q: "faq.mistake.q", a: "faq.mistake.a" },
];

export function FaqList() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-3">
      {ENTRIES.map((entry) => (
        <div key={entry.q} className="shadow-card flex gap-3 rounded-2xl border border-hairline bg-card p-5">
          <HelpCircle className="mt-0.5 size-5 shrink-0 text-accent-foreground" strokeWidth={2} />
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-foreground">{t(entry.q)}</p>
            <p className="text-sm text-muted-foreground">{t(entry.a)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
