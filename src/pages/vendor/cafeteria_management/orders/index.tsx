import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// --- Dnd-kit Imports ---
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
  UniqueIdentifier
} from '@dnd-kit/core';
import {
  arrayMove, // Needed for reordering state update
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// --- End Dnd-kit Imports ---
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient'; // Import Supabase client
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'; // Import types

import { VendorCafeteriaController } from '@/controllers/vendorCafeteriaController';
// Import the correct OrderLineItem type
import { Order, OrderLineItem } from '@/models/cafeteria';
import { RefreshCw, AlertCircle, Eye, GripVertical, Search, Maximize, Minimize } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  CircularProgress,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Input,
  Select,
  SelectItem // Correct import assumed from @heroui/react based on usage
} from "@heroui/react";
import { Counter } from '@/models/vendor/counter';


// Define Kanban columns based on Order ITEM status for the kitchen view
type OrderItemStatus = OrderLineItem['status']; // 'pending' | 'preparing' | 'ready' | 'delivered'
const KANBAN_ITEM_COLUMNS: OrderItemStatus[] = ['pending', 'preparing', 'ready']; // Removed 'delivered'

// Map item statuses to column titles
const itemColumnTitles: Record<OrderItemStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready for Pickup",
  delivered: "Delivered / Picked Up", // Keep for potential use elsewhere, but not a column title
};

// Define item status colors
const itemStatusColorMap: Record<OrderItemStatus, "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
  pending: "warning",
  preparing: "secondary",
  ready: "primary",
  delivered: "success", // Keep for chips, etc.
};


// Define overall order status colors (for modal - remains unchanged)
const statusColorMap: Record<Order['status'], "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
    pending: "warning",
    confirmed: "primary",
    preparing: "secondary",
    ready: "default", // Or maybe success?
    partially_ready: "secondary",
    partially_delivered: "secondary",
    completed: "success",
    cancelled: "danger",
    partially_completed: "secondary", // Keep legacy?
};


// Interface for items displayed on the board (OrderLineItem + parent Order info)
interface KanbanItem extends OrderLineItem {
  parentOrderId: string;
  parentOrderCreatedAt: Date;
  parentOrderPickupTime?: Date;
  userName?: string; // Add user name
}

// Type for the board state, mapping item status to KanbanItem array
interface ItemBoardState {
  [key: string]: KanbanItem[]; // Column ID (item status) maps to array of KanbanItems
}

// --- Sortable Order Item Card Component ---
interface SortableItemCardProps {
  item: KanbanItem;
  menuItemName: string;
  onViewOrderDetails: (orderId: string) => void;
  // No need to pass userName separately, it's in item
}

const SortableItemCard: React.FC<SortableItemCardProps> = ({ item, menuItemName, onViewOrderDetails }) => {
  // console.log(`[SortableItemCard] Rendering card for Item ID: ${item.id} (Parent Order: ${item.parentOrderId.substring(0,8)})`); // Removed log
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'N/A';
    try { return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
    catch { return 'Invalid Date'; }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3 cursor-grab">
      <Card className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
        <CardHeader className="flex justify-between items-center pb-1 pt-1 px-1 select-none">
           <div className="flex items-center gap-1">
             <GripVertical className="h-4 w-4 text-default-400" />
             <span className="text-sm font-medium">{item.quantity}x {menuItemName}</span>
           </div>
           <Chip size="sm" color={itemStatusColorMap[item.status]} variant="flat">{item.status}</Chip>
        </CardHeader>
        <CardBody className="px-1 py-1">
           {/* Display User Name if available, otherwise fallback */}
           <p className="text-xs text-default-600 font-medium">{item.userName || `User: ${item.parentOrderId.substring(0, 6)}...`}</p>
           {item.specialInstructions && <p className="text-xs text-default-500 mt-1">Notes: "{item.specialInstructions}"</p>}
           <p className="text-xs text-default-500">Pickup: {formatDate(item.parentOrderPickupTime)}</p>
           <p className="text-xs text-default-400">Order ID: {item.parentOrderId.substring(0, 8)}...</p>
        </CardBody>
         <CardFooter className="px-1 pt-1 pb-0">
           <Button size="sm" variant="light" onPress={() => onViewOrderDetails(item.parentOrderId)} startContent={<Eye className="h-4 w-4" />}>
             Order Details
           </Button>
         </CardFooter>
      </Card>
    </div>
  );
};
// --- End Sortable Order Item Card Component ---

// --- Droppable Column Component (for Items) ---
interface DroppableItemColumnProps {
  id: OrderItemStatus;
  title: string;
  items: KanbanItem[];
  menuItemsMap: Map<string, string>;
  onViewOrderDetails: (orderId: string) => void;
}

