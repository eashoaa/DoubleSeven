"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function ClickableRow({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const router = useRouter();

  return (
    <TableRow
      onClick={() => router.push(href)}
      className={cn("group cursor-pointer hover:bg-primary/5", className)}
    >
      {children}
    </TableRow>
  );
}
