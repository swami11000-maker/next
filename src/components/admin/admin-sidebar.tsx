"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import Link from "next/link";

import {
  Bike,
  Car,
  ClipboardList,
  LayoutDashboard,
  LucideCoins,
  LucideWorkflow,
  Stethoscope,
  Users,
  CreditCard,
  CommandIcon,
  Bell,
  Loader2,
} from "lucide-react";

import { LogoutButton } from "@/components/logout-button";
import { useEffect, useState } from "react";
import { useAlerts } from "@/hooks/use-alert";

const menuItems = [
  {
    id: "dashboard",
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    id: "add-money",
    title: "Add Money Dashboard",
    href: "/admin/addmoney-dashboard",
    icon: CreditCard,
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
  {
    id: "addmoney-history",
    title: "Add Money History",
    href: "/admin/addmoney-history",
    icon: CommandIcon,
  },
];


export function AdminSidebar() {

  const {
    alerts,
    loading,
    error,
    refreshAlerts,
  } = useAlerts();

  return (
    <Sidebar>
      <SidebarHeader />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground">
            Services
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      render={
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>

          {/* Pending Alerts */}
          <SidebarGroupLabel className="mt-4 text-sidebar-foreground">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span>Pending Alerts</span>
              </div>

              {alerts.length > 0 && (
                <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {alerts.length}
                </span>
              )}
            </div>
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {loading ? (
                <SidebarMenuItem>
                  <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading alerts...</span>
                  </div>
                </SidebarMenuItem>
              ) : alerts.length === 0 ? (
                <SidebarMenuItem>
                  <div className="px-2 py-3 text-sm text-muted-foreground">
                    No pending alerts
                  </div>
                </SidebarMenuItem>
              ) : (
                alerts.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <div className="w-full rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 rounded-full bg-orange-500/10 p-1.5">
                          <Bell className="h-3.5 w-3.5 text-orange-500" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold">
                            {item.service_name || "Service Request"}
                          </p>

                          {item.order_id && (
                            <p className="mt-1 truncate text-[11px] text-muted-foreground">
                              Order: {item.order_id}
                            </p>
                          )}

                          {item.user_name && (
                            <p className="truncate text-[11px] text-muted-foreground">
                              User: {item.user_name}
                            </p>
                          )}

                          <span className="mt-2 inline-flex rounded-full bg-orange-500 px-2 py-0.5 text-[9px] font-semibold uppercase text-white">
                            {item.status || "panding"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </SidebarMenuItem>
                ))
              )}
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