const DroppableItemColumn: React.FC<DroppableItemColumnProps> = ({ id, title, items, menuItemsMap, onViewOrderDetails }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  // Create a new array reference for itemIds only when items prop changes
  const itemIds = useMemo(() => items.map(i => i.id), [items]);
  // console.log(`[DroppableItemColumn ${id}] Rendering with ${items.length} items. Item IDs for SortableContext:`, itemIds); // Removed log


  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-100 dark:bg-gray-900 p-3 rounded-lg min-h-[200px] ${isOver ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500' : ''}`}
    >
      <h2 className="font-semibold mb-3 text-center text-gray-700 dark:text-gray-300">{title} ({items.length})</h2>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableItemCard
            key={item.id}
            item={item}
            menuItemName={menuItemsMap.get(item.menuItemId) || 'Unknown Item'}
            onViewOrderDetails={onViewOrderDetails}
          />
        ))}
      </SortableContext>
    </div>
  );
};
// --- End Droppable Column Component ---


export default function VendorCafeteriaOrdersKanbanPage() {
  // State for raw data (source of truth)
  const [allFetchedOrders, setAllFetchedOrders] = useState<Order[]>([]); // Orders should contain student_full_name
  const [menuItemsMap, setMenuItemsMap] = useState<Map<string, string>>(new Map());
  // REMOVED: const [userNamesMap, setUserNamesMap] = useState<UserNamesMap>({});
  // State for UI display (derived, but managed with useState for optimistic updates)
  const [boardState, setBoardState] = useState<ItemBoardState>({});
  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Modal state
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  // dnd-kit state
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCounterId, setSelectedCounterId] = useState<string | null>(null);
  // Other UI state
  const [vendorCounters, setVendorCounters] = useState<Counter[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Auth & Realtime refs
  const { user } = useAuth();
  const orderChannelRef = useRef<RealtimeChannel | null>(null);
  const itemChannelRef = useRef<RealtimeChannel | null>(null);

  const { isOpen: isDetailModalOpen, onOpen: onDetailModalOpen, onClose: onDetailModalClose } = useDisclosure();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- Helper Function to Calculate Board State ---
  // Calculates the ItemBoardState based on current orders and filters
  const calculateBoardState = useCallback((
    orders: Order[], // Orders contain student_full_name
    counterId: string | null,
    query: string,
    itemsMap: Map<string, string>
    // REMOVED: usersMap: UserNamesMap
  ): ItemBoardState => {
    // console.log("[calculateBoardState] Calculating state..."); // Reduced logging
    const grouped: ItemBoardState = {};
    KANBAN_ITEM_COLUMNS.forEach(status => { grouped[status] = []; }); // Initialize columns

    if (!counterId) {
      // console.log("[calculateBoardState] No counter selected."); // Reduced logging
      return grouped;
    }

    const lowerCaseQuery = query.toLowerCase();
    // console.log(`[calculateBoardState] Processing ${orders.length} orders for counter ${counterId}.`); // Reduced logging

    orders.forEach(order => {
      // console.log(`[calculateBoardState] Processing Order ID: ${order.id}, Items:`, order.items); // Reduced logging
      order.items?.forEach(item => {
        if (item.counterId === counterId) {
          // console.log(`[calculateBoardState] Item ${item.id} (Status: ${item.status}) matches counter ${counterId}.`); // Reduced logging
          const itemName = itemsMap.get(item.menuItemId)?.toLowerCase() || '';
          const parentOrderIdMatch = order.id.toLowerCase().includes(lowerCaseQuery);
          const itemNameMatch = itemName.includes(lowerCaseQuery);

          if (!lowerCaseQuery || parentOrderIdMatch || itemNameMatch) {
            // console.log(`[calculateBoardState] Item ${item.id} matches search query "${query}".`); // Reduced logging
            if (KANBAN_ITEM_COLUMNS.includes(item.status)) {
              // console.log(`[calculateBoardState] Item ${item.id} status ${item.status} is relevant for Kanban. Adding to column.`); // Reduced logging
              const kanbanItemData: KanbanItem = {
                ...item,
                parentOrderId: order.id,
                parentOrderCreatedAt: new Date(order.createdAt), // Ensure it's a Date object
                parentOrderPickupTime: order.pickupTime ? new Date(order.pickupTime) : undefined, // Ensure it's a Date object
                userName: order.student_full_name || 'Unknown User', // Use student_full_name from Order
              };
              grouped[item.status].push(kanbanItemData);
            }
          }
        }
      });
    });

    // --- Sort items within each column by creation date (oldest first) ---
    Object.keys(grouped).forEach((status) => {
      grouped[status].sort((a, b) => {
        // Ensure dates are valid before comparing
        const dateA = a.parentOrderCreatedAt instanceof Date ? a.parentOrderCreatedAt.getTime() : 0;
        const dateB = b.parentOrderCreatedAt instanceof Date ? b.parentOrderCreatedAt.getTime() : 0;
        return dateA - dateB; // Ascending order
      });
    });
    // --- End Sorting ---

    // console.log("[calculateBoardState] Calculation and sorting complete:", grouped); // Reduced logging
    return grouped;
  }, []); // No dependencies needed as args are passed

  // --- Effect to Update Board State When Data/Filters Change ---
  // This runs after initial fetch and whenever filters or the underlying order data changes.
  useEffect(() => {
    console.log("[useEffect: Data/Filter Change] Checking if board state needs recalculation.");
    // Avoid recalculating during an active drag operation.
    if (!activeId) {
      console.log("[useEffect: Data/Filter Change] No active drag, proceeding with recalculation.");
      // REMOVED: Pass userNamesMap to calculateBoardState
      const newBoardState = calculateBoardState(allFetchedOrders, selectedCounterId, searchQuery, menuItemsMap);
      // Ensure we set a new object reference to guarantee re-render trigger
      setBoardState({...newBoardState}); // Spread into a new object
    } else {
      console.log("[useEffect: Data/Filter Change] Active drag detected, skipping recalculation.");
    }
  }, [allFetchedOrders, selectedCounterId, searchQuery, menuItemsMap, calculateBoardState, activeId]); // REMOVED: userNamesMap dependency


  const toggleFullscreen = () => { /* ... (fullscreen logic unchanged) ... */
    const element = containerRef.current;
    if (!element) return;

    if (!document.fullscreenElement) {
      element.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        setError(`Fullscreen not supported or permission denied.`); // Inform user
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
   };
  useEffect(() => { /* ... (fullscreen listener unchanged) ... */
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
   }, []);

  const handleDragStart = (event: DragStartEvent) => {
    console.log("[DragStart] Active ID (OrderItem):", event.active.id);
    setActiveId(event.active.id);
  };

  const handleDragCancel = () => {
      console.log("[DragCancel] Drag cancelled.");
      setActiveId(null);
  };

  // --- Function to refetch menu items and update map ---
  const refetchMenuItems = useCallback(async () => {
    console.log("Refetching menu items...");
    try {
      const fetchedMenuItems = await VendorCafeteriaController.getVendorMenuItems();
      const itemMap = new Map<string, string>();
      fetchedMenuItems.forEach(item => itemMap.set(item.id, item.name));
      setMenuItemsMap(itemMap);
      console.log("Menu items map updated.");
    } catch (err) {
      console.error("Failed to refetch menu items:", err);
    }
  }, []);

  // --- Realtime Handlers ---
  const handleOrderChange = useCallback((payload: RealtimePostgresChangesPayload<Order>) => {
    console.log('Realtime Order Change Received:', payload);
    const { eventType, new: newOrderData, old: oldOrderData } = payload;

    setAllFetchedOrders(currentOrders => {
      let updatedOrders = [...currentOrders];
      let needsMenuRefetch = false;

      // Apply changes to updatedOrders...
      if (eventType === 'INSERT') {
        console.log('[RT Order INSERT] Received INSERT event. Payload:', payload);
        const newOrder = newOrderData as Order;
        console.log('[RT Order INSERT] Parsed new order data:', newOrder);
        if (!newOrder || !newOrder.id) {
            console.error('[RT Order INSERT] Invalid new order data received.');
            return currentOrders; // Skip if data is invalid
        }
        if (!newOrder.items) {
            console.log('[RT Order INSERT] New order has no items array, initializing.');
            newOrder.items = [];
        }
        if (!updatedOrders.some(o => o.id === newOrder.id)) {
          console.log(`[RT Order INSERT] Adding new order ${newOrder.id} to state.`);
          updatedOrders = [newOrder, ...updatedOrders];
          if (newOrder.items) {
            console.log(`[RT Order INSERT] Checking items for menu map consistency for order ${newOrder.id}.`);
            for (const item of newOrder.items) {
              if (!menuItemsMap.has(item.menuItemId)) {
                console.log(`[RT Order INSERT] Menu item ${item.menuItemId} not found in map. Triggering refetch.`);
                needsMenuRefetch = true; break;
              }
            }
          }
        }
      } else if (eventType === 'UPDATE') {
        const updatedOrderData = newOrderData as Order;
        const index = updatedOrders.findIndex(o => o.id === updatedOrderData.id);
        if (index !== -1) {
          const existingOrder = updatedOrders[index];
          updatedOrders[index] = { ...existingOrder, ...updatedOrderData, items: updatedOrderData.items || existingOrder.items || [] };
        } else {
           if (!updatedOrderData.items) updatedOrderData.items = [];
           updatedOrders = [updatedOrderData, ...updatedOrders];
        }
      } else if (eventType === 'DELETE') {
        const deletedOrderId = (oldOrderData as Order)?.id;
        if (deletedOrderId) updatedOrders = updatedOrders.filter(o => o.id !== deletedOrderId);
      }

      if (needsMenuRefetch) refetchMenuItems();

      // Let the useEffect hook handle board state recalculation based on updatedOrders
      console.log('[handleOrderChange] Finished processing event. Returning updated orders list.');

      return updatedOrders;
    });
  }, [refetchMenuItems]); // Only refetchMenuItems is needed directly

  const handleItemChange = useCallback((payload: RealtimePostgresChangesPayload<OrderLineItem>) => {
    console.log('Realtime Order Item Change Received:', payload);
    const { eventType, new: newItemData, old: oldItemData } = payload;

    setAllFetchedOrders(currentOrders => {
      console.log(`[handleItemChange] Received event: ${eventType} for item:`, newItemData || oldItemData);
      let updatedOrders = [...currentOrders]; // Top-level copy

      // Find target item/order IDs...
      let targetItemId: string | undefined;
      let targetOrderId: string | undefined;
      let itemPayloadData: any; // Use 'any' temporarily to access snake_case
      // Removed duplicate declarations below

      if (eventType === 'INSERT' || eventType === 'UPDATE') {
          itemPayloadData = newItemData; // Keep as raw payload data initially
          targetItemId = itemPayloadData?.id;
          targetOrderId = itemPayloadData?.order_id; // Read snake_case directly
          // Fallback for UPDATE if new data somehow misses IDs
          if (eventType === 'UPDATE' && (!targetItemId || !targetOrderId) && oldItemData) {
              targetItemId = (oldItemData as any)?.id;
              targetOrderId = (oldItemData as any)?.order_id; // Read snake_case directly
          }
      } else if (eventType === 'DELETE') {
          itemPayloadData = oldItemData; // Use old data for DELETE
          targetItemId = itemPayloadData?.id;
          targetOrderId = itemPayloadData?.order_id; // Read snake_case directly
      }

      // No need for separate typedItemPayload if we map directly during assignment

      if (!targetItemId || !targetOrderId) {
          console.warn('[handleItemChange] Could not determine target item/order ID from payload. Aborting.');
          return currentOrders;
      }
      console.log(`[handleItemChange] Target Order ID: ${targetOrderId}, Target Item ID: ${targetItemId}`);

      const orderIndex = updatedOrders.findIndex(o => o.id === targetOrderId);
      if (orderIndex === -1) {
          console.log(`[handleItemChange] Parent order ${targetOrderId} not found in state. Ignoring item change.`);
          return currentOrders; // Order not relevant or not yet added
      }

      // Create mutable copies for modification
      let orderToUpdate = { ...updatedOrders[orderIndex] };
      // Ensure items array exists and is copied immutably
      let currentItems = orderToUpdate.items ? [...orderToUpdate.items] : [];
      const itemIndex = currentItems.findIndex(i => i?.id === targetItemId); // Add null check for i

      console.log(`[handleItemChange] Found order at index ${orderIndex}. Item index: ${itemIndex}. Current items:`, currentItems);

      // Apply changes immutably
      if (eventType === 'INSERT') {
          if (itemPayloadData && itemIndex === -1) {
              console.log(`[handleItemChange] Adding item ${targetItemId} to order ${targetOrderId}`);
              // Construct the new item directly, mapping snake_case
              const newItemToAdd: OrderLineItem = {
                  id: itemPayloadData.id,
                  orderId: targetOrderId, // Use the correctly extracted targetOrderId
                  menuItemId: itemPayloadData.menu_item_id,
                  quantity: itemPayloadData.quantity,
                  priceAtOrder: itemPayloadData.price_at_order,
                  counterId: itemPayloadData.counter_id,
                  specialInstructions: itemPayloadData.special_instructions,
                  status: itemPayloadData.status,
                  // Add other fields from OrderLineItem if they exist in payload, otherwise they'll be undefined
              };
              currentItems.push(newItemToAdd);
              orderToUpdate.items = currentItems;
              updatedOrders[orderIndex] = orderToUpdate;
          } else {
              console.log(`[handleItemChange] Item ${targetItemId} already exists or payload invalid. Skipping INSERT.`);
          }
      } else if (eventType === 'UPDATE') {
          if (itemPayloadData && itemIndex !== -1) {
              console.log(`[handleItemChange] Updating item ${targetItemId} in order ${targetOrderId}`);
              // Merge existing item with payload, mapping snake_case
              const updatedItem: OrderLineItem = {
                  ...currentItems[itemIndex], // Start with existing
                  id: itemPayloadData.id, // Ensure ID is correct
                  orderId: targetOrderId, // Ensure orderId is correct
                  menuItemId: itemPayloadData.menu_item_id ?? currentItems[itemIndex].menuItemId,
                  quantity: itemPayloadData.quantity ?? currentItems[itemIndex].quantity,
                  priceAtOrder: itemPayloadData.price_at_order ?? currentItems[itemIndex].priceAtOrder,
                  counterId: itemPayloadData.counter_id ?? currentItems[itemIndex].counterId,
                  specialInstructions: itemPayloadData.special_instructions, // null is acceptable
                  status: itemPayloadData.status ?? currentItems[itemIndex].status,
              };
              currentItems[itemIndex] = updatedItem;
              orderToUpdate.items = currentItems;
              updatedOrders[orderIndex] = orderToUpdate;
          } else if (itemPayloadData && itemIndex === -1) {
              // Item not found, treat as insert
              console.log(`[handleItemChange] Item ${targetItemId} not found during UPDATE, adding instead.`);
              const newItemToAdd: OrderLineItem = {
                   id: itemPayloadData.id,
                   orderId: targetOrderId,
                   menuItemId: itemPayloadData.menu_item_id,
                   quantity: itemPayloadData.quantity,
                   priceAtOrder: itemPayloadData.price_at_order,
                   counterId: itemPayloadData.counter_id,
                   specialInstructions: itemPayloadData.special_instructions,
                   status: itemPayloadData.status,
              };
              currentItems.push(newItemToAdd);
              orderToUpdate.items = currentItems;
              updatedOrders[orderIndex] = orderToUpdate;
          } else {
               console.log(`[handleItemChange] Invalid payload or item not found for UPDATE. Skipping.`);
          }
      } else if (eventType === 'DELETE') {
          if (itemIndex !== -1) {
              console.log(`[handleItemChange] Removing item ${targetItemId} from order ${targetOrderId}`);
              // Filter creates a new array (immutable)
              orderToUpdate.items = currentItems.filter(i => i?.id !== targetItemId);
              updatedOrders[orderIndex] = orderToUpdate;
          } else {
              console.log(`[handleItemChange] Item ${targetItemId} not found for DELETE. Skipping.`);
          }
      }

      console.log('[handleItemChange] Finished processing item event. Returning updated orders list:', updatedOrders);
      return updatedOrders;
    });
  }, []); // No external dependencies needed for processing payload

  // --- Function to setup subscriptions ---
  const setupRealtimeSubscriptions = useCallback(() => {
    // Cleanup existing channels...
    if (orderChannelRef.current) supabase.removeChannel(orderChannelRef.current);
    if (itemChannelRef.current) supabase.removeChannel(itemChannelRef.current);
    orderChannelRef.current = null; itemChannelRef.current = null;

    if (!user) return;
    console.log(`Setting up vendor subscriptions for user ${user.id}`);

    // Subscribe to ORDERS
    orderChannelRef.current = supabase
      .channel(`vendor_orders_${user.id}`)
      .on<Order>('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, handleOrderChange)
      .subscribe((_status, _err) => { /* Error handling */ });

    // Subscribe to ORDER_ITEMS
    itemChannelRef.current = supabase
      .channel(`vendor_order_items_${user.id}`)
      .on<OrderLineItem>('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, handleItemChange)
      .subscribe((_status, _err) => { /* Error handling */ });

  }, [user, handleOrderChange, handleItemChange]);


  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    console.log("[fetchData] Starting data fetch");
    setIsLoading(true);
    setError(null);
    try {
      // Fetch counters, orders, and menu items concurrently
      const [fetchedCounters, fetchedOrders, fetchedMenuItems] = await Promise.all([
        VendorCafeteriaController.getVendorCounters(),
        VendorCafeteriaController.getVendorOrders(),
        VendorCafeteriaController.getVendorMenuItems()
      ]);

      setVendorCounters(fetchedCounters);
      setAllFetchedOrders(fetchedOrders); // Update source of truth

      const itemMap = new Map<string, string>();
      fetchedMenuItems.forEach(item => itemMap.set(item.id, item.name));
      setMenuItemsMap(itemMap);

      // REMOVED: Separate user name fetching logic

      // Set initial counter selection only if not already set and counters exist
      if (selectedCounterId === null && fetchedCounters.length > 0) {
        setSelectedCounterId(fetchedCounters[0].id);
      }
      console.log("[fetchData] Data fetch complete (including user names)");
      // Board state will be calculated by the useEffect hook watching allFetchedOrders & userNamesMap
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error("Fetch data error:", err);
      setVendorCounters([]);
      setAllFetchedOrders([]);
      setMenuItemsMap(new Map());
      // REMOVED: setUserNamesMap({});
    } finally {
      setIsLoading(false);
    }
  }, [selectedCounterId]); // Keep selectedCounterId dependency for initial set


  // --- Initial Fetch and Subscription Setup ---
  useEffect(() => {
    let isMounted = true;
    fetchData().then(() => {
      if (isMounted) {
        setupRealtimeSubscriptions();
      }
    });
    return () => {
      isMounted = false;
      if (orderChannelRef.current) supabase.removeChannel(orderChannelRef.current);
      if (itemChannelRef.current) supabase.removeChannel(itemChannelRef.current);
    };
  }, [user, fetchData, setupRealtimeSubscriptions]); // Rerun if user changes


  // --- Drag and Drop Handlers ---
  // Helper to find the item's current status from the source data
  const findItemContainer = (itemId: UniqueIdentifier): OrderItemStatus | undefined => {
      if (KANBAN_ITEM_COLUMNS.includes(itemId as OrderItemStatus)) {
          return itemId as OrderItemStatus; // Dropped directly onto a column
      }
      for (const order of allFetchedOrders) {
          const item = order.items?.find(i => i.id === itemId);
          if (item && item.counterId === selectedCounterId && KANBAN_ITEM_COLUMNS.includes(item.status)) {
              return item.status;
          }
      }
      console.warn(`[findItemContainer] Could not find container for item ID: ${itemId}`);
      return undefined;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    // Keep activeId set during this handler until the end

    if (!over) {
      console.log('[handleDragEnd] No drop target.');
      setActiveId(null); // Clear active drag state if no target
      return;
    }

    const processedItemId = active.id as string;
    const overId = over.id as string;

    console.log(`[handleDragEnd] Active Item ID: ${processedItemId}, Over ID: ${overId}`);

    // Find current and target columns based on source data
    const sourceColumnStatus = findItemContainer(processedItemId);
    const destinationColumnStatus = KANBAN_ITEM_COLUMNS.includes(overId as OrderItemStatus)
        ? overId as OrderItemStatus
        : findItemContainer(overId);

    if (!sourceColumnStatus || !destinationColumnStatus) {
        console.error("[handleDragEnd] Could not determine source or destination container.");
        setActiveId(null); // Clear active drag state on error
        return;
    }
    console.log(`[handleDragEnd] Source: ${sourceColumnStatus}, Destination: ${destinationColumnStatus}`);

    // --- Handle Reordering vs. Moving ---
    if (sourceColumnStatus === destinationColumnStatus) {
      // Reordering within the same column
      if (processedItemId !== overId) {
        console.log('[handleDragEnd] Reordering item within column.');
        setBoardState(prevBoardState => {
          const itemsInColumn = prevBoardState[sourceColumnStatus] || [];
          const oldIndex = itemsInColumn.findIndex(item => item.id === processedItemId);
          const newIndex = itemsInColumn.findIndex(item => item.id === overId);

          if (oldIndex !== -1 && newIndex !== -1) {
            return {
              ...prevBoardState,
              [sourceColumnStatus]: arrayMove(itemsInColumn, oldIndex, newIndex),
            };
          }
          return prevBoardState; // Return unchanged state if indices are invalid
        });
      }
      // Clear active drag state after reordering logic is complete
      setActiveId(null);
    } else {
      // Moving item to a different column
      console.log('[handleDragEnd] Moving item to different column.');

      // --- Optimistic Update of allFetchedOrders ---
      let previousAllFetchedOrders: Order[] | null = null; // Store state for potential rollback

      setAllFetchedOrders(currentOrders => {
        previousAllFetchedOrders = [...currentOrders]; // Store for rollback
        const orderIndex = currentOrders.findIndex(order => order.items?.some(item => item.id === processedItemId));

        if (orderIndex === -1) {
          console.error("[handleDragEnd] Optimistic Update: Order not found for item.");
          previousAllFetchedOrders = null; // Invalidate rollback
          return currentOrders;
        }

        const updatedOrders = [...currentOrders]; // Create a new array
        const orderToUpdate = { ...updatedOrders[orderIndex] }; // Shallow copy the order
        const itemIndex = orderToUpdate.items?.findIndex(item => item.id === processedItemId);

        if (!orderToUpdate.items || itemIndex === undefined || itemIndex === -1) {
          console.error("[handleDragEnd] Optimistic Update: Item not found within order.");
          previousAllFetchedOrders = null; // Invalidate rollback
          return currentOrders;
        }

        const updatedItems = [...orderToUpdate.items]; // Shallow copy items array
        updatedItems[itemIndex] = { ...updatedItems[itemIndex], status: destinationColumnStatus }; // Update the specific item's status
        orderToUpdate.items = updatedItems; // Assign updated items back to the copied order
        updatedOrders[orderIndex] = orderToUpdate; // Put the updated order back into the new orders array

        console.log('[handleDragEnd] Optimistically updated allFetchedOrders.');
        return updatedOrders; // Return the new state
      });
      // --- End Optimistic Update ---


      // Persist the change to the backend AFTER optimistic update
      console.log('[handleDragEnd] Starting item status persistence.');
      try {
        await VendorCafeteriaController.updateOrderItemStatus(processedItemId, destinationColumnStatus);
        console.log(`[handleDragEnd] Successfully persisted item ${processedItemId} status to ${destinationColumnStatus}.`);
        // Realtime update will eventually confirm this state or correct discrepancies.
      } catch (error) {
        console.error("[handleDragEnd] Error during item status persistence:", error);
        setError(error instanceof Error ? error.message : "An unexpected error occurred while updating item status.");

        // --- Revert Optimistic Update on Error ---
        if (previousAllFetchedOrders) {
          console.log('[handleDragEnd] Reverting optimistic allFetchedOrders update due to error.');
          setAllFetchedOrders(previousAllFetchedOrders); // Revert the source of truth
        }
        // --- End Revert ---
      } finally {
         // Clear active drag state AFTER all logic (including potential async operations)
         setActiveId(null);
      }
      // NOTE: No need for the extra 'else' block here. setActiveId(null) is handled
      // within the 'if' block for reordering and within the 'finally' block for moving.
    }
  };

  // Helper to find the KanbanItem object by its ID for the DragOverlay
  // Reads from the source of truth: allFetchedOrders
  const findKanbanItemById = (id: UniqueIdentifier | null): KanbanItem | undefined => {
      if (!id) return undefined;
      for (const order of allFetchedOrders) {
          const item = order.items?.find(i => i.id === id);
          if (item && item.counterId === selectedCounterId) {
              const kanbanItemData: KanbanItem = {
                  ...item,
                  parentOrderId: order.id,
                  parentOrderCreatedAt: new Date(order.createdAt),
                  parentOrderPickupTime: order.pickupTime ? new Date(order.pickupTime) : undefined,
                  userName: order.student_full_name || 'Unknown User', // Use student_full_name from Order
              };
              return kanbanItemData;
          }
      }
      console.warn(`[findKanbanItemById] Could not find item with ID: ${id}`);
      return undefined;
  };
  // --- End Drag and Drop Handlers ---


  // --- Modal Logic ---
  const handleViewOrderDetails = (orderId: string) => {
    const parentOrder = allFetchedOrders.find(o => o.id === orderId);
    if (parentOrder) {
      setDetailOrder(parentOrder);
      onDetailModalOpen();
    } else {
      console.error("Could not find parent order details for ID:", orderId);
      setError("Could not load order details.");
    }
  };

  // --- End Modal Logic ---

  // Find the currently dragged KanbanItem for the overlay
  const draggedItem = findKanbanItemById(activeId);

  // Log boardState before rendering
  console.log("[Render] Rendering with boardState:", boardState);

  // Manual refresh handler
  const handleRefresh = () => {
    console.log("Manual refresh requested");
    fetchData();
  };

  return (
    <div ref={containerRef} className={`p-4 md:p-6 m-4 ${isFullscreen ? 'bg-background' : ''}`}>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
          <div className="flex items-center gap-3">
             <h1 className="text-2xl font-semibold">Order Item Management</h1>
             <Button isIconOnly size="sm" variant="ghost" aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"} onPress={toggleFullscreen}>
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </Button>
           </div>
           <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Select
                // label="Filter by Counter"
                placeholder="Select a counter"
                size="sm"
                selectedKeys={selectedCounterId ? [selectedCounterId] : []}
                onChange={(e) => setSelectedCounterId(e.target.value || null)}
                className="min-w-[200px]"
                aria-label="Select Counter Filter"
               >
                 {vendorCounters.map((counter) => (
                   // Corrected: Pass key prop, children is the display value
                   <SelectItem key={counter.id}>
                    {counter.name}
                  </SelectItem>
                ))}
              </Select>
              <Input
               isClearable
               placeholder="Search by Order ID or Item..."
               size="sm"
               startContent={<Search className="text-default-400" />}
               value={searchQuery}
               onClear={() => setSearchQuery('')}
               onValueChange={setSearchQuery}
                className="max-w-[250px]"
              />
              <Button isIconOnly size="sm" variant="ghost" onPress={handleRefresh} isDisabled={isLoading} aria-label="Refresh Orders">
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
        </CardHeader>
        <CardBody>
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <CircularProgress size="lg" aria-label="Loading..." label="Loading order items..." />
            </div>
          )}
          {!isLoading && !selectedCounterId && vendorCounters.length > 0 && (
              <div className="p-4 text-center text-default-500">Please select a counter to view items.</div>
          )}
           {!isLoading && selectedCounterId && vendorCounters.length === 0 && (
              <div className="p-4 text-center text-default-500">No counters found for this vendor.</div>
          )}
          {!isLoading && error && (
            <div className="p-4 mb-4 text-sm text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert">
              <AlertCircle className="inline w-4 h-4 mr-2" />{error}
            </div>
          )}
          {!isLoading && !error && selectedCounterId && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {KANBAN_ITEM_COLUMNS.map((status) => (
                  <DroppableItemColumn
                    key={status} // Revert key back to just status
                    id={status}
                    title={itemColumnTitles[status]}
                    items={boardState[status] || []} // Ensure items is always an array
                    menuItemsMap={menuItemsMap}
                    onViewOrderDetails={handleViewOrderDetails}
                  />
                ))}
              </div>
              <DragOverlay>
                {activeId && draggedItem ? (
                  <SortableItemCard
                    item={draggedItem}
                    menuItemName={menuItemsMap.get(draggedItem.menuItemId) || 'Unknown Item'}
                    onViewOrderDetails={() => {}} // No action needed in overlay
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </CardBody>
      </Card>

      {/* Order Detail Modal */}
      <Modal isOpen={isDetailModalOpen} onOpenChange={onDetailModalClose} size="xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Order Details ({detailOrder?.id.substring(0, 8)}...)
              </ModalHeader>
              <ModalBody>
                {detailOrder && (
                  <div className="space-y-4">
                    {/* Add checks for detailOrder before accessing properties */}
                    <p><span className="font-semibold">Order ID:</span> {detailOrder.id || 'N/A'}</p>
                    <p><span className="font-semibold">User:</span> {detailOrder.student_full_name || detailOrder.userId || 'N/A'}</p>
                    <p><span className="font-semibold">Overall Status:</span> {detailOrder.status ? <Chip size="sm" color={statusColorMap[detailOrder.status]} variant="flat">{detailOrder.status}</Chip> : 'N/A'}</p>
                    <p><span className="font-semibold">Created:</span> {detailOrder.createdAt ? new Date(detailOrder.createdAt).toLocaleString() : 'N/A'}</p>
                    {detailOrder.pickupTime && <p><span className="font-semibold">Pickup Time:</span> {new Date(detailOrder.pickupTime).toLocaleString()}</p>}
                    {/* Safely access totalPrice */}
                    <p><span className="font-semibold">Total:</span> {typeof detailOrder.totalPrice === 'number' ? `৳${detailOrder.totalPrice.toFixed(2)}` : 'N/A'}</p>

                    <h3 className="font-semibold mt-4 border-t pt-2">Items in this Order:</h3>
                    {/* Ensure items array exists before mapping */}
                    <ul className="list-none space-y-2">
                      {detailOrder.items && detailOrder.items.length > 0 ? (
                         detailOrder.items.map(item => {
                           // Add null check for item just in case
                           if (!item) return null;
                           const belongsToCurrentCounter = item.counterId === selectedCounterId;
                           return (
                             <li key={item.id} className={`border-b pb-2 last:border-b-0 ${belongsToCurrentCounter ? '' : 'opacity-60'}`}>
                               <div className="flex justify-between items-center">
                                 <div>
                                   <p>{item.quantity}x {menuItemsMap.get(item.menuItemId) || 'Unknown Item'} <span className="text-xs text-default-500">(Counter: {vendorCounters.find(c=>c.id === item.counterId)?.name ?? item.counterId?.substring(0,6) ?? 'N/A'})</span></p>
                                   {item.specialInstructions && <p className="text-xs italic text-default-500">Note: "{item.specialInstructions}"</p>}
                                 </div>
                                 {/* Add check for item.status */}
                                 <Chip size="sm" color={item.status ? itemStatusColorMap[item.status] : 'default'} variant="flat">{item.status || 'N/A'}</Chip>
                               </div>
                             </li>
                           );
                         })
                       ) : (
                         <li>No items found for this order.</li>
                       )}
                    </ul>
                  </div>
                )}
                {/* Add a fallback if detailOrder itself is null */}
                {!detailOrder && (
                   <p>Could not load order details.</p>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

    </div>
  );
}
