"use client";

import { useLanguage, type Language } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Language; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "bisaya", label: "BIS" },
  { value: "hybrid", label: "EN+BIS" },
];

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="hidden shrink-0 items-center gap-0.5 rounded-full border border-hairline bg-white/70 p-0.5 sm:flex">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setLang(opt.value)}
          aria-pressed={lang === opt.value}
          className={cn(
            "rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors",
            lang === opt.value
              ? "bg-primary text-primary-foreground"
              : "text-foreground/60 hover:bg-white"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
