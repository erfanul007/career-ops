import { createBrowserRouter, RouterProvider, Navigate } from "react-router";
import { AppLayout } from "@/components/AppLayout";
import CompaniesPage from "@/pages/CompaniesPage";
import JobLeadsPage from "@/pages/JobLeadsPage";
import JobLeadDetailsPage from "@/pages/JobLeadDetailsPage";
import SettingsProfilePage from "@/pages/SettingsProfilePage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/job-leads" replace /> },
      { path: "job-leads", element: <JobLeadsPage /> },
      { path: "job-leads/new", element: <JobLeadDetailsPage /> },
      { path: "job-leads/:id", element: <JobLeadDetailsPage /> },
      { path: "companies", element: <CompaniesPage /> },
      { path: "settings/profile", element: <SettingsProfilePage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
