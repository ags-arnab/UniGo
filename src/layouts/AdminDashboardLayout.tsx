import { Outlet } from 'react-router-dom';
import AdminSidebar from '@/components/admin/AdminSidebar.tsx'; // Added .tsx extension
import {
  Navbar as HeroUINavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@heroui/navbar";
import { useAuth } from '@/contexts/AuthContext';

export default function AdminDashboardLayout() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-secondary-50 dark:bg-gray-900">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <HeroUINavbar isBordered className="bg-background dark:bg-gray-800">
           <NavbarBrand>
              <p className="font-bold text-inherit">Admin Dashboard</p>
           </NavbarBrand>
           <NavbarContent justify="end">
              {user && (
                 <NavbarItem>
                    <span className="text-sm text-foreground-500">Admin: {user.email}</span>
                 </NavbarItem>
              )}
           </NavbarContent>
        </HeroUINavbar>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-secondary-100 dark:bg-gray-900 p-4 md:p-6">
          <Outlet /> {/* Child routes render here */}
        </main>
      </div>
    </div>
  );
}
