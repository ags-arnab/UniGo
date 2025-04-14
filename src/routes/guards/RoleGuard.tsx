import { useAuth } from '@/contexts/AuthContext';
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
// Optional: Import a loading spinner component if desired
// import LoadingSpinner from '@/components/LoadingSpinner';

interface RoleGuardProps {
  allowedRoles: string[]; // Keep as string array for flexibility
}

const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles }) => {
  // Get auth state from context, including profileLoading
  const { profile, isAuthenticated, loading, profileLoading } = useAuth(); // Added profileLoading

  // Handle initial auth loading state (already handled by AuthGuard, but good practice)
  if (loading) {
    // Optional: Render a loading spinner or a blank screen
    // return <LoadingSpinner />;
    return null; // Render nothing while initial auth is loading
  }

  // Handle profile loading state
  if (profileLoading) {
    // Optional: Render a loading spinner or a blank screen
    // return <LoadingSpinner />;
    return null; // Render nothing while profile is loading
  }

  // Now that loading and profileLoading are false, check authentication and profile
  if (!isAuthenticated || !profile) {
    // If not authenticated OR profile fetch failed (profile is null), redirect to login.
    // AuthContext's profileError might contain more details if needed.
    console.log(`RoleGuard: Redirecting. isAuthenticated: ${isAuthenticated}, profile exists: ${!!profile}`);
    return <Navigate to="/auth/login" replace />;
  }

  // Check if the user's role is included in the allowed roles
  const hasRequiredRole = allowedRoles.includes(profile.role);
  
  // Check for active status (if status is defined on the profile)
  const isActive = profile.status === 'active';

  // Check if the user is newly registered
  // If user has just registered (status is pending or undefined), redirect to login
  if (profile.status === 'pending_approval' || profile.status === 'pending') {
    // Newly registered user, redirect to login with a parameter to show appropriate message
    return <Navigate to="/auth/login?status=pending" replace />;
  }

  // --- Future Enhancement: Vendor Type Check ---
  // This logic can remain similar, checking properties on the 'profile' object
  let hasRequiredVendorType = true; // Assume true by default
  /* 
  if (hasRequiredRole && profile.role === 'vendor') {
    // Example check (assuming a 'vendor_type' or similar property exists on profile):
    // const requiredVendorType = 'cafeteria';
    // hasRequiredVendorType = profile.vendor_type === requiredVendorType;
  }
  */
  // --- End Future Enhancement ---

  // If user doesn't have the required role OR is not active
  if (!hasRequiredRole || !isActive || !hasRequiredVendorType) {
    // User is authenticated but not authorized (wrong role or inactive status).
    // Redirect to login page. The login controller will provide specific feedback.
    return <Navigate to="/auth/login" replace />;
  }

  // If authenticated, has the required role, and is active, render the nested routes via Outlet
  return <Outlet />;
};

export default RoleGuard;
