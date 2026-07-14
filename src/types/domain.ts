export type LotStatus =
  | "available"
  | "reserved"
  | "active"
  | "delinquent"
  | "defaulted"
  | "cancelled"
  | "paid";

export const LOT_STATUS_LABEL: Record<LotStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  active: "Active",
  delinquent: "Delinquent",
  defaulted: "Defaulted",
  cancelled: "Cancelled",
  paid: "Fully Paid",
};

export type Tier = "prime" | "premium" | "regular";

export const TIER_LABEL: Record<Tier, string> = {
  prime: "Prime",
  premium: "Premium",
  regular: "Regular",
};

export const TIER_MULTIPLIER: Record<Tier, number> = {
  regular: 1.0,
  premium: 1.15,
  prime: 1.35,
};

export type SectionCode = "ll" | "gl" | "fe" | "ce" | "cv" | "os";

export const SECTION_LABEL: Record<SectionCode, string> = {
  ll: "Lawn Lots",
  gl: "Garden Lots",
  fe: "Family Estates",
  ce: "Court Estates",
  cv: "Community Vaults",
  os: "Ossuary",
};
