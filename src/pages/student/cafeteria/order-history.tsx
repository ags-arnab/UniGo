import React, { useState, useEffect, useRef } from 'react';
import { CafeteriaController } from '@/controllers/studentCafeteriaController';
import { Order, OrderLineItem } from '@/models/cafeteria'; // Removed MenuItem import
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Tabs, Tab } from "@heroui/tabs";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Divider } from "@heroui/divider";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Check, ArrowRight, Printer, Download, Share2 } from "lucide-react"; // Added Timer icon
import { Switch } from "@heroui/react"; // Import Switch component
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { supabase } from '@/lib/supabaseClient'; // Import Supabase client
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'; // Import types
import PickupTimer from '@/components/ui/cafeteria/PickupTimer'; // Import the new timer component

// Helper function to determine if an order is for later pickup
const isPickupLater = (order: Order): boolean => {
  const now = new Date();
  const pickupTime = order.pickupTime ? new Date(order.pickupTime) : null;
  // Define a threshold for what constitutes "later" (e.g., more than 15 minutes from now)
  // You might adjust this threshold based on your needs
  const laterThreshold = new Date(now.getTime() + 15 * 60 * 1000);
  return !!(pickupTime && pickupTime > laterThreshold);
};


// Helper function to determine order type for tabs (Simplified)
const getOrderCategory = (order: Order): 'Past' | 'Active' => {
	switch (order.status) {
		case 'completed':
		case 'cancelled':
			return 'Past';
		// All other statuses are considered 'Active'
		case 'pending':
		case 'confirmed':
		case 'preparing':
		case 'ready':
		case 'partially_ready':
		case 'partially_delivered':
		case 'partially_completed':
			return 'Active';
		default:
            console.warn(`Unexpected order status encountered: ${order.status}`);
			return 'Active'; // Default to Active for unknown statuses
	}
};

