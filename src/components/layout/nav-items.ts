import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Map,
  Users,
  Rows3,
  Wallet,
  ClipboardCheck,
} from "lucide-react";
import type { NavId } from "@/lib/permissions";

export interface NavItem {
  id: NavId;
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Only routes that exist today. Phase 2 nav ids are added once their pages ship. */
export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Dashboard", href: "/", icon: LayoutDashboard },
  { id: "map", label: "Park Map", href: "/map", icon: Map },
  { id: "clients", label: "Clients", href: "/clients", icon: Users },
  { id: "ledger", label: "Lots & Ledger", href: "/lots", icon: Rows3 },
  { id: "collections", label: "Collections", href: "/collections", icon: Wallet },
  { id: "pending", label: "Approvals", href: "/pending", icon: ClipboardCheck },
];
