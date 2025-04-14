import { useState, useEffect, useCallback, useMemo, useRef } from 'react'; // Added useRef
import { supabase } from '@/lib/supabaseClient'; // Import Supabase client
import { RealtimeChannel } from '@supabase/supabase-js'; // Import type
import { VendorCafeteriaController } from '@/controllers/vendorCafeteriaController';
import { Order } from '@/models/cafeteria';
import { Counter } from '@/models/vendor/counter'; // Import Counter type
import { useAuth } from '@/contexts/AuthContext'; // Assuming vendor auth context exists or use general one
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  CircularProgress,
  Chip,
  Divider,
  Input, // Import Input
  Modal, // Use Modal instead of Dialog
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalContent, // Import ModalContent
  useDisclosure, // Import useDisclosure hook
  Select, // Import Select
  SelectItem, // Import SelectItem
} from "@heroui/react";
import { AlertCircle, CheckCircle, RefreshCw, Search, Truck } from 'lucide-react'; // Import Search and Truck icons

// Define the relevant order statuses for this page
// Show orders where items might be ready for pickup/delivery by this vendor
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'; // Import payload type
import { OrderLineItem, MenuItem } from '@/models/cafeteria'; // Import OrderLineItem and MenuItem types

// Define the relevant order statuses for immediate display/action
// Define relevant item statuses that mean an order might show up here

