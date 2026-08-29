import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import Link from "next/link";
import { Bike, Car, ClipboardList, LayoutDashboard, LucideCoins, LucideWorkflow, Stethoscope, Users } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

const menuItems = [
  {
    id: "dashboard",
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    id: "retailers",
    title: "Retailers",
    href: "/admin/retailers",
    icon: Users,
  },
  {
    id: "2-wheeler",
    title: "2 Wheeler",
    href: "/admin/2wheeler",
    icon: Bike,
  },
  {
    id: "4-wheeler",
    title: "4 Wheeler",
    href: "/admin/4wheeler",
    icon: Car,
  },
  {
    id: "ll-exam",
    title: "LL Exam",
    href: "/admin/ll-exam-request",
    icon: ClipboardList,
  },
  {
    id: "medical",
    title: "Medical",
    href: "/admin/ll-medical",
    icon: Stethoscope,
  },
  {
    id: "work-history",
    title: "Work History",
    href: "/admin/workhistory",
    icon: LucideWorkflow,
  },
  {
    id: "transactions",
    title: "Transactions",
    href: "/admin/transactions",
    icon: LucideCoins,
  },
];

export function AdminSidebar() {
  return (
    <Sidebar>
      <SidebarHeader />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground">Services</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    render={
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <LogoutButton label="Logout" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
