import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  adminOnly?: boolean;
}

export const ProtectedRoute = ({
  children,
  requireAuth = true,
  adminOnly = false
}: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Redirect to login if auth required but no user
  if (requireAuth && !user) {
    return <Navigate to="/login" replace />;
  }

  // Check admin access - ONLY these emails can access /admin dashboard
  if (adminOnly && user) {
    const ADMIN_EMAILS = ['abirmaji108@gmail.com', 'rupsamaji00@gmail.com'];
    
    if (!ADMIN_EMAILS.includes(user.email || '')) {
      return <Navigate to="/app" replace />;
    }
  }

  // Redirect authenticated users away from auth pages
  if (!requireAuth && user) {
    return <Navigate to="/app" replace />;
  }

  // Render protected content if all checks pass
  return <>{children}</>;
};
