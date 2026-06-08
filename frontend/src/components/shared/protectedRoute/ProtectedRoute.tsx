import { Navigate } from 'react-router-dom';
import { authService } from '../services/auth.service';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
