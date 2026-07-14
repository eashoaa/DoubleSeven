import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getCurrentUser } from "@/lib/supabase/current-user";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col">
      <Topbar user={user} />
      <div className="flex flex-1 gap-2 px-2 pb-2">
        <Sidebar role={user.role} />
        <main className="flex-1 rounded-3xl border border-hairline bg-card p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
