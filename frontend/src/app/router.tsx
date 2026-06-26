import { createBrowserRouter, RouterProvider } from 'react-router';
import { AppLayout } from '@/components/AppLayout';
import DashboardPage from '@/pages/DashboardPage';
import JobsPage from '@/pages/JobsPage';
import JobDetailPage from '@/pages/JobDetailPage';
import CompaniesPage from '@/pages/CompaniesPage';
import TasksPage from '@/pages/TasksPage';
import SettingsProfilePage from '@/pages/SettingsProfilePage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'jobs', element: <JobsPage /> },
      { path: 'jobs/:id', element: <JobDetailPage /> },
      { path: 'companies', element: <CompaniesPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'settings/profile', element: <SettingsProfilePage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
