import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Map,
  Users,
  Rows3,
  Wallet,
  ClipboardCheck,
  ClipboardList,
  AlertTriangle,
  Receipt,
  History,
  Settings,
  HelpCircle,
  Boxes,
  Handshake,
  BarChart3,
} from "lucide-react";
import { hasNav, type NavId, type Role } from "@/lib/permissions";
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
  {
    id: "map",
    label: "Park Map",
    labelKey: "nav.map",
    href: "/map",
    icon: Map,
    children: [
      { id: "inventory", label: "Inventory", labelKey: "nav.inventory", href: "/inventory", icon: Boxes },
      { id: "ledger", label: "Lots & Ledger", labelKey: "nav.ledger", href: "/lots", icon: Rows3 },
    ],
  },
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
  { id: "agents", label: "Agents", labelKey: "nav.agents", href: "/agents", icon: Handshake },
  {
    id: "expenses",
    label: "Expenses",
    labelKey: "nav.expenses",
    href: "/expenses",
    icon: Receipt,
    children: [
      {
        id: "requisitions",
        label: "Requisitions",
        labelKey: "nav.requisitions",
        href: "/requisitions",
        icon: ClipboardList,
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    labelKey: "nav.reports",
    href: "/reports",
    icon: BarChart3,
    children: [
      { id: "audit", label: "Audit", labelKey: "nav.audit", href: "/audit", icon: History },
      { id: "pending", label: "Approvals", labelKey: "nav.pending", href: "/pending", icon: ClipboardCheck },
    ],
  },
  { id: "faq", label: "Help / FAQ", labelKey: "nav.faq", href: "/faq", icon: HelpCircle },
  { id: "settings", label: "Settings", labelKey: "nav.settings", href: "/settings", icon: Settings },
];

/**
 * Groups (e.g. "Park Map" owning Inventory + Lots & Ledger) only make sense
 * for a role that's allowed to see the parent page itself. A role that has
 * some of the children but not the parent (e.g. accountant has Inventory
 * and Ledger but not Park Map) gets those children promoted back to
 * top-level items instead of losing them.
 */
export function getVisibleNavItems(role: Role): NavItem[] {
  const result: NavItem[] = [];
  for (const item of NAV_ITEMS) {
    const visibleChildren = item.children?.filter((child) => hasNav(role, child.id)) ?? [];
    if (hasNav(role, item.id)) {
      result.push({ ...item, children: visibleChildren });
    } else {
      result.push(...visibleChildren);
    }
  }
  return result;
}
