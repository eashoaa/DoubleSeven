import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Map,
  Users,
  Rows3,
  Wallet,
  ClipboardCheck,
  AlertTriangle,
  Receipt,
  History,
  Settings,
  HelpCircle,
} from "lucide-react";
import type { NavId } from "@/lib/permissions";
import type { LangKey } from "@/lib/i18n/dictionary";

export interface NavItem {
  id: NavId;
  label: string;
  labelKey: LangKey;
  href: string;
  icon: LucideIcon;
  children?: NavItem[];
}

/** Only routes that exist today. Phase 2 nav ids are added once their pages ship. */
export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Dashboard", labelKey: "nav.home", href: "/", icon: LayoutDashboard },
  { id: "map", label: "Park Map", labelKey: "nav.map", href: "/map", icon: Map },
  {
    id: "clients",
    label: "Clients",
    labelKey: "nav.clients",
    href: "/clients",
    icon: Users,
    children: [
      { id: "overdue", label: "Overdue", labelKey: "nav.overdue", href: "/overdue", icon: AlertTriangle },
      { id: "collections", label: "Collections", labelKey: "nav.collections", href: "/collections", icon: Wallet },
    ],
  },
  { id: "ledger", label: "Lots & Ledger", labelKey: "nav.ledger", href: "/lots", icon: Rows3 },
  { id: "expenses", label: "Expenses", labelKey: "nav.expenses", href: "/expenses", icon: Receipt },
  { id: "audit", label: "Audit", labelKey: "nav.audit", href: "/audit", icon: History },
  { id: "pending", label: "Approvals", labelKey: "nav.pending", href: "/pending", icon: ClipboardCheck },
  { id: "faq", label: "Help / FAQ", labelKey: "nav.faq", href: "/faq", icon: HelpCircle },
  { id: "settings", label: "Settings", labelKey: "nav.settings", href: "/settings", icon: Settings },
];
