import { NavLink, Outlet, useLocation } from "react-router";
import { LayoutDashboard, Briefcase, CheckSquare, Building2, Settings } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { useGetUserProfile } from "@/lib/api/settings/settings";
import { Logo } from "@/components/Logo";
import { ModeToggle } from "@/components/ModeToggle";

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
        <SidebarHeader className="flex-row items-center gap-2 px-3 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Logo className="size-7 shrink-0" />
          <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">CareerOps</span>
        </SidebarHeader>
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
        <SidebarFooter className="px-3 py-2 text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
          {name || "Set up your profile"}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="h-svh overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-2">
            <ModeToggle />
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
