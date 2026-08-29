import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { LogoutButton } from "@/components/logout-button";
import { requireRole } from "@/lib/session";

interface LayoutProps {
  children: React.ReactNode;
}

export default async function Layout({ children }: LayoutProps) {
  const session = await requireRole("superAdmin");

  return (
    <SidebarProvider>
      <div className="flex w-full bg-background">
        <AdminSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center border-b bg-background/95 px-3 backdrop-blur sm:px-4 bg-gradient-to-r from-black via-black to-[#ff3800]/5 relative rounded-b-4xl">
            <SidebarTrigger className="mr-2 bg-black" />

            <div className="min-w-0 flex-1 text-right">
              <span className="text-sm font-medium text-white">{session.email}</span>
            </div>

            <LogoutButton />
          </header>

          <main className="min-w-0 flex-1 w-full overflow-x-hidden p-4">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
