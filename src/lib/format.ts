/**
 * Money is always integer centavos (1/100 PHP) end-to-end: the prototype's
 * float arithmetic produced values like `tp: 27055.199999999997` in real
 * client data. Convert to centavos once at the DB boundary and never back
 * to floats until display.
 */
export function centavosToPesos(centavos: number): number {
  return centavos / 100;
}

export function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

export function formatMoney(centavos: number): string {
  return peso.format(centavosToPesos(centavos));
}

export function formatMoneyCompact(centavos: number): string {
  const pesos = centavosToPesos(centavos);
  if (Math.abs(pesos) >= 1_000_000) {
    return `₱${(pesos / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(pesos) >= 1_000) {
    return `₱${(pesos / 1_000).toFixed(0)}K`;
  }
  return peso.format(pesos);
}

const dateFmt = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return dateFmt.format(d);
}

export function daysBetween(a: string | Date, b: string | Date): number {
  const d1 = typeof a === "string" ? new Date(a) : a;
  const d2 = typeof b === "string" ? new Date(b) : b;
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}
