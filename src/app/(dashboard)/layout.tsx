import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getOverdueContractsMerged } from "@/lib/domain/dev-masterlist";
import type { NotificationPreview } from "@/components/layout/notification-bell";
import { LanguageProvider } from "@/lib/i18n/language-context";
import { SidebarToggleButton } from "@/components/layout/sidebar-toggle-button";

async function getOverdueForBell(): Promise<NotificationPreview[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const overdue = await getOverdueContractsMerged();
    return overdue.map((c) => ({
      id: c.id,
      clientName: c.clientName,
      lotDisplayId: c.lotDisplayId,
      overdueDays: c.overdueDays,
      priceCents: c.priceCents,
    }));
  }
  return [];
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, overdue] = await Promise.all([getCurrentUser(), getOverdueForBell()]);

  return (
    <LanguageProvider>
      <div className="mx-auto flex min-h-dvh w-full max-w-[1440px] gap-2 px-1 pt-1 pb-1 sm:px-2 sm:pt-2 sm:pb-2">
        <Sidebar role={user.role} />
        <MobileSidebar role={user.role} />
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
