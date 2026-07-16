"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { hasNav, type Role } from "@/lib/permissions";
import { NAV_ITEMS } from "./nav-items";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { NavItemRow } from "./nav-item";
import { useLanguage } from "@/lib/i18n/language-context";
import { useSidebarCollapsed } from "./sidebar-state";

gsap.registerPlugin(useGSAP);

const EXPANDED_WIDTH = 240;
const EXPANDED_WIDTH_HYBRID = 320;
const COLLAPSED_WIDTH = 72;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Sidebar({ role }: { role: Role }) {
  const items = NAV_ITEMS.filter((item) => hasNav(role, item.id)).map((item) => ({
    ...item,
    children: item.children?.filter((child) => hasNav(role, child.id)),
  }));
  const containerRef = useRef<HTMLElement>(null);
  const collapsed = useSidebarCollapsed();
  const { lang } = useLanguage();
  const expandedWidth = lang === "hybrid" ? EXPANDED_WIDTH_HYBRID : EXPANDED_WIDTH;

  // One-time entrance stagger for nav items.
  useGSAP(
    () => {
      gsap.from(".nav-item", {
        opacity: 0,
        x: -8,
        stagger: 0.04,
        duration: 0.4,
        ease: "power2.out",
      });
    },
    { scope: containerRef }
  );

  // Collapse / expand transition. Everything that changes size moves on
  // one timeline so nothing snaps ahead of the rest mid-animation: the
  // icon column stays put throughout; width, label width, and each letter
  // all move together. Letters stagger in on expand (a soft "materializing"
  // reveal instead of the label just popping into place) and fade out as a
  // block on collapse, since a staggered exit reads as laggy, not smooth.
  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const duration = reduced ? 0 : 0.4;
      const tl = gsap.timeline({ defaults: { duration, ease: "power3.inOut" } });

      tl.to(containerRef.current, { width: collapsed ? COLLAPSED_WIDTH : expandedWidth }, 0);
      tl.to(".sidebar-label", { width: collapsed ? 0 : "auto" }, 0);
      tl.to(".logo-fade", { opacity: collapsed ? 0 : 1, duration: reduced ? 0 : collapsed ? 0.15 : 0.3 }, 0);

      if (collapsed) {
        tl.to(".letter", { opacity: 0, duration: reduced ? 0 : 0.15, ease: "power1.out" }, 0);
      } else {
        tl.fromTo(
          ".letter",
          { opacity: 0, y: 4 },
          {
            opacity: 1,
            y: 0,
            duration: reduced ? 0 : 0.3,
            stagger: reduced ? 0 : 0.012,
            ease: "power2.out",
          },
          reduced ? 0 : 0.1
        );
      }

      return () => {
        tl.kill();
      };
    },
    { dependencies: [collapsed, expandedWidth], scope: containerRef }
  );

  return (
    <aside
      ref={containerRef}
      style={{ width: expandedWidth }}
      className="sticky top-2 flex max-h-[calc(100vh-1rem)] shrink-0 flex-col gap-3 self-start overflow-hidden px-3 py-4"
    >
      <Link href="/" className="flex h-[70px] shrink-0 items-end pb-2">
        <div className="sidebar-label flex flex-col justify-end overflow-hidden leading-none tracking-tight">
          <div className="logo-fade flex flex-col">
            <span className="logo-3d pr-1 text-3xl font-extrabold whitespace-nowrap text-foreground">
              <span className="logo-initial">D</span>oubleSeven.
            </span>
            <span className="mt-1 pr-1 text-sm font-bold whitespace-nowrap text-foreground/60">
              Heaven&apos;s Gate
            </span>
          </div>
        </div>
      </Link>

      <NewClientDialog className="nav-item flex items-center justify-center gap-2 rounded-full bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90" />

      <nav className="flex flex-col gap-1">
        {items.map((item) => (
          <NavItemRow key={item.id} item={item} collapsed={collapsed} />
        ))}
      </nav>
    </aside>
  );
}
