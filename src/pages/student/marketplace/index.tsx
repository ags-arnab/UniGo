import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardBody, CardFooter, Image, Button, Spinner, Input, Avatar, ButtonGroup, Chip } from '@heroui/react';
import { ShoppingBag, Search, Store, ShoppingCart, Eye } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import MarketplaceCartFAB from '@/components/ui/marketplace/CartFAB';
import StorefrontsSlider from '@/components/ui/marketplace/StorefrontsSlider';

// Define interfaces
interface Storefront {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  is_active: boolean;
  operator_id: string;
  created_at: string;
  updated_at: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  storefront_id: string;
  category: string | null;
  images: string[] | null;
  stock_quantity: number | null;
  attributes: Record<string, any> | null;
  is_available: boolean;
  storefronts?: { name: string };
}

// Default placeholder images (using general placeholders)
const DEFAULT_BANNER = 'https://via.placeholder.com/1200x400?text=Store+Banner';
const DEFAULT_LOGO = 'https://via.placeholder.com/150x150?text=Store+Logo';
const DEFAULT_PRODUCT_IMAGE = 'https://via.placeholder.com/300x300?text=No+Image';

const StudentMarketplacePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const { addItemToCart } = useCart();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from('marketplace_products')
          .select('*, storefronts(name)')
          .eq('is_available', true);

        if (debouncedSearchTerm) {
          query = query.or(`name.ilike.%${debouncedSearchTerm}%,description.ilike.%${debouncedSearchTerm}%`);
        }
        
        const { data, error: supaError } = await query.order('created_at', { ascending: false });

        if (supaError) throw supaError;
        setProducts(data as Product[] || []);
      } catch (err: any) {
        console.error('Error fetching marketplace products:', err);
        setError(err.message || 'Failed to load products.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [debouncedSearchTerm]);

  const handleAddToCart = (product: Product) => {
    addItemToCart(product, 1);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Spinner label="Loading products..." size="lg" /></div>;
  }

  if (error) {
    return <div className="p-4 text-center text-danger-500">Error: {error}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-default-800">Marketplace</h1>
        <p className="text-default-600 mb-6">Browse available university and student-run stores.</p>

        {/* Featured Storefronts Slider */}
        <div className="mb-8">
          <StorefrontsSlider />
        </div>
        <hr className="my-8 border-default-200" />
      </div>

      <div className="mb-6 flex flex-col md:flex-row gap-4 items-center">
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow"
          isClearable
          onClear={() => setSearchTerm('')}
          startContent={<Search className="w-5 h-5 text-default-400" />}
        />
      </div>

      <h2 className="text-2xl font-semibold mb-4">All Products</h2>

      {products.length === 0 && !loading && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-10">
          <ShoppingBag className="w-16 h-16 mx-auto text-default-300 mb-4"/>
          <p>No products found matching your search criteria.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => (
          <Card
            key={product.id}
            isPressable // Keep pressable for visual feedback if desired, but it won't navigate
            isHoverable
            className="h-full bg-content1/80 backdrop-blur-sm relative overflow-hidden flex flex-col"
          >
            {/* Link wraps image and body */}
            <Link to={`/student/marketplace/product/${product.id}`} className="flex flex-col flex-grow">
              {/* Item image with overlay for unavailable items */}
              <div className="relative w-full h-48 overflow-hidden">
                <Image
                  src={product.images && product.images.length > 0 ? product.images[0] : DEFAULT_PRODUCT_IMAGE}
                  alt={product.name}
                  className="h-full w-full object-cover object-center"
                  radius="none"
                  loading="lazy"
                />

                {/* Unavailability overlay */}
                {product.stock_quantity != null && product.stock_quantity <= 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Chip color="danger" variant="flat" className="text-sm font-semibold">
                      Out of Stock
                    </Chip>
                  </div>
                )}
              </div>

              {/* Content */}
              <CardBody className="flex flex-col gap-2">
                {/* Container for Name and Price */}
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-default-900 flex-grow">{product.name}</h3>
                  {/* Price Chip moved here */}
                  <Chip
                    color="success" // Changed color to success (green)
                    variant="solid"
                    size="sm"
                    className="text-default-800 font-bold shadow-sm flex-shrink-0"
                  >
                    ${product.price.toFixed(2)}
                  </Chip>
                </div>
                {/* Container for Store Name */}
                <div className="flex justify-end"> {/* New div to align store name to the right */}
                  <Chip color="default" variant="flat" size="sm" className="text-xs">
                    Sold by: {product.storefronts?.name || 'Unknown Store'}
                  </Chip>
                </div>

                <p className="text-sm text-default-600 line-clamp-3 flex-1">
                  {product.description || 'No description'}
                </p>
              </CardBody>
            </Link> {/* End of Link wrapping image and body */}

            {/* Footer remains outside the Link */}
            <CardFooter className="flex flex-col gap-3 border-t border-default-100 pt-3">
              {/* Row for Category and Stock */}
              <div className="flex items-center justify-between w-full gap-2">
                {/* Category Chip */}
                {product.category && (
                  <Chip
                    color="primary"
                    variant="flat"
                    size="sm"
                    className="text-xs flex-shrink-0"
                  >
                    {product.category}
                  </Chip>
                )}

                {/* Stock Chip (Conditional) */}
                {product.stock_quantity != null && product.stock_quantity > 0 && ( // Only show if available and stock is a number > 0
                  <Chip
                    color={product.stock_quantity <= 10 ? "warning" : "default"} // Warning color if stock is low (using 10 as threshold)
                    variant="flat"
                    size="sm"
                    className="text-xs"
                  >
                    {product.stock_quantity <= 10 ? `${product.stock_quantity} left` : `Stock: ${product.stock_quantity}`} {/* Different text for low stock */}
                  </Chip>
                )}
              </div>

              {/* Add to Cart Button */}
              {product.is_available && product.stock_quantity != null && product.stock_quantity > 0 && ( // Keep button conditional on availability and stock
                <Button
                  color="primary"
                  variant="ghost" // Default variant
                  size="md"
                  className="w-full transition-colors duration-300 sm:text-sm"
                  startContent={<ShoppingCart size={18} />}
                  onPress={() => handleAddToCart(product)}
                >
                  Add to Cart
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
      <MarketplaceCartFAB />
    </div>
  );
};

export default StudentMarketplacePage;