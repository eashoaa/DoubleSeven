"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { Role } from "@/lib/permissions";
import { UserMenu } from "./user-menu";
import { SearchBar } from "./search-bar";
import { NotificationBell, type NotificationPreview } from "./notification-bell";
import { LanguageToggle } from "./language-toggle";

gsap.registerPlugin(useGSAP);

const dateFmt = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

export function Topbar({
  user,
  overdue,
}: {
  user: { name: string; role: Role };
  overdue: NotificationPreview[];
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.from(ref.current, {
        opacity: 0,
        y: -6,
        duration: reduced ? 0 : 0.4,
        ease: "power2.out",
      });
    },
    { scope: ref }
  );

  return (
    <header ref={ref} className="flex items-center gap-4 px-4 py-3">
      <div className="w-[320px] max-w-full">
        <SearchBar />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-sm font-medium text-foreground/70 md:inline">
          {dateFmt.format(new Date())}
        </span>
        <LanguageToggle />
        <NotificationBell overdue={overdue} />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
