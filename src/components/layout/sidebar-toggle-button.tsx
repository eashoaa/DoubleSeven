"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSidebarCollapsed, setSidebarCollapsed } from "./sidebar-state";

export function SidebarToggleButton() {
  const collapsed = useSidebarCollapsed();

  return (
    <button
      onClick={() => setSidebarCollapsed(!collapsed)}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="shadow-card fixed bottom-6 left-6 z-40 flex size-14 items-center justify-center rounded-2xl border border-hairline bg-white text-foreground/70 transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {collapsed ? (
        <PanelLeftOpen className="size-6" strokeWidth={2} />
      ) : (
        <PanelLeftClose className="size-6" strokeWidth={2} />
      )}
    </button>
  );
}
