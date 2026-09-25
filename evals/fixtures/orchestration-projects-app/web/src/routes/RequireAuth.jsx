import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { currentSession } from '../api/client';

// Only checks that someone is signed in; there is no role-based guard yet.
export function RequireAuth() {
  const location = useLocation();
  if (!currentSession()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