export default function VendorCafeteriaDeliveryPage() {
  const [allFetchedOrders, setAllFetchedOrders] = useState<Order[]>([]); // Renamed state
  const [vendorCounters, setVendorCounters] = useState<Counter[]>([]); // Store vendor's counters
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemUpdateStatus, setItemUpdateStatus] = useState<Record<string, { loading: boolean; error: string | null }>>({}); // Track individual item updates
  const [searchTerm, setSearchTerm] = useState(''); // State for search input
  const [selectedCounterId, setSelectedCounterId] = useState<string | null>(null); // State for selected counter filter (null means 'All')
  // Use useDisclosure hook for modal state management
  const { isOpen: isConfirmOpen, onOpen: openConfirmModal, onOpenChange: onConfirmModalChange } = useDisclosure();
  // Update state to include itemName AND menuItemId
  const [itemToConfirm, setItemToConfirm] = useState<{ itemId: string; orderId: string; itemName: string; menuItemId: string; } | null>(null); // State for single item confirmation
  // State for order-level bulk delivery confirmation modal
  const { isOpen: isOrderBulkConfirmOpen, onOpen: openOrderBulkConfirmModal, onOpenChange: onOrderBulkConfirmChange } = useDisclosure();
  const [orderToBulkConfirm, setOrderToBulkConfirm] = useState<{ orderId: string; counterId: string; counterName: string } | null>(null); // State for order/counter details
  const [isOrderBulkDelivering, setIsOrderBulkDelivering] = useState<Record<string, boolean>>({}); // Loading state per order for bulk delivery
  const [orderBulkDeliveryError, setOrderBulkDeliveryError] = useState<Record<string, string | null>>({}); // Error state per order for bulk delivery
  const [vendorMenuItems, setVendorMenuItems] = useState<MenuItem[]>([]); // State to store fetched menu items

  const { user } = useAuth(); // Get vendor user info
  const orderChannelRef = useRef<RealtimeChannel | null>(null); // Ref for order channel
  const itemChannelRef = useRef<RealtimeChannel | null>(null); // Ref for item channel

  // Fetch vendor counters and relevant orders
  const fetchData = useCallback(async (isManualRefresh = false) => { // Add optional parameter
    if (!user) {
      setError("Vendor not authenticated.");
      if (isManualRefresh) setIsLoading(false); // Only set loading false if manual
      return;
    }

    // Set loading true only for manual refresh or initial load (handled in useEffect)
    if (isManualRefresh) setIsLoading(true);
    setError(null);
    setOrderBulkDeliveryError({}); // Clear all order-specific bulk errors on refresh

    let fetchedOrders: Order[] | null = null;
    let counters: Counter[] | null = null;
    let menuItems: MenuItem[] | null = null;

    try {
      // Fetch orders, counters, and menu items concurrently
      [fetchedOrders, counters, menuItems] = await Promise.all([
        VendorCafeteriaController.getVendorOrders(), // Fetches orders with items
        // Fetch counters only if not already fetched
        vendorCounters.length === 0 ? VendorCafeteriaController.getVendorCounters() : Promise.resolve(vendorCounters),
        // Fetch menu items only if not already fetched - Assuming getVendorMenuItems exists and works
        VendorCafeteriaController.getVendorMenuItems() // Fetch all vendor menu items once
      ]);

      setAllFetchedOrders(fetchedOrders); // Update source of truth
      // Only update counters if they were actually fetched
      if (counters !== vendorCounters) { // Check if counters were fetched anew
        setVendorCounters(counters);
      }
      // Always update menu items from fetch result
      setVendorMenuItems(menuItems || []);

      console.log("[fetchData] Data fetch complete (Orders, Counters, MenuItems).");

    } catch (err) {
      // Log the specific error more clearly
      const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred during data fetch';
      console.error("Error during fetchData:", err); // Log the full error object
      setError(`Failed to load data: ${errorMsg}`); // Set a user-friendly error message

      // Determine which part might have failed if possible (though Promise.all rejects on first error)
      // This is a basic check; more granular try/catch around each promise might be needed for precise debugging
      if (!Array.isArray(fetchedOrders)) console.error("[fetchData Error] Could not fetch orders.");
      if (!Array.isArray(counters)) console.error("[fetchData Error] Could not fetch counters.");
      if (!Array.isArray(menuItems)) console.error("[fetchData Error] Could not fetch menu items.");


      setAllFetchedOrders([]); // Reset orders on error
      // Keep potentially stale counters/menu items if they were fetched before
    } finally {
      // Only set loading false if it was a manual refresh or initial load
      if (isManualRefresh || !isLoading) setIsLoading(false); // Ensure loading is set false
    }
  // Dependencies: user, and counter length to trigger initial fetch
  }, [user, vendorCounters.length]); // Removed vendorMenuItems.length dependency, fetch always

  const vendorCounterIds = useMemo(() => new Set(vendorCounters.map(c => c.id)), [vendorCounters]);

  // Create a lookup map for menu item names from the fetched vendorMenuItems
  const menuItemMap = useMemo(() => {
    const map: Record<string, MenuItem> = {};
    vendorMenuItems.forEach(item => {
      if (item && item.id) { // Ensure item and id exist
        map[item.id] = item;
      }
    });
    console.log("[Memo] Recalculated menuItemMap:", map); // Log map creation
    return map;
  }, [vendorMenuItems]);

  // Create options for the Select component, including "All Counters"
  const selectOptions = useMemo(() => {
    return [
      { id: 'all', name: 'All Counters' }, // Placeholder for All
      ...vendorCounters,
    ];
  }, [vendorCounters]);

  // --- Realtime Handlers (stable due to useCallback([])) ---
  const handleOrderChange = useCallback((payload: RealtimePostgresChangesPayload<Order>) => {
    console.log('Realtime Order Change Received:', payload);
    const { eventType, new: newOrderData, old: oldOrderData } = payload;

    setAllFetchedOrders(currentOrders => {
      let updatedOrders = [...currentOrders];
      const orderId = eventType === 'DELETE' ? (oldOrderData as Order)?.id : (newOrderData as Order)?.id;

      if (!orderId) {
        console.warn("[RT Order Change] Could not determine order ID from payload:", payload);
        return currentOrders; // Cannot process without ID
      }

      if (eventType === 'INSERT') {
        const newOrder = newOrderData as Order;
        // Ensure items is always an array, even if null/undefined in payload
        newOrder.items = newOrder.items || [];
        if (!updatedOrders.some(o => o.id === newOrder.id)) {
          updatedOrders = [newOrder, ...updatedOrders]; // Add to start
          console.log(`[RT Order INSERT] Added order ${orderId}`);
        } else {
          console.log(`[RT Order INSERT] Order ${orderId} already exists, likely race condition. Ignoring.`);
        }
      } else if (eventType === 'UPDATE') {
        const updatedOrderData = newOrderData as Order;
        const index = updatedOrders.findIndex(o => o.id === updatedOrderData.id);
        if (index !== -1) {
          // Merge update, preserving existing items if not in payload
          const existingOrder = updatedOrders[index];
          // Ensure items array exists on the update payload before merging
          updatedOrderData.items = updatedOrderData.items || existingOrder.items || [];
          updatedOrders[index] = { ...existingOrder, ...updatedOrderData };
          console.log(`[RT Order UPDATE] Updated order ${orderId}`);
        } else {
           // If not found, treat as insert (might happen with RLS delays)
           const orderToAdd = updatedOrderData as Order;
           orderToAdd.items = orderToAdd.items || []; // Ensure items array exists
           updatedOrders = [orderToAdd, ...updatedOrders];
           console.log(`[RT Order UPDATE] Added missing order ${orderId}`);
        }
      } else if (eventType === 'DELETE') {
        updatedOrders = updatedOrders.filter(o => o.id !== orderId);
        console.log(`[RT Order DELETE] Removed order ${orderId}`);
      }
      return updatedOrders;
    });
  // Keep useCallback with empty dependencies as it uses functional state updates
  }, []);

  const handleItemChange = useCallback((payload: RealtimePostgresChangesPayload<OrderLineItem>) => {
    console.log('Realtime Order Item Change Received:', payload);
    const { eventType, new: newItemData, old: oldItemData } = payload;

    setAllFetchedOrders(currentOrders => {
      let updatedOrders = [...currentOrders];

      // Determine target item and order IDs from the payload (which uses snake_case)
      let targetItemId: string | undefined;
      let targetOrderId: string | undefined;
      let rawItemData: any; // Use 'any' temporarily to access snake_case field

      if (eventType === 'INSERT' || eventType === 'UPDATE') {
          rawItemData = newItemData;
          targetItemId = rawItemData?.id;
          targetOrderId = rawItemData?.order_id; // Read snake_case from payload
      } else if (eventType === 'DELETE') {
          rawItemData = oldItemData;
          targetItemId = rawItemData?.id;
          targetOrderId = rawItemData?.order_id; // Read snake_case from payload
      }

      // If we don't have IDs from the payload, we can't process
      if (!targetItemId || !targetOrderId) {
          console.warn('[RT Item Change] Could not determine target item/order ID from payload (expected id, order_id):', payload);
          return currentOrders;
      }

      // Find the order using the extracted targetOrderId
      const orderIndex = updatedOrders.findIndex(o => o.id === targetOrderId);

      // If the parent order doesn't exist in our state, ignore the item change
      // (it might belong to an order not relevant to this view/vendor)
      if (orderIndex === -1) {
          console.log(`[RT Item Change] Parent order ${targetOrderId} not found locally. Ignoring item ${targetItemId} change.`);
          return currentOrders;
      }

      // Create a mutable copy of the order and its items
      let orderToUpdate = { ...updatedOrders[orderIndex] };
      // Ensure items array exists and is copied
      orderToUpdate.items = [...(orderToUpdate.items || [])];

      const itemIndex = orderToUpdate.items.findIndex(i => i && i.id === targetItemId); // Add check for i

      if (eventType === 'INSERT') {
          if (itemIndex === -1 && rawItemData) {
              // Construct the item object conforming to OrderLineItem type
              const newItem: OrderLineItem = {
                  ...rawItemData,
                  orderId: targetOrderId, // Map snake_case payload field to camelCase type field
                  // Ensure other required fields are present or provide defaults if necessary
                  menuItemId: rawItemData.menu_item_id,
                  priceAtOrder: rawItemData.price_at_order,
                  counterId: rawItemData.counter_id,
                  // Optional fields
                  specialInstructions: rawItemData.special_instructions,
                  status: rawItemData.status ?? 'pending', // Default status if missing
              };
              orderToUpdate.items.push(newItem);
              updatedOrders[orderIndex] = orderToUpdate;
              console.log(`[RT Item INSERT] Added item ${targetItemId} to order ${targetOrderId}`);
          } else if (itemIndex !== -1) {
              console.log(`[RT Item INSERT] Item ${targetItemId} already exists in order ${targetOrderId}. Ignoring.`);
          }
      } else if (eventType === 'UPDATE') {
          if (itemIndex !== -1 && rawItemData) {
              // Careful merge: Create a new item object preserving existing fields
              const existingItem = orderToUpdate.items[itemIndex];
              // Ensure existingItem is valid before spreading
              const updatedItem = existingItem ? { ...existingItem } : {} as OrderLineItem;

              // Iterate over keys in the raw payload and apply them, mapping snake_case if needed
              for (const key in rawItemData) {
                  if (Object.prototype.hasOwnProperty.call(rawItemData, key)) {
                      // Map specific snake_case keys to camelCase
                      if (key === 'order_id') {
                          updatedItem.orderId = rawItemData[key];
                      } else if (key === 'menu_item_id') {
                          updatedItem.menuItemId = rawItemData[key];
                      } else if (key === 'price_at_order') {
                          updatedItem.priceAtOrder = rawItemData[key];
                      } else if (key === 'counter_id') {
                          updatedItem.counterId = rawItemData[key];
                      } else if (key === 'special_instructions') {
                          updatedItem.specialInstructions = rawItemData[key];
                      } else {
                          // Assign other keys directly (assuming they match or are handled by 'any')
                          (updatedItem as any)[key] = rawItemData[key];
                      }
                  }
              }

              // Ensure the updated item has an ID and required fields
              if (updatedItem.id && updatedItem.orderId && updatedItem.menuItemId) {
                // Rely on the spread operator and payload structure. If payload lacks menuItem, existing one might be kept.
                // If payload explicitly sends menuItem: null, it might overwrite. Simplifying for now.
                orderToUpdate.items[itemIndex] = updatedItem; // Assign the carefully merged item
                updatedOrders[orderIndex] = orderToUpdate;
                console.log(`[RT Item UPDATE] Updated item ${targetItemId} in order ${targetOrderId} with merged data.`);
              } else {
                 console.warn(`[RT Item UPDATE] Merged item for ${targetItemId} is missing required fields (id, orderId, menuItemId). Aborting update. Merged data:`, updatedItem);
              }
          } else if (itemIndex === -1 && rawItemData) {
              // Item wasn't found, treat as insert (similar logic to INSERT block)
               const newItem: OrderLineItem = {
                  ...rawItemData,
                  orderId: targetOrderId,
                  menuItemId: rawItemData.menu_item_id,
                  priceAtOrder: rawItemData.price_at_order,
                  counterId: rawItemData.counter_id,
                  specialInstructions: rawItemData.special_instructions,
                  status: rawItemData.status ?? 'pending',
              };
              orderToUpdate.items.push(newItem);
              updatedOrders[orderIndex] = orderToUpdate;
              console.log(`[RT Item UPDATE] Added missing item ${targetItemId} to order ${targetOrderId}`);
          }
      } else if (eventType === 'DELETE') {
          const initialLength = orderToUpdate.items.length;
          orderToUpdate.items = orderToUpdate.items.filter(i => i && i.id !== targetItemId); // Add check for i
          // Only update the main array if an item was actually removed
          if (orderToUpdate.items.length < initialLength) {
              updatedOrders[orderIndex] = orderToUpdate;
              console.log(`[RT Item DELETE] Removed item ${targetItemId} from order ${targetOrderId}`);
          }
      }

      return updatedOrders;
    });
  // Keep useCallback with empty dependencies as it uses functional state updates
  }, []);

  // --- Initial Fetch and Subscription Setup ---
  useEffect(() => {
    console.log("Running setup effect (user dependency)...");
    let isMounted = true; // Flag to prevent state updates on unmounted component

    const initialLoad = async () => {
        if (!user) {
            setIsLoading(false);
            setError("Vendor not authenticated.");
            return;
        }
        setIsLoading(true); // Set loading true for initial load
        await fetchData(false); // Pass false for initial load
        if (isMounted) {
            setIsLoading(false); // Set loading false after initial fetch completes
        }
    };

    initialLoad();

    // Setup subscriptions (only depends on user and stable handlers)
    if (user && isMounted) {
        console.log(`Setting up subscriptions for user ${user.id}`);
        // Cleanup existing channels FIRST to prevent duplicates if effect re-runs
        if (orderChannelRef.current) {
          supabase.removeChannel(orderChannelRef.current).catch(console.error);
          orderChannelRef.current = null;
        }
        if (itemChannelRef.current) {
          supabase.removeChannel(itemChannelRef.current).catch(console.error);
          itemChannelRef.current = null;
        }

        // Subscribe to ORDERS table
        orderChannelRef.current = supabase
          .channel(`delivery_orders_${user.id}_${Date.now()}`) // More unique channel name
          .on<Order>('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, handleOrderChange)
          .subscribe((status, err) => {
            if (!isMounted) return; // Don't process if unmounted
            if (status === 'SUBSCRIBED') console.log('Subscribed to delivery orders channel');
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.error('Order subscription error:', status, err);
              // Use functional update for error to avoid overwriting other errors potentially set elsewhere
              setError(prev => prev || 'Realtime order connection issue. Try refreshing.');
            }
          });

        // Subscribe to ORDER_ITEMS table
        itemChannelRef.current = supabase
          .channel(`delivery_order_items_${user.id}_${Date.now()}`) // More unique channel name
          .on<OrderLineItem>('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, handleItemChange)
          .subscribe((status, err) => {
             if (!isMounted) return; // Don't process if unmounted
             if (status === 'SUBSCRIBED') console.log('Subscribed to delivery order items channel');
             if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
               console.error('Order item subscription error:', status, err);
               setError(prev => prev || 'Realtime item connection issue. Try refreshing.');
             }
          });
    } else {
        // If no user, ensure channels are cleaned up (e.g., on logout)
        if (orderChannelRef.current) {
          supabase.removeChannel(orderChannelRef.current).catch(console.error);
          orderChannelRef.current = null;
        }
        if (itemChannelRef.current) {
          supabase.removeChannel(itemChannelRef.current).catch(console.error);
          itemChannelRef.current = null;
        }
    }

    // Cleanup function
    return () => {
      isMounted = false; // Set flag on unmount
      console.log("Cleaning up subscriptions...");
      // Use refs directly in cleanup
      const orderChannel = orderChannelRef.current;
      const itemChannel = itemChannelRef.current;
      if (orderChannel) {
        supabase.removeChannel(orderChannel).catch(console.error);
        orderChannelRef.current = null;
      }
      if (itemChannel) {
        supabase.removeChannel(itemChannel).catch(console.error);
        itemChannelRef.current = null;
      }
    };
  // Re-run only if user or the stable handlers change (which they shouldn't after mount).
  // fetchData is included because it's called within the effect for the initial load.
  }, [user, handleOrderChange, handleItemChange, fetchData]);

  // Prepare and open the confirmation modal
  const handleOpenConfirmModal = (orderItemId: string, orderId: string, menuItemId: string) => {
    // 1. Check if menuItemId is valid
    if (!menuItemId) {
        console.error(`[Modal Open Error] Invalid or missing menuItemId for order item ${orderItemId}. Cannot open confirmation.`);
        // Optionally, provide user feedback via state/toast
        setError(`Error: Could not identify the item (ID: ${orderItemId}) for confirmation.`);
        return; // Stop execution
    }

    // 2. Log the state of the map and the lookup attempt
    console.log(`[Modal Open] Attempting lookup for menuItemId: ${menuItemId}`);
    console.log(`[Modal Open] Current menuItemMap keys:`, Object.keys(menuItemMap)); // Log keys to see if ID exists
    const menuItemFromMap = menuItemMap[menuItemId];
    const itemNameFromMap = menuItemFromMap?.name;

    // 3. Determine the name to use (map lookup or fallback)
    const itemName = itemNameFromMap || `Item ID: ${menuItemId}`; // Fallback if name not found in map

    console.log(`[Modal Open] Map lookup result for ${menuItemId}:`, menuItemFromMap); // Log the found item object (or undefined)
    console.log(`[Modal Open] Using name: "${itemName}" for item ${orderItemId}`);

    // 4. Set state for the modal
    setItemToConfirm({ itemId: orderItemId, orderId, itemName, menuItemId });
    openConfirmModal(); // Open the modal
  };

  // Handles the actual delivery confirmation after dialog approval
  const confirmDelivery = async (onCloseModal: () => void) => { // Accept onClose from render prop
    if (!itemToConfirm) return;

    const { itemId } = itemToConfirm; // Use itemId (which is the orderItemId)
    // Don't close modal immediately, let the process finish or error out

    setItemUpdateStatus(prev => ({ ...prev, [itemId]: { loading: true, error: null } }));
    setError(null); // Clear general error
    try {
      // Use the controller method to update the item status to 'delivered'
      await VendorCafeteriaController.updateOrderItemStatus(itemId, 'delivered');

      // Realtime subscription will handle the UI update.
      // Clear specific item loading/error status immediately for better UX
      setItemUpdateStatus(prev => {
          const newState = { ...prev };
          delete newState[itemId];
          return newState;
      });
      onCloseModal(); // Close modal on success

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to mark item as delivered';
      console.error(`Error delivering item ${itemId}:`, err);
      setItemUpdateStatus(prev => ({ ...prev, [itemId]: { loading: false, error: errorMsg } }));
      setError(`Failed to update item ${itemId}. Please try again.`); // Show general error too
      // Do not close modal on error, let user see the error or retry? Or close? Let's close for now.
      onCloseModal();
    } finally {
       // Reset item details after operation attempt
       setItemToConfirm(null);
    }
  };

  // --- Order-Level Bulk Delivery Logic ---

  // Prepare and open the order-level bulk confirmation modal
  const handleOpenOrderBulkConfirmModal = (orderId: string, counterId: string) => {
    if (!counterId) return;
    const counterName = vendorCounters.find(c => c.id === counterId)?.name || 'Selected Counter';
    setOrderToBulkConfirm({ orderId, counterId, counterName });
    setOrderBulkDeliveryError(prev => ({ ...prev, [orderId]: null })); // Clear previous error for this order
    openOrderBulkConfirmModal();
  };

  // Handles the actual order-level bulk delivery confirmation
  const confirmOrderBulkDelivery = async (onCloseModal: () => void) => {
    if (!orderToBulkConfirm) return;
    const { orderId, counterId } = orderToBulkConfirm;

    setIsOrderBulkDelivering(prev => ({ ...prev, [orderId]: true })); // Set loading true for this order
    setOrderBulkDeliveryError(prev => ({ ...prev, [orderId]: null })); // Clear error for this order
    setError(null); // Clear general error

    // Find the specific order
    const order = allFetchedOrders.find(o => o.id === orderId);
    if (!order) {
      console.error(`[Order Bulk Deliver] Order ${orderId} not found.`);
      setOrderBulkDeliveryError(prev => ({ ...prev, [orderId]: "Order not found." }));
      setIsOrderBulkDelivering(prev => ({ ...prev, [orderId]: false }));
      onCloseModal();
      return;
    }

    // Find all 'ready' item IDs for the selected counter *within this order*
    const itemsToDeliver = order.items?.filter(item =>
      item &&
      item.counterId === counterId &&
      item.status === 'ready'
    ).map(item => item?.id).filter((id): id is string => !!id); // Ensure clean array of string IDs

    if (!itemsToDeliver || itemsToDeliver.length === 0) {
      console.log(`[Order Bulk Deliver] No 'ready' items found for counter ${counterId} in order ${orderId}.`);
      setOrderBulkDeliveryError(prev => ({ ...prev, [orderId]: "No items ready for this counter in this order." }));
      setIsOrderBulkDelivering(prev => ({ ...prev, [orderId]: false }));
      // Keep modal open? Let's close.
      onCloseModal();
      return;
    }

    console.log(`[Order Bulk Deliver] Attempting to deliver ${itemsToDeliver.length} items for counter ${counterId} in order ${orderId}:`, itemsToDeliver);

    try {
      // Call updateOrderItemStatus for each item concurrently
      const updatePromises = itemsToDeliver.map(itemId =>
        VendorCafeteriaController.updateOrderItemStatus(itemId, 'delivered')
      );
      await Promise.all(updatePromises);

      console.log(`[Order Bulk Deliver] Successfully marked ${itemsToDeliver.length} items as delivered for order ${orderId}.`);
      // Realtime subscriptions should handle UI updates.
      onCloseModal(); // Close modal on success

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to mark some items as delivered';
      console.error(`[Order Bulk Deliver] Error delivering items for order ${orderId}, counter ${counterId}:`, err);
      const userErrorMsg = `Bulk delivery failed for this order: ${errorMsg}. Some items might not be updated.`;
      setOrderBulkDeliveryError(prev => ({ ...prev, [orderId]: userErrorMsg }));
      setError(`Bulk delivery failed for order ${orderId}. Please check items.`); // Show general error too
      // Keep modal open to show error? Let's close for now.
      onCloseModal();
    } finally {
      setIsOrderBulkDelivering(prev => ({ ...prev, [orderId]: false })); // Set loading false for this order
      setOrderToBulkConfirm(null); // Clear the state after attempt
    }
  };


  // Filter and sort orders based on search term and creation date
  // This list contains all orders relevant to the vendor, even if not ready for delivery yet.
  const relevantOrders = useMemo(() => {
    console.log("[Memo] Recalculating relevantOrders...");
    return allFetchedOrders
      // Filter 1: Keep order if it contains ANY item for this vendor
      .filter(order => {
          if (!order) return false; // Safety check
          // Check if *any* item belongs to this vendor's counters
          return order.items && order.items.some(item =>
              item && vendorCounterIds.has(item.counterId)
          );
      })
      // Filter 2: Apply search term (student ID)
      .filter(order =>
        // Add safety check for student_reg_id
        order.student_reg_id?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false
      )
      // Sort by creation date (oldest first)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  // Depend on source data, search term, and vendor counters
  }, [allFetchedOrders, searchTerm, vendorCounterIds]); // Removed selectedCounterId dependency here, filtering happens later

  // Calculate the count of orders that are actually ready for delivery based on the selected counter
  const readyForDeliveryCount = useMemo(() => {
    return relevantOrders.filter(order =>
      order.items?.some(item =>
        item &&
        vendorCounterIds.has(item.counterId) &&
        item.status === 'ready' &&
        (selectedCounterId === null || item.counterId === selectedCounterId) // Filter by selected counter
      )
    ).length;
  }, [relevantOrders, vendorCounterIds, selectedCounterId]); // Add selectedCounterId dependency


  // Render individual order item for delivery (No change needed)
  const renderDeliveryItem = (item: Order['items'][0], orderId: string) => {
    // Add safety check for item AND filter by selected counter
    if (!item || !vendorCounterIds.has(item.counterId) || item.status !== 'ready' || (selectedCounterId !== null && item.counterId !== selectedCounterId)) {
      return null;
    }

    const updateStatus = itemUpdateStatus[item.id] || { loading: false, error: null };

    return (
      <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
        <div>
          {/* Use menuItemMap for display name */}
          <p className="font-medium">{item.quantity}x {menuItemMap[item.menuItemId]?.name || `Item ID: ${item.menuItemId}`}</p>
          {item.specialInstructions && <p className="text-xs text-default-500 italic">Note: {item.specialInstructions}</p>}
           {updateStatus.error && <p className="text-xs text-danger mt-1">{updateStatus.error}</p>}
        </div>
        <Button
          size="sm"
          color="success"
          variant="flat"
          isLoading={updateStatus.loading}
          // Pass necessary IDs to the handler (which now uses the map)
          onPress={() => handleOpenConfirmModal(item.id, orderId, item.menuItemId)}
          startContent={!updateStatus.loading ? <CheckCircle className="h-4 w-4" /> : null}
        >
          Mark Delivered
        </Button>
      </div>
    );
  };

  // Render a card for each order needing delivery
  const renderOrderForDelivery = (order: Order) => {
    // Add safety check for order
    if (!order || !order.id) return null; // Ensure order and order.id exist

    // Filter items for this specific vendor that are READY for delivery AND match the selected counter
    const vendorReadyItems = order.items?.filter(item =>
        item &&
        vendorCounterIds.has(item.counterId) &&
        item.status === 'ready' &&
        (selectedCounterId === null || item.counterId === selectedCounterId) // Filter by selected counter
    ) || []; // Ensure it's an array

    // If no 'ready' items for this vendor in this order (considering the selected counter), don't render the card
    if (vendorReadyItems.length === 0) {
        // console.log(`[Render] Skipping order ${order.id?.substring(0,8)} - no 'ready' items for this vendor/counter.`); // Keep commented unless debugging
        return null;
    }
     console.log(`[Render] Rendering order ${order.id?.substring(0,8)} with ${vendorReadyItems.length} ready items for counter ${selectedCounterId || 'any'}.`);

    const currentCounterName = selectedCounterId ? vendorCounters.find(c => c.id === selectedCounterId)?.name : null;
    const isThisOrderBulkDelivering = isOrderBulkDelivering[order.id] || false;
    const thisOrderBulkError = orderBulkDeliveryError[order.id];

    return (
      <Card key={order.id} className="mb-4">
        <CardHeader className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Order #{order.id?.substring(0, 8)}...</h3>
            <p className="text-sm text-default-500">
              Student: {order.student_full_name || order.userId} {order.student_reg_id ? `(${order.student_reg_id})` : ''}
            </p>
            <p className="text-sm text-default-500">
              Ordered: {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <Chip size="sm" color={order.status === 'ready' ? 'warning' : 'secondary'} variant="flat" className="capitalize">
            {order.status?.replace('_', ' ') || 'Unknown Status'}
          </Chip>
        </CardHeader>
        <Divider />
        <CardBody>
          <h4 className="font-semibold mb-2">Items to Deliver{selectedCounterId && currentCounterName ? ` from ${currentCounterName}` : ''}:</h4>
          {/* Display Order-Specific Bulk Error */}
          {thisOrderBulkError && (
            <div className="p-2 mb-3 text-xs text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert">
              <AlertCircle className="inline w-3 h-3 mr-1" />{thisOrderBulkError}
            </div>
          )}
          {/* Render only the items that are ready for the selected counter */}
          {vendorReadyItems.map(item => renderDeliveryItem(item, order.id))}

          {/* Order-Level Bulk Deliver Button */}
          {selectedCounterId && currentCounterName && vendorReadyItems.length > 0 && (
            <div className="mt-4 pt-3 border-t">
              <Button
                size="sm"
                color="primary"
                variant="solid"
                fullWidth // Make button full width within card body padding
                onPress={() => handleOpenOrderBulkConfirmModal(order.id, selectedCounterId)}
                isLoading={isThisOrderBulkDelivering}
                isDisabled={isThisOrderBulkDelivering} // Only disable if loading
                startContent={!isThisOrderBulkDelivering ? <Truck className="h-4 w-4" /> : null}
                aria-label={`Deliver all ${currentCounterName} items for order ${order.id}`}
              >
                Deliver All {vendorReadyItems.length} Item(s) from {currentCounterName}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    );
  };


  return (
    <div className="p-4 md:p-6 m-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
          <h1 className="text-2xl font-semibold">Cafeteria Delivery</h1>
          {/* Container for filters and actions */}
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
             {/* Counter Select */}
             <Select
                 label="Filter by Counter"
                 placeholder="All Counters"
                 size="sm"
                 // Adjust selectedKeys logic for 'all' option
                  selectedKeys={selectedCounterId === null ? ['all'] : [selectedCounterId]}
                  // Refine onSelectionChange to handle potential undefined key
                  onSelectionChange={(keys) => {
                    const selectedKey = (keys as Set<string>).values().next().value ?? null; // Default to null if undefined
                    setSelectedCounterId(selectedKey === 'all' ? null : selectedKey);
                  }}
                  className="w-full sm:w-48" // Adjust width as needed
                  aria-label="Filter orders by counter"
                 items={selectOptions} // Use the combined options list
               >
                 {/* Render all items using the render prop */}
                 {(option) => (
                   <SelectItem key={option.id}>
                     {option.name}
                   </SelectItem>
                 )}
              </Select>
              {/* Search Input */}
              <Input
                placeholder="Search by Student ID..."
                value={searchTerm}
                onValueChange={setSearchTerm}
                startContent={<Search className="h-4 w-4 text-default-400" />}
                className="flex-grow sm:w-64" // Allow input to grow on small screens
                aria-label="Search Orders by Student ID"
             />
            <Button
              isIconOnly
            size="sm"
            variant="ghost"
            onPress={() => fetchData(true)} // Pass true for manual refresh
            isDisabled={isLoading}
            aria-label="Refresh Delivery Orders"
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          </div>
        </CardHeader>
        <CardBody>
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <CircularProgress size="lg" aria-label="Loading..." label="Loading delivery orders..." />
            </div>
          )}
          {!isLoading && error && (
            <div className="p-4 mb-4 text-sm text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert">
              <AlertCircle className="inline w-4 h-4 mr-2" />{error}
            </div>
          )}
          {/* Updated Empty/Not Found States */}
          {!isLoading && !error && relevantOrders.length === 0 && searchTerm && (
             <p className="text-center text-default-500 py-8">No orders found matching Student ID "{searchTerm}".</p>
          )}
          {/* Check if there are relevant orders but none are ready for display */}
          {!isLoading && !error && relevantOrders.length > 0 && readyForDeliveryCount === 0 && !searchTerm && (
             <p className="text-center text-default-500 py-8">No orders currently require delivery actions (items might be preparing).</p>
          )}
          {/* Check if there are truly no orders relevant to this vendor */}
           {!isLoading && !error && relevantOrders.length === 0 && !searchTerm && (
             <p className="text-center text-default-500 py-8">No orders found for your counters.</p>
           )}

          {/* Render Logic: Only render the section if there are orders ready for delivery */}
          {!isLoading && !error && readyForDeliveryCount > 0 && (
            <div className="space-y-4">
              {/* Kanban Board Layout */}
              <div className="flex flex-col space-y-4"> {/* Using flex-col for a single column layout */}
                {/* Column: Ready for Delivery */}
                <div>
                  {/* Removed bg-background from h2 */}
                  <h2 className="text-xl font-semibold mb-3 sticky top-0 py-2 z-10">Ready for Delivery ({readyForDeliveryCount})</h2>
                  <div className="space-y-4">
                     {/* Map over relevantOrders but let renderOrderForDelivery filter for display */}
                     {relevantOrders.map(renderOrderForDelivery).filter(Boolean)} {/* Filter out null results from renderOrderForDelivery */}
                  </div>
                </div>
                {/* Add more columns here if needed for other statuses in the future */}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Confirmation Modal using useDisclosure and ModalContent */}
      <Modal
        isOpen={isConfirmOpen}
        onOpenChange={onConfirmModalChange}
        isDismissable={false} // Prevent closing by clicking outside
        isKeyboardDismissDisabled={true} // Prevent closing with Esc key
      >
        <ModalContent>
          {(onClose) => ( // Use render prop to get onClose function
            <>
              <ModalHeader>Confirm Delivery</ModalHeader>
              <ModalBody>
                Are you sure you want to mark item{' '}
                {/* Display itemName from state */}
                <span className="font-semibold">{itemToConfirm?.itemName}</span>{' '}
                as delivered? This action cannot be undone.
              </ModalBody>
              <ModalFooter>
                {/* Use onClose from render prop */}
                <Button variant="ghost" onPress={onClose}>
                  Cancel
                </Button>
                {/* Pass onClose to the confirm function */}
                <Button color="success" onPress={() => confirmDelivery(onClose)}>
                  Confirm Delivery
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Order-Level Bulk Delivery Confirmation Modal */}
      <Modal
        isOpen={isOrderBulkConfirmOpen}
        onOpenChange={onOrderBulkConfirmChange}
        isDismissable={!isOrderBulkDelivering[orderToBulkConfirm?.orderId || '']} // Prevent closing while loading for the specific order
        isKeyboardDismissDisabled={isOrderBulkDelivering[orderToBulkConfirm?.orderId || '']}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Confirm Bulk Delivery for Order</ModalHeader>
              <ModalBody>
                Are you sure you want to mark ALL ready items for the selected counter within this order
                as delivered? This action cannot be undone.
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" onPress={onClose} isDisabled={isOrderBulkDelivering[orderToBulkConfirm?.orderId || '']}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={() => confirmOrderBulkDelivery(onClose)}
                  isLoading={isOrderBulkDelivering[orderToBulkConfirm?.orderId || '']}
                  isDisabled={isOrderBulkDelivering[orderToBulkConfirm?.orderId || '']}
                >
                  {isOrderBulkDelivering[orderToBulkConfirm?.orderId || ''] ? 'Delivering...' : 'Confirm Delivery'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

    </div>
  );
}
