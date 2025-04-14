import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { MenuItem } from '@/models/cafeteria'; // Import MenuItem type

// Interface for items in the cart store
interface CartStoreItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

// Define the state structure for the student cart store
interface StudentCartState {
  cartItems: CartStoreItem[];
  addToCart: (menuItem: MenuItem, quantity: number, specialInstructions?: string) => void;
  removeFromCart: (menuItemId: string) => void;
  updateCartItemQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
}

// Create the student cart store
export const useStudentCartStore = create<StudentCartState>()(
  devtools(
    (set, get) => ({
      // Initial state
      cartItems: [],

      // Add item to cart
      addToCart: (menuItem: MenuItem, quantity: number, specialInstructions?: string) => {
        const { cartItems } = get();
        const existingItemIndex = cartItems.findIndex(item => item.menuItem.id === menuItem.id);

        if (existingItemIndex > -1) {
          // Update quantity if item exists
          const updatedCart = cartItems.map((item, index) =>
            index === existingItemIndex
              ? { ...item, quantity: item.quantity + quantity } // Consider if special instructions should merge or replace here
              : item
          );
          set({ cartItems: updatedCart }, false, "addToCart (update quantity)");
        } else {
          // Add new item to cart
          set(
            state => ({
              cartItems: [...state.cartItems, { menuItem, quantity, specialInstructions }]
            }),
            false,
            "addToCart (new item)"
          );
        }
      },

      // Remove item from cart
      removeFromCart: (menuItemId: string) => {
        set(
          state => ({
            cartItems: state.cartItems.filter(item => item.menuItem.id !== menuItemId)
          }),
          false,
          "removeFromCart"
        );
      },

      // Update cart item quantity
      updateCartItemQuantity: (menuItemId: string, quantity: number) => {
        if (quantity <= 0) {
          // Remove item if quantity is 0 or negative
          get().removeFromCart(menuItemId);
          return;
        }
        set(
          state => ({
            cartItems: state.cartItems.map(item =>
              item.menuItem.id === menuItemId
                ? { ...item, quantity }
                : item
            )
          }),
          false,
          "updateCartItemQuantity"
        );
      },

      // Clear cart
      clearCart: () => {
        set({ cartItems: [] }, false, "clearCart");
      },
    }),
    { name: 'StudentCartStore' } // Name for Redux DevTools
  )
);
