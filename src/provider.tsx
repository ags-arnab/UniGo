import type { NavigateOptions } from 'react-router-dom';

// Import HeroUIProvider from @heroui/react instead of @heroui/system
import { HeroUIProvider, ToastProvider } from '@heroui/react';
import { useHref, useNavigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext'; // Assuming AuthProvider is here
import { CartProvider } from '@/contexts/CartContext'; // Import CartProvider

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NavigateOptions;
  }
}

export function Provider({ children }: { children: React.ReactNode }) {
	const navigate = useNavigate();

	return (
		<AuthProvider> { /* AuthProvider should be high up */}
			<CartProvider> { /* CartProvider wraps children that need cart access */}
				<HeroUIProvider navigate={navigate} useHref={useHref}>
					{children}
					{/* Render ToastProvider as a sibling, as it likely doesn't take children */}
					<ToastProvider />
				</HeroUIProvider>
			</CartProvider>
		</AuthProvider>
	);
}
