import React, {  } from 'react'; // Import useEffect
import { Link } from "@heroui/link";
import { Navbar } from "@/components/navbar";
import { CartFAB } from "@/components/ui/cafeteria/CartFAB";
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useAuth();

  // Render null or a loading indicator while auth state is loading
  // This prevents rendering children routes before auth status is confirmed
  if (loading) {
     return null;
  }

  // If authenticated and not loading, render the layout and children
  return (
    <div className="relative flex flex-col h-screen">
      <Navbar />
      <main className="container mx-auto max-w-7xl flex-grow"> 
        {children}
      </main>
      {/* Add the Cart FAB here so it overlays the content */}
      <CartFAB /> 
      <footer className="w-full flex items-center justify-center py-3">
        <Link
          isExternal
          className="flex items-center gap-1 text-current"
          href="https://heroui.com"
          title="heroui.com homepage"
        >
          <span className="text-default-600">Powered by</span>
          <p className="text-primary">HeroUI</p>
        </Link>
      </footer>
    </div>
  );
}
