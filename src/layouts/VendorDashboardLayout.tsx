import { Outlet } from 'react-router-dom';
import DashboardSidebar from '@/components/vendor/DashboardSidebar.tsx'; // Added .tsx extension
import {
  Navbar as HeroUINavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Button, // Added Button
} from "@heroui/react"; // Use main @heroui/react import
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, LogOut } from 'lucide-react'; // Added LogOut
import { ThemeSwitch } from '@/components/theme-switch'; // Import ThemeSwitch
export default function VendorDashboardLayout() {
  const { user, profileError, loading, logout } = useAuth(); // Get user info, error, and logout function

  // Display error if profile fetching failed
  if (!loading && profileError) {
    return (
      // Revert to using theme colors for error page background
      <div className="flex h-screen items-center justify-center p-4 bg-secondary-50 dark:bg-gray-900">
        {/* Revert card background to theme */}
        <div className="max-w-md w-full p-6 bg-background dark:bg-gray-800 rounded-lg shadow-md border border-danger-200 dark:border-danger-700">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-6 w-6 text-danger mr-3" /> {/* Revert danger text color */}
            <h2 className="text-xl font-semibold text-danger">Profile Error</h2>
          </div>
          <p className="text-foreground-600 dark:text-foreground-400 mb-2">
            There was an issue loading your user profile, which is required to access the dashboard.
          </p>
          <p className="text-sm text-danger-700 dark:text-danger-300 bg-danger-50 dark:bg-gray-700 p-2 rounded">
            <strong>Error:</strong> {profileError.message}
          </p>
          <p className="text-xs text-foreground-500 mt-4">
            Please ensure a profile exists for your user ID in the database (public.profiles table) with the correct role. Contact support if the issue persists.
          </p>
        </div>
      </div>
    );
  }

  // Render layout if no error (and not loading - though AuthGuard usually handles loading)
  return (
    // Use standard neutral grays for the main layout container
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main Content Area - Removed overflow-hidden */}
      <div className="flex-1 flex flex-col">
      {/* Optional Top Navbar within the main area - Rely solely on theme background */}
      <HeroUINavbar isBordered className="bg-background">
           <NavbarBrand>
              <p className="font-bold text-inherit">Vendor Dashboard</p>
           </NavbarBrand>
           <NavbarContent justify="end" className="items-center"> {/* Ensure items are vertically centered */}
              {/* Theme Switch */}
              <NavbarItem>
                 <ThemeSwitch />
              </NavbarItem>

              {/* Display user info and logout button */}
              {user && (
                 <>
                    <NavbarItem className="hidden sm:flex"> {/* Hide email on small screens */}
                       {/* Use default foreground color, maybe slightly muted */}
                       <span className="text-sm text-foreground/80">Welcome, {user.email}</span>
                    </NavbarItem>
                    <NavbarItem>
                       <Button
                          size="sm"
                          variant="light"
                          color="danger" // Use danger color for logout
                          isIconOnly
                          aria-label="Logout"
                          onPress={logout} // Call logout function from context
                       >
                          <LogOut className="h-5 w-5" />
                       </Button>
                    </NavbarItem>
                 </>
              )}
           </NavbarContent>
        </HeroUINavbar>

        {/* Page Content - Rendered by Outlet - Use standard neutral grays */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4 md:p-6">
          <Outlet /> {/* Child routes will render here */}
        </main>
      </div>
    </div>
  );
}
