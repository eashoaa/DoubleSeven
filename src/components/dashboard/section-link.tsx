"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";
import type { LangKey } from "@/lib/i18n/dictionary";

export function SectionLink({ href, labelKey }: { href: string; labelKey: LangKey }) {
  const { t } = useLanguage();
  return (
    <Link href={href} className="text-sm font-semibold text-foreground hover:underline">
      {t(labelKey)}
    </Link>
  );
}
