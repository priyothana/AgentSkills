import { createBrowserRouter } from 'react-router-dom';
import { RequireAuth } from './routes/RequireAuth';
import { LoginPage } from './pages/LoginPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <ProjectsPage /> },
      { path: '/projects/:projectId', element: <ProjectDetailPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
