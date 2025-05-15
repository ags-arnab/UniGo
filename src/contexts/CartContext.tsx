import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { MarketplaceProduct } from '../pages/vendor/marketplace_management/products'; // Adjust path as needed
import { addToast } from '@heroui/react'; // Assuming HeroUI for toasts

export interface CartItem extends MarketplaceProduct {
  quantityInCart: number;
  selectedAttributes?: Record<string, string | number | boolean> | null;
}

interface CartContextType {
  cartItems: CartItem[];
  addItemToCart: (product: MarketplaceProduct, quantity: number) => void;
  removeItemFromCart: (productId: string) => void;
  updateItemQuantity: (productId: string, newQuantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getTotalItems: () => number;
  // Potentially add storefrontId to ensure cart is for a single store at a time, or manage multi-store carts
  // For simplicity, this cart is for any marketplace product, assuming checkout per store or unified.
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const localData = localStorage.getItem('marketplaceCart');
    return localData ? JSON.parse(localData) : [];
  });

  useEffect(() => {
    localStorage.setItem('marketplaceCart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addItemToCart = (product: MarketplaceProduct, quantity: number) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        const updatedQuantity = existingItem.quantityInCart + quantity;
        // Check against available stock if stock_quantity is a number
        if (typeof product.stock_quantity === 'number' && updatedQuantity > product.stock_quantity) {
          addToast({ title: 'Stock Limit', description: `Cannot add more than ${product.stock_quantity} of ${product.name}.`, color: 'warning' });
          return prevItems.map(item => 
            item.id === product.id ? { ...item, quantityInCart: product.stock_quantity! } : item
          );
        }
        return prevItems.map(item => 
          item.id === product.id ? { ...item, quantityInCart: updatedQuantity } : item
        );
      } else {
        // Check stock for new item
        if (typeof product.stock_quantity === 'number' && quantity > product.stock_quantity) {
          addToast({ title: 'Stock Limit', description: `Only ${product.stock_quantity} of ${product.name} available.`, color: 'warning' });
          return [...prevItems, { ...product, quantityInCart: product.stock_quantity! }];
        }
        return [...prevItems, { ...product, quantityInCart: quantity }];
      }
    });
    addToast({ title: 'Added to Cart', description: `${product.name} (${quantity}) added to your cart.`, color: 'success' });
  };

  const removeItemFromCart = (productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
    addToast({ title: 'Item Removed', description: 'Item removed from your cart.', color: 'default' });
  };

  const updateItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItemFromCart(productId);
      return;
    }
    setCartItems(prevItems => 
      prevItems.map(item => {
        if (item.id === productId) {
          // Check stock if available
          if (typeof item.stock_quantity === 'number' && newQuantity > item.stock_quantity) {
            addToast({ title: 'Stock Limit', description: `Only ${item.stock_quantity} of ${item.name} available.`, color: 'warning' });
            return { ...item, quantityInCart: item.stock_quantity! };
          }
          return { ...item, quantityInCart: newQuantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
    addToast({ title: 'Cart Cleared', description: 'Your cart is now empty.', color: 'default' });
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.price * item.quantityInCart, 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((count, item) => count + item.quantityInCart, 0);
  };

  return (
    <CartContext.Provider value={{ cartItems, addItemToCart, removeItemFromCart, updateItemQuantity, clearCart, getCartTotal, getTotalItems }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}; 