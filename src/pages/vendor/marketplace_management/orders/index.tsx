import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button, Select, SelectItem, Card, CardBody, CardHeader, addToast, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, getKeyValue, Chip, Input, Spinner, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { Search, Eye } from 'lucide-react';

// From 036_create_marketplace_module.sql
export type MarketplaceOrderStatus = 
  | 'pending_payment'
  | 'processing'
  | 'ready_for_pickup'
  | 'shipped'
  | 'delivered'
  | 'cancelled_by_student'
  | 'cancelled_by_operator'
  | 'refunded';

export interface MarketplaceOrderItem {
  id: string;
  marketplace_order_id: string;
  marketplace_product_id: string;
  quantity: number;
  price_at_purchase: number;
  selected_attributes?: Record<string, any> | null;
  product_snapshot?: Record<string, any> | null;
  product?: {
    name: string;
    images?: string[] | null;
  }; // For display
}

export interface StudentProfile {
  id: string;
  full_name?: string;
  email?: string;
  student_id?: string;
  avatar_url?: string;
  phone_number?: string;
}

export interface MarketplaceOrder {
  id: string;
  student_user_id: string;
  storefront_id: string;
  total_price: number;
  shipping_address?: Record<string, any> | null;
  status: MarketplaceOrderStatus | string;
  created_at: string;
  updated_at: string;
  student_notes?: string;
  operator_notes?: string;
  student_profile?: StudentProfile;
  order_items?: MarketplaceOrderItem[];
  // Add a flag to track loading state for student profile
  isLoadingProfile?: boolean;
}

const statusColors: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
  pending_payment: "warning",
  processing: "primary",
  ready_for_pickup: "secondary",
  shipped: "secondary",
  delivered: "success",
  cancelled_by_student: "danger",
  cancelled_by_operator: "danger",
  refunded: "default",
};

