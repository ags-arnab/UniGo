import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { supabase } from '@/lib/supabaseClient'; // Import Supabase client
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'; // Import types
// Update controller import
import { VendorCafeteriaController } from '@/controllers/vendorCafeteriaController';
import { MenuItem } from '@/models/cafeteria';
import { CheckCircle } from 'lucide-react'; // Keep CheckCircle for success indication
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  getKeyValue,
  Card,
  CardHeader,
  CardBody,
  Input,
  Button,
  CircularProgress,
  Tooltip, // For showing success briefly
  Chip // Added Chip import
} from "@heroui/react";

interface StockUpdateState {
  [itemId: string]: {
    currentStock: number | string; // Store input value as string or number
    isSaving?: boolean;
    error?: string | null;
    success?: boolean;
  };
}

// TODO: Get vendorId from authentication context

export default function VendorInventoryManagementPage() { // Renamed component
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [stockUpdates, setStockUpdates] = useState<StockUpdateState>({});
  const { user } = useAuth(); // Get user context
  const menuItemChannelRef = useRef<RealtimeChannel | null>(null);
  const componentName = "VendorInventoryManagementPage"; // For logging context

  console.log(`[${componentName}] Component rendering or re-rendering.`); // Log component render

  const fetchItems = useCallback(async () => {
    console.log(`[${componentName}] Fetching items...`); // Keep existing basic log
    setIsLoading(true);
    setPageError(null);
    try {
      // Use Vendor controller method (no vendor ID needed due to RLS)
      const items = await VendorCafeteriaController.getVendorMenuItems();
      setMenuItems(items);
      // Initialize stockUpdates state based on fetched items
      const initialStockState: StockUpdateState = {};
      items.forEach(item => {
        initialStockState[item.id] = { currentStock: item.stock ?? 0 }; // Use fetched stock
      }); // <-- Added closing parenthesis for forEach
      setStockUpdates(initialStockState); // Set the initial state
      console.log(`[${componentName}] Items fetched and stock state initialized. Count: ${items.length}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch menu items';
      setPageError(errorMsg);
      console.error(`[${componentName}] Fetch error:`, err);
    } finally {
      setIsLoading(false);
      console.log(`[${componentName}] Fetching items finished.`);
    }
  }, [componentName]); // <-- Added componentName to dependency array

  // --- Realtime Handler for Menu Items ---
  const handleMenuItemChange = useCallback((payload: RealtimePostgresChangesPayload<any>) => { // Use any for easier logging
    console.log(`[${componentName}] handleMenuItemChange triggered.`); // Log function start
    console.log(`[${componentName}] Realtime Menu Item Change Received (Payload):`, JSON.stringify(payload, null, 2)); // Log stringified payload
    const { eventType, new: newItemData, old: oldItemData, errors, table, schema } = payload;

    console.debug(`[${componentName}] Realtime Details: Event=${eventType}, Schema=${schema}, Table=${table}`);

    if (errors) {
      console.error(`[${componentName}] Realtime error received:`, JSON.stringify(errors, null, 2)); // Log stringified error
      setPageError(prev => prev ? `${prev}\nRealtime error: ${errors[0]}` : `Realtime error: ${errors[0]}`);
      return;
    }

    setMenuItems(currentItems => {
      console.log(`[${componentName}] Updating menuItems state based on realtime event.`);
      let updatedItems = [...currentItems];
      let changedItemId: string | null = null;
      let newStockValue: number | null | undefined = undefined; // Track stock changes
      const originalItems = [...currentItems]; // Keep original for comparison logging

      if (eventType === 'INSERT') {
        const newItem = newItemData as MenuItem; // Assume structure for logging
        if (!updatedItems.some(item => item.id === newItem.id)) {
          console.log(`[${componentName}] Adding new item ${newItem.id} via realtime.`);
          updatedItems = [newItem, ...updatedItems]; // Add to beginning for visibility
          changedItemId = newItem.id;
          newStockValue = newItem.stock;
        } else {
          console.log(`[${componentName}] Received INSERT for existing item ${newItem.id}, ignoring duplicate.`);
        }
      } else if (eventType === 'UPDATE') {
        const updatedItem = newItemData as MenuItem; // Assume structure for logging
        const index = updatedItems.findIndex(item => item.id === updatedItem.id);
        if (index !== -1) {
          console.log(`[${componentName}] Updating item ${updatedItem.id} via realtime.`);
          // Check if stock actually changed
          if (updatedItems[index].stock !== updatedItem.stock) {
             console.log(`[${componentName}] Stock changed for ${updatedItem.id}: ${updatedItems[index].stock} -> ${updatedItem.stock}`);
            newStockValue = updatedItem.stock;
          } else {
             console.log(`[${componentName}] Stock unchanged for ${updatedItem.id}.`);
          }
          updatedItems[index] = updatedItem;
          changedItemId = updatedItem.id;
        } else {
          // If update received for an item not in state, treat as insert
          console.log(`[${componentName}] Received update for unknown item ${updatedItem.id}, adding.`);
          updatedItems = [updatedItem, ...updatedItems];
          changedItemId = updatedItem.id;
          newStockValue = updatedItem.stock;
        }
      } else if (eventType === 'DELETE') {
        const deletedItemId = (oldItemData as any)?.id; // Use any for logging flexibility
        if (deletedItemId) {
          console.log(`[${componentName}] Removing item ${deletedItemId} via realtime.`);
          updatedItems = updatedItems.filter(item => item.id !== deletedItemId);
          // Remove from stockUpdates as well
          setStockUpdates(prev => {
            console.log(`[${componentName}] Removing item ${deletedItemId} from stockUpdates state.`);
            const newState = { ...prev };
            delete newState[deletedItemId];
            return newState;
          });
        }
      }

      // If an item was added or updated, update its stock in stockUpdates state
      if (changedItemId && newStockValue !== undefined) {
        console.log(`[${componentName}] Syncing stockUpdates for item ${changedItemId} to ${newStockValue ?? 'null'}`);
        setStockUpdates(prev => {
           const updatedStockState = {
            ...prev,
            [changedItemId!]: {
              // Preserve saving/error/success state if it exists, otherwise initialize
              ...(prev[changedItemId!] || {}),
              currentStock: newStockValue ?? 0, // Update the controlled input value
            }
          };
           console.log(`[${componentName}] New stockUpdates state for ${changedItemId}:`, updatedStockState[changedItemId!]);
           return updatedStockState;
        });
      }

      console.log(`[${componentName}] handleMenuItemChange finished. Items before: ${originalItems.length}, Items after: ${updatedItems.length}`);
      return updatedItems;
    });
  }, [componentName]); // Added componentName dependency

  // --- Function to setup subscriptions ---
  const setupRealtimeSubscriptions = useCallback(() => {
    console.log(`[${componentName}] Running setupRealtimeSubscriptions.`);
    // Cleanup existing channel
    if (menuItemChannelRef.current) {
      console.log(`[${componentName}] Cleaning up existing menu item channel.`);
      supabase.removeChannel(menuItemChannelRef.current).then(() => console.log(`[${componentName}] Cleaned up existing menu item channel.`));
      menuItemChannelRef.current = null;
    }

    if (!user) {
      console.log(`[${componentName}] Skipping subscription setup: No user.`);
      return;
    }

    console.log(`[${componentName}] Setting up menu item subscription for user ${user.id}`);
    const channelName = `vendor_menu_items_${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on<MenuItem>(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'menu_items',
          // RLS policies handle filtering for the vendor's items
        },
        handleMenuItemChange // Use the dedicated handler
      )
      .subscribe((status, err) => {
        console.log(`[${componentName}] Realtime channel '${channelName}' status: ${status}`, err || ''); // Log status changes
        if (status === 'SUBSCRIBED') {
          console.log(`[${componentName}] Realtime MENU_ITEMS channel subscribed successfully.`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error(`[${componentName}] Realtime MENU_ITEMS channel error/closed: ${status}`, err);
          setPageError(prev => prev ? `${prev}\nRealtime connection error: ${err?.message}` : `Realtime connection error: ${err?.message}`);
          // Optional: Attempt to resubscribe after a delay?
        }
      });
    menuItemChannelRef.current = channel;

  }, [user, handleMenuItemChange, componentName]); // Added componentName

  // Main useEffect for fetching data and setting up subscriptions
  useEffect(() => {
    let isMounted = true;
    console.log(`[${componentName}] Component mounted.`); // Log mount

    const fetchAndSubscribe = async () => {
        console.log(`[${componentName}] Running fetchAndSubscribe.`);
        await fetchItems(); // Fetch initial data
        if (isMounted) {
            console.log(`[${componentName}] Initial fetch complete. Setting up subscriptions.`);
            setupRealtimeSubscriptions();
        } else {
            console.log(`[${componentName}] Component unmounted before subscriptions setup.`);
        }
    };

    fetchAndSubscribe();

    // Cleanup function
    return () => {
      console.log(`[${componentName}] Component unmounting.`); // Log unmount
      isMounted = false;
      if (menuItemChannelRef.current) {
        const channelToRemove = menuItemChannelRef.current;
        menuItemChannelRef.current = null; // Clear ref immediately
        console.log(`[${componentName}] Removing realtime channel on unmount.`);
        supabase.removeChannel(channelToRemove)
          .then(() => console.log(`[${componentName}] Realtime channel removed successfully on unmount.`))
          .catch(err => console.error(`[${componentName}] Error removing channel on unmount:`, err));
      }
    };
  }, [fetchItems, setupRealtimeSubscriptions]); // Dependencies

  const handleStockInputChange = (itemId: string, value: string) => {
    console.log(`[${componentName}] handleStockInputChange: itemId=${itemId}, value=${value}`);
    setStockUpdates(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        currentStock: value, // Keep as string until save
        error: null, // Clear error on input change
        success: false, // Clear success message
      },
    }));
  };

  const handleSaveStock = async (itemId: string) => {
    console.log(`[${componentName}] handleSaveStock called for itemId: ${itemId}`);
    const updateInfo = stockUpdates[itemId];
    if (!updateInfo || updateInfo.isSaving) {
      console.log(`[${componentName}] handleSaveStock: Skipping save for ${itemId} (no update info or already saving).`);
      return;
    }

    const newStockValueStr = String(updateInfo.currentStock);
    // Validate input: Allow empty string (treat as 0) or positive integer
    const isValidInput = newStockValueStr === '' || /^\d+$/.test(newStockValueStr);
    const newStockNumber = isValidInput ? parseInt(newStockValueStr || '0', 10) : NaN;

    if (!isValidInput || isNaN(newStockNumber) || newStockNumber < 0) {
      console.warn(`[${componentName}] Invalid stock input for ${itemId}: ${newStockValueStr}`);
      setStockUpdates(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], error: 'Stock must be a non-negative number.', success: false },
      }));
      return;
    }

    console.log(`[${componentName}] Saving stock for ${itemId}: ${newStockNumber}`);
    // Set saving state
    setStockUpdates(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], isSaving: true, error: null, success: false },
    }));

    try {
      // Use Vendor controller method (no vendor ID needed due to RLS)
      await VendorCafeteriaController.setItemStock(itemId, newStockNumber);
      console.log(`[${componentName}] Successfully called setItemStock for ${itemId}.`);
      // Update local state to reflect saved number and show success
      // NOTE: Realtime should handle the menuItems update, but we update stockUpdates state here
      // to manage the input field and success/error indicators.
      setStockUpdates(prev => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          currentStock: newStockNumber, // Update input value to the saved number
          isSaving: false,
          success: true,
          error: null,
        },
      }));
      console.log(`[${componentName}] Updated stockUpdates state for ${itemId} after save.`);

      // Optionally clear success message after a delay
      setTimeout(() => {
         console.log(`[${componentName}] Clearing success indicator for ${itemId}.`);
         setStockUpdates(prev => ({
           ...prev,
           [itemId]: { ...prev[itemId], success: false },
         }));
      }, 2000);

    } catch (err) {
      console.error(`[${componentName}] Failed to update stock for ${itemId}:`, err);
      setStockUpdates(prev => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          isSaving: false,
          error: err instanceof Error ? err.message : 'Failed to save stock.',
          success: false,
        },
      }));
    }
  };

  // Define columns for the HeroUI Table
  const columns = [
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
    { key: "name", label: "Name", sortable: true },
    { key: "category", label: "Category", sortable: true },
    { key: "counterName", label: "Counter" }, // Changed to Counter Name
    { key: "stock", label: "Current Stock", sortable: true }, // Display the live item.stock
    { key: "available", label: "Available", sortable: true }, // Added Available column
    { key: "update", label: "Update Stock" },
  ];

  // TODO: Fetch counters to display names instead of IDs
  // For now, we'll just display the ID

  // Render cell content based on column key
  const renderCell = useCallback((item: MenuItem, columnKey: string | number) => {
    const cellValue = getKeyValue(item, columnKey);
    const updateState = stockUpdates[item.id] || { currentStock: item.stock ?? 0 };

    switch (columnKey) {
      case "counterName":
        // TODO: Replace with actual counter name lookup when counters are fetched
        return item.counterId.substring(0, 6) + '...'; // Display truncated counter ID for now
      case "stock":
        // console.log(`[${componentName}] Rendering stock cell for ${item.id}: ${item.stock}`); // DEBUG: Log stock value being rendered
        return item.stock ?? 'N/A'; // Display live stock from item object
      case "available":
         // Display availability status (e.g., using a Chip or simple text)
         return (
           <Chip size="sm" color={item.available ? "success" : "danger"} variant="flat">
             {item.available ? "Yes" : "No"}
           </Chip>
         );
      case "update":
        const isStockUnchanged = String(item.stock ?? 0) === String(updateState.currentStock);
        // console.log(`[${componentName}] Rendering update cell for ${item.id}. Stock: ${item.stock}, Input: ${updateState.currentStock}, Unchanged: ${isStockUnchanged}`); // DEBUG
        return (
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center gap-2">
              <Input
                type="number"
                aria-label={`Update stock for ${item.name}`}
                placeholder="Stock"
                size="sm"
                min={0}
                step={1}
                value={String(updateState.currentStock)} // Input value controlled by stockUpdates state
                onValueChange={(value) => handleStockInputChange(item.id, value)}
                isInvalid={!!updateState.error}
                isDisabled={updateState.isSaving}
                className="w-20"
              />
              <Tooltip content="Saved!" isOpen={updateState.success} color="success">
                <Button
                  isIconOnly
                  size="sm"
                  color={updateState.success ? "success" : "primary"}
                  variant="flat"
                  onPress={() => handleSaveStock(item.id)}
                  isDisabled={updateState.isSaving || isStockUnchanged} // Disable if saving or no change
                  isLoading={updateState.isSaving}
                  aria-label={`Save stock for ${item.name}`}
                >
                  {!updateState.isSaving && <CheckCircle className="h-4 w-4" />}
                </Button>
              </Tooltip>
            </div>
            {updateState.error && (
              <p className="text-xs text-danger mt-1">{updateState.error}</p>
            )}
          </div>
        );
      default:
        return String(cellValue); // Ensure string conversion for safety
    }
  }, [stockUpdates, componentName, handleStockInputChange, handleSaveStock]); // Added dependencies

  return (
    <Card className="p-4 md:p-6 m-4">
      <CardHeader>
        <h1 className="text-2xl font-semibold">Inventory Management</h1>
      </CardHeader>
      <CardBody>
        {isLoading && (
           <div className="flex justify-center items-center h-64">
              <CircularProgress size="lg" aria-label="Loading..." label="Loading inventory..." />
           </div>
        )}
        {!isLoading && pageError && (
           <div className="p-4 mb-4 text-sm text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert">
             <span className="font-medium">Error:</span> {pageError}
           </div>
        )}

        {!isLoading && !pageError && (
          <Table aria-label="Inventory Table">
            <TableHeader columns={columns}>
              {(column) => <TableColumn key={column.key} align={column.key === 'update' ? 'center' : 'start'}>{column.label}</TableColumn>}
            </TableHeader>
            {/* Corrected TableBody structure */}
            <TableBody items={menuItems} emptyContent={"No menu items found."}>
              {(item) => (
                <TableRow key={item.id}>
                  {/* Render cells directly using the renderCell function */}
                  {(columnKey) => (
                    <TableCell>{renderCell(item, columnKey)}</TableCell>
                  )}
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
}
