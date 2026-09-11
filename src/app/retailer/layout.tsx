import { AppSidebar } from "@/components/app-sidebar";
import Header from "@/components/header";
import { Ltable } from "@/components/ltable";
import { PriceSidebar } from "@/components/price-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { requireRole } from "@/lib/session";

async function Layout({ children }: { children: React.ReactNode }) {
  await requireRole("retailer");

  return (
    <SidebarProvider>
      <div className="flex w-full bg-background">
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center border-b bg-background/95 px-3 backdrop-blur sm:px-4 bg-gradient-to-r from-black via-black to-[#ff3800]/5 relative rounded-b-4xl">
            <SidebarTrigger className="mr-2 bg-black" />

            <div className="min-w-0 flex-1">
              <Header />
            </div>
          </header>

          <main className="min-w-0 flex-1 w-full overflow-x-hidden bg-gray-600 ">
            <div className="grid grid-cols-12 gap-2 m-2 max-h-full">
              <div className="w-full p-3 sm:p-4 md:p-6 bg-gray-700 col-span-9 rounded-4xl ">{children}</div>
              <div className="col-span-3 rounded-4xl bg-orange-600">
                <PriceSidebar />
              </div>
            </div>
            {/* Table */}
            <div className="w-full px-3 pb-4 sm:px-4 md:px-6 bg-gray-600 rounded-4xl mt-2 ">
              <Ltable />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default Layout;
