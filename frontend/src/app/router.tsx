import { createBrowserRouter, RouterProvider, Navigate } from "react-router";
import { AppLayout } from "@/components/AppLayout";
import CompaniesPage from "@/pages/CompaniesPage";
import SettingsProfilePage from "@/pages/SettingsProfilePage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/companies" replace /> },
      { path: "companies", element: <CompaniesPage /> },
      { path: "settings/profile", element: <SettingsProfilePage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
