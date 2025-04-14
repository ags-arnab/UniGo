import { useAuth } from '@/contexts/AuthContext'; // Import useAuth hook
import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom'; // Added Outlet
// Optional: Import a loading spinner component if desired
// import LoadingSpinner from '@/components/LoadingSpinner';

// No longer needs children prop when used in <Route element={...}>
// interface AuthGuardProps {
//   children: ReactNode;
// }

// const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
const AuthGuard: React.FC = () => { // Changed to simple FC
  // Get loading and authentication status from the AuthContext
  // Get loading, authentication status, and potentially the user object itself
  // to check if we were previously authenticated
  // Get loading and authentication status from the updated AuthContext
  const { isAuthenticated, loading } = useAuth(); // Removed 'user' as direct dependency here
  const location = useLocation();

  // --- Simplified Logic ---
  // 1. If still loading the initial auth state, show nothing (or a spinner).
  if (loading) {
    console.log('AuthGuard: Initial loading state. Rendering null.');
    // Optional: Render a proper loading spinner here
    // return <LoadingSpinner />;
    return null;
  }

  // 2. If loading is finished AND the user is definitively NOT authenticated, redirect.
  //    'isAuthenticated' now correctly reflects the state based on session/user from AuthContext.
  if (!isAuthenticated) {
    console.log('AuthGuard: Loading finished, not authenticated. Redirecting to login.');
    // Redirect them to the /login page, saving the intended location.
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // 3. If loading is finished AND the user IS authenticated, render the protected route.
  console.log(`AuthGuard: Loading finished, authenticated. Rendering Outlet.`);
  return <Outlet />;
};

export default AuthGuard;
