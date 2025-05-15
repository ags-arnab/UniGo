import React, { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button, Card, CardBody, CardHeader, CardFooter, Image, Input, Divider, addToast } from '@heroui/react';
import { Link, useNavigate } from 'react-router-dom';
import { TrashIcon } from '@heroicons/react/24/outline';

// Type for the items expected by the create_marketplace_order function
interface OrderItemInput {
  product_id: string;
  quantity: number;
  selected_attributes?: Record<string, any> | null; // Match the SQL function type
}

const CartPage: React.FC = () => {
  const { cartItems, removeItemFromCart, updateItemQuantity, getCartTotal, getTotalItems, clearCart } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // For now, assume a single storefront in the cart. 
  // A more robust solution would group items by storefront if multi-store carts are allowed.
  const currentStorefrontId = cartItems.length > 0 ? cartItems[0].storefront_id : null;

  const handleCheckout = async () => {
    if (!user || !profile) {
      addToast({ title: 'Authentication Error', description: 'You must be logged in to checkout.', color: 'danger' });
      navigate('/auth/login');
      return;
    }
    if (cartItems.length === 0) {
      addToast({ title: 'Empty Cart', description: 'Your cart is empty.', color: 'warning' });
      return;
    }
    if (!currentStorefrontId) {
      addToast({ title: 'Cart Error', description: 'Cannot determine storefront for checkout.', color: 'danger' });
      return;
    }

    setIsCheckingOut(true);

    const orderItemsInput: OrderItemInput[] = cartItems.map(item => ({
      product_id: item.id,
      quantity: item.quantityInCart,
      selected_attributes: item.attributes, // Assuming product attributes are the selected ones for now
    }));

    try {
      const { error: rpcError } = await supabase.rpc('create_marketplace_order', {
        p_student_user_id: user.id,
        p_storefront_id: currentStorefrontId,
        p_items: orderItemsInput,
        p_total_order_price: getCartTotal(),
        // p_shipping_address: null, // Add if shipping is implemented
      });

      if (rpcError) throw rpcError;

      addToast({ title: 'Order Placed!', description: 'Your order has been successfully placed.', color: 'success' });
      clearCart();
      // Potentially fetch and update user balance from profile if not automatically updated by context listener
      navigate('/student/orders'); // Or a marketplace order confirmation page
    } catch (err: any) {
      console.error('Checkout error:', err);
      addToast({ title: 'Checkout Failed', description: err.message || 'Could not place your order.', color: 'danger' });
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold">Your Shopping Cart</h1>
        </CardHeader>
        <CardBody>
          {cartItems.length === 0 ? (
            <p>Your cart is empty. <Link to="/student/marketplace" className="text-primary hover:underline">Continue shopping?</Link></p>
          ) : (
            <div className="space-y-4">
              {cartItems.map(item => (
                <Card key={item.id} className="flex flex-row items-center gap-4 p-4" shadow="sm">
                  <Image 
                    src={item.images && item.images.length > 0 ? item.images[0] : 'https://via.placeholder.com/100?text=No+Image'} 
                    alt={item.name} 
                    width={100} 
                    height={100} 
                    className="rounded-md object-cover aspect-square"
                  />
                  <div className="flex-grow">
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-600">Price: ${item.price.toFixed(2)}</p>
                    {/* Add display for selected_attributes if relevant */}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number"
                      value={String(item.quantityInCart)}
                      onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value, 10) || 0)}
                      min="1"
                      max={item.stock_quantity ?? undefined} // Use product stock as max
                      className="w-20"
                      size="sm"
                    />
                    <Button isIconOnly variant="light" color="danger" onPress={() => removeItemFromCart(item.id)}>
                      <TrashIcon className="w-5 h-5" />
                    </Button>
                  </div>
                  <p className="font-semibold w-24 text-right">
                    ${(item.price * item.quantityInCart).toFixed(2)}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </CardBody>
        {cartItems.length > 0 && (
          <CardFooter className="flex flex-col items-end gap-4 pt-4 border-t">
            <div className="text-xl font-bold">
              Total Items: <span className="text-primary">{getTotalItems()}</span>
            </div>
            <div className="text-2xl font-bold">
              Grand Total: <span className="text-primary">${getCartTotal().toFixed(2)}</span>
            </div>
            <Divider className="my-2"/>
            <div className="flex gap-2">
                <Button variant="flat" color="danger" onPress={clearCart} isDisabled={isCheckingOut}>Clear Cart</Button>
                <Button color="primary" onPress={handleCheckout} isLoading={isCheckingOut} className="min-w-[120px]">
                    Checkout
                </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default CartPage; 