import { NavLink } from 'react-router-dom';
import {
  ClipboardList, // Menu
  Archive, // Inventory
  ShoppingCart, // Orders
  BarChart3, // Analytics
  Building, // Counters
  Store, // Shop Settings
  Receipt, // Tax Settings
  Settings, // General Settings Parent
  Terminal, // POS icon
  ChevronDown,
  ChevronRight,
  Tags, // Added for Categories
  Wallet, // Added for Balance
  History, // Added for Legacy Orders
  Truck // Added for Delivery
} from 'lucide-react';
import { Logo } from '@/components/icons'; // Assuming Logo component exists
import { Accordion, AccordionItem } from "@heroui/react"; // For collapsible Settings

const sidebarNavItems = [
  { name: 'Menu Management', href: '/vendor/dashboard/menu', icon: ClipboardList },
  { name: 'Categories', href: '/vendor/dashboard/categories', icon: Tags }, // Added Categories link
  { name: 'Inventory', href: '/vendor/dashboard/inventory', icon: Archive },
  { name: 'Orders', href: '/vendor/dashboard/orders', icon: ShoppingCart },
  { name: 'Orders Kanban', href: '/vendor/dashboard/legacy-orders', icon: History }, // Renamed link to Orders Kanban
  { name: 'Delivery', href: '/vendor/dashboard/delivery', icon: Truck }, // Added Delivery link
  { name: 'Analytics', href: '/vendor/dashboard/analytics', icon: BarChart3 },
  { name: 'Counters', href: '/vendor/dashboard/counters', icon: Building },
  { name: 'POS', href: '/vendor/dashboard/pos', icon: Terminal }, // Added POS link
  { name: 'Balance', href: '/vendor/dashboard/balance', icon: Wallet }, // Added Balance link
  // Settings group
  {
    name: 'Settings',
    icon: Settings,
    subItems: [
      { name: 'Shop Settings', href: '/vendor/dashboard/settings/shop', icon: Store },
      { name: 'Tax Settings', href: '/vendor/dashboard/settings/tax', icon: Receipt },
    ]
  }
];

export default function DashboardSidebar() {
  const baseLinkClasses = "flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150";
  // Use theme's foreground color and standard subtle hover/focus states
  const inactiveLinkClasses = "text-foreground/70 hover:text-foreground hover:bg-foreground/10 dark:hover:bg-foreground/10";
  // Use a slightly more prominent background for active state, keep text as default foreground
  const activeLinkClasses = "bg-foreground/10 text-foreground";
  const subLinkClasses = "pl-10"; // Indentation for sub-items

  return (
    <aside className="w-64 flex-shrink-0 bg-background border-r border-divider flex flex-col">
      {/* Logo/Brand */}
      <div className="h-16 flex items-center justify-center px-4 border-b border-divider">
         {/* Ensure logo text uses theme foreground */}
         <NavLink to="/" className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Logo />
            <span>UniGo Vendor</span>
         </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {sidebarNavItems.map((item) =>
          item.subItems ? (
            <Accordion key={item.name} selectionMode="multiple" className="p-0 shadow-none">
              <AccordionItem
                key={item.name}
                aria-label={item.name}
                title={
                  <div className={`${baseLinkClasses} ${inactiveLinkClasses} w-full justify-between`}>
                     <div className="flex items-center">
                        <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                        <span>{item.name}</span>
                     </div>
                     {/* Indicator will be handled by AccordionItem's default */}
                  </div>
                }
                classNames={{
                   trigger: "p-0 hover:bg-transparent", // Remove padding from trigger
                   content: "pt-1 pb-0 pl-0 space-y-1", // Adjust content padding
                }}
                indicator={({ isOpen }) => (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
              >
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
              </AccordionItem>
            </Accordion>
          ) : (
            <NavLink
              key={item.name}
              to={item.href}
              end // Use 'end' for non-parent routes to avoid matching parent when child is active
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

      {/* Optional Footer Area */}
      {/* <div className="p-4 border-t border-divider dark:border-gray-700">
         Footer content
      </div> */}
    </aside>
  );
}
