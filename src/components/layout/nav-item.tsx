"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SplitLetters } from "./split-letters";
import { useLanguage } from "@/lib/i18n/language-context";
import type { NavItem as NavItemType } from "./nav-items";

gsap.registerPlugin(useGSAP);

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function RowContent({ item, active, label }: { item: NavItemType; active: boolean; label: string }) {
  const Icon = item.icon;
  return (
    <>
      <Icon className="size-4.5 shrink-0" strokeWidth={2} />
      <span className="sidebar-label overflow-hidden whitespace-nowrap">
        <SplitLetters text={label} />
      </span>
      {active && <span className="sr-only">(current)</span>}
    </>
  );
}

export function NavItemRow({ item, collapsed }: { item: NavItemType; collapsed: boolean }) {
  const { t } = useLanguage();
  const label = t(item.labelKey);
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const hasChildren = !!item.children?.length;
  const childActive = item.children?.some((c) => isActive(pathname, c.href)) ?? false;
  const [expanded, setExpanded] = useState(active || childActive);
  const subRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  // First run just establishes the starting height/opacity with no
  // animation (gsap.set, not .to): otherwise an inline style set by React
  // on the same render would snap to the final state instantly, and this
  // tween would then animate from "already there" to "already there",
  // which reads as a pop instead of a smooth open/close.
  useGSAP(
    () => {
      if (!subRef.current) return;
      const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!mounted.current) {
        gsap.set(subRef.current, { height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 });
        mounted.current = true;
        return;
      }

      gsap.to(subRef.current, {
        height: expanded ? "auto" : 0,
        opacity: expanded ? 1 : 0,
        duration: reduced ? 0 : 0.4,
        ease: "power3.inOut",
      });
    },
    { dependencies: [expanded] }
  );

  const link = (
    <Link
      href={item.href}
      onClick={() => {
        if (hasChildren) setExpanded((v) => !v);
      }}
      className={cn(
        "nav-item flex flex-1 items-center gap-2.5 rounded-full px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-white/60",
        active && "bg-white text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.06)] hover:bg-white"
      )}
    >
      <RowContent item={item} active={active} label={label} />
      {hasChildren && (
        <ChevronDown
          className={cn(
            "sidebar-label ml-auto size-3.5 shrink-0 text-foreground/40 transition-transform duration-200",
            expanded && "rotate-180"
          )}
          strokeWidth={2}
        />
      )}
    </Link>
  );

  return (
    <div className="flex flex-col">
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger render={link} />
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      ) : (
        link
      )}

      {hasChildren && (
        <div ref={subRef} className={cn("overflow-hidden", collapsed && "hidden")}>
          <div className="flex flex-col gap-1 py-1 pl-5">
            {item.children!.map((child) => {
              const childActiveNow = isActive(pathname, child.href);
              const ChildIcon = child.icon;
              return (
                <Link
                  key={child.id}
                  href={child.href}
                  className={cn(
                    "nav-item flex items-center gap-2 rounded-full px-2.5 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-white/60",
                    childActiveNow && "bg-white text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.06)] hover:bg-white"
                  )}
                >
                  <ChildIcon className="size-4 shrink-0" strokeWidth={2} />
                  <span className="whitespace-nowrap">{t(child.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
