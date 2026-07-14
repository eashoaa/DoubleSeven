import Link from "next/link";
import { Search, Bell } from "lucide-react";
import type { Role } from "@/lib/permissions";
import { UserMenu } from "./user-menu";

const dateFmt = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

export function Topbar({
  user,
}: {
  user: { name: string; role: Role };
}) {
  return (
    <header className="flex items-center gap-4 px-4 py-4">
      <Link href="/" className="shrink-0 text-lg font-bold tracking-tight text-foreground">
        D7 <span className="font-normal text-muted-foreground">Heaven&apos;s Gate</span>
      </Link>

      <div className="flex flex-1 justify-center">
        <div className="flex w-full max-w-md items-center gap-2 rounded-full border border-hairline bg-white/70 px-4 py-2 text-sm text-muted-foreground">
          <Search className="size-4" strokeWidth={2} />
          <span>Search clients, lots, OR number&hellip;</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <span className="hidden text-sm text-muted-foreground md:inline">
          {dateFmt.format(new Date())}
        </span>
        <button
          aria-label="Notifications"
          className="flex size-9 items-center justify-center rounded-full border border-hairline bg-white/70 text-foreground/70 hover:bg-white"
        >
          <Bell className="size-4" strokeWidth={2} />
        </button>
        <UserMenu user={user} />
      </div>
    </header>
  );
}
