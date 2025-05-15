import React from 'react';
import { Outlet, NavLink as RouterNavLink } from 'react-router-dom'; // Use RouterNavLink to avoid name clash if HeroUI has NavLink
import { Navbar as HeroUINavbar, NavbarBrand, NavbarContent } from "@heroui/navbar"; // Assuming this is where Navbar components are
import { BuildingStorefrontIcon, CubeIcon, ShoppingCartIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { Logo } from '@/components/icons'; // Assuming a Logo component exists
import { useAuth } from '@/contexts/AuthContext';

const MarketplaceManagementLayout: React.FC = () => {
  const { user } = useAuth();

  const baseLinkClasses = "flex items-center px-3 py-2 rounded-md text-sm font-medium";
  const activeLinkClasses = "bg-primary-100 text-primary-700";
  const inactiveLinkClasses = "text-gray-700 hover:bg-gray-100 hover:text-gray-900";

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md flex-shrink-0">
        <div className="h-16 flex items-center justify-center border-b">
          <RouterNavLink to="/" className="flex items-center gap-2 text-lg font-semibold">
            <Logo /> 
            <span>UniGo Marketplace</span>
          </RouterNavLink>
        </div>
        <nav className="mt-5 p-2 space-y-1">
          <RouterNavLink 
            to="products" 
            className={({ isActive }) => `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}
          >
            <CubeIcon className="h-5 w-5 mr-3" />
            Products
          </RouterNavLink>
          <RouterNavLink 
            to="storefront" 
            className={({ isActive }) => `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}
          >
            <BuildingStorefrontIcon className="h-5 w-5 mr-3" />
            Storefront Settings
          </RouterNavLink>
          <RouterNavLink 
            to="orders" 
            className={({ isActive }) => `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}
          >
            <ShoppingCartIcon className="h-5 w-5 mr-3" />
            Orders
          </RouterNavLink>
          <RouterNavLink 
            to="balance" 
            className={({ isActive }) => `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}
          >
            <BanknotesIcon className="h-5 w-5 mr-3" />
            Balance
          </RouterNavLink>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <HeroUINavbar isBordered className="bg-white">
          <NavbarBrand>
            <p className="font-bold text-inherit">Marketplace Operator Dashboard</p>
          </NavbarBrand>
          <NavbarContent justify="end">
            {user && (
              <span className="text-sm text-gray-600">Operator: {user.email}</span>
            )}
          </NavbarContent>
        </HeroUINavbar>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 p-4 md:p-6">
          <Outlet /> {/* Child routes render here */}
        </main>
      </div>
    </div>
  );
};

export default MarketplaceManagementLayout; 