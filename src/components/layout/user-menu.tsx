"use client";

import { ChevronDown, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLES, type Role } from "@/lib/permissions";
import { signOut } from "@/server/actions/auth";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "");
}

export function UserMenu({ user }: { user: { name: string; role: Role } }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-hairline bg-white/70 py-1 pl-1 pr-3 hover:bg-white">
        <span className="flex size-7 items-center justify-center rounded-full bg-chip-indigo-bg text-xs font-semibold text-chip-indigo-fg">
          {initials(user.name)}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-medium text-foreground">{user.name}</span>
          <span className="block text-xs text-muted-foreground">
            {ROLES[user.role]?.label ?? user.role}
          </span>
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" strokeWidth={2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => signOut()}>
          <LogOut className="size-4" strokeWidth={2} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
