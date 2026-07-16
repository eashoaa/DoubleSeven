import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { T } from "@/lib/i18n/translated-text";
import type { LangKey } from "@/lib/i18n/dictionary";

const TONE_MAP = {
  indigo: "bg-chip-indigo-bg text-chip-indigo-fg",
  amber: "bg-chip-amber-bg text-chip-amber-fg",
  violet: "bg-chip-violet-bg text-chip-violet-fg",
} as const;

export function StatCard({
  icon: Icon,
  label,
  labelKey,
  value,
  hint,
  tone = "indigo",
  className,
  href,
}: {
  icon: LucideIcon;
  label?: string;
  labelKey?: LangKey;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: keyof typeof TONE_MAP;
  className?: string;
  href?: string;
}) {
  const content = (
    <>
      <div
        className={cn(
          "flex size-9 items-center justify-center rounded-lg",
          TONE_MAP[tone]
        )}
      >
        <Icon className="size-4.5" strokeWidth={2} />
      </div>
      <div className="mt-4 text-sm text-muted-foreground">{labelKey ? <T k={labelKey} /> : label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      ) : href ? (
        <div className="mt-1 text-xs font-medium text-accent-foreground">
          <T k="button.tapToView" /> &rarr;
        </div>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "shadow-card block rounded-2xl border border-hairline bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-ring/40 hover:shadow-lg",
          className
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "shadow-card rounded-2xl border border-hairline bg-card p-5",
        className
      )}
    >
      {content}
    </div>
  );
}
