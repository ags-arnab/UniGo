import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner, Button, Card, addToast } from "@heroui/react";

const MarketplaceOperatorBalancePage: React.FC = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [, setStorefrontId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPayoutLoading, setIsPayoutLoading] = useState<boolean>(false);
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState<boolean>(true);

  // Handle payout request
  const handlePayoutRequest = async () => {
    if (!balance || balance <= 0) return;
    
    setIsPayoutLoading(true);
    
    try {
      // This is a simulation - in a real app, you'd call an API endpoint
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      addToast({
        title: "Payout Request Submitted",
        description: `Your request to withdraw ৳${balance.toFixed(2)} has been submitted.`,
        color: "success"
      });
      
      setIsPayoutDialogOpen(true);
    } catch (err) {
      addToast({
        title: "Error",
        description: "Failed to process payout request. Please try again.",
        color: "danger"
      });
    } finally {
      setIsPayoutLoading(false);
    }
  };

  useEffect(() => {
    const fetchStorefrontAndBalance = async () => {
      if (!user) {
        setError('User not authenticated.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setBalance(null);

      try {
        // 1. Get the operator's storefront
        const { data: storefront, error: storefrontError } = await supabase
          .from('storefronts')
          .select('id')
          .eq('operator_id', user.id)
          .single();

        if (storefrontError) throw storefrontError;
        if (!storefront) {
          setError('No storefront found for this operator.');
          setIsLoading(false);
          return;
        }

        setStorefrontId(storefront.id);

        // 2. Get the operator's profile for current balance
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        setBalance(profile?.balance || 0);

        // 3. Fetch recent transactions
        const { data: recentTransactions, error: transactionsError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'marketplace_sale_credit')
          .order('created_at', { ascending: false })
          .limit(10);

        if (transactionsError) throw transactionsError;
        setTransactions(recentTransactions || []);

      } catch (err: any) {
        console.error("Error fetching operator balance:", err);
        setError(err.message || 'Failed to fetch balance.');
      } finally {
        setIsLoading(false);
        setLoadingTransactions(false);
      }
    };

    fetchStorefrontAndBalance();
  }, [user]);

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Your Marketplace Balance</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="lg:col-span-1">
          <Card className="shadow-lg rounded-lg p-6 bg-white dark:bg-gray-800">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4 text-center">Available Balance</h2>

            {isLoading && (
              <div className="flex flex-col items-center justify-center h-40">
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
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">Current balance:</p>
                <p className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 mb-6">
                  ৳ {balance.toFixed(2)}
                </p>
                <Button
                  color="success"
                  onClick={handlePayoutRequest}
                  isLoading={isPayoutLoading}
                  isDisabled={balance <= 0 || isPayoutLoading}
                  className="w-full font-medium py-2 px-4 rounded"
                >
                  {isPayoutLoading ? 'Processing...' : 'Request Payout'}
                </Button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  Payouts are typically processed within 3-5 business days.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Transactions Card */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg rounded-lg p-6 bg-white dark:bg-gray-800">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Recent Transactions</h2>
            
            {loadingTransactions && (
              <div className="flex flex-col items-center justify-center h-40">
                <Spinner size="lg" />
                <p className="mt-2 text-gray-500 dark:text-gray-400">Loading transactions...</p>
              </div>
            )}
            
            {!loadingTransactions && transactions.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-10">
                No recent transactions found.
              </p>
            )}
            
            {!loadingTransactions && transactions.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(transaction.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                          {transaction.description || 'Marketplace Sale'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600 dark:text-green-400">
                          +৳ {transaction.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Custom Payout Confirmation Modal */}
      {isPayoutDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-2">
              Payout Request Submitted
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your request to withdraw ৳ {balance?.toFixed(2)} has been submitted.
                It will typically be processed within 3-5 business days.
              </p>
            </div>
            <div className="mt-5 sm:mt-6">
              <Button
                color="primary"
                onClick={() => setIsPayoutDialogOpen(false)}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm"
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

export default MarketplaceOperatorBalancePage; 