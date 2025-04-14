export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "UniGo", // Updated App Name
  description: "Your University Campus Companion App.",
  // Main navigation items for desktop view
  navItems: [
    {
      label: "Home",
      href: "/",
    },
    {
      label: "Cafeteria",
      href: "/student/cafeteria", // Correct route
    },
    {
      label: "Events",
      href: "/student/events", // Correct route
    },
    {
      label: "Marketplace",
      href: "/student/marketplace", // Correct route
    },
  ],
  // Navigation items for the mobile menu
  navMenuItems: [
    {
      label: "Home",
      href: "/",
    },
    {
      label: "Cafeteria",
      href: "/student/cafeteria",
    },
    {
      label: "Events",
      href: "/student/events",
    },
    {
      label: "Marketplace",
      href: "/student/marketplace",
    },
    {
      label: "Profile",
      href: "/student/profile", // Correct route
    },
    {
      label: "Login",
      href: "/auth/login", // Correct route
    },
    // Add other relevant mobile links if needed, e.g., Settings, Logout
  ],
  // Keeping external links for now, can be removed if not needed
  links: {
    github: "https://github.com/arnab-4/UniGo", // Update if needed
    twitter: "https://twitter.com/hero_ui",
    docs: "https://heroui.com",
    discord: "https://discord.gg/9b6yyZKmH4",
    sponsor: "https://patreon.com/jrgarciadev",
  },
};
