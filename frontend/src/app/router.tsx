import { createBrowserRouter, RouterProvider, Navigate } from "react-router";
import SettingsProfilePage from "@/pages/SettingsProfilePage";

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/settings/profile" replace /> },
  { path: "/settings/profile", element: <SettingsProfilePage /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
