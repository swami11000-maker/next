import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import Link from "next/link";
import { Bike, Car, ClipboardList, CommandIcon, FileText, LayoutDashboard, LucideCoins, LucideWorkflow, Phone, Search, Smartphone, Stethoscope, TractorIcon, Vote, Wind } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    items: [{ title: "Dashboard", href: "/retailer", icon: LayoutDashboard }],
  },
  {
    title: "E-SHARM CARD",
    icon: Wind,
    items: [
      { title: "E-Shram PDF DownLoad", href: "/retailer/e-sharam/e-sharm-pdf", icon: Bike },
      { title: "E-Shram Mobile Update ", href: "/retailer/e-sharam/e-sharm-mob-update", icon: Car },
    ],
  },
  {
    title: "Pollution",
    icon: Wind,
    items: [
      { title: "2 Wheeler", href: "/retailer/pollution/2wheeler", icon: Bike },
      { title: "4 Wheeler", href: "/retailer/pollution/4wheeler", icon: Car },
    ],
  },
  {
    title: "Farmer Service",
    icon: TractorIcon,
    items: [{ title: "Farmer Card PDF", href: "/retailer/farmer-service/farmer-card", icon: FileText }],
  },
  {
    title: "LL Exam Request",
    icon: ClipboardList,
    items: [{ title: "LL Exam Request", href: "/retailer/ll-exam-request", icon: ClipboardList }],
  },
  {
    title: "Learning Exam Medical",
    icon: Stethoscope,
    items: [{ title: "Learning Exam Medical", href: "/retailer/learning-exam-medical", icon: Stethoscope }],
  },
  {
    title: "PAN Service",
    icon: FileText,
    items: [
      { title: "PAN Find", href: "/retailer/pan-service/aadhar-to-pan", icon: Search },
      { title: "PAN Detail", href: "/retailer/pan-service/pan-detail", icon: FileText },
    ],
  },
  {
    title: "Voter",
    icon: Vote,
    items: [{ title: "Voter Mobile Link", href: "/retailer/voter_mobile_link", icon: Smartphone }],
  },
  {
    title: "Vehicle Service",
    icon: Car,
    items: [{ title: "RC PDF", href: "/retailer/vehical-service/rc-pdf", icon: FileText }],
  },
  {
    title: "Driving Licence",
    icon: Car,
    items: [{ title: "DL Print", href: "/retailer/driving-license/dl-print", icon: Search }],
  },

  {
    title: "History",
    icon: LucideWorkflow,
    items: [
      { title: "Work History", href: "/retailer/history", icon: LucideWorkflow },
      { title: "Payment History", href: "/retailer/transitions", icon: LucideCoins },
      { title: "Add Money History", href: "/retailer/add-money-history", icon: CommandIcon },
    ],
  },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader />
      <SidebarContent>
        {menuItems.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-sidebar-foreground">{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item, index) => (
                  <SidebarMenuItem key={`${item.href}-${item.title}-${index}`}>
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
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenuItem>
          <LogoutButton label="Logout" />
        </SidebarMenuItem>
      </SidebarFooter>
    </Sidebar>
  );
}
