/**
 * Mirrors the prototype's ROLES matrix (cemetery_dashboard.jsx lines 99-248).
 * UX-only — hides/shows nav and controls. The real security boundary is
 * Postgres RLS (supabase/migrations); never trust this module for access
 * control decisions that matter.
 */

export type Role = "admin" | "accountant" | "marketing" | "staff" | "agent";

export type Capability =
  | "viewAllFinancials"
  | "recordPayment"
  | "recordReservationOnly"
  | "voidPayment"
  | "deletePayment"
  | "editLotPrice"
  | "forfeitLot"
  | "releaseLot"
  | "createClient"
  | "editClient"
  | "transferLot"
  | "manageAgents"
  | "payOutCommission"
  | "lockPeriods"
  | "verifyPending"
  | "bulkDeposit"
  | "restoreTrash"
  | "requireReceiptPhoto"
  | "requireDepositProof";

export type NavId =
  | "home"
  | "map"
  | "ledger"
  | "expenses"
  | "clients"
  | "cash"
  | "agents"
  | "collections"
  | "transfers"
  | "reports"
  | "audit"
  | "trash"
  | "settings"
  | "pending";

interface RoleDef {
  label: string;
  nav: NavId[];
  can: Record<Capability, boolean>;
}

const allFalse: Record<Capability, boolean> = {
  viewAllFinancials: false,
  recordPayment: false,
  recordReservationOnly: false,
  voidPayment: false,
  deletePayment: false,
  editLotPrice: false,
  forfeitLot: false,
  releaseLot: false,
  createClient: false,
  editClient: false,
  transferLot: false,
  manageAgents: false,
  payOutCommission: false,
  lockPeriods: false,
  verifyPending: false,
  bulkDeposit: false,
  restoreTrash: false,
  requireReceiptPhoto: false,
  requireDepositProof: false,
};

export const ROLES: Record<Role, RoleDef> = {
  admin: {
    label: "Admin",
    nav: [
      "home",
      "map",
      "ledger",
      "expenses",
      "clients",
      "cash",
      "agents",
      "collections",
      "transfers",
      "reports",
      "audit",
      "trash",
      "settings",
      "pending",
    ],
    can: {
      ...allFalse,
      viewAllFinancials: true,
      recordPayment: true,
      voidPayment: true,
      deletePayment: true,
      editLotPrice: true,
      forfeitLot: true,
      releaseLot: true,
      createClient: true,
      editClient: true,
      transferLot: true,
      manageAgents: true,
      payOutCommission: true,
      lockPeriods: true,
      verifyPending: true,
      bulkDeposit: true,
      restoreTrash: true,
    },
  },
  accountant: {
    label: "Accountant",
    nav: ["home", "collections", "cash", "ledger", "pending"],
    can: {
      ...allFalse,
      viewAllFinancials: true,
      recordPayment: true,
      bulkDeposit: true,
      requireReceiptPhoto: true,
      requireDepositProof: true,
    },
  },
  marketing: {
    label: "Marketing",
    nav: ["home", "map", "clients", "pending"],
    can: {
      ...allFalse,
      recordPayment: true,
      recordReservationOnly: true,
      createClient: true,
      editClient: true,
      requireReceiptPhoto: true,
    },
  },
  staff: {
    label: "Staff",
    nav: ["home", "map", "clients"],
    can: { ...allFalse },
  },
  agent: {
    label: "Sales Agent",
    nav: ["home", "map", "clients"],
    can: { ...allFalse },
  },
};

export function can(role: Role, capability: Capability): boolean {
  return !!ROLES[role]?.can[capability];
}

export function hasNav(role: Role, navId: NavId): boolean {
  return !!ROLES[role]?.nav.includes(navId);
}
