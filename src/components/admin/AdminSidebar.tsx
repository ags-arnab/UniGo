import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutGrid, // Dashboard/Overview
  Users, // User Management
  Building, // Vendor Management
  Mail, // Vendor Applications Icon
  CheckCircle // Imported CheckCircle
} from 'lucide-react';
import { Logo } from '@/components/icons';

// Define sidebar structure (expand later)
const sidebarNavItems = [
  { name: 'Overview', href: '/admin/dashboard/overview', icon: LayoutGrid },
  { name: 'Users', href: '/admin/users', icon: Users },
  {
    name: 'Vendors',
    icon: Building,
    subItems: [
      { name: 'Applications', href: '/admin/vendors/applications', icon: Mail },
      { name: 'Approved', href: '/admin/vendors/approved', icon: CheckCircle }, // Example
      // Add other vendor sub-items later
    ]
   },
  // Add other top-level items like Settings later
];

export default function AdminSidebar() {
  const baseLinkClasses = "flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150";
  const inactiveLinkClasses = "text-gray-600 dark:text-gray-400 hover:bg-primary-100 dark:hover:bg-gray-700 hover:text-primary-700 dark:hover:text-primary-300";
  const activeLinkClasses = "bg-primary-100 dark:bg-gray-700 text-primary-700 dark:text-primary-300";
  const subLinkClasses = "pl-10"; // Indentation for sub-items

  // Basic Accordion Logic (Replace with HeroUI Accordion if needed later)
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const toggleAccordion = (name: string) => {
      setOpenAccordion(openAccordion === name ? null : name);
  };


  return (
    <aside className="w-64 flex-shrink-0 bg-background dark:bg-gray-800 border-r border-divider dark:border-gray-700 flex flex-col">
      {/* Logo/Brand */}
      <div className="h-16 flex items-center justify-center px-4 border-b border-divider dark:border-gray-700">
         <NavLink to="/admin/dashboard" className="flex items-center gap-2 text-lg font-semibold text-foreground dark:text-white">
            <Logo />
            <span>UniGo Admin</span>
         </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {sidebarNavItems.map((item) =>
          item.subItems ? (
            <div key={item.name}>
              <button
                onClick={() => toggleAccordion(item.name)}
                className={`${baseLinkClasses} ${inactiveLinkClasses} w-full justify-between`}
              >
                 <div className="flex items-center">
                    <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span>{item.name}</span>
                 </div>
                 {/* Basic Chevron Indicator */}
                 <svg className={`w-4 h-4 transition-transform ${openAccordion === item.name ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
              {/* Collapsible Content */}
              {openAccordion === item.name && (
                 <div className="mt-1 space-y-1">
                    {item.subItems.map((subItem) => (
                      <NavLink
                        key={subItem.name}
                        to={subItem.href}
                        className={({ isActive }) =>
                          `${baseLinkClasses} ${subLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`
                        }
                      >
                        <subItem.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                        <span>{subItem.name}</span>
                      </NavLink>
                    ))}
                 </div>
              )}
            </div>
          ) : (
            <NavLink
              key={item.name}
              to={item.href}
              end // Use 'end' for non-parent routes
              className={({ isActive }) =>
                `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`
              }
            >
              <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          )
        )}
      </nav>
    </aside>
  );
}
