import { useState, useEffect, useRef, useCallback } from 'react'; // Added useCallback
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { supabase } from '@/lib/supabaseClient'; // Import Supabase client
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'; // Import types
import { VendorCafeteriaController } from '@/controllers/vendorCafeteriaController';
import { Counter } from '@/models/vendor/counter';
import { MenuItem } from '@/models/cafeteria';
import { Plus, Minus, Trash2, ShoppingCart, AlertCircle, Maximize, Minimize } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Select,
  SelectItem,
  CircularProgress,
  Image, // For menu item images
  Input,
  Divider,
  Badge, // Keep Badge for the cart icon
  Chip,  // Add Chip for the item stock
  RadioGroup, // Added
  Radio,
  Modal,        // Added
  ModalHeader,  // Added
  ModalBody,    // Added
  ModalFooter,  // Added
  useDisclosure // Added
} from "@heroui/react";
import { CheckCircle } from 'lucide-react'; // Added for success icon

// TODO: Get vendorId from authentication context

interface POSCartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  counterId: string; // Store counterId for validation/submission
}

export default function VendorPOSPage() {
  const [counters, setCounters] = useState<Counter[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCounterId, setSelectedCounterId] = useState<string | null>(null);
  const [posCart, setPosCart] = useState<POSCartItem[]>([]);
  const [isLoadingCounters, setIsLoadingCounters] = useState(true);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash'); // Added state
  const [studentId, setStudentId] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const posContainerRef = useRef<HTMLDivElement>(null);
  const { isOpen: isSuccessModalOpen, onOpen: openSuccessModal, onClose: closeSuccessModal } = useDisclosure(); // Added modal state
  const [lastOrderId, setLastOrderId] = useState<string | null>(null); // Added state to store last order ID for modal
  const { user } = useAuth(); // Get user context
  const menuItemChannelRef = useRef<RealtimeChannel | null>(null);

  // --- Fullscreen Logic ---
  const toggleFullscreen = () => {
    const element = posContainerRef.current;
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

  // Update state if fullscreen is exited via ESC key
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    // Cleanup listener on component unmount
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  // --- End Fullscreen Logic ---


  // Fetch counters on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingCounters(true);
      setError(null);
      try {
        // Controller uses authenticated user context, no vendorId needed here
        const fetchedCounters = await VendorCafeteriaController.getVendorCounters();
        const activeCounters = fetchedCounters.filter(c => c.isActive);
        setCounters(activeCounters);
        // Select the first active counter by default if available
        if (activeCounters.length > 0) {
          setSelectedCounterId(activeCounters[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch counters');
        console.error(err);
      } finally {
        setIsLoadingCounters(false);
      }
    };
    fetchInitialData();
  }, []); // Keep this effect for initial counter load

  // Fetch menu items when selectedCounterId changes (for initial load of that counter's menu)
  useEffect(() => {
    if (!selectedCounterId) {
      setMenuItems([]); // Clear menu if no counter selected
      return;
    }

    const fetchMenuItemsForCounter = async () => {
      setIsLoadingMenu(true);
      setError(null);
      try {
        // Fetch ALL items specifically for the selected counter
        // Let the realtime handler manage filtering based on availability
        const fetchedItems = await VendorCafeteriaController.getVendorMenuItems(selectedCounterId);
        console.log(`[POS] Initial fetch for counter ${selectedCounterId} got ${fetchedItems.length} items (before availability filter).`);
        // Apply the availability filter *here* for the initial display, consistent with the realtime handler
        const checkItemAvailability = (item: MenuItem | undefined | null): boolean => {
            return !!item && item.available && (item.stock === undefined || item.stock === null || item.stock > 0);
        };
        const availableItems = fetchedItems.filter(checkItemAvailability);
        console.log(`[POS] Setting initial menu with ${availableItems.length} available items.`);
        setMenuItems(availableItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch menu items for the selected counter');
        console.error("[POS] Error fetching menu items:", err);
      } finally {
        setIsLoadingMenu(false);
      }
    };

    fetchMenuItemsForCounter();
    // Note: Realtime subscription setup is handled in a separate useEffect below
  }, [selectedCounterId]); // Dependency on selectedCounterId

  // --- Realtime Handler for Menu Items ---
  const handleMenuItemChange = useCallback((payload: RealtimePostgresChangesPayload<MenuItem>) => {
    // Log the raw payload for detailed debugging
    console.log('[POS] Realtime Menu Item Change Received:', JSON.stringify(payload, null, 2));
    const { eventType, new: newItemData, old: oldItemData, errors } = payload;

    if (errors) {
      console.error('[POS] Realtime error:', errors);
      setError(prev => prev ? `${prev}\nRealtime error: ${errors[0]}` : `Realtime error: ${errors[0]}`);
      return;
    }

    // Get the ID of the item that changed
    const changedItemId = (eventType === 'DELETE' ? oldItemData?.id : newItemData?.id);
    if (!changedItemId) return; // Cannot process without an ID

    // Get the counter ID of the item that changed - Defensive check for both casings
    let changedItemCounterId: string | undefined;
    if (eventType === 'DELETE') {
        // Attempt to get from old data, might be limited
        changedItemCounterId = oldItemData?.counterId ?? (oldItemData as any)?.counter_id;
        console.log(`[POS] Extracted counterId from OLD data (DELETE): ${changedItemCounterId}`);
    } else {
        // For INSERT/UPDATE, prioritize typed access, fallback to snake_case
        changedItemCounterId = newItemData?.counterId ?? (newItemData as any)?.counter_id;
         console.log(`[POS] Extracted counterId from NEW data (INSERT/UPDATE): ${changedItemCounterId}`);
    }

    // Log values right before the crucial check
    console.log(`[POS] PRE-CHECK: EventType=${eventType}, ChangedItemID=${changedItemId}, ExtractedCounterID=${changedItemCounterId}, SelectedCounterID=${selectedCounterId}`);

    // --- Only update the displayed menu if the change affects the currently selected counter ---
    if (changedItemCounterId && changedItemCounterId === selectedCounterId) { // Ensure changedItemCounterId is not undefined
        console.log(`[POS] Counter ID matches selected counter. Proceeding with UI update for item ${changedItemId}.`);

      // Define availability check function locally for clarity, handling potential snake_case from payload
      const checkItemAvailability = (itemData: any | undefined | null): boolean => {
          if (!itemData) return false;
          // Prioritize direct access, fallback to snake_case if needed (though 'available' and 'stock' are same)
          const available = itemData.available ?? (itemData as any).available;
          const stock = itemData.stock ?? (itemData as any).stock;
          const isAvailable = !!itemData && available && (stock === undefined || stock === null || stock > 0);
          console.log(`[POS] Availability check for item ${itemData.id}: available=${available}, stock=${stock}, result=${isAvailable}`);
          return isAvailable;
      };

      setMenuItems(currentItems => {
        console.log(`[POS] setMenuItems START. Current items count: ${currentItems.length}. Event: ${eventType}, Item ID: ${changedItemId}`);
        let nextState = [...currentItems]; // Create a mutable copy

        // Helper to create a consistent MenuItem object from payload data
        const mapPayloadToMenuItem = (payloadData: any): MenuItem => {
            // Basic mapping, assuming payload might have snake_case
            // This should ideally align perfectly with mapMenuItemFromDb in controller if possible,
            // but Realtime payload might differ slightly.
            return {
                id: payloadData.id,
                counterId: payloadData.counterId ?? payloadData.counter_id,
                name: payloadData.name,
                description: payloadData.description,
                price: payloadData.price,
                category: payloadData.category,
                allergens: payloadData.allergens || [],
                ingredients: payloadData.ingredients || [],
                imagePath: payloadData.imagePath ?? payloadData.image_path,
                available: payloadData.available ?? (payloadData as any).available, // Handle casing
                stock: payloadData.stock ?? (payloadData as any).stock,             // Handle casing
                isDietFood: payloadData.isDietFood ?? payloadData.is_diet_food ?? false,
                // Add nutritionalInfo if present in payload
                nutritionalInfo: payloadData.nutritionalInfo ?? {
                    protein: payloadData.protein,
                    carbs: payloadData.carbs,
                    fat: payloadData.fat,
                },
                // Add other fields as needed based on actual payload structure
            };
        };


        if (eventType === 'INSERT') {
          const newItem = mapPayloadToMenuItem(newItemData); // Map from payload
          console.log('[POS] Handling INSERT.');
          const isAvailable = checkItemAvailability(newItemData); // Check raw payload data
          const exists = nextState.some(item => item.id === newItem.id);
          if (isAvailable && !exists) {
            console.log(`[POS] Adding available item ${newItem.id}`);
            nextState.unshift(newItem); // Add the mapped item
          } else {
            console.log(`[POS] Item ${newItem.id} insert ignored (unavailable or exists).`);
          }
        } else if (eventType === 'UPDATE') {
          const updatedItem = mapPayloadToMenuItem(newItemData); // Map from payload
          console.log('[POS] Handling UPDATE for item:', updatedItem.id);
          const isAvailable = checkItemAvailability(newItemData); // Check raw payload data
          const index = nextState.findIndex(item => item.id === updatedItem.id);

          if (isAvailable) {
            if (index !== -1) {
              console.log(`[POS] Updating item ${updatedItem.id} at index ${index}.`);
              nextState[index] = updatedItem; // Update in place with mapped item
            } else {
              console.log(`[POS] Item ${updatedItem.id} became available, adding.`);
              nextState.unshift(updatedItem); // Add the mapped item
            }
          } else {
            // Not available
            if (index !== -1) {
              console.log(`[POS] Item ${updatedItem.id} became unavailable, removing.`);
              nextState.splice(index, 1); // Remove from array
            } else {
               console.log(`[POS] Item ${updatedItem.id} update ignored (unavailable and not in list).`);
            }
          }
        } else if (eventType === 'DELETE') {
          console.log('[POS] Handling DELETE for item:', changedItemId);
          const index = nextState.findIndex(item => item.id === changedItemId);
          if (index !== -1) {
            console.log(`[POS] Removing item ${changedItemId} at index ${index}.`);
            nextState.splice(index, 1); // Remove from array
          } else {
             console.log(`[POS] Item ${changedItemId} delete ignored (not in list).`);
          }
        }

        console.log(`[POS] setMenuItems END. New items count: ${nextState.length}.`);
        // Return the potentially modified array. If splice/unshift modified it, it's a new reference.
        // If no changes happened, returning the same reference is fine, React optimizes.
        return nextState;
      });

      // Optional: Check cart consistency (more complex UI logic)
      // e.g., if an item in the cart becomes unavailable, highlight it or show a warning.
      // For now, validation happens primarily during order submission.

    } else {
       // Log the reason for ignoring
       console.log(`[POS] Change detected for item ${changedItemId}, but counter ID mismatch or missing. ExtractedCounterID=${changedItemCounterId}, SelectedCounterID=${selectedCounterId}. Ignoring UI update.`);
    }
  }, [selectedCounterId]); // Dependency on selectedCounterId to filter updates

  // --- Function to setup subscriptions ---
  const setupRealtimeSubscriptions = useCallback(() => {
    // Cleanup existing channel
    if (menuItemChannelRef.current) {
      supabase.removeChannel(menuItemChannelRef.current).then(() => console.log("[POS] Cleaned up existing menu item channel."));
      menuItemChannelRef.current = null;
    }

    if (!user) {
      console.log("[POS] Skipping subscription setup: No user.");
      return;
    }

    console.log(`[POS] Setting up menu item subscription for user ${user.id}`);

    const channel = supabase
      .channel(`vendor_menu_items_pos_${user.id}`) // Unique channel name for POS context
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
        if (status === 'SUBSCRIBED') {
          console.log(`[POS] Realtime MENU_ITEMS channel subscribed.`);
        } else {
          console.error(`[POS] Realtime MENU_ITEMS channel error: ${status}`, err);
          setError(prev => prev ? `${prev}\nRealtime connection error: ${err?.message}` : `Realtime connection error: ${err?.message}`);
        }
      });
    menuItemChannelRef.current = channel;

  }, [user, handleMenuItemChange]); // Dependencies

  // Main useEffect for setting up subscriptions (runs once on mount/user change)
  useEffect(() => {
    let isMounted = true;
    console.log("[POS] Subscription useEffect running.");

    if (isMounted) {
        setupRealtimeSubscriptions();
    }

    // Cleanup function
    return () => {
      console.log("[POS] Subscription useEffect cleanup.");
      isMounted = false;
      if (menuItemChannelRef.current) {
        supabase.removeChannel(menuItemChannelRef.current)
          .then(() => console.log("[POS] Realtime channel removed on unmount."))
          .catch(err => console.error("[POS] Error removing channel on unmount:", err));
        menuItemChannelRef.current = null;
      }
    };
  }, [setupRealtimeSubscriptions]); // Dependency

  const handleAddToCart = (item: MenuItem) => {
    if (!selectedCounterId) return; // Should not happen if button is enabled

    setPosCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(cartItem => cartItem.menuItemId === item.id);
      if (existingItemIndex > -1) {
        // Increment quantity
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + 1,
        };
        return updatedCart;
      } else {
        // Add new item
        return [
          ...prevCart,
          { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, counterId: selectedCounterId }
        ];
      }
    });
  };

  const handleUpdateQuantity = (menuItemId: string, newQuantity: number) => {
    setPosCart(prevCart => {
      if (newQuantity <= 0) {
        // Remove item if quantity is zero or less
        return prevCart.filter(item => item.menuItemId !== menuItemId);
      }
      // Update quantity
      return prevCart.map(item =>
        item.menuItemId === menuItemId ? { ...item, quantity: newQuantity } : item
      );
    });
  };

  const handleRemoveFromCart = (menuItemId: string) => {
    setPosCart(prevCart => prevCart.filter(item => item.menuItemId !== menuItemId));
  };

  const calculateCartTotal = () => {
    return posCart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const handleSubmitOrder = async () => {
    if (!selectedCounterId || posCart.length === 0 || isSubmittingOrder) return;
    if (paymentMethod === 'online' && !studentId.trim()) {
      setError("Please enter the Student ID for online payment.");
      return;
    }

    setIsSubmittingOrder(true);
    setError(null);

    let actualStudentUserId: string | null = null;

    // --- Lookup Student UUID if payment is online ---
    if (paymentMethod === 'online') {
      const studentRegNumberToSearch = studentId.trim(); // Trim whitespace
      console.log("Attempting to find student UUID for student_id:", studentRegNumberToSearch); // Log the ID being searched
      try {
        actualStudentUserId = await VendorCafeteriaController.findStudentUserIdByRegNumber(studentRegNumberToSearch);
        if (!actualStudentUserId) {
          // Make error slightly more specific
          throw new Error(`Student ID "${studentRegNumberToSearch}" not found or profile is not a student.`);
        }
      } catch (lookupErr) {
        setError(lookupErr instanceof Error ? lookupErr.message : "Failed to verify Student ID.");
        setIsSubmittingOrder(false);
        return; // Stop submission if lookup fails
      }
    }
    // --- End Lookup ---

    const orderItems = posCart.map(item => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      // specialInstructions could be added here if needed
    }));

    try {
      // Pass paymentMethod and the actual UUID (actualStudentUserId) if online
      const createdOrderId = await VendorCafeteriaController.createInPersonOrder(
        orderItems,
        selectedCounterId,
        paymentMethod,
        actualStudentUserId // Pass the looked-up UUID or null
      );
      
      console.log('POS Order Created:', createdOrderId);
      setPosCart([]); // Clear cart
      setStudentId(''); // Clear student ID input
      setPaymentMethod('cash'); // Reset payment method
      
      // Update modal state
      setLastOrderId(createdOrderId); 
      console.log("Order successful, opening success modal for order:", createdOrderId);
      openSuccessModal(); // Call directly without setTimeout
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit POS order');
      console.error("Order submission error:", err);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const totalCartItems = posCart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    // Revert to using bg-background for fullscreen
    <div ref={posContainerRef} className={`p-4 md:p-6 m-4 grid grid-cols-1 lg:grid-cols-3 gap-6 ${isFullscreen ? 'bg-background' : ''}`}>
      {/* Column 1: Counter Selection & Menu */}
      <div className="lg:col-span-2">
        {/* Remove explicit card background, let Card component handle it */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
            <div className="flex items-center gap-3"> {/* Group title and fullscreen button */}
              <h1 className="text-2xl font-semibold">Point of Sale (POS)</h1>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                onPress={toggleFullscreen}
              >
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </Button>
            </div>
            {isLoadingCounters ? (
              <CircularProgress size="sm" aria-label="Loading counters..." />
            ) : (
              <Select
                aria-label="Select Counter"
                placeholder="Select a Counter"
                selectedKeys={selectedCounterId ? [selectedCounterId] : []}
                onSelectionChange={(keys) => {
                  const newKey = Array.from(keys)[0];
                  setSelectedCounterId(newKey ? String(newKey) : null);
                  setPosCart([]); // Clear cart when counter changes
                }}
                className="min-w-[200px]"
                size="sm"
                isDisabled={counters.length === 0}
                items={counters}
              >
                {(counter) => <SelectItem key={counter.id}>{counter.name}</SelectItem>}
              </Select>
            )}
          </CardHeader>
          <CardBody>
            {error && (
              <div className="p-4 mb-4 text-sm text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert">
                <AlertCircle className="inline w-4 h-4 mr-2" />{error}
              </div>
            )}
            {!selectedCounterId && !isLoadingCounters && (
              // Revert to text-default-500
              <p className="text-center text-default-500">Please select an active counter to view the menu.</p>
            )}
            {isLoadingMenu && selectedCounterId && (
              <div className="flex justify-center items-center h-64">
                <CircularProgress size="lg" aria-label="Loading menu..." label="Loading menu..." />
              </div>
            )}
            {!isLoadingMenu && selectedCounterId && menuItems.length === 0 && !error && (
               // Revert to text-default-500
               <p className="text-center text-default-500">No available menu items found for this counter.</p>
            )}
            {!isLoadingMenu && selectedCounterId && menuItems.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {menuItems.map((item) => (
                  <Card key={item.id} shadow="sm" isPressable onPress={() => handleAddToCart(item)} className="relative"> {/* Ensure Card has relative positioning */}
                    {/* Chip removed from here */}
                    <CardBody className="overflow-visible p-0">
                      <Image
                        shadow="sm"
                        radius="lg"
                         width="100%"
                          alt={item.name}
                          className="w-full object-contain h-[140px]" // Changed object-cover to object-contain
                          src={VendorCafeteriaController.getMenuItemImageUrl(item.imagePath) || 'https://placehold.co/300x200?text=No+Image'}
                        />
                       </CardBody>
                       {/* Remove explicit footer background */}
                      <CardFooter className="text-small justify-between items-center"> {/* Added items-center */}
                        <div className="flex items-center gap-2"> {/* Wrap name and chip */}
                          <b>{item.name}</b>
                          {/* Stock Chip - Moved here */}
                          <Chip
                            color={item.stock && item.stock < 10 ? "warning" : "primary"} // Conditional color
                            variant="flat"
                            size="sm"
                          >
                            {item.stock !== null && item.stock !== undefined ? `Stock: ${item.stock}` : 'Available'} {/* Show Stock: X or Available */}
                          </Chip>
                        </div>
                       {/* Revert to text-default-500 */}
                       <p className="text-default-500">৳{item.price.toFixed(2)}</p>
                     </CardFooter>
                   </Card>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Column 2: POS Cart */}
      <div className="lg:col-span-1">
         {/* Remove explicit card background */}
        <Card className="sticky top-6"> {/* Make cart sticky */}
          <CardHeader className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Current Order</h2>
            <Badge content={totalCartItems} color="primary" isInvisible={totalCartItems === 0}>
              <ShoppingCart className="h-6 w-6" />
            </Badge>
          </CardHeader>
          <CardBody className="max-h-[60vh] overflow-y-auto"> {/* Scrollable cart */}
            {posCart.length === 0 ? (
               // Revert to text-default-500
              <p className="text-center text-default-500 py-8">Cart is empty. Add items from the menu.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {posCart.map((item) => (
                  <div key={item.menuItemId} className="flex items-center justify-between gap-2">
                    <div className="flex-grow">
                      <p className="font-medium">{item.name}</p>
                       {/* Revert to text-default-500 */}
                      <p className="text-small text-default-500">৳{item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                       <Button
                         isIconOnly
                         size="sm"
                         variant="flat"
                         aria-label="Decrease quantity"
                         onPress={() => handleUpdateQuantity(item.menuItemId, item.quantity - 1)}
                       >
                         <Minus className="h-4 w-4" />
                       </Button>
                       <Input
                          type="number"
                          aria-label="Quantity"
                          value={String(item.quantity)}
                          onValueChange={(val) => handleUpdateQuantity(item.menuItemId, parseInt(val, 10) || 0)}
                          className="w-12 text-center"
                          size="sm"
                          min={1}
                       />
                       <Button
                         isIconOnly
                         size="sm"
                         variant="flat"
                         aria-label="Increase quantity"
                         onPress={() => handleUpdateQuantity(item.menuItemId, item.quantity + 1)}
                       >
                         <Plus className="h-4 w-4" />
                       </Button>
                    </div>
                     <Button
                       isIconOnly
                       size="sm"
                       variant="light"
                       color="danger"
                       aria-label="Remove item"
                       onPress={() => handleRemoveFromCart(item.menuItemId)}
                     >
                       <Trash2 className="h-4 w-4" />
                     </Button>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
          {posCart.length > 0 && (
            <>
              <Divider />
              {/* Payment Method Selection */}
              <CardBody> {/* Added CardBody for padding */}
                <RadioGroup
                  label="Payment Method"
                  orientation="horizontal"
                  value={paymentMethod}
                  onValueChange={(value) => setPaymentMethod(value as 'cash' | 'online')}
                  className="mb-4"
                >
                  <Radio value="cash">Cash</Radio>
                  <Radio value="online">Online (Student Balance)</Radio>
                </RadioGroup>

                {paymentMethod === 'online' && (
                  <Input
                    label="Student ID"
                    placeholder="Enter Student ID"
                    value={studentId}
                    onValueChange={setStudentId}
                    className="mb-4"
                    isRequired
                    size="sm"
                  />
                )}
              </CardBody>
              <Divider />
              <CardFooter className="flex flex-col gap-3">
                <div className="flex justify-between w-full font-semibold">
                  <span>Total:</span>
                  <span>৳{calculateCartTotal().toFixed(2)}</span>
                </div>
                <Button
                  color="primary"
                  fullWidth
                  onPress={handleSubmitOrder}
                  isLoading={isSubmittingOrder}
                  isDisabled={!selectedCounterId || posCart.length === 0 || isSubmittingOrder}
                >
                  {isSubmittingOrder ? 'Submitting...' : 'Submit Order'}
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>

      {/* Success Modal */}
      {/* Use fixed positioning and flex centering utilities */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={closeSuccessModal}
        backdrop="blur"
        className="fixed inset-0 flex items-center justify-center z-50" // Added positioning and centering classes
      >
        {/* Use theme background for modal */}
        <ModalHeader className="flex flex-col gap-1 items-center text-success-600 dark:text-success-400"> {/* Use success color */}
          <CheckCircle className="h-10 w-10 mb-2" />
          Order Submitted Successfully!
        </ModalHeader>
        <ModalBody className="text-center">
          <p>
            Order ID: <span className="font-semibold">{lastOrderId}</span> has been created.
          </p>
          <p className="text-sm text-foreground/70 mt-1">
            The order is marked as completed and balances (if applicable) have been updated.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button color="success" variant="light" onPress={closeSuccessModal}> {/* Use success color */}
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
