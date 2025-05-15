import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { MarketplaceProduct } from '../../vendor/marketplace_management/products'; // Re-use type
import { Button, Input, Card, CardBody, CardHeader, CardFooter, Spinner, Chip, Breadcrumbs, BreadcrumbItem, addToast, Select, SelectItem } from '@heroui/react';
import { useCart } from '@/contexts/CartContext'; // Import useCart

interface StorefrontDetails {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
}

const StorefrontViewPage: React.FC = () => {
  const { storefrontId } = useParams<{ storefrontId: string }>();
  const { addItemToCart } = useCart(); // Use the cart context
  
  const [storefront, setStorefront] = useState<StorefrontDetails | null>(null);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>(''); // Example filter
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchStorefrontAndProducts = async () => {
      if (!storefrontId) {
        setError('Storefront ID is missing.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Fetch storefront details
        const { data: sfData, error: sfError } = await supabase
          .from('storefronts')
          .select('id, name, description, logo_url, banner_url')
          .eq('id', storefrontId)
          .eq('is_active', true)
          .single();

        if (sfError || !sfData) {
          throw sfError || new Error('Storefront not found or is not active.');
        }
        setStorefront(sfData);

        // Fetch products for the storefront
        const { data: productData, error: productError } = await supabase
          .from('marketplace_products')
          .select('*')
          .eq('storefront_id', storefrontId)
          .eq('is_available', true);
          // Add order by, e.g., .order('name', { ascending: true });

        if (productError) throw productError;
        setProducts(productData || []);

        // Extract categories for filtering
        if (productData) {
          const uniqueCategories = Array.from(new Set(productData.map(p => p.category).filter(Boolean))) as string[];
          setCategories(uniqueCategories.sort());
        }

      } catch (err: any) {
        console.error('Error fetching storefront products:', err);
        setError(err.message || 'Could not load storefront information.');
      } finally {
        setLoading(false);
      }
    };
    fetchStorefrontAndProducts();
  }, [storefrontId]);

  const categoryOptions = [
    { key: '', label: 'All Categories' },
    ...categories.map(cat => ({ key: cat, label: cat }))
  ];

  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory ? p.category === filterCategory : true;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (product: MarketplaceProduct) => {
    // Check if the product belongs to the current storefront to prevent multi-store cart issues easily
    // This check is more of a safeguard if the cart logic itself doesn't enforce single-store carts.
    if (product.storefront_id !== storefrontId) {
        addToast({
            title: "Cart Error",
            description: "You can only add items from the same store to your cart at one time.",
            color: "danger"
        });
        return;
    }
    addItemToCart(product, 1); // addToast is now handled by CartContext
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner label="Loading store..." color="primary" size="lg"/>
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-danger p-8">Error: {error}</p>;
  }

  if (!storefront) {
    return <p className="text-center text-gray-500 p-8">Storefront not found.</p>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Breadcrumbs className="mb-4">
        <BreadcrumbItem as={Link} to="/student/marketplace">Marketplace</BreadcrumbItem>
        <BreadcrumbItem>{storefront.name}</BreadcrumbItem>
      </Breadcrumbs>

      <header className="mb-8 p-6 rounded-lg shadow-md" 
        style={{ backgroundImage: `url(${storefront.banner_url || 'https://via.placeholder.com/1200x300?text=Welcome'})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="bg-black bg-opacity-50 p-6 rounded-md">
          {storefront.logo_url && <img src={storefront.logo_url} alt={`${storefront.name} logo`} className="h-20 w-20 rounded-full mb-4 border-2 border-white shadow-lg"/>}
          <h1 className="text-4xl font-bold text-white mb-2">{storefront.name}</h1>
          <p className="text-lg text-gray-200">{storefront.description || 'Welcome to our store!'}</p>
        </div>
      </header>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-center">
        <Input 
          placeholder={`Search products in ${storefront.name}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow"
          isClearable
          onClear={() => setSearchTerm('')}
        />
        {categories.length > 0 && (
          <Select 
            aria-label="Filter by category"
            placeholder="Filter by category"
            selectedKeys={filterCategory ? [filterCategory] : []}
            onSelectionChange={(keys) => setFilterCategory(Array.from(keys as Set<string>)[0])}
            className="w-full md:w-64"
            items={categoryOptions}
          >
            {(item) => (
              <SelectItem key={item.key}>
                {item.label}
              </SelectItem>
            )}
          </Select>
        )}
      </div>

      {/* Product Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <Card key={product.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="p-0 aspect-square overflow-hidden">
                <img 
                  src={product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/300x300?text=No+Image'} 
                  alt={product.name} 
                  className="w-full h-full object-cover"
                />
              </CardHeader>
              <CardBody className="p-4 flex-grow">
                <h3 className="text-lg font-semibold text-gray-800 mb-1 truncate" title={product.name}>{product.name}</h3>
                {product.category && <Chip size="sm" variant="flat" className="mb-2">{product.category}</Chip>}
                <p className="text-sm text-gray-600 mb-2 h-10 overflow-hidden text-ellipsis">{product.description || 'No description.'}</p>
                <p className="text-xl font-bold text-gray-900 mb-2">${product.price.toFixed(2)}</p>
              </CardBody>
              <CardFooter className="p-4 border-t">
                <Button color="primary" className="w-full" onPress={() => handleAddToCart(product)}>
                  Add to Cart
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-8">
          {searchTerm || filterCategory ? 'No products match your current filters.' : 'This store has no products available at the moment.'}
        </p>
      )}
    </div>
  );
};

export default StorefrontViewPage; 