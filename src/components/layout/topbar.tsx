"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Menu } from "lucide-react";
import type { Role } from "@/lib/permissions";
import { UserMenu } from "./user-menu";
import { SearchBar } from "./search-bar";
import { NotificationBell, type NotificationPreview } from "./notification-bell";
import { LanguageToggle } from "./language-toggle";
import { setMobileMenuOpen } from "./sidebar-state";

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
    <header ref={ref} className="flex items-center gap-2 px-3 py-3 sm:gap-4 sm:px-4">
      <button
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open menu"
        className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-hairline bg-white/70 text-foreground/70 hover:bg-white md:hidden"
      >
        <Menu className="size-4.5" strokeWidth={2} />
      </button>

      <div className="min-w-0 flex-1 sm:max-w-[320px] sm:flex-initial">
        <SearchBar />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <span className="hidden text-sm font-medium text-foreground/70 lg:inline">
          {dateFmt.format(new Date())}
        </span>
        <LanguageToggle />
        <NotificationBell overdue={overdue} />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
