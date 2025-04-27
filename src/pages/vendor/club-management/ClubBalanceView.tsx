import React, { useState, useEffect, useCallback } from 'react';
import { ClubController } from '@/controllers/clubController'; // Assuming controller exists
import { useAuth } from '@/contexts/AuthContext'; // Assuming AuthContext provides user info
import {
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Chip,
} from "@heroui/react";
import { BanknotesIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

const ClubBalanceView: React.FC = () => {
  const { user } = useAuth(); // Get the current user
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!user?.id) {
      setError("User not authenticated.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Assuming a function getClubProfile exists in the controller
      const profile = await ClubController.getClubProfile(user.id);
      if (profile && typeof profile.balance === 'number') {
        setBalance(profile.balance);
      } else {
        // Handle cases where balance might be null or not returned as expected
        setBalance(0); // Default to 0 or handle as appropriate
        console.warn("Balance not found or invalid in profile:", profile);
      }
    } catch (err) {
      console.error("Error fetching club balance:", err);
      setError(err instanceof Error ? err.message : 'Failed to load balance.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return (
    <Card>
      <CardHeader className="flex items-center gap-3">
        <BanknotesIcon className="w-6 h-6 text-secondary-600" />
        <h1 className="text-xl font-semibold text-default-800">
          Club Balance
        </h1>
      </CardHeader>
      <CardBody>
        {loading && (
          <div className="flex justify-center items-center py-10">
            <Spinner label="Loading balance..." color="secondary" />
          </div>
        )}
        {error && (
          <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded relative" role="alert">
            <ExclamationCircleIcon className="w-5 h-5 inline mr-2" />
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}
        {!loading && !error && balance !== null && (
          <div className="flex flex-col items-center justify-center p-6">
            <p className="text-lg text-default-600 mb-2">Current Balance:</p>
            <Chip
              color="success"
              variant="dot"
              size="lg"
              className="text-3xl font-bold tracking-tight text-success-700 px-4 py-2"
            >
              ৳{balance.toFixed(2)} {/* Assuming BDT currency */}
            </Chip>
            {/* Add more details or actions if needed */}
          </div>
        )}
         {!loading && !error && balance === null && (
           <p className="text-center text-default-500">Could not retrieve balance information.</p>
         )}
      </CardBody>
    </Card>
  );
};

export default ClubBalanceView;
