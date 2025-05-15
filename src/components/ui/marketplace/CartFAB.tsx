import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext'; // Assuming CartContext is for marketplace
import { Button, Badge } from '@heroui/react';
import { ShoppingCart } from 'lucide-react';

const MarketplaceCartFAB: React.FC = () => {
  const { getTotalItems } = useCart();
  const navigate = useNavigate();
  const totalItems = getTotalItems();

  const handleCartClick = () => {
    navigate('/student/marketplace/cart'); // Navigate to the marketplace cart page
  };

  if (totalItems === 0) {
    // Optionally, don't show the FAB if the cart is empty, or show it differently
    // For now, let's always show it but it will navigate to an empty cart.
  }

  return (
    <Button
      isIconOnly
      color="primary"
      variant="solid"
      className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg p-3 h-14 w-14"
      onPress={handleCartClick}
      aria-label="Open Marketplace Cart"
    >
      <Badge content={totalItems > 0 ? String(totalItems) : ''} color="danger" isInvisible={totalItems === 0} placement="top-right">
        <ShoppingCart size={24} />
      </Badge>
    </Button>
  );
};

export default MarketplaceCartFAB; 