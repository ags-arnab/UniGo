import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@heroui/react';
import { Badge } from '@heroui/react';
import { Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter } from '@heroui/react';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { useStudentCartStore } from '@/store/studentCartStore';
import { CafeteriaController } from '@/controllers/studentCafeteriaController';


export const CartFAB: React.FC = () => {
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const cartItems = useStudentCartStore((state) => state.cartItems);
  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = CafeteriaController.getCartTotal();

  const handleCheckout = () => {
    setIsDrawerOpen(false);
    // Introduce a small delay before navigating to allow state update
    setTimeout(() => {
      navigate('/student/cafeteria/checkout');
    }, 50); // 50ms delay, adjust if needed
  };

  const handleRemoveItem = (itemId: string) => {
    CafeteriaController.removeFromCart(itemId);
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    CafeteriaController.updateCartItemQuantity(itemId, newQuantity);
  };


  // Only render the FAB if there are items in the cart
  if (itemCount === 0) {
    return null;
  }

  return (
    <>
      {/* FAB Button triggers the drawer */}
      <div className="fixed bottom-6 right-6 z-50"> 
        <Badge 
          content={itemCount > 9 ? '9+' : itemCount} 
          color="danger" 
            placement="top-right"
            isInvisible={itemCount === 0}
            shape="circle"
          >
            <Button
              isIconOnly
              aria-label={`Shopping Cart with ${itemCount} items`}
              color="primary"
              variant="solid"
              className="rounded-full shadow-lg"
          size="lg"
          onClick={() => setIsDrawerOpen(true)}
        >
          <ShoppingCart size={24} />
        </Button>
      </Badge>
      </div>
      
      {/* Drawer Component */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        placement="right"
        // Removed unsupported props: closeOnOverlayClick, closeOnEsc
      >
        <DrawerContent className="max-h-[100vh] h-full flex flex-col w-full max-w-md">
          {/* Header with Title */}
          <DrawerHeader className="flex items-center justify-between p-4 border-b border-default-200">
            <h2 className="text-lg font-semibold text-default-800">Your Cart ({itemCount} items)</h2>
            {/* Removed explicit close button - relying on Drawer's onClose prop */}
          </DrawerHeader>

          {/* Scrollable Cart Items */}
          <DrawerBody className="flex-grow overflow-y-auto p-4">
          {cartItems.length === 0 ? (
            <p className="text-center text-default-500 py-8">Your cart is empty.</p>
          ) : (
            <div className="space-y-4">
              {cartItems.map(({ menuItem, quantity }) => (
                <div key={menuItem.id} className="flex items-center gap-4 border-b border-default-100 pb-4 last:border-b-0">
                  <div className="flex-grow">
                    <p className="font-medium text-default-800">{menuItem.name}</p>
                    <p className="text-sm text-default-600">৳{menuItem.price.toFixed(2)}</p>
                  </div>
                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1 border border-default-200 rounded-md">
                     <Button 
                       isIconOnly 
                       size="sm" 
                       variant="light" 
                       onClick={() => handleUpdateQuantity(menuItem.id, quantity - 1)}
                       aria-label={`Decrease quantity of ${menuItem.name}`}
                       disabled={quantity <= 1} // Disable minus if quantity is 1
                     >
                       <Minus size={14} />
                     </Button>
                     <span className="px-2 text-sm font-medium w-8 text-center">{quantity}</span>
                     <Button 
                       isIconOnly 
                       size="sm" 
                       variant="light" 
                       onClick={() => handleUpdateQuantity(menuItem.id, quantity + 1)}
                       aria-label={`Increase quantity of ${menuItem.name}`}
                     >
                       <Plus size={14} />
                     </Button>
                  </div>
                  {/* Remove Button */}
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    onClick={() => handleRemoveItem(menuItem.id)}
                    aria-label={`Remove ${menuItem.name} from cart`}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Receipt-like Price Breakdown Section */}
          {cartItems.length > 0 && (
            <div className="mt-6 pt-4 border-t border-dashed border-default-200 font-mono text-sm">
              <h3 className="mb-2 font-semibold text-default-700">Price Breakdown:</h3>
              <div className="space-y-1">
                {cartItems.map(({ menuItem, quantity }) => (
                  <div key={`${menuItem.id}-breakdown`} className="flex justify-between">
                    <span className="text-default-600 truncate pr-2">{menuItem.name} (x{quantity})</span>
                    <span className="text-default-800">৳{(menuItem.price * quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DrawerBody>

          {/* Footer with Total and Checkout */}
          {cartItems.length > 0 && (
            <DrawerFooter className="mt-auto border-t border-default-200 p-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-default-800">Total:</span>
                <span className="text-lg font-semibold text-primary">৳{totalPrice.toFixed(2)}</span>
              </div>
              <Button 
                color="primary" 
              className="w-full" 
              onClick={handleCheckout}
            >
              Proceed to Checkout
            </Button>
            {/* Removed Continue Shopping Button */}
          </DrawerFooter>
        )}
       </DrawerContent>
      </Drawer>
    </>
  );
};
