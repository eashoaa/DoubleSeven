"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasNav, type Role } from "@/lib/permissions";
import { NAV_ITEMS } from "./nav-items";

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => hasNav(role, item.id));

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-6 px-4 py-6">
      <button className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
        <Plus className="size-4" strokeWidth={2.5} />
        New Client
      </button>

      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-white/60",
                active && "bg-white text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.06)] hover:bg-white"
              )}
            >
              <Icon className="size-4.5" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
