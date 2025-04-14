import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import {
  Navbar as HeroUINavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from "@heroui/navbar";
import { link as linkStyles } from "@heroui/theme";
import clsx from "clsx";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { User, LogIn, LogOut } from "lucide-react"; // Import icons for Profile, Login, and Logout
import { Logo } from "@/components/icons";
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth

export const Navbar = () => {
  const { isAuthenticated, logout, profile } = useAuth(); // Get auth state and logout function (renamed from signOut)

  return (
    <HeroUINavbar maxWidth="xl" position="sticky">
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand className="gap-3 max-w-fit">
          <Link
            className="flex justify-start items-center gap-1"
            color="foreground"
            href="/"
          >
            <Logo />
            <p className="font-bold text-inherit">{siteConfig.name}</p> {/* Use name from config */}
          </Link>
        </NavbarBrand>
        {/* Main Nav Links (Desktop) */}
        <div className="hidden lg:flex gap-4 justify-start ml-2">
          {siteConfig.navItems.map((item) => (
            <NavbarItem key={item.href}>
              <Link
                className={clsx(
                  linkStyles({ color: "foreground" }),
                  "data-[active=true]:text-primary data-[active=true]:font-medium"
                )}
                color="foreground"
                href={item.href}
              >
                {item.label}
              </Link>
            </NavbarItem>
          ))}
        </div>
      </NavbarContent>

      <NavbarContent
        className="hidden sm:flex basis-1/5 sm:basis-full"
        justify="end"
      >
        {/* Right side items: Conditional Profile/Login or Logout, Theme Switch */}
        {isAuthenticated && profile?.role === 'student' ? (
          <>
            <NavbarItem className="hidden sm:flex">
              <Link href="/student/profile" aria-label="Profile">
                <Button isIconOnly variant="light">
                  <User className="text-default-500" />
                </Button>
              </Link>
            </NavbarItem>
            <NavbarItem className="hidden sm:flex">
              {/* Logout Button - Styled Red */}
              <Button 
                isIconOnly 
                variant="light" 
                onPress={logout} // Use logout function
                aria-label="Logout"
                className="text-red-500 hover:bg-red-100" // Apply red color and hover effect
              >
                <LogOut /> 
              </Button>
            </NavbarItem>
          </>
        ) : !isAuthenticated ? (
          // Show Login only if not authenticated
          <NavbarItem className="hidden sm:flex">
            <Link href="/auth/login" aria-label="Login">
              <Button isIconOnly variant="light">
                <LogIn className="text-default-500" />
              </Button>
            </Link>
          </NavbarItem>
        ) : null /* Optionally handle other roles or states here */} 
        {/* Theme Switch is always visible */}
        <NavbarItem>
          <ThemeSwitch />
        </NavbarItem>
      </NavbarContent>

      {/* Mobile Menu Toggle */}
      <NavbarContent className="sm:hidden basis-1 pl-4" justify="end">
        <ThemeSwitch /> {/* Keep theme switch accessible */}
        <NavbarMenuToggle />
      </NavbarContent>

      <NavbarMenu>
        <div className="mx-4 mt-2 flex flex-col gap-2">
          {/* Standard Menu Items */}
          {siteConfig.navMenuItems.map((item, index) => (
            <NavbarMenuItem key={`${item.href}-${index}`}>
              <Link href={item.href} size="lg" color="foreground">
                {item.label}
              </Link>
            </NavbarMenuItem>
          ))}
          {/* Conditional Auth Links in Mobile Menu */}
          {isAuthenticated && profile?.role === 'student' ? (
            <>
              <NavbarMenuItem key="profile-mobile">
                <Link href="/student/profile" size="lg" color="foreground">
                  Profile
                </Link>
              </NavbarMenuItem>
              <NavbarMenuItem key="logout-mobile">
                <Button 
                  variant="light" 
                  onPress={logout} // Use logout function
                  className="w-full justify-start text-red-500 px-0" // Red color, full width, left align
                  size="lg"
                >
                  <LogOut className="mr-2" /> Logout
                </Button>
              </NavbarMenuItem>
            </>
          ) : !isAuthenticated ? (
             <NavbarMenuItem key="login-mobile">
                <Link href="/auth/login" size="lg" color="foreground">
                  Login
                </Link>
              </NavbarMenuItem>
          ) : null /* Handle other roles if needed */}
        </div>
      </NavbarMenu>
    </HeroUINavbar>
  );
};
