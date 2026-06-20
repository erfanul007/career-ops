import { NavLink, Outlet, useLocation } from "react-router";
import { LayoutDashboard, KanbanSquare, Building2, Settings } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { useGetUserProfile } from "@/lib/api/settings/settings";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/job-leads", label: "Job Leads", icon: KanbanSquare },
  { to: "/companies", label: "Companies", icon: Building2 },
  { to: "/settings/profile", label: "Settings", icon: Settings },
];

export function AppLayout() {
  const { data } = useGetUserProfile();
  const { pathname } = useLocation();
  const name = data?.data && "fullName" in data.data ? data.data.fullName : "";

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-3 py-2 text-lg font-semibold">CareerOps</SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.map((n) => {
                  const isActive = pathname === n.to || pathname.startsWith(`${n.to}/`);
                  return (
                    <SidebarMenuItem key={n.to}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={n.label}>
                        <NavLink to={n.to}>
                          <n.icon />
                          <span>{n.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="px-3 py-2 text-sm text-muted-foreground">
          {name || "Set up your profile"}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <span className="font-medium">CareerOps</span>
        </header>
        <div className="mx-auto w-full max-w-6xl p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
