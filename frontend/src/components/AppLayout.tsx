import { NavLink, Outlet } from "react-router";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/job-leads", label: "Job Leads" },
  { to: "/companies", label: "Companies" },
  { to: "/settings/profile", label: "Settings" },
];

export function AppLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <nav className="mx-auto flex max-w-5xl gap-4 p-4">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                isActive ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground"
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl p-8">
        <Outlet />
      </main>
    </div>
  );
}