const MarketplaceOrderManagement: React.FC = () => {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<MarketplaceOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [storefrontId, setStorefrontId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<MarketplaceOrder | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Function to fetch student profile by UUID
  const fetchStudentProfile = async (orderId: string, studentId: string) => {
    // Mark this order as loading profile
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId ? { ...order, isLoadingProfile: true } : order
      )
    );
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, student_id')
        .eq('id', studentId)
        .single();
        
      if (error) throw error;
      
      // Update the order with fetched profile
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { 
                ...order, 
                student_profile: data as StudentProfile, 
                isLoadingProfile: false 
              } 
            : order
        )
      );
      
      // Also update filtered orders
      setFilteredOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { 
                ...order, 
                student_profile: data as StudentProfile, 
                isLoadingProfile: false 
              } 
            : order
        )
      );
    } catch (err) {
      console.error('Error fetching student profile:', err);
      // Mark as not loading even if there was an error
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, isLoadingProfile: false } : order
        )
      );
    }
  };

  useEffect(() => {
    const fetchStorefrontAndOrders = async () => {
      if (!user || !profile || profile.role !== 'marketplace_operator') {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // First get the operator's storefront
        const { data: sfData, error: sfError } = await supabase
          .from('storefronts')
          .select('id')
          .eq('operator_id', user.id)
          .single();

        if (sfError || !sfData) {
          addToast({ title: 'Error', description: 'Storefront not found.', color: 'danger' });
          throw sfError || new Error('Storefront not found for operator');
        }
        setStorefrontId(sfData.id);

        // Use the new database function to get orders with complete student details
        const { data: orderData, error: orderError } = await supabase
          .rpc('get_marketplace_orders_with_student_details', {
            p_storefront_id: sfData.id
          });
        
        if (orderError) {
          console.error('Error fetching orders with function:', orderError);
          throw orderError;
        }

        // Parse the returned objects properly
        const parsedOrders = orderData.map((order: any) => ({
          ...order,
          student_profile: typeof order.student_profile === 'string' 
            ? JSON.parse(order.student_profile) 
            : order.student_profile,
          order_items: typeof order.order_items === 'string'
            ? JSON.parse(order.order_items)
            : order.order_items
        }));

        setOrders(parsedOrders as MarketplaceOrder[]);
        setFilteredOrders(parsedOrders as MarketplaceOrder[]);

      } catch (err: any) {
        console.error('Error fetching orders:', err);
        addToast({ title: 'Fetch Error', description: err.message || 'Could not load orders.', color: 'danger' });
      } finally {
        setLoading(false);
      }
    };
    
    fetchStorefrontAndOrders();
  }, [user, profile]);

  // Fetch missing student profiles after initial load
  useEffect(() => {
    const fetchMissingProfiles = async () => {
      for (const order of orders) {
        // If we have the student_user_id but no profile data, fetch it
        if (order.student_user_id && (!order.student_profile || !order.student_profile.full_name)) {
          await fetchStudentProfile(order.id, order.student_user_id);
        }
      }
    };
    
    if (!loading && orders.length > 0) {
      fetchMissingProfiles();
    }
  }, [loading, orders.length]); // Only run when orders are first loaded

  // Apply search filter
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOrders(orders);
      return;
    }
    
    const lowercasedSearch = searchTerm.toLowerCase();
    const filtered = orders.filter(order => 
      order.id.toLowerCase().includes(lowercasedSearch) || 
      (order.student_profile?.full_name && order.student_profile.full_name.toLowerCase().includes(lowercasedSearch)) ||
      (order.student_profile?.email && order.student_profile.email.toLowerCase().includes(lowercasedSearch)) ||
      (order.student_profile?.student_id && order.student_profile.student_id.toLowerCase().includes(lowercasedSearch)) ||
      (order.student_profile?.phone_number && order.student_profile.phone_number.toLowerCase().includes(lowercasedSearch)) ||
      order.student_user_id.toLowerCase().includes(lowercasedSearch)
    );
    
    setFilteredOrders(filtered);
  }, [orders, searchTerm]);

  const handleStatusChange = async (orderId: string, newStatus: MarketplaceOrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const { data, error } = await supabase
        .from('marketplace_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      
      // Update the order status while preserving other properties
      const orderToUpdate = orders.find(o => o.id === orderId);
      if (!orderToUpdate) throw new Error('Order not found in state');

      const updatedOrder = { 
        ...orderToUpdate,
        status: newStatus,
        updated_at: data.updated_at
      };
      
      setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? updatedOrder : o));
      setFilteredOrders(prevOrders => prevOrders.map(o => o.id === orderId ? updatedOrder : o));
      
      addToast({ title: 'Success', description: `Order ${orderId.substring(0,8)} status updated to ${newStatus}.`, color: 'success' });
    } catch (err: any) {
      addToast({ title: 'Update Error', description: `Failed to update order status: ${err.message}`, color: 'danger' });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleViewDetails = (order: MarketplaceOrder) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const formatAddress = (address: any) => {
    if (!address) return 'No address provided';
    
    try {
      const addressObj = typeof address === 'string' ? JSON.parse(address) : address;
      return Object.entries(addressObj)
        .filter(([_, value]) => value)
        .map(([_, value]) => value)
        .join(', ');
    } catch (e) {
      return String(address);
    }
  };

  const orderStatusOptions: MarketplaceOrderStatus[] = [
    'pending_payment', 'processing', 'ready_for_pickup', 'shipped',
    'delivered', 'cancelled_by_operator', 'refunded' // Student cancellation handled by student
  ];

  if (loading) return <p>Loading orders...</p>;
  if (!profile || profile.role !== 'marketplace_operator') return <p>Not authorized.</p>;
  if (!storefrontId && !loading) return <p>Storefront not found. Cannot load orders.</p>;
  
  const columns = [
    { key: "id", label: "Order ID" },
    { key: "student", label: "Student" },
    { key: "student_id", label: "Student ID" },
    { key: "total_price", label: "Total" },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Date" },
    { key: "actions", label: "Actions" },
  ];

  return (
    <div className="p-4 md:p-6">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">Manage Marketplace Orders</h1>
        </CardHeader>
        <CardBody>
          {/* Search Bar */}
          <div className="mb-6">
            <Input
              placeholder="Search by order ID, student name, email, or student ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              startContent={<Search className="text-gray-400" size={18} />}
              isClearable
              onClear={() => setSearchTerm('')}
            />
          </div>

          {filteredOrders.length === 0 && !loading && (
            <div className="text-center py-10">
              {searchTerm ? (
                <p className="mb-2 text-lg">No orders found matching "{searchTerm}".</p>
              ) : (
                <p>No orders found for your storefront.</p>
              )}
            </div>
          )}
          {filteredOrders.length > 0 && (
            <Table aria-label="Marketplace Orders Table">
              <TableHeader columns={columns}>
                {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
              </TableHeader>
              <TableBody items={filteredOrders}>
                {(item: MarketplaceOrder) => (
                  <TableRow key={item.id}>
                    {(columnKey) => {
                      if (columnKey === 'id') return <TableCell><pre className="text-xs">{item.id.substring(0,8)}...</pre></TableCell>;
                      
                      if (columnKey === 'student') {
                        if (item.isLoadingProfile) {
                          return <TableCell><Spinner size="sm" /></TableCell>;
                        }
                        return (
                          <TableCell>
                            {item.student_profile?.full_name || 
                              <Button 
                                size="sm" 
                                variant="light" 
                                color="primary" 
                                onPress={() => fetchStudentProfile(item.id, item.student_user_id)}
                              >
                                Load Info
                              </Button>
                            }
                          </TableCell>
                        );
                      }
                      
                      if (columnKey === 'student_id') {
                        if (item.isLoadingProfile) {
                          return <TableCell><Spinner size="sm" /></TableCell>;
                        }
                        return <TableCell>{item.student_profile?.student_id || 'N/A'}</TableCell>;
                      }
                      
                      if (columnKey === 'total_price') return <TableCell>${item.total_price.toFixed(2)}</TableCell>;
                      if (columnKey === 'status') {
                        const statusKey = String(item.status);
                        return (
                          <TableCell>
                            <Chip 
                              color={statusColors[statusKey] || "default"} 
                              size="sm"
                            >
                              {String(statusKey).replace(/_/g, ' ')}
                            </Chip>
                          </TableCell>
                        );
                      }
                      if (columnKey === 'created_at') return <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>;
                      if (columnKey === 'actions') return (
                        <TableCell className="flex gap-2">
                          <Button
                            size="sm"
                            variant="flat"
                            color="primary"
                            startContent={<Eye size={16} />}
                            onPress={() => handleViewDetails(item)}
                          >
                            View Details
                          </Button>
                          <Select 
                            aria-label="Update order status"
                            placeholder="Change status"
                            selectedKeys={[String(item.status)]}
                            onSelectionChange={(keys) => handleStatusChange(item.id, Array.from(keys)[0] as MarketplaceOrderStatus)}
                            size="sm"
                            isDisabled={updatingOrderId === item.id}
                          >
                            {orderStatusOptions.map((statusOpt) => (
                              <SelectItem key={statusOpt}>
                                {statusOpt.replace(/_/g, ' ')}
                              </SelectItem>
                            ))}
                          </Select>
                        </TableCell>
                      );
                      return <TableCell>{getKeyValue(item, columnKey)}</TableCell>;
                    }}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal 
        isOpen={isDetailsModalOpen} 
        onOpenChange={setIsDetailsModalOpen}
        size="2xl"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <h3 className="text-lg font-semibold">Order Details</h3>
              </ModalHeader>
              <ModalBody>
                {selectedOrder && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Order Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Order ID:</p>
                          <p className="font-mono">{selectedOrder.id}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Date Placed:</p>
                          <p>{new Date(selectedOrder.created_at).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Status:</p>
                          <Chip color={statusColors[selectedOrder.status] || "default"} size="sm">
                            {String(selectedOrder.status).replace(/_/g, ' ')}
                          </Chip>
                        </div>
                        <div>
                          <p className="text-gray-500">Total Amount:</p>
                          <p className="font-semibold">${selectedOrder.total_price.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Student Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Name:</p>
                          <p>{selectedOrder.student_profile?.full_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Student ID:</p>
                          <p>{selectedOrder.student_profile?.student_id || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Email:</p>
                          <p>{selectedOrder.student_profile?.email || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Phone:</p>
                          <p>{selectedOrder.student_profile?.phone_number || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Shipping Address</h4>
                      <p className="text-sm">{formatAddress(selectedOrder.shipping_address)}</p>
                    </div>

                    {selectedOrder.student_notes && (
                      <div>
                        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Student Notes</h4>
                        <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded">
                          {selectedOrder.student_notes}
                        </p>
                      </div>
                    )}

                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Order Items</h4>
                      <div className="space-y-2">
                        {selectedOrder.order_items?.map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            <div>
                              <p className="font-medium">{item.product_snapshot?.name || 'Product Name Not Available'}</p>
                              <p className="text-gray-500">Quantity: {item.quantity}</p>
                            </div>
                            <p className="font-semibold">${item.price_at_purchase.toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Close</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default MarketplaceOrderManagement;
