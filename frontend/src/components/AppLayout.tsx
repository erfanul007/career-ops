import { NavLink, Outlet, useLocation } from "react-router";
import { LayoutDashboard, Briefcase, CheckSquare, Building2, Settings } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { useGetUserProfile } from "@/lib/api/settings/settings";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
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
                  const isActive = n.to === '/' ? pathname === '/' : (pathname === n.to || pathname.startsWith(`${n.to}/`));
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
      <SidebarInset className="h-svh overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
