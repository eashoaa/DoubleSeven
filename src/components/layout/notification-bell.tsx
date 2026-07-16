"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Money } from "@/components/shared/money";

export interface NotificationPreview {
  id: string;
  clientName: string;
  lotDisplayId: string;
  overdueDays: number | null;
  priceCents: number;
}

export function NotificationBell({ overdue }: { overdue: NotificationPreview[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Notifications"
        className="relative flex size-9 items-center justify-center rounded-full border border-hairline bg-white/70 text-foreground/70 hover:bg-white"
      >
        <Bell className="size-4" strokeWidth={2} />
        {overdue.length > 0 && (
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-status-defaulted-map text-[9px] font-bold text-white">
            {overdue.length > 9 ? "9+" : overdue.length}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          {overdue.length > 0 ? `${overdue.length} overdue accounts` : "No overdue accounts"}
        </div>
        {overdue.slice(0, 6).map((item) => (
          <DropdownMenuItem key={item.id} render={<Link href="/overdue" />}>
            <div className="flex w-full items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">{item.clientName}</div>
                <div className="text-xs text-muted-foreground">
                  {item.lotDisplayId} · {item.overdueDays ?? 0}d overdue
                </div>
              </div>
              <Money centavos={item.priceCents} className="text-xs text-muted-foreground" />
            </div>
          </DropdownMenuItem>
        ))}
        {overdue.length > 0 && (
          <DropdownMenuItem render={<Link href="/overdue" />} className="justify-center text-sm font-medium">
            View all overdue accounts
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
