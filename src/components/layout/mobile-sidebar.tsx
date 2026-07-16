"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { hasNav, type Role } from "@/lib/permissions";
import { NAV_ITEMS } from "./nav-items";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { NavItemRow } from "./nav-item";
import { useMobileMenuOpen, setMobileMenuOpen } from "./sidebar-state";

export function MobileSidebar({ role }: { role: Role }) {
  const items = NAV_ITEMS.filter((item) => hasNav(role, item.id)).map((item) => ({
    ...item,
    children: item.children?.filter((child) => hasNav(role, child.id)),
  }));
  const open = useMobileMenuOpen();
  const pathname = usePathname();
  const firstRender = useRef(true);

  // Auto-close on navigation, not on first mount (that would immediately
  // close a menu the user just opened before the route had a chance to
  // change).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        onClick={() => setMobileMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col gap-3 overflow-y-auto bg-card px-4 py-4 shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Link href="/" className="flex flex-col leading-none tracking-tight" onClick={() => setMobileMenuOpen(false)}>
            <span className="text-2xl font-extrabold whitespace-nowrap text-foreground">DoubleSeven.</span>
            <span className="mt-1 text-sm font-bold whitespace-nowrap text-foreground/60">Heaven&apos;s Gate</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-hairline text-foreground/70 hover:bg-accent"
          >
            <X className="size-4.5" strokeWidth={2} />
          </button>
        </div>

        <NewClientDialog className="flex items-center justify-center gap-2 rounded-full bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90" />

        <nav className="flex flex-col gap-1">
          {items.map((item) => (
            <NavItemRow key={item.id} item={item} collapsed={false} />
          ))}
        </nav>
      </aside>
    </div>
  );
}
