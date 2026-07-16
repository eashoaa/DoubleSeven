"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useLanguage } from "@/lib/i18n/language-context";
import type { LangKey } from "@/lib/i18n/dictionary";

gsap.registerPlugin(useGSAP);

function timeOfDayGreetingKey(hour: number): LangKey {
  if (hour < 12) return "greeting.morning";
  if (hour < 18) return "greeting.afternoon";
  return "greeting.evening";
}

export function Greeting({ firstName }: { firstName: string }) {
  const { t } = useLanguage();
  const greeting = t(timeOfDayGreetingKey(new Date().getHours()));
  const ref = useRef<HTMLHeadingElement>(null);

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

  return (
    <h1 ref={ref} className="text-3xl text-foreground">
      <span className="font-serif-italic">{greeting},</span>{" "}
      <span className="font-bold">{firstName}</span> <span aria-hidden>👋</span>
    </h1>
  );
}
