import React from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarDaysIcon, Cog6ToothIcon, BanknotesIcon, ChartBarIcon, UsersIcon } from '@heroicons/react/24/outline'; // Added UsersIcon

const ClubSidebar: React.FC = () => {
  const baseClasses = "flex items-center px-4 py-2.5 rounded-lg transition-colors duration-200";
  const inactiveClasses = "text-default-600 hover:bg-default-100 hover:text-default-900";
  const activeClasses = "bg-secondary/10 text-secondary font-medium"; // Use secondary color for active

  // Helper function to combine classes
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;

  return (
    <div className="h-full w-64 bg-white border-r border-default-200 flex flex-col">
      <div className="px-6 py-4 border-b border-default-200">
        {/* Replace with Club Logo/Name if available */}
        <h2 className="text-xl font-semibold text-default-800">Club Dashboard</h2>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {/* Example Links - Adjust paths and icons as needed */}
        <NavLink to="/club/dashboard/events" className={getNavLinkClass}>
          <CalendarDaysIcon className="w-5 h-5 mr-3" />
          Event Management
        </NavLink>
        <NavLink to="/club/dashboard/registrations" className={getNavLinkClass}>
          <UsersIcon className="w-5 h-5 mr-3" /> {/* Using UsersIcon for registrations */}
          Registrations
        </NavLink>
        <NavLink to="/club/dashboard/balance" className={getNavLinkClass}>
          <BanknotesIcon className="w-5 h-5 mr-3" />
          Balance
        </NavLink>
        <NavLink to="/club/dashboard/analytics" className={getNavLinkClass}>
          <ChartBarIcon className="w-5 h-5 mr-3" />
          Analytics
        </NavLink>
        <NavLink to="/club/dashboard/settings" className={getNavLinkClass}>
          <Cog6ToothIcon className="w-5 h-5 mr-3" />
          Settings
        </NavLink>
        {/* Add more links as needed */}

        {/* Optional: Link back to main site or student view */}
        {/* <NavLink to="/" className={getNavLinkClass}>
          <HomeIcon className="w-5 h-5 mr-3" />
          Back to UniGo
        </NavLink> */}
      </nav>
      {/* Optional: Footer section for user info/logout */}
      {/* <div className="px-4 py-3 border-t border-default-200">
         User Info / Logout Button
      </div> */}
    </div>
  );
};

export default ClubSidebar;
