"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useLanguage } from "@/lib/i18n/language-context";
import type { LangKey } from "@/lib/i18n/dictionary";

gsap.registerPlugin(useGSAP);

export function PageHeader({
  title,
  description,
  titleKey,
  descriptionKey,
}: {
  title?: string;
  description?: ReactNode;
  titleKey?: LangKey;
  descriptionKey?: LangKey;
}) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.from(ref.current, {
        opacity: 0,
        y: 8,
        duration: reduced ? 0 : 0.5,
        ease: "power2.out",
      });
    },
    { scope: ref }
  );

  const resolvedTitle = titleKey ? t(titleKey) : title;
  const resolvedDescription = descriptionKey ? t(descriptionKey) : description;

  return (
    <div ref={ref}>
      <h1 className="text-xl font-semibold text-foreground">{resolvedTitle}</h1>
      {resolvedDescription ? <p className="text-sm text-muted-foreground">{resolvedDescription}</p> : null}
    </div>
  );
}
