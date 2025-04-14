import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Assuming supabase client is here
import { useAuth } from '@/contexts/AuthContext'; // Assuming Auth context is here
import { Spinner, Button, Card } from "@heroui/react"; // Removed Dialog import

const VendorBalancePage: React.FC = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPayoutLoading, setIsPayoutLoading] = useState<boolean>(false); // State for payout button
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState<boolean>(false); // State for Dialog

  // Placeholder function for payout request
  const handlePayoutRequest = async () => {
    setIsPayoutLoading(true);
    console.log("Payout requested for balance:", balance);
    // TODO: Implement actual payout logic here (e.g., API call)
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    // alert(`Payout request for ৳ ${balance?.toFixed(2)} submitted (simulation).`); // Replaced with Dialog
    setIsPayoutLoading(false);
    setIsPayoutDialogOpen(true); // Open the dialog
    // Optionally, refresh balance or disable button after request
  };


  useEffect(() => {
    const fetchBalance = async () => {
      if (!user) {
        setError('User not authenticated.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setBalance(null);

      try {
        // 1. Get vendor's counters
        const { data: counters, error: countersError } = await supabase
          .from('counters')
          .select('id')
          .eq('vendor_id', user.id);

        if (countersError) throw countersError;
        if (!counters || counters.length === 0) {
          // No counters found for this vendor
          setBalance(0);
          setIsLoading(false);
          return;
        }

        const counterIds = counters.map(c => c.id);

        // 2. Get order items associated with these counters
        // We need order_id from order_items to link to the orders table
        const { data: orderItems, error: orderItemsError } = await supabase
          .from('order_items')
          .select('order_id')
          .in('counter_id', counterIds);

        if (orderItemsError) throw orderItemsError;
        if (!orderItems || orderItems.length === 0) {
            // No orders found for this vendor's counters
            setBalance(0);
            setIsLoading(false);
            return;
        }

        // Get unique order IDs
        const orderIds = [...new Set(orderItems.map(item => item.order_id))];

        // 3. Get completed orders associated with these order IDs
        const { data: completedOrders, error: ordersError } = await supabase
          .from('orders')
          .select('total_price')
          .in('id', orderIds)
          .eq('status', 'completed'); // Filter by completed status

        if (ordersError) throw ordersError;

        // 4. Calculate total balance
        const totalBalance = completedOrders?.reduce((sum, order) => sum + (order.total_price || 0), 0) ?? 0;

        setBalance(totalBalance);

      } catch (err: any) {
        console.error("Error fetching vendor balance:", err);
        setError(err.message || 'Failed to fetch balance.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();
  }, [user]); // Re-fetch if user changes

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Your Balance</h1>

      {/* Using HeroUI Card structure - often simpler */}
      <Card className="max-w-md mx-auto shadow-lg rounded-lg p-6 bg-white dark:bg-gray-800">
         <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4 text-center">Available Funds</h2>

         {isLoading && (
           <div className="flex flex-col items-center justify-center h-40">
             {/* HeroUI Spinner might just take children or a simple label prop */}
             <Spinner size="lg" />
             <p className="mt-2 text-gray-500 dark:text-gray-400">Loading balance...</p>
           </div>
         )}
         {error && (
             <div className="text-center text-red-600 dark:text-red-400 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                 <p className="font-medium">Error loading balance:</p>
                 <p>{error}</p>
                </div>
            )}
         {!isLoading && !error && balance !== null && (
           <div className="text-center">
             <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">Balance from completed orders:</p>
             <p className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 mb-6">
               ৳ {balance.toFixed(2)}
             </p>
             {/* HeroUI Button props might differ slightly */}
             <Button
               color="success" // Assuming HeroUI supports color prop like this
               // variant="solid" // Check if HeroUI uses variant prop
               onClick={handlePayoutRequest}
               isLoading={isPayoutLoading} // Corrected: HeroUI uses isLoading
               disabled={balance <= 0 || isPayoutLoading} // Standard disabled prop
               className="w-full font-medium py-2 px-4 rounded" // Basic styling
             >
               {isPayoutLoading ? 'Processing...' : 'Request Payout'}
             </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                 Payouts are typically processed within 3-5 business days.
              </p>
              </div>
            )}
         {/* Removed extra closing parenthesis here */}
         {!isLoading && !error && balance === null && !user && (
           <p className="text-center text-gray-500 dark:text-gray-400">Please log in to view your balance.</p>
         )}
          {!isLoading && !error && balance === 0 && user && (
              <p className="text-center text-gray-500 dark:text-gray-400">Your current balance is ৳ 0.00.</p>
          )}
      </Card>

      {/* Custom Payout Confirmation Modal */}
      {isPayoutDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-2">
              Payout Request Submitted
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your request to payout ৳ {balance?.toFixed(2)} has been submitted (simulation).
                It will typically be processed within 3-5 business days.
              </p>
            </div>
            <div className="mt-5 sm:mt-6">
              <Button
                color="primary" // Use HeroUI Button
                onClick={() => setIsPayoutDialogOpen(false)}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm"
                // Add appropriate color classes if needed, e.g., bg-blue-600 hover:bg-blue-700 text-white
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorBalancePage;
