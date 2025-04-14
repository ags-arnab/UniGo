import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CafeteriaController } from '@/controllers/studentCafeteriaController';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { useStudentCartStore } from '@/store/studentCartStore'; // Import the new cart store
import { 
  Button,
  Card, CardHeader, CardBody, CardFooter, 
  Tabs, Tab,
  Divider,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, // Added ModalFooter
} from "@heroui/react";
import { AlertTriangle, Check } from "lucide-react"; // Added CheckCircle
import { CheckCircleIcon } from '@heroicons/react/24/outline'; // Added Heroicon CheckCircleIcon

// Define the possible order types
type OrderPickupType = 'instant' | 'later';

// Define the OrderItem interface for the UI
interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  counterId: string; // Added counterId
  customizations?: string[];
}

// Renaming component to reflect its purpose (Checkout)
const StudentCafeteriaCheckout: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // Get user from auth context
  const cartItemsFromStore = useStudentCartStore((state) => state.cartItems); // Get cart items from the new store
  const [cartItemsForSummary, setCartItemsForSummary] = useState<OrderItem[]>([]);
  const [cartTotals, setCartTotals] = useState({ subtotal: 0, tax: 0, total: 0 });
  const [studentData, setStudentData] = useState<{ name: string | null; studentId: string | null; balance: number } | null>(null); // State for student info
  const [isLoadingStudentInfo, setIsLoadingStudentInfo] = useState<boolean>(true); // Loading state for student info

  // Get initial order state from controller
  const initialOrderState = CafeteriaController.initializeOrderPlacement();
  const [orderType, setOrderType] = useState<OrderPickupType>(initialOrderState.orderType);
  const [error, setError] = useState<string | null>(initialOrderState.error);
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(initialOrderState.isPlacingOrder);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState<boolean>(false); // Confirmation dialog
  const [isOrderSuccessful, setIsOrderSuccessful] = useState<boolean>(initialOrderState.isOrderSuccessful);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState<boolean>(false); // New state for success modal

  // Removed synchronous call to getStudentInfo

  // State for hold-to-order button
  const [isHoldingOrderButton, setIsHoldingOrderButton] = useState<boolean>(false);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const HOLD_DURATION = 2000; // 2 seconds in milliseconds

  // Fetch cart items, calculate totals, and fetch student info on load/user change
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setError("Please log in to proceed with checkout.");
        setIsLoadingStudentInfo(false);
        setCartItemsForSummary([]);
        setCartTotals({ subtotal: 0, tax: 0, total: 0 });
        return;
      }

      setIsLoadingStudentInfo(true);
      setError(null);
      try {
        // Fetch student info first
        const fetchedStudentInfo = await CafeteriaController.getStudentInfo(user.id);
        setStudentData(fetchedStudentInfo);

        // Use controller to get and validate cart
        const validationError = CafeteriaController.validateCart();
      if (validationError) {
        setError(validationError);
        setCartItemsForSummary([]);
        setCartTotals({ subtotal: 0, tax: 0, total: 0 });
        return;
      }

      // Use cart items directly from the store hook
      const currentCartItems = cartItemsFromStore; 

      // Use controller to format cart items for display *first*
      const mappedItems = CafeteriaController.formatCartItemsForDisplay(currentCartItems);
      setCartItemsForSummary(mappedItems);

      // Use controller to calculate totals *asynchronously* using the cart items from the store
      const totals = await CafeteriaController.calculateOrderTotals(currentCartItems); // Await the promise
      setCartTotals(totals); // Set state with the resolved totals object

    } catch (err) {
       console.error('Error loading cart items:', err);
       setError(err instanceof Error ? err.message : 'Failed to load cart items.');
       setCartItemsForSummary([]);
       setCartTotals({ subtotal: 0, tax: 0, total: 0 });
    } finally {
      setIsLoadingStudentInfo(false); // Stop loading student info regardless of outcome
    }
   };

    loadData();
  }, [user, cartItemsFromStore]); // Rerun if user OR cartItemsFromStore changes

  // Function to open the confirmation dialog
  const handleOpenOrderDialog = () => {
    if (cartItemsForSummary.length === 0) {
      setError("Cannot confirm an empty order.");
      return;
    }
    // Reset any previous errors specific to placing order
    setError(null);
    setIsOrderSuccessful(false);
    setHoldProgress(0);
    setIsOrderDialogOpen(true);
  };

  // Function containing the actual order placement logic
  const executePlaceOrder = async () => {
    if (isPlacingOrder || isOrderSuccessful) return;

    setIsPlacingOrder(true);
    setError(null);
    
    // Ensure user is available before placing order
    if (!user) {
      setError("User not authenticated. Cannot place order.");
      setIsPlacingOrder(false);
      return;
    }

    // Ensure student data is loaded before placing order
    if (!studentData) {
      setError("Student information not loaded. Cannot place order.");
      setIsPlacingOrder(false);
      return;
    }

    // Use controller to handle the order placement process
    const result = await CafeteriaController.handleOrderPlacement(
      orderType,
      studentData.balance, // Use balance from state
      cartTotals.total,
      user.id // Pass the actual user ID
    );

    if (result.success) {
      // Set success state
      // Set success state for button visual
      setIsOrderSuccessful(true);
      setHoldProgress(100);

      // Close the confirmation dialog
      setIsOrderDialogOpen(false);
      // Show the dedicated success modal
      setIsSuccessModalVisible(true);

      // Clear cart after successful order (optional, depends on desired flow)
      // CafeteriaController.clearCart(); // Uncomment if needed

    } else {
      // Set error state (keep confirmation dialog open)
      setError(result.error || 'Unknown error occurred');
    }
    
    setIsPlacingOrder(false);
  };

  // --- Hold-to-Order Button Logic ---

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const handleMouseDown = () => {
    if (isPlacingOrder || isOrderSuccessful) return;
    setIsHoldingOrderButton(true);
    setHoldProgress(0);

    // Start the main timer for order execution
    holdTimerRef.current = setTimeout(() => {
      setHoldProgress(100);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      executePlaceOrder();
    }, HOLD_DURATION);

    // Start the interval for visual progress update
    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const progress = Math.min(100, Math.floor((elapsedTime / HOLD_DURATION) * 100));
      setHoldProgress(progress);
      if (progress >= 100) {
         clearInterval(progressIntervalRef.current!);
         progressIntervalRef.current = null;
      }
    }, 30);
  };

  const handleMouseUpOrLeave = () => {
    if (isHoldingOrderButton && !isPlacingOrder && !isOrderSuccessful) {
      clearHoldTimer();
      setIsHoldingOrderButton(false);
      setHoldProgress(0);
    }
  };

  // Cleanup timers on component unmount
  useEffect(() => {
    return () => {
      clearHoldTimer();
    };
  }, []);

  // Loading state for student info
  if (isLoadingStudentInfo) {
     return (
       <div className="container mx-auto px-4 py-8 text-center">
         Loading student information...
       </div>
     );
  }

  // Handle case where cart is empty or student info failed to load
  if ((cartItemsForSummary.length === 0 && !error) || !studentData) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
          {error || "Your cart is empty or student data could not be loaded."}
          <Button onClick={() => navigate('/student/cafeteria/menu')} className="mt-4">
              Back to Menu
          </Button>
      </div>
    );
  }

  // Rest of the component's JSX rendering...
  return (
    <div className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Column 1: Order Summary (takes 2 cols on lg screens) */}
      <div className="lg:col-span-2">
        <h1 className="text-3xl font-bold mb-6">Checkout</h1>
        
        {/* Display general errors here if needed */}
        {error && !isOrderDialogOpen && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded">
                Error: {error}
            </div>
        )}
        
        <Card className="shadow-md">
          <CardHeader>
            <h2 className="text-xl font-semibold text-default-800">Order Summary</h2>
          </CardHeader>
          <CardBody className="divide-y divide-default-100">
            {/* Display cart items */}
            {cartItemsForSummary.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                <div className="flex-1 mr-4">
                  {/* Display item name, quantity, and counter ID */}
                  <p className="font-medium text-default-800">
                    {item.name} (x{item.quantity}) <span className="text-xs text-default-500">({item.counterId})</span>
                  </p>
                  {item.customizations && item.customizations.length > 0 && (
                    <p className="text-sm text-default-600"> - {item.customizations.join(', ')}</p>
                  )}
                </div>
                <p className="font-medium text-default-800">৳{(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </CardBody>
          <Divider />
          <CardFooter>
            <div className="w-full space-y-2 text-default-700">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium text-default-800">৳{cartTotals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (8%):</span>
                <span className="font-medium text-default-800">৳{cartTotals.tax.toFixed(2)}</span>
              </div>
              <Divider className="my-1" />
              <div className="flex justify-between font-bold text-lg text-default-900">
                <span>Total:</span>
                <span>৳{cartTotals.total.toFixed(2)}</span>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Column 2: Order Options */}
      <div className="lg:col-span-1">
        <Card className="shadow-md">
          <CardHeader>
            <h2 className="text-xl font-semibold text-default-800">Pickup Options</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            {/* Tabs for Pickup Type */}
            <Tabs
              aria-label="Pickup Options"
              selectedKey={orderType}
              onSelectionChange={(key) => setOrderType(key as OrderPickupType)}
              color="primary"
              variant="underlined"
            >
              <Tab key="instant" title="Instant Pickup">
                <p className="text-sm text-default-600 mt-2 px-1">
                  Your order will be prepared immediately. Proceed to confirm.
                </p>
              </Tab>
              <Tab key="later" title="Pickup Later">
                <div className="mt-3 p-3 bg-warning-50 border border-warning-200 rounded-md text-warning-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 mt-0.5 text-warning-600 flex-shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-medium text-sm">Important Pickup Information</p>
                      <p className="text-xs mt-1">
                        Orders must be picked up within <span className="font-semibold">30 minutes</span> of confirmation.
                        Unclaimed orders will be cancelled <span className="font-semibold">without refund</span>.
                      </p>
                    </div>
                  </div>
                </div>
              </Tab>
            </Tabs>
          </CardBody>
          <Divider />
          <CardFooter>
            <Button
              fullWidth
              onClick={handleOpenOrderDialog}
              size="lg"
              color="primary"
              isDisabled={cartItemsForSummary.length === 0 || isPlacingOrder}
            >
              {isPlacingOrder ? 'Processing...' : `Confirm Order & Pay ৳${cartTotals.total.toFixed(2)}`}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Order Confirmation Modal */}
      <Modal
        isOpen={isOrderDialogOpen}
        onClose={() => !(isPlacingOrder || isOrderSuccessful) && setIsOrderDialogOpen(false)}
        backdrop="blur"
      >
        <ModalContent>
          <ModalHeader>
            <h3 className="text-xl font-bold">Confirm Your Order</h3>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="p-4 bg-default-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Student Name:</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">{studentData?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Student ID:</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">{studentData?.studentId || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Available Balance:</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">৳{(studentData?.balance ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-neutral-700 dark:text-neutral-300">Order Total:</span>
                  <span className="text-neutral-900 dark:text-neutral-100">৳{cartTotals.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Display Error in Dialog if exists */}
              {error && (
                <div className="mt-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded text-sm">
                  Error: {error}
                </div>
              )}
              
              {/* Balance Check and Message */}
              {studentData && !CafeteriaController.hassufficientBalance(studentData.balance, cartTotals.total) && (
                <div className="mt-4 p-3 bg-warning-100 text-warning-800 border border-warning-300 rounded text-sm flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning-600 flex-shrink-0" />
                  <span>Insufficient balance to place this order.</span>
                </div>
              )}

              {/* Hold-to-Order Button */}
              <div className="mt-6">
                <Button
                  fullWidth
                  size="lg"
                  color={isOrderSuccessful ? "success" : "primary"}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUpOrLeave}
                  onMouseLeave={handleMouseUpOrLeave}
                  onTouchStart={handleMouseDown}
                  onTouchEnd={handleMouseUpOrLeave}
                  disabled={isPlacingOrder || isOrderSuccessful || !studentData || !CafeteriaController.hassufficientBalance(studentData.balance, cartTotals.total)}
                  className="relative overflow-hidden transition-colors duration-300 ease-in-out"
                >
                  {/* Progress Bar Background */}
                  <span
                    className={`absolute inset-0 ${isOrderSuccessful ? 'bg-success-500' : 'bg-primary-600'}`}
                    style={{
                      transform: `translateX(-${100 - holdProgress}%)`,
                      transition: 'transform 0.05s linear, background-color 0.3s ease',
                      zIndex: 1,
                    }}
                    aria-hidden="true"
                  />
                  {/* Button Text and Icon */}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isOrderSuccessful ? (
                      <>
                        <Check className="h-5 w-5" />
                        Order Placed!
                      </>
                    ) : (
                      isPlacingOrder ? 'Processing...' : 'Hold to Place Order'
                    )}
                  </span>
                </Button>
              </div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* New Success Modal */}
      <Modal
        isOpen={isSuccessModalVisible}
        onClose={() => setIsSuccessModalVisible(false)} // Allow closing by clicking outside/esc
        backdrop="blur"
        isDismissable={true} // Allow closing
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 items-center text-center pt-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-success/10 mb-3 border-4 border-success/20">
              <CheckCircleIcon className="h-8 w-8 text-success" />
            </div>
            Order Placed Successfully!
          </ModalHeader>
          <ModalBody className="text-center pb-4">
            <p className="text-default-600 mb-4">
              Your order has been sent to the kitchen. You can track its status in your order history.
            </p>
            {/* Optionally display order ID if available from controller */}
            {/* <p className="text-sm text-default-500">Order ID: {orderId}</p> */}
          </ModalBody>
          <ModalFooter className="justify-center pb-6">
            <Button
              color="success"
              variant="solid"
              onPress={() => {
                setIsSuccessModalVisible(false);
                navigate('/student/cafeteria/order-history');
              }}
              className="px-8"
            >
              View Order History
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default StudentCafeteriaCheckout;
