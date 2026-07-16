"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";

interface TrendPoint {
  key: string;
  label: string;
  totalCents: number;
}

const CHART_HEIGHT = 140;

export function CollectionsTrendChart({ data }: { data: TrendPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.totalCents));

  return (
    <div className="shadow-card flex flex-col gap-4 rounded-2xl border border-hairline bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Collections trend</h2>
          <p className="text-xs text-muted-foreground">Last 12 months, all collections (any period filter below doesn&apos;t affect this)</p>
        </div>
        {hoverIndex !== null ? (
          <div className="text-right">
            <div className="text-xs text-muted-foreground">{data[hoverIndex].label}</div>
            <div className="text-sm font-semibold tabular-nums text-foreground">
              {formatMoney(data[hoverIndex].totalCents)}
            </div>
          </div>
        ) : null}
      </div>

      <div
        className="flex items-end gap-2"
        style={{ height: CHART_HEIGHT }}
        role="img"
        aria-label={`Monthly collections for the last 12 months, from ${data[0]?.label} to ${data[data.length - 1]?.label}`}
      >
        {data.map((d, i) => {
          const heightPx = d.totalCents === 0 ? 2 : Math.max(4, Math.round((d.totalCents / max) * (CHART_HEIGHT - 20)));
          const active = hoverIndex === i;
          return (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full flex-1 items-end justify-center">
                <button
                  type="button"
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                  onFocus={() => setHoverIndex(i)}
                  onBlur={() => setHoverIndex(null)}
                  className="w-full max-w-6 rounded-t-[4px] bg-chip-indigo-fg opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  style={{ height: heightPx, opacity: active ? 1 : undefined }}
                  aria-label={`${d.label}: ${formatMoney(d.totalCents)}`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{d.label}</span>
            </div>
          );
        })}
      </div>

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none hover:text-foreground">View as table</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-muted-foreground">
              <th className="py-1 font-medium">Month</th>
              <th className="py-1 text-right font-medium">Collected</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.key}>
                <td className="py-0.5 text-foreground">{d.label}</td>
                <td className="py-0.5 text-right tabular-nums text-foreground">{formatMoney(d.totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