const StudentCafeteriaOrderHistory: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  // Removed menuItems state
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('active'); // Default to 'active' tab
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [showPickupLater, setShowPickupLater] = useState<boolean>(true); // State for the filter switch
  // REMOVED: countersMap state
  // REMOVED: dataLoaded state
  const { user } = useAuth(); // Get user from AuthContext
  const orderChannelRef = useRef<RealtimeChannel | null>(null);
  const itemChannelRef = useRef<RealtimeChannel | null>(null); // Re-add ref for item channel

  // Handler for Order table updates - Uses payload data directly
  const handleOrderUpdate = (payload: RealtimePostgresChangesPayload<Order>) => {
    console.log('Realtime Order Update Received:', payload);
    const updatedOrderData = payload.new as Order; // Cast to Order

    // Check if payload.new exists and has necessary properties
    if (updatedOrderData && typeof updatedOrderData === 'object' && 'id' in updatedOrderData) {
      const orderIdToUpdate = updatedOrderData.id;
      console.log(`Processing direct update for order ${orderIdToUpdate}.`);

      // We will handle the potential missing 'items' array inside the setOrders callback

      setOrders(currentOrders => { // Use functional update form
        console.log(`[setOrders handleOrderUpdate] Updating state for order ${orderIdToUpdate}`);

        let orderDataToUse = { ...updatedOrderData }; // Clone payload data

        // Ensure items array exists, merging if necessary *using currentOrders*
        if (!orderDataToUse.items) {
            console.warn(`Order update payload for ${orderIdToUpdate} missing items array. Attempting to merge.`);
            // Find existing order within the current state passed to this callback
            const existingOrder = currentOrders.find((o: Order) => o.id === orderIdToUpdate); // Add type for 'o'
            orderDataToUse.items = existingOrder?.items || []; // Use items from current state
        }

        // Find the index of the order to update
        const orderIndex = currentOrders.findIndex((order: Order) => order.id === orderIdToUpdate);

        if (orderIndex !== -1) {
          // Order exists, merge the update
          const existingOrder = currentOrders[orderIndex];
          console.log("[Merge Debug] Existing Order:", JSON.stringify(existingOrder));
          console.log("[Merge Debug] Payload Data (orderDataToUse):", JSON.stringify(orderDataToUse));
          // Create a new merged order object: Spread existing first, then the update payload.
          // This preserves fields from existingOrder if they are not in orderDataToUse.
          const mergedOrder = {
            ...existingOrder,
            ...orderDataToUse, // Spread the (potentially partial, potentially item-augmented) payload
          };
          // Create a new array with the merged order
          const updatedOrdersState = [...currentOrders];
          updatedOrdersState[orderIndex] = mergedOrder;
          console.log("[Merge Debug] Merged Order:", JSON.stringify(mergedOrder)); // Log the result of the merge
          return updatedOrdersState;
        } else {
          // If order doesn't exist (e.g., update arrived before initial fetch completed?), add it
          console.warn(`Order ${orderIdToUpdate} not found in current state during UPDATE, adding.`);
          // Ensure items array exists even when adding
          if (!orderDataToUse.items) {
            orderDataToUse.items = [];
          }
          return [orderDataToUse, ...currentOrders];
        }
      });
      console.log(`Successfully updated local state for order ${orderIdToUpdate} directly from payload.`);

    } else {
       console.warn('Received order update payload without necessary data:', payload);
    }
  };

  // Handler for Order Item table updates - Uses payload data directly
  const handleItemUpdate = (payload: RealtimePostgresChangesPayload<OrderLineItem>) => {
    console.log('Realtime Order Item Update Received:', payload);
    // Directly check the raw payload.new object
    const rawNewData = payload.new;

    if (rawNewData && typeof rawNewData === 'object' && 'order_id' in rawNewData && 'id' in rawNewData) {
      // Extract necessary IDs directly from the raw data
      const orderIdToUpdate = rawNewData.order_id as string;
      const itemIdToUpdate = rawNewData.id as string;
      // Cast the object for use within the state update logic
      const updatedItemData = rawNewData as OrderLineItem;

      console.log(`Processing direct item update for item ${itemIdToUpdate} in order ${orderIdToUpdate}.`);

      setOrders(currentOrders => {
        console.log(`[setOrders handleItemUpdate] Updating state for order ${orderIdToUpdate} due to item ${itemIdToUpdate}`);
        const orderIndex = currentOrders.findIndex(order => order.id === orderIdToUpdate);

        if (orderIndex === -1) {
          console.warn(`Parent order ${orderIdToUpdate} not found in state for item update.`);
          // Cannot update item if parent order isn't there
          return currentOrders;
        }

        // Clone the order and its items array to avoid mutation
        const updatedOrders = [...currentOrders];
        const orderToUpdate = { ...updatedOrders[orderIndex] };
        // Ensure items array exists and clone it
        orderToUpdate.items = orderToUpdate.items ? [...orderToUpdate.items] : [];

        const itemIndex = orderToUpdate.items.findIndex(item => item.id === itemIdToUpdate);

        if (itemIndex !== -1) {
          // Merge the existing item data with the update payload
          // This preserves fields not present in the payload (e.g., menuItemId, quantity)
          const existingItem = orderToUpdate.items[itemIndex];
          orderToUpdate.items[itemIndex] = { ...existingItem, ...updatedItemData };
          console.log(`Merged item update for ${itemIdToUpdate}. Existing:`, existingItem, 'Payload:', updatedItemData, 'Result:', orderToUpdate.items[itemIndex]);
        } else {
          // If item doesn't exist in the order's items array, add it
          // Ensure the payload has enough info, otherwise log a warning
          if (!updatedItemData.menuItemId || !updatedItemData.quantity) {
             console.warn(`Adding item ${itemIdToUpdate} via update, but payload might be incomplete:`, updatedItemData);
          }
          console.warn(`Item ${itemIdToUpdate} not found in order ${orderIdToUpdate}'s items array, adding.`);
          orderToUpdate.items.push(updatedItemData);
        }

        // Replace the order in the cloned orders array *with the modified orderToUpdate*
        updatedOrders[orderIndex] = orderToUpdate;
        console.log(`Successfully updated item ${itemIdToUpdate} in local state for order ${orderIdToUpdate} directly from payload.`);
        return updatedOrders; // Return the new top-level array reference
      });

    } else {
       console.warn('Received order item update payload without necessary data:', payload);
    }
  };


  // Function to setup subscriptions
  const setupRealtimeSubscriptions = (currentOrderIds: string[]) => {
    // Cleanup existing channels before creating new ones
    if (orderChannelRef.current) {
      supabase.removeChannel(orderChannelRef.current);
      orderChannelRef.current = null;
      console.log("Cleaned up existing order channel.");
    }
     if (itemChannelRef.current) {
      supabase.removeChannel(itemChannelRef.current);
      itemChannelRef.current = null;
      console.log("Cleaned up existing item channel.");
    }

    if (!user) {
        console.log("Skipping subscription setup: No user.");
        return;
    }
     if (currentOrderIds.length === 0) {
        console.log("Skipping item subscription setup: No orders found for user.");
        // Still setup order subscription in case new orders are created
    }


    console.log(`Setting up subscriptions for user ${user.id}`);

    // 1. Subscribe to ORDERS table (for overall status changes, new orders)
    const orderChannel = supabase
      .channel(`student_orders_${user.id}`) // Channel name for orders
      .on<Order>(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and UPDATE
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        // Use a wrapper handler to differentiate INSERT/UPDATE if needed,
        // or handleOrderUpdate might be sufficient if it refetches based on ID.
        // For simplicity, let's reuse handleOrderUpdate for now, assuming it works for INSERTs too
        // (as payload.new should contain the new order data).
        // A more robust approach might involve adding the new order directly for INSERT.
        (payload) => {
            console.log(`Realtime Order Event (${payload.eventType}) Received:`, payload);
            if (payload.eventType === 'INSERT') {
                // Option 1: Refetch all orders (simpler, less efficient)
                // fetchDataAndSubscribe(); // Refetch everything - might be too heavy
                // Option 2: Add the new order directly (more efficient)
                const newOrder = payload.new as Order;
                if (newOrder && newOrder.id) {
                    console.log(`New order ${newOrder.id} detected. Adding to state.`);
                    // Ensure items array exists if not included in initial payload
                    if (!newOrder.items) newOrder.items = [];
                    setOrders(currentOrders => [newOrder, ...currentOrders]);
                     // We might need to update the item subscription filter if it was initially empty
                    if (itemChannelRef.current && currentOrderIds.length === 0) {
                        console.log("First order detected, potentially updating item subscription filter.");
                        // Re-setup subscriptions might be the easiest way to update the filter
                        setupRealtimeSubscriptions([newOrder.id]); // Pass only the new ID initially
                    } else if (itemChannelRef.current) {
                         // TODO: Ideally, update the existing item channel filter without full removal/re-add
                         // This is complex with current Supabase JS V2. Re-subscribing might be necessary.
                         console.warn("New order added, but updating item channel filter dynamically is complex. Consider re-subscribing if item updates for the new order are missed.");
                    }

                } else {
                    console.warn("Received INSERT payload without necessary data:", payload);
                }
            } else if (payload.eventType === 'UPDATE') {
                // Pass the raw payload, handleOrderUpdate now expects it
                handleOrderUpdate(payload as RealtimePostgresChangesPayload<Order>);
            } else if (payload.eventType === 'DELETE') {
                 const deletedOrderData = payload.old as Partial<Order>; // DELETE payload is in 'old'
                 if (deletedOrderData && deletedOrderData.id) {
                     const orderIdToDelete = deletedOrderData.id;
                     console.log(`Processing DELETE for order ${orderIdToDelete}.`);
                     setOrders(currentOrders => {
                         console.log(`[setOrders handleOrderChange DELETE] Removing order ${orderIdToDelete}`);
                         return currentOrders.filter(order => order.id !== orderIdToDelete);
                     });
                 } else {
                     console.warn("Received DELETE payload without ID:", payload);
                 }
            }
        }
      )
      .subscribe((status, err) => {
         if (status === 'SUBSCRIBED') {
            console.log(`Realtime ORDERS channel subscribed for user ${user.id}`);
         } else {
            console.error(`Realtime ORDERS channel error: ${status}`, err);
            setError(`Realtime ORDERS connection error: ${err?.message}`);
         }
       });
    orderChannelRef.current = orderChannel; // Store the order channel

    // 2. Subscribe to ORDER_ITEMS table (for individual item status changes)
    // Only subscribe if there are orders to watch
    if (currentOrderIds.length > 0) {
        const itemChannel = supabase
          .channel(`student_order_items_${user.id}`) // Channel name for items
          .on<OrderLineItem>( // Listen to OrderLineItem type changes
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'order_items',
              // Filter for items belonging to the user's orders
              filter: `order_id=in.(${currentOrderIds.join(',')})`
            },
            // Pass the raw payload, handleItemUpdate now expects it
            handleItemUpdate
          )
          .subscribe((status, err) => {
             if (status === 'SUBSCRIBED') {
                console.log(`Realtime ORDER_ITEMS channel subscribed for orders: ${currentOrderIds.join(', ')}`);
             } else {
                console.error(`Realtime ORDER_ITEMS channel error: ${status}`, err);
                setError(`Realtime ORDER_ITEMS connection error: ${err?.message}`);
             }
           });
        itemChannelRef.current = itemChannel; // Store the item channel
    } else {
        console.log("No active orders to subscribe to item updates for.");
    }
  };


  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component

    const fetchDataAndSubscribe = async () => {
      if (!user) {
        setError("Please log in to view your order history.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      let fetchedOrders: Order[] = []; // Declare outside try

      try {
        // Fetch initial data - Only Orders needed now
        fetchedOrders = await CafeteriaController.getOrderHistory(user.id);

        if (isMounted) {
          setOrders(fetchedOrders);

          // Get order IDs for item subscription
          const orderIds = fetchedOrders.map(o => o.id);
          // Setup subscriptions after initial data is loaded
          setupRealtimeSubscriptions(orderIds);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load order data.');
        }
        console.error(err);
      } finally {
        // Keep setLoading(false) for overall loading state
        if (isMounted) {
           setLoading(false);
           // REMOVED: setDataLoaded(true);
           console.log("Data fetch complete. Orders count:", fetchedOrders.length);
        }
      }
    };

    fetchDataAndSubscribe();

    // Cleanup function
    return () => {
      isMounted = false; // Set flag on unmount
      console.log(`Unsubscribing from realtime channels for user ${user?.id}`);
      if (orderChannelRef.current) {
        supabase.removeChannel(orderChannelRef.current);
        orderChannelRef.current = null;
      }
      if (itemChannelRef.current) { // Clean up item channel as well
        supabase.removeChannel(itemChannelRef.current);
        itemChannelRef.current = null;
      }
    };
  }, [user]); // Rerun effect if user changes

  // Removed menuItemMap

  // Removed derived state variables (pastOrders, pickupLaterOrders, realtimeOrders)
  // Filtering will happen directly in the JSX map

  const handleOpenReceipt = (order: Order) => {
    setSelectedOrder(order);
    setIsReceiptOpen(true);
  };

  const handleCloseReceipt = () => {
    setIsReceiptOpen(false);
  };

  const formatDate = (dateInput: Date | string) => {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Helper to format status text nicely
  const formatStatusText = (status: Order['status'] | OrderLineItem['status']): string => {
      if (!status) return 'N/A';
      return status
          .replace('_', ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
  };

  const renderOrderCard = (order: Order) => {
    // const orderType = getOrderType(order); // No longer needed for card rendering logic directly
    const now = new Date();
    const pickupTime = order.pickupTime ? new Date(order.pickupTime) : null;
    const isPickupTimeSoon = pickupTime && +pickupTime - +now <= 30 * 60 * 1000 && +pickupTime - +now > 0;

    // Use order.status directly from the backend. Remove displayStatus calculation.
    const displayStatus = order.status;

    // Status color map for overall order status (using order.status)
    const orderStatusColorMap: Record<Order['status'], "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
        ready: 'success',
        preparing: 'warning',
        pending: 'primary',
        confirmed: 'primary',
        partially_ready: 'secondary',
        partially_delivered: 'secondary',
        completed: 'default',
        cancelled: 'danger',
        partially_completed: 'secondary'
    };

     // Progress width map for overall order status (using order.status)
     const orderProgressWidthMap: Record<Order['status'], string> = {
        pending: '10%',
        confirmed: '25%',
        preparing: '50%',
        partially_ready: '75%',
        ready: '100%',
        partially_delivered: '90%',
        completed: '100%',
        cancelled: '0%',
        partially_completed: '85%'
    };

    // Status color map for individual items
    const itemStatusColorMap: Record<OrderLineItem['status'], "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
      pending: "warning",
      preparing: "secondary",
      ready: "primary",
      delivered: "success",
    };

    // --- Group items by counter name using item.counterName ---
    const groupedItems = order.items.reduce((acc, item) => {
      // Use item.counterName directly, provide fallback if null/undefined
      const counterName = item.counterName || `Counter ID: ${item.counterId.substring(0, 6)}...`;
      if (!acc[counterName]) {
        acc[counterName] = [];
      }
      acc[counterName].push(item);
      return acc;
    }, {} as Record<string, OrderLineItem[]>);
    // --- End Grouping ---

    return (
      <Card
        key={order.id}
        className="mb-4"
        // Removed isPressable and onPress to fix nested button warning
        // The "View Receipt" button below handles the action
      >
        <CardHeader className="flex flex-col gap-2">
          <div className="flex justify-between items-center gap-4">
            <h3 className="text-lg font-semibold">Order #{order.id.substring(order.id.lastIndexOf('-') + 1)}</h3>
            <Chip
              color={orderStatusColorMap[displayStatus] || 'default'}
              variant="flat"
              size="sm"
            >
              {formatStatusText(displayStatus)}
            </Chip>
          </div>
          <p className="text-sm text-default-500">Ordered: {new Date(order.createdAt).toLocaleString()}</p>
          {/* Add PickupTimer component here, conditionally rendered */}
          <PickupTimer readyAt={order.ready_at} status={order.status} />
        </CardHeader>
        <Divider />
        <CardBody>
          {/* Display Item Statuses Grouped by Counter */}
          <div className="mb-3 space-y-3">
            <h4 className="text-xs font-semibold text-default-600">Items & Status:</h4>
            {Object.entries(groupedItems).map(([counterName, items]) => (
              <div key={counterName} className="border border-default-200 rounded-md p-2">
                <p className="text-xs font-medium text-default-500 mb-1">{counterName}</p>
                {items.map((item, index) => {
                  const itemName = item.menuItem?.name || `Item ID: ${item.menuItemId}`;
                  const itemStatus = item.status;
                  const chipColor = itemStatus ? itemStatusColorMap[itemStatus] : 'default';
                  return (
                    <div key={item.id || index} className="flex justify-between items-center text-xs mb-1 last:mb-0">
                      <span className="text-default-700">{itemName} (x{item.quantity})</span>
                      <Chip size="sm" color={chipColor} variant="dot">{formatStatusText(itemStatus)}</Chip>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between pt-2 border-t border-default-100">
            <span>Total:</span>
            {/* Add defensive check for totalPrice */}
            <span className="font-semibold">
              {typeof order.totalPrice === 'number' ? `$${order.totalPrice.toFixed(2)}` : 'N/A'}
            </span>
          </div>

          {/* Display Pickup Time if it exists */}
          {pickupTime && (
            <div className="mt-4 p-3 bg-default-50 rounded-md text-sm">
              <p className="mb-1">Scheduled Pickup: {pickupTime.toLocaleTimeString()}</p>
              {isPickupTimeSoon && !['completed', 'cancelled'].includes(order.status) && ( // Only show countdown if active and soon
                <Chip color="warning" variant="flat">
                  Pickup in approx. {Math.ceil((+pickupTime - +now) / (60 * 1000))} minutes
                </Chip>
              )}
            </div>
          )}

          {/* Overall Order Progress Bar - Show for all active orders */}
          {getOrderCategory(order) === 'Active' && (
            <div className="mt-4">
              <p className="text-sm mb-1">Overall Order Progress:</p>
              <div className="w-full bg-default-200 rounded-full h-2.5 mb-2">
                <div
                  className={`h-2.5 rounded-full bg-${orderStatusColorMap[displayStatus] || 'default'}`}
                  style={{ width: orderProgressWidthMap[displayStatus] || '0%' }}
                ></div>
              </div>
              <p className="text-sm text-default-600">Tracking live status...</p>
            </div>
          )}
        </CardBody>
        <CardFooter>
          <div className="w-full flex justify-center">
             {/* Add onPress handler directly to the button */}
            <Button
              onPress={() => handleOpenReceipt(order)} // Moved onPress here
              color="primary"
              variant="light"
              size="sm"
              endContent={<ArrowRight size={16} />}
            >
              View Receipt
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  };

  // Receipt Modal UI (remains mostly the same, maybe add item statuses here too?)
  const renderReceiptModal = () => {
    if (!selectedOrder) return null;

    const orderId = selectedOrder.id.substring(selectedOrder.id.lastIndexOf('-') + 1);
    const orderDate = formatDate(selectedOrder.createdAt);
    const pickupTime = selectedOrder.pickupTime ? formatDate(selectedOrder.pickupTime) : "ASAP";

    // Calculate subtotal and tax - Add defensive check here too
    const subtotal = typeof selectedOrder.totalPrice === 'number' ? selectedOrder.totalPrice / 1.05 : 0; // Assuming 5% tax - TODO: Use actual tax from order if available
    const tax = typeof selectedOrder.totalPrice === 'number' ? selectedOrder.totalPrice - subtotal : 0; // TODO: Use actual tax from order if available

    // Calculate displayStatus for the receipt modal, mirroring the card logic
    let displayStatus: Order['status'] = selectedOrder.status;
    const isOrderActive = !['completed', 'cancelled'].includes(selectedOrder.status);
    const hasReadyItem = selectedOrder.items.some(item => item.status === 'ready');
    const allItemsReady = selectedOrder.items.every(item => item.status === 'ready');

    if (isOrderActive && hasReadyItem && !allItemsReady && selectedOrder.status !== 'ready') {
        displayStatus = 'partially_ready';
    }

    // --- Group items by counter name for Receipt using item.counterName ---
    const groupedReceiptItems = selectedOrder.items.reduce((acc, item) => {
      // Use item.counterName directly, provide fallback if null/undefined
      const counterName = item.counterName || `Counter ID: ${item.counterId.substring(0, 6)}...`;
      if (!acc[counterName]) {
        acc[counterName] = [];
      }
      acc[counterName].push(item);
      return acc;
    }, {} as Record<string, OrderLineItem[]>);
    // --- End Grouping ---

    return (
      <Modal
        isOpen={isReceiptOpen}
        onClose={handleCloseReceipt}
        backdrop="blur"
        scrollBehavior="outside"
        classNames={{
          base: "bg-default-50",
          body: "py-6 font-mono",
          backdrop: "bg-default/70",
        }}
        size="sm"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 text-center border-b border-dashed border-default-300 pb-4">
            <h2 className="text-xl font-bold">UniGo Cafeteria</h2>
            <p className="text-default-500 text-sm">University Campus Location</p>
            <p className="text-default-500 text-sm">Tel: (555) 123-4567</p>
          </ModalHeader>
          <ModalBody>
            <div className="text-center mb-4">
              <p className="text-sm">Order Receipt</p>
              <h3 className="text-lg font-bold">#{orderId}</h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div>
                <p className="font-bold">Student:</p>
                <p>{selectedOrder.student_full_name || '(Name not available)'}</p>
                <p>ID: {selectedOrder.student_reg_id || '(ID not available)'}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">Date:</p>
                <p>{orderDate}</p>
                <p>Pickup: {pickupTime}</p>
              </div>
            </div>

            <Divider className="my-4" />

            {/* Receipt Items Grouped by Counter */}
            <div className="space-y-4 mb-4">
              {Object.entries(groupedReceiptItems).map(([counterName, items]) => (
                <div key={counterName}>
                  <p className="text-xs font-semibold text-default-600 mb-1">{counterName}</p>
                  {/* Items Table Header within group */}
                  <div className="grid grid-cols-12 text-xs font-bold mb-1 border-b border-dashed pb-1">
                    <div className="col-span-1">Qty</div>
                    <div className="col-span-6">Item</div>
                    <div className="col-span-2 text-center">Status</div>
                    <div className="col-span-3 text-right">Price</div>
                  </div>
                  {/* Items within the group */}
                  <div className="space-y-1">
                    {items.map((item, index) => {
                      const itemName = item.menuItem?.name || `Item ID: ${item.menuItemId}`;
                      const price = item.priceAtOrder * item.quantity;
                      const itemStatus = item.status || 'pending';

                      return (
                        <div key={item.id || index} className="grid grid-cols-12 text-sm items-center">
                          <div className="col-span-1">{item.quantity}x</div>
                          <div className="col-span-6">{itemName}</div>
                          <div className="col-span-2 text-center text-xs">{formatStatusText(itemStatus)}</div>
                          <div className="col-span-3 text-right">${price.toFixed(2)}</div>
                          {item.specialInstructions && (
                            <div className="col-span-11 col-start-2 text-xs text-default-500 italic">
                              Note: {item.specialInstructions}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {/* End Grouped Items */}

            <Divider className="my-4" />

            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (5%):</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base mt-2">
                <span>TOTAL:</span>
                {/* Add defensive check for totalPrice */}
                <span>
                  {typeof selectedOrder.totalPrice === 'number' ? `$${selectedOrder.totalPrice.toFixed(2)}` : 'N/A'}
                </span>
              </div>
            </div>

            <div className="mt-6 text-center text-xs text-default-500">
              {/* Use displayStatus for the overall status in the receipt */}
              <p>Overall Status: <span className="font-medium">{formatStatusText(displayStatus)}</span></p>
              <p className="mt-2">Thank you for your order!</p>
              {/* Update condition to use displayStatus for the "Ready for pickup" message */}
              {(displayStatus === "ready" || displayStatus === "partially_ready" || displayStatus === "partially_delivered") && (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <Check size={14} className="text-success" />
                  <span className="text-success font-medium">Ready for pickup</span>
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter className="flex justify-center gap-2 pt-0">
            <Button
              size="sm"
              variant="flat"
              startContent={<Printer size={16} />}
            >
              Print
            </Button>
            <Button
              size="sm"
              variant="flat"
              startContent={<Download size={16} />}
            >
              Download
            </Button>
            <Button
              size="sm"
              variant="flat"
              startContent={<Share2 size={16} />}
            >
              Share
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner size="lg" color="primary" />
        <span className="ml-2">Loading Order History...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-6 text-center">
        <h1 className="text-3xl font-bold mb-6 text-danger">Error Loading Orders</h1>
        <p className="text-danger">{error}</p>
        <Button
          color="primary"
          variant="solid"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">My Cafeteria Orders</h1>

      {/* Render Tabs directly after loading is false */}
      {!loading && (
        <Tabs
          aria-label="Order History Tabs"
          selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as string)}
        className="w-full"
        color="primary"
        variant="underlined"
      >
        <Tab key="active" title="Active Orders">
          <div className="mt-4">
            {/* Filter Switch */}
            <div className="flex justify-end items-center mb-4">
               <label htmlFor="showPickupLaterSwitch" className="text-sm mr-2 text-default-600">Show Pickup Later Orders</label>
               <Switch
                 id="showPickupLaterSwitch"
                 isSelected={showPickupLater}
                 onValueChange={setShowPickupLater}
                 color="primary"
                 size="sm"
               />
            </div>

            {/* Filter and map based on category and switch state */}
            {orders.filter(o => {
                const category = getOrderCategory(o);
                if (category !== 'Active') return false; // Only show Active orders in this tab
                if (!showPickupLater && isPickupLater(o)) return false; // Hide pickup later if switch is off
                return true; // Show the order
              }).length > 0 ? (
              orders
                .filter(o => {
                  const category = getOrderCategory(o);
                  if (category !== 'Active') return false;
                  if (!showPickupLater && isPickupLater(o)) return false;
                  return true;
                })
                .map(renderOrderCard)
            ) : (
              <p className="text-center p-4 bg-default-50 rounded-lg">
                {showPickupLater ? "No active orders right now." : "No active orders for immediate pickup."}
              </p>
            )}
          </div>
        </Tab>
        {/* Removed Pickup Later Tab */}
        <Tab key="past" title="Past Orders">
          <div className="mt-4">
            {/* Filter and map directly */}
            {orders.filter(o => getOrderCategory(o) === 'Past').length > 0 ? (
              orders
                .filter(o => getOrderCategory(o) === 'Past')
                .map(renderOrderCard)
            ) : (
              <p className="text-center p-4 bg-default-50 rounded-lg">You haven't placed any orders yet.</p>
            )}
          </div>
        </Tab>
        </Tabs>
      )}
      {/* REMOVED: Conditional rendering based on dataLoaded */}

      {/* Render Receipt Modal */}
      {renderReceiptModal()}
    </div>
  );
};

export default StudentCafeteriaOrderHistory;
