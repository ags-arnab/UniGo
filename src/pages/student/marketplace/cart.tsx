import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart, CartItem } from '@/contexts/CartContext';
import { Button, Image, Input, Card, CardBody, CardHeader, Divider } from '@heroui/react';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from 'lucide-react';

const MarketplaceCartPage: React.FC = () => {
  const { cartItems, removeItemFromCart, updateItemQuantity, getCartTotal, getTotalItems, clearCart } = useCart();
  const navigate = useNavigate();

  const handleQuantityChange = (item: CartItem, newQuantity: number) => {
    if (newQuantity < 1) {
      // Optionally, ask for confirmation before removing if quantity becomes 0
      removeItemFromCart(item.id);
    } else if (item.stock_quantity != null && newQuantity > item.stock_quantity) {
      // Toast notification is handled by CartContext, but we could add one here too if needed
      updateItemQuantity(item.id, item.stock_quantity); 
    } else {
      updateItemQuantity(item.id, newQuantity);
    }
  };

  const handleProceedToCheckout = () => {
    // Navigate to the checkout page (to be created)
    navigate('/student/marketplace/checkout');
  };

  if (cartItems.length === 0) {
    return (
      <div className="p-4 md:p-8 text-center">
        <ShoppingBag className="mx-auto h-24 w-24 text-gray-400 mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Your Marketplace Cart is Empty</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Looks like you haven't added any products yet. Explore the marketplace and find something you like!</p>
        <Button color="primary" onPress={() => navigate('/student/marketplace')} startContent={<ArrowLeft size={18}/>}>
          Continue Shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold">Your Cart ({getTotalItems()} items)</h1>
        <Button variant="light" color="danger" onPress={clearCart} startContent={<Trash2 size={16}/>} isDisabled={cartItems.length === 0}>
          Clear Cart
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items List - takes 2/3 width on large screens */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map(item => (
            <Card key={item.id} shadow="sm">
              <CardBody>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <Image 
                    src={item.images && item.images.length > 0 ? item.images[0] : 'https://via.placeholder.com/100x100?text=No+Image'} 
                    alt={item.name} 
                    width={100} 
                    height={100} 
                    className="object-cover rounded-md aspect-square" 
                  />
                  <div className="flex-grow">
                    <h2 className="text-lg font-semibold truncate" title={item.name}>{item.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Price: ${item.price.toFixed(2)}</p>
                    {item.stock_quantity != null && (
                      <p className={`text-xs ${item.quantityInCart > item.stock_quantity ? 'text-danger-500' : 'text-gray-500 dark:text-gray-400'}`}>
                        Stock: {item.stock_quantity}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <Button isIconOnly variant="flat" size="sm" onPress={() => handleQuantityChange(item, item.quantityInCart - 1)}>
                      <Minus size={16} />
                    </Button>
                    <Input 
                      type="number"
                      value={String(item.quantityInCart)}
                      onValueChange={(val) => handleQuantityChange(item, parseInt(val, 10) || 1)}
                      className="w-16 text-center"
                      aria-label={`Quantity for ${item.name}`}
                      min={1}
                      max={item.stock_quantity != null ? item.stock_quantity : undefined}
                    />
                    <Button isIconOnly variant="flat" size="sm" onPress={() => handleQuantityChange(item, item.quantityInCart + 1)} isDisabled={item.stock_quantity != null && item.quantityInCart >= item.stock_quantity}>
                      <Plus size={16} />
                    </Button>
                  </div>
                  <div className="ml-auto sm:ml-4 mt-2 sm:mt-0">
                    <p className="font-semibold text-lg">${(item.price * item.quantityInCart).toFixed(2)}</p>
                  </div>
                  <Button isIconOnly variant="light" color="danger" size="sm" className="mt-2 sm:mt-0" onPress={() => removeItemFromCart(item.id)}>
                    <Trash2 size={18} />
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Order Summary - takes 1/3 width on large screens */}
        <div className="lg:col-span-1">
          <Card shadow="md">
            <CardHeader>
              <h2 className="text-xl font-semibold">Order Summary</h2>
            </CardHeader>
            <Divider />
            <CardBody className="space-y-3">
              <div className="flex justify-between">
                <p>Subtotal ({getTotalItems()} items)</p>
                <p className="font-medium">${getCartTotal().toFixed(2)}</p>
              </div>
              <div className="flex justify-between">
                <p>Shipping</p>
                <p className="font-medium">Free</p> {/* Or calculate later */}
              </div>
              <Divider />
              <div className="flex justify-between text-lg font-semibold">
                <p>Total</p>
                <p>${getCartTotal().toFixed(2)}</p>
              </div>
              <Button 
                color="primary" 
                fullWidth 
                size="lg" 
                onPress={handleProceedToCheckout}
                startContent={<ShoppingBag size={20}/>}
              >
                Proceed to Checkout
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceCartPage;