import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getOverdueRows } from "@/lib/server/overdue";
import { createClient } from "@/lib/supabase/server";
import type { NotificationPreview } from "@/components/layout/notification-bell";
import type { NavId } from "@/lib/permissions";
import { LanguageProvider } from "@/lib/i18n/language-context";
import { SidebarToggleButton } from "@/components/layout/sidebar-toggle-button";

async function getOverdueForBell(): Promise<NotificationPreview[]> {
  const overdue = await getOverdueRows();
  return overdue.map((c) => ({
    id: c.id,
    clientName: c.clientName,
    lotDisplayId: c.lotDisplayId,
    overdueDays: c.overdueDays,
    priceCents: c.priceCents,
  }));
}

/** Admin-only counts for the sidebar badges — both queues only admin resolves. */
async function getNavBadgeCounts(role: string): Promise<Partial<Record<NavId, number>>> {
  if (role !== "admin" || !process.env.NEXT_PUBLIC_SUPABASE_URL) return {};

  const supabase = await createClient();
  const [{ count: pendingCount }, { count: requisitionsCount }] = await Promise.all([
    supabase.from("pending_verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("requisitions").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return { pending: pendingCount ?? 0, requisitions: requisitionsCount ?? 0 };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const [overdue, badgeCounts] = await Promise.all([getOverdueForBell(), getNavBadgeCounts(user.role)]);

  return (
    <LanguageProvider>
      <div className="mx-auto flex min-h-dvh w-full max-w-[1440px] gap-2 px-1 pt-1 pb-1 sm:px-2 sm:pt-2 sm:pb-2">
        <Sidebar role={user.role} badgeCounts={badgeCounts} />
        <MobileSidebar role={user.role} badgeCounts={badgeCounts} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Topbar user={user} overdue={overdue} />
          <main className="shadow-card min-h-0 flex-1 rounded-3xl border border-hairline bg-card p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
      <SidebarToggleButton />
    </LanguageProvider>
  );
}
