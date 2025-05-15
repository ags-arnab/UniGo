import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardBody, CardFooter, Image, Button, Spinner, Input, Avatar, ButtonGroup } from '@heroui/react';
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
  const { addItemToCart } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from('marketplace_products')
          .select('*, storefronts(name)')
          .eq('is_available', true);

        if (searchTerm) {
          query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
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
  }, [searchTerm]);

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
    <div className="p-4 md:p-6">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map(product => (
          <Card 
            key={product.id} 
            className="h-full flex flex-col shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="relative h-48 overflow-hidden rounded-t-lg">
              <Image
                src={product.images && product.images.length > 0 ? product.images[0] : DEFAULT_PRODUCT_IMAGE}
                alt={product.name}
                className="w-full h-full object-cover"
                removeWrapper
              />
            </div>
            <CardBody className="p-4 flex-grow">
              <h3 className="font-semibold text-lg truncate" title={product.name}>{product.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Sold by: {product.storefronts?.name || 'Unknown Store'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 h-10 overflow-hidden text-ellipsis mt-2" title={product.description || ''}>
                {product.description || 'No description'}
              </p>
              <div className="flex justify-between items-center pt-3">
                <p className="text-lg font-bold text-primary-600 dark:text-primary-400">${product.price.toFixed(2)}</p>
                {product.stock_quantity != null && product.stock_quantity <= 0 && (
                  <p className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100">
                    Out of Stock
                  </p>
                )}
                {product.stock_quantity != null && product.stock_quantity > 0 && product.stock_quantity <= 10 && (
                  <p className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-100">
                    Low Stock ({product.stock_quantity})
                  </p>
                )}
              </div>
            </CardBody>
            <CardFooter className="p-4">
              <ButtonGroup fullWidth>
                <Button
                  as={Link}
                  to={`/student/marketplace/product/${product.id}`}
                  color="secondary"
                  variant="flat"
                  startContent={<Eye className="w-4 h-4" />}
                >
                  View Detail
                </Button>
                <Button 
                  color="primary" 
                  onPress={() => handleAddToCart(product)}
                  startContent={<ShoppingCart className="w-4 h-4" />}
                  isDisabled={product.stock_quantity != null && product.stock_quantity <= 0}
                >
                  Add to Cart
                </Button>
              </ButtonGroup>
            </CardFooter>
          </Card>
        ))}
      </div>
      <MarketplaceCartFAB />
    </div>
  );
};

export default StudentMarketplacePage;