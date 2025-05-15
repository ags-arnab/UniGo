import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardBody, CardHeader, Spinner, Button, Chip } from '@heroui/react';
import { ArrowLeft, ShoppingBag, ExternalLink } from 'lucide-react';

// Define interfaces for order data
interface ProductSnapshot {
  name?: string;
  image_url?: string;
  storefront_name?: string;
  id?: string;
  price?: number;
  category?: string;
  description?: string;
}

interface MarketplaceOrderItem {
  id: string;
  marketplace_product_id: string | null;
  quantity: number;
  price_at_purchase: number;
  product_snapshot: ProductSnapshot | null;
  fetchedProduct?: {
    name: string;
    images: string[] | null;
    storefront_name?: string;
  } | null;
}

interface MarketplaceOrder {
  id: string;
  created_at: string;
  total_price: number;
  status: string;
  storefront_id: string;
  storefront_name?: string;
  marketplace_order_items: MarketplaceOrderItem[];
}

const StudentMarketplaceOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) {
        setLoading(false);
        setError('User not authenticated.');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // First, fetch the basic order details
        const { data: orderData, error: orderError } = await supabase
          .from('marketplace_orders')
          .select(`
            id,
            created_at,
            total_price,
            status,
            storefront_id,
            marketplace_order_items (
              id,
              marketplace_product_id,
              quantity,
              price_at_purchase,
              product_snapshot
            )
          `)
          .eq('student_user_id', user.id)
          .order('created_at', { ascending: false });

        if (orderError) throw orderError;

        // Then, for each order, fetch the storefront name
        const ordersWithDetails = await Promise.all((orderData || []).map(async (order) => {
          // Get the storefront name
          let storefront_name;
          try {
            const { data: sfData } = await supabase
              .from('storefronts')
              .select('name')
              .eq('id', order.storefront_id)
              .single();
            
            if (sfData) {
              storefront_name = sfData.name;
            }
          } catch (e) {
            // If we can't get the storefront name from the database, try to get it from the product snapshot
            console.error('Error fetching storefront:', e);
          }

          // If storefront name is still undefined, try to get it from the first product's snapshot
          if (!storefront_name && order.marketplace_order_items?.length > 0) {
            storefront_name = order.marketplace_order_items[0].product_snapshot?.storefront_name;
          }

          // Now, enhance each item with product details if missing
          const enhancedItems = await Promise.all(order.marketplace_order_items.map(async (item) => {
            // If product snapshot is missing or incomplete and we have a product ID, fetch details
            if ((!item.product_snapshot || !item.product_snapshot.name) && item.marketplace_product_id) {
              try {
                const { data: productData, error: productError } = await supabase
                  .from('marketplace_products')
                  .select(`
                    name, 
                    images,
                    storefront:storefronts(name)
                  `)
                  .eq('id', item.marketplace_product_id)
                  .single();
                
                if (!productError && productData) {
                  // Handle storefront data safely
                  const storeData = productData.storefront as any; // Use any to bypass type checking temporarily
                  const storeName = Array.isArray(storeData) && storeData.length > 0
                    ? storeData[0]?.name
                    : typeof storeData === 'object' && storeData !== null
                      ? storeData.name
                      : undefined;
                      
                  // Add fetched product data
                  return {
                    ...item,
                    fetchedProduct: {
                      name: productData.name,
                      images: productData.images,
                      storefront_name: storeName
                    }
                  };
                }
              } catch (err) {
                console.error('Error fetching product details:', err);
              }
            }
            return item;
          }));

          return {
            ...order,
            storefront_name,
            marketplace_order_items: enhancedItems
          };
        }));

        setOrders(ordersWithDetails);
      } catch (err: any) {
        console.error('Error fetching marketplace orders:', err);
        setError(err.message || 'Failed to load orders.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const getStatusColor = (status: string): "primary" | "secondary" | "success" | "warning" | "danger" | "default" => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing':
      case 'pending_confirmation':
      case 'shipped': 
      case 'ready_for_pickup': return 'primary';
      case 'pending_payment': return 'warning';
      case 'cancelled_by_student':
      case 'cancelled_by_operator':
      case 'refunded': return 'danger';
      default: return 'default';
    }
  };

  const formatStatus = (status: string | null | undefined): string => {
    if (!status) return 'Unknown Status';
    return status.replace(/_/g, ' ');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Spinner label="Loading your orders..." size="lg" /></div>;
  }

  if (error) {
    return <div className="p-4 text-center text-danger-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex items-center mb-6">
        <Link to="/student/profile" className="mr-3 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <ArrowLeft size={20}/>
        </Link>
        <h1 className="text-2xl md:text-3xl font-semibold">My Marketplace Orders</h1>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-10">
            <ShoppingBag className="mx-auto h-20 w-20 text-gray-400 mb-4" />
            <p className="text-xl text-gray-600 dark:text-gray-400">You haven't placed any marketplace orders yet.</p>
            <Button as={Link} to="/student/marketplace" color="primary" className="mt-6">
                Browse Marketplace
            </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <Card key={order.id} shadow="md">
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-4 border-b dark:border-gray-700">
                <div>
                    <h2 className="text-lg font-semibold">Order ID: <span className="font-mono text-primary-600 dark:text-primary-400">{order.id.substring(0,8)}...</span></h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Placed on: {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Store: {order.storefront_name || 'N/A'}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <Chip color={getStatusColor(order.status)} variant="flat" className="capitalize">
                        {formatStatus(order.status)}
                    </Chip>
                    <p className="text-lg font-bold">Total: ${order.total_price.toFixed(2)}</p>
                </div>
              </CardHeader>
              <CardBody className="p-4">
                <h3 className="font-semibold mb-2 text-md">Items ({order.marketplace_order_items.length}):</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {order.marketplace_order_items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                      <img 
                        src={
                          item.product_snapshot?.image_url || 
                          (item.fetchedProduct?.images && item.fetchedProduct.images.length > 0 
                            ? item.fetchedProduct.images[0] 
                            : 'https://via.placeholder.com/60x60?text=N/A')} 
                        alt={(item.product_snapshot?.name || item.fetchedProduct?.name || 'Product Image')} 
                        className="w-12 h-12 object-cover rounded shadow-sm"
                      />
                      <div className="flex-grow">
                        <p className="font-medium truncate" 
                           title={item.product_snapshot?.name || item.fetchedProduct?.name}>
                           {item.product_snapshot?.name || item.fetchedProduct?.name || 'Product details not available'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Qty: {item.quantity} &bull; Price: ${item.price_at_purchase.toFixed(2)} each
                        </p>
                      </div>
                      <p className="font-semibold text-sm">${(item.quantity * item.price_at_purchase).toFixed(2)}</p>
                      {item.marketplace_product_id && (
                         <Button as={Link} to={`/student/marketplace/product/${item.marketplace_product_id}`} size="sm" variant="light" isIconOnly title="View Product">
                            <ExternalLink size={16}/>
                         </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentMarketplaceOrdersPage; 