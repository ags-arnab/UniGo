import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useCart } from '@/contexts/CartContext';
import { Button, Card, CardBody, CardHeader, Divider, Image, Spinner, Chip, Badge, Textarea, addToast } from '@heroui/react';
import { ArrowLeft, ShoppingCart, Plus, Minus, StoreIcon } from 'lucide-react';

interface ProductDetails {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string | null;
  images: string[] | null;
  stock_quantity: number | null;
  is_available: boolean;
  attributes: Record<string, any> | null;
  storefront_id: string;
  storefront: {
    name: string;
    logo_url: string | null;
    description: string | null;
  }
}

const StudentMarketplaceProductDetails: React.FC = () => {
  const { productId, storefrontId } = useParams<{ productId: string, storefrontId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const { cartItems, addItemToCart, removeItemFromCart, updateItemQuantity } = useCart();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        setError('Product ID is missing');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('marketplace_products')
          .select(`
            *,
            storefront:storefronts (
              name,
              logo_url,
              description
            )
          `)
          .eq('id', productId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Product not found');

        setProduct(data as ProductDetails);
        
        // Set the first image as selected by default
        if (data.images && data.images.length > 0) {
          setSelectedImage(data.images[0]);
        }
        
      } catch (err: any) {
        console.error('Error fetching product:', err);
        setError(err.message || 'Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  // Handle quantity changes
  const incrementQuantity = () => {
    if (product?.stock_quantity && quantity >= product.stock_quantity) {
      addToast({ 
        title: 'Maximum Stock Reached', 
        description: `Only ${product.stock_quantity} item(s) available.`, 
        color: 'warning' 
      });
      return;
    }
    setQuantity(prev => prev + 1);
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  // Check if product is in cart
  const isInCart = (productId: string): boolean => {
    return cartItems.some(item => item.id === productId);
  };

  // Get item quantity from cart
  const getItemQuantity = (productId: string): number => {
    const item = cartItems.find(item => item.id === productId);
    return item ? item.quantityInCart : 0;
  };

  // Handle add to cart
  const handleAddToCart = () => {
    if (!product) return;

    if (isInCart(product.id)) {
      const currentQty = getItemQuantity(product.id);
      updateItemQuantity(product.id, currentQty + quantity);
      addToast({ 
        title: 'Cart Updated', 
        description: `Updated quantity for ${product.name}`, 
        color: 'success' 
      });
    } else {
      addItemToCart(product, quantity);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" label="Loading product details..." />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="text-center py-10">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Product</h1>
          <p className="mb-6 text-gray-600">{error || 'Product not found'}</p>
          <Button 
            color="primary" 
            onPress={() => navigate(-1)} 
            startContent={<ArrowLeft size={18} />}
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6">
        <Button 
          variant="light" 
          onPress={() => navigate(-1)} 
          startContent={<ArrowLeft size={18} />}
        >
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Images Section */}
        <div className="space-y-4">
          <Card shadow="sm">
            <CardBody className="p-0 relative">
              <Image
                src={selectedImage || (product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/600x400?text=No+Image')}
                alt={product.name}
                className="w-full max-h-[500px] object-contain rounded-lg bg-white"
              />
              {!product.is_available && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                  <Badge size="lg" color="danger" variant="solid">Currently Unavailable</Badge>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Thumbnail Images */}
          {product.images && product.images.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {product.images.map((img, index) => (
                <Button
                  key={index}
                  isIconOnly
                  variant={selectedImage === img ? "solid" : "flat"}
                  onPress={() => setSelectedImage(img)}
                  className="p-0 min-w-0"
                >
                  <Image
                    src={img}
                    alt={`Product image ${index + 1}`}
                    className="w-16 h-16 object-cover"
                  />
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details Section */}
        <div>
          <Card shadow="sm" className="mb-4">
            <CardBody className="p-6">
              <div className="mb-2">
                {product.category && (
                  <Chip color="secondary" variant="flat" size="sm" className="mb-2">{product.category}</Chip>
                )}
                <h1 className="text-2xl md:text-3xl font-bold mb-2">{product.name}</h1>
                <div className="flex flex-wrap gap-2 items-center mb-4">
                  <Link to={`/student/marketplace/stores/${product.storefront_id}`} className="flex items-center text-sm text-primary-600 hover:underline">
                    <StoreIcon size={16} className="mr-1" />
                    {product.storefront?.name || 'Store'}
                  </Link>
                  
                  {product.stock_quantity !== null && (
                    <Chip color={product.stock_quantity > 10 ? "success" : (product.stock_quantity > 0 ? "warning" : "danger")} variant="flat" size="sm">
                      {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}
                    </Chip>
                  )}
                </div>
              </div>

              <Divider className="my-4" />

              <div className="mb-6">
                <p className="text-3xl font-bold text-primary-600 mb-2">${product.price.toFixed(2)}</p>
                <div className="prose dark:prose-invert max-w-none">
                  <p>{product.description || 'No description available.'}</p>
                </div>
              </div>

              {/* Product Attributes */}
              {product.attributes && Object.keys(product.attributes).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Specifications</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(product.attributes).map(([key, value]) => (
                      <div key={key} className="flex flex-col">
                        <span className="text-sm text-gray-500 capitalize">{key}</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Divider className="my-4" />

              {/* Add to Cart Section */}
              <div className="mt-6">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center h-12 border rounded-lg overflow-hidden">
                    <Button 
                      isIconOnly 
                      variant="light" 
                      onPress={decrementQuantity} 
                      disabled={quantity <= 1}
                    >
                      <Minus size={16} />
                    </Button>
                    <span className="w-12 text-center">{quantity}</span>
                    <Button 
                      isIconOnly 
                      variant="light" 
                      onPress={incrementQuantity}
                      disabled={product.stock_quantity !== null && quantity >= product.stock_quantity}
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                  
                  <Button
                    color="primary"
                    size="lg"
                    startContent={<ShoppingCart />}
                    onPress={handleAddToCart}
                    disabled={!product.is_available || (product.stock_quantity !== null && product.stock_quantity <= 0)}
                    className="flex-1"
                  >
                    {isInCart(product.id) ? 'Update Cart' : 'Add to Cart'}
                  </Button>
                </div>
                
                <div className="mt-3">
                  <Button
                    as={Link}
                    to={`/student/marketplace/stores/${product.storefront_id}`}
                    color="secondary"
                    variant="flat"
                    size="lg"
                    startContent={<StoreIcon size={18} />}
                    className="w-full"
                  >
                    View Store
                  </Button>
                </div>
                
                {!product.is_available && (
                  <p className="text-sm text-danger-600 mt-2">This product is currently not available for purchase.</p>
                )}
                
                {product.stock_quantity !== null && product.stock_quantity <= 0 && (
                  <p className="text-sm text-danger-600 mt-2">This product is out of stock.</p>
                )}
              </div>
            </CardBody>
          </Card>
          
          {/* Store Information */}
          {product.storefront && (
            <Card shadow="sm">
              <CardHeader className="pb-0">
                <h3 className="text-lg font-semibold">About the Store</h3>
              </CardHeader>
              <CardBody>
                <div className="flex items-center gap-3 mb-2">
                  {product.storefront.logo_url ? (
                    <Image
                      src={product.storefront.logo_url}
                      alt={product.storefront.name}
                      className="w-12 h-12 object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <StoreIcon size={24} className="text-primary-600" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold">{product.storefront.name}</h4>
                    <Link 
                      to={`/student/marketplace/stores/${product.storefront_id}`} 
                      className="text-sm text-primary-600 hover:underline"
                    >
                      View Store
                    </Link>
                  </div>
                </div>
                {product.storefront.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {product.storefront.description}
                  </p>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentMarketplaceProductDetails;