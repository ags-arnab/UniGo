import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart, CartItem } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button, Textarea, Card, CardBody, CardHeader, Divider, Spinner, addToast, Alert } from '@heroui/react';
import { ShoppingBag, ArrowLeft, AlertCircle } from 'lucide-react';

// Interface for items to be passed to the Supabase function
interface OrderItemInput {
  product_id: string;
  quantity: number;
  selected_attributes?: Record<string, string | number | boolean> | null;
}

const MarketplaceCheckoutPage: React.FC = () => {
  const { cartItems, getCartTotal, getTotalItems, clearCart } = useCart();
  const { user, profile } = useAuth(); // To get student_user_id and potentially current balance for client-side check
  const navigate = useNavigate();

  const [shippingAddress, setShippingAddress] = useState<string>('');
  const [studentNotes, setStudentNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlaceOrder = async () => {
    if (!user || !profile) {
      setError('You must be logged in to place an order.');
      addToast({title: 'Authentication Error', description: 'Please log in first.', color: 'danger'});
      return;
    }
    if (cartItems.length === 0) {
      setError('Your cart is empty.');
      return;
    }

    // Basic client-side balance check (optional, server will do the definitive check)
    const totalAmount = getCartTotal();
    if (profile.balance != null && profile.balance < totalAmount) {
        setError(`Insufficient balance. You need $${totalAmount.toFixed(2)} but have $${profile.balance.toFixed(2)}.`);
        addToast({title: 'Insufficient Balance', description: `Your current balance is $${profile.balance.toFixed(2)}. Required: $${totalAmount.toFixed(2)}.`, color: 'danger'});
        return;
    }

    setIsLoading(true);
    setError(null);

    const orderItemsInput: OrderItemInput[] = cartItems.map(item => ({
      product_id: item.id,
      quantity: item.quantityInCart,
      selected_attributes: item.selectedAttributes || null
    }));

    // Assuming all items are from the same storefront for simplicity in this call.
    // The `create_marketplace_order` function expects a single storefront_id.
    // A more complex cart might group items by storefront.
    const storefrontId = cartItems.length > 0 ? cartItems[0].storefront_id : null;
    if (!storefrontId) {
        setError('Could not determine storefront for the order. Cart items might be inconsistent.');
        addToast({title: 'Order Error', description: 'Storefront ID missing from cart items.', color: 'danger'});
        setIsLoading(false);
        return;
    }

    const shippingAddressJson = {
        fullAddress: shippingAddress, // Example structure
        // Can be expanded: street, city, postalCode, etc.
    };

    try {
      const { data: orderData, error: orderError } = await supabase.rpc('create_marketplace_order', {
        p_student_user_id: user.id,
        p_storefront_id: storefrontId, 
        p_items: orderItemsInput,
        p_total_order_price: totalAmount, // Client-calculated total for server-side validation
        p_shipping_address: shippingAddress.trim() ? shippingAddressJson : null,
        p_student_notes: studentNotes.trim() || null,
      });

      if (orderError) throw orderError;

      addToast({ title: 'Order Placed!', description: `Your order #${orderData} has been successfully placed.`, color: 'success' });
      clearCart();
      // Navigate to a dedicated order confirmation page or order history
      navigate(`/student/profile/marketplace-orders`); // Or to a specific order detail page: /student/marketplace/orders/${orderData}

    } catch (err: any) {
      console.error('Error placing marketplace order:', err);
      const errorMessage = err.details || err.message || 'Failed to place order. Please try again.';
      setError(errorMessage);
      addToast({ title: 'Order Failed', description: errorMessage, color: 'danger' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile && !user) {
    return <div className="p-8 text-center"><Spinner label="Loading user..."/></div>
  }

  if (cartItems.length === 0 && !isLoading) {
    return (
      <div className="p-4 md:p-8 text-center">
        <ShoppingBag className="mx-auto h-24 w-24 text-gray-400 mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Your Cart is Empty</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">No items to checkout. Add some products first!</p>
        <Button color="primary" onPress={() => navigate('/student/marketplace/cart')} startContent={<ArrowLeft size={18}/>}>
          Back to Cart
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex items-center mb-6">
        <Button variant="light" isIconOnly onPress={() => navigate('/student/marketplace/cart')} className="mr-2">
            <ArrowLeft size={20}/>
        </Button>
        <h1 className="text-2xl md:text-3xl font-semibold">Checkout</h1>
      </div>

      {error && (
        <Alert color="danger" icon={<AlertCircle />} className="mb-4">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Summary - Left side */}
        <div className="lg:col-span-2">
          <Card shadow="sm">
            <CardHeader>
              <h2 className="text-xl font-semibold">Order Summary ({getTotalItems()} items)</h2>
            </CardHeader>
            <Divider/>
            <CardBody className="space-y-3">
              {cartItems.map(item => (
                <div key={item.id} className="flex justify-between items-center py-2">
                  <div>
                    <p className="font-medium">{item.name} (x{item.quantityInCart})</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Unit Price: ${item.price.toFixed(2)}</p>
                  </div>
                  <p className="font-semibold">${(item.price * item.quantityInCart).toFixed(2)}</p>
                </div>
              ))}
              <Divider/>
              <div className="flex justify-between font-bold text-lg pt-2">
                <p>Total Amount</p>
                <p>${getCartTotal().toFixed(2)}</p>
              </div>
            </CardBody>
          </Card>
          
          <Card shadow="sm" className="mt-6">
            <CardHeader>
                <h2 className="text-xl font-semibold">Shipping / Pickup Information</h2>
            </CardHeader>
            <CardBody>
                <Textarea
                    label="Shipping Address or Pickup Instructions"
                    value={shippingAddress}
                    onValueChange={setShippingAddress}
                    placeholder="Enter your full shipping address if applicable, or any specific pickup arrangements/notes..."
                    rows={4}
                    description="If this is a digital product or campus pickup, please specify."
                />
            </CardBody>
          </Card>

          <Card shadow="sm" className="mt-6">
            <CardHeader>
                <h2 className="text-xl font-semibold">Order Notes (Optional)</h2>
            </CardHeader>
            <CardBody>
                <Textarea
                    label="Notes for the Seller"
                    value={studentNotes}
                    onValueChange={setStudentNotes}
                    placeholder="Any special requests or notes for the seller?"
                    rows={3}
                />
            </CardBody>
          </Card>
        </div>

        {/* Place Order - Right side */}
        <div className="lg:col-span-1">
          <Card shadow="md" className="sticky top-24">
            <CardHeader>
              <h2 className="text-xl font-semibold">Confirm Purchase</h2>
            </CardHeader>
            <Divider />
            <CardBody className="space-y-4">
                {profile && profile.balance != null && (
                     <div className="p-3 bg-blue-50 dark:bg-blue-800/30 rounded-md">
                        <p className="text-sm text-blue-700 dark:text-blue-300">Your current balance:</p>
                        <p className="text-xl font-semibold text-blue-800 dark:text-blue-200">${profile.balance.toFixed(2)}</p>
                    </div>
                )}
              <div className="flex justify-between text-lg font-semibold">
                <p>Order Total:</p>
                <p>${getCartTotal().toFixed(2)}</p>
              </div>
              {profile && profile.balance != null && getCartTotal() > profile.balance && (
                <Alert color="warning" icon={<AlertCircle size={20}/>} className="items-start">
                    <p className="font-semibold">Potential Issue</p>
                    <p className="text-sm">Your order total exceeds your current balance. The transaction will likely fail unless your balance is updated.</p>
                </Alert>
              )}
              <Button 
                color="primary" 
                fullWidth 
                size="lg" 
                onPress={handlePlaceOrder}
                isLoading={isLoading}
                startContent={<ShoppingBag size={20}/>}
              >
                {isLoading ? 'Processing Order...' : 'Place Order & Pay'}
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceCheckoutPage; 