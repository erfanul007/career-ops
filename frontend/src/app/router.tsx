import { createBrowserRouter, RouterProvider, Navigate } from "react-router";
import { AppLayout } from "@/components/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import CompaniesPage from "@/pages/CompaniesPage";
import JobLeadsPage from "@/pages/JobLeadsPage";
import ApplicationsPage from "@/pages/ApplicationsPage";
import ResumeVariantsPage from "@/pages/ResumeVariantsPage";
import SettingsProfilePage from "@/pages/SettingsProfilePage";
import TasksPage from "@/pages/TasksPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "job-leads", element: <JobLeadsPage /> },
      { path: "applications", element: <ApplicationsPage /> },
      { path: "companies", element: <CompaniesPage /> },
      { path: "resume-variants", element: <ResumeVariantsPage /> },
      { path: "tasks", element: <TasksPage /> },
      { path: "settings/profile", element: <SettingsProfilePage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
