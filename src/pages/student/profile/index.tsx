import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { CafeteriaController } from '@/controllers/studentCafeteriaController';
import { Spinner } from '@heroui/react';
import { User, Hash, Mail, Phone, History } from 'lucide-react'; // Corrected icon name

// Only need state for balance now, as other info comes from AuthContext
const StudentProfile: React.FC = () => {
  const { user, profile, loading: authLoading, profileError } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(true);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      if (user?.id) {
        setLoadingBalance(true);
        setBalanceError(null);
        try {
          // Use controller specifically for balance
          const info = await CafeteriaController.getStudentInfo(user.id);
          if (info) {
            setBalance(info.balance);
          } else {
            // This might happen if the profile exists but getStudentInfo fails for some reason
            setBalanceError('Could not fetch student balance information.');
          }
        } catch (err) {
          console.error("Error fetching student balance:", err);
          setBalanceError(err instanceof Error ? err.message : 'An unknown error occurred fetching balance.');
        } finally {
          setLoadingBalance(false);
        }
      } else if (!authLoading) {
        // If auth is done loading and there's still no user
        setBalanceError('User not authenticated.'); // Or handle silently
        setLoadingBalance(false);
      }
    };

    // Fetch balance only if auth isn't loading and profile exists
    if (!authLoading && profile) {
      fetchBalance();
    } else if (!authLoading && !profile) {
      // If auth is done but profile doesn't exist (could be due to profileError)
      setLoadingBalance(false); // Stop balance loading
      // Error state is handled by profileError below
    }
  }, [user, profile, authLoading]); // Rerun when user, profile or authLoading changes

  // Combine loading states
  const isLoading = authLoading || loadingBalance;
  // Combine error states (prefer profile error if it exists)
  const error = profileError?.message || balanceError;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">My Profile</h1> {/* Increased bottom margin */}

      {/* Display loading spinner */}
      {isLoading && (
        <div className="flex justify-center items-center h-40">
          <Spinner color="primary" size="lg" />
        </div>
      )}

      {/* Display error message */}
      {error && !isLoading && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Display content when loaded and no errors */}
      {!isLoading && !error && user && profile && balance !== null && (
        <> {/* Use Fragment to group elements */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8"> {/* Increased gap */}
            {/* Student Details Card */}
            <div className="md:col-span-2 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 border border-gray-200 dark:border-gray-700"> {/* Increased padding, added border */}
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-6">Personal Information</h2> {/* Increased size/margin */}
              <div className="space-y-4"> {/* Increased spacing */}
                <div className="flex items-center space-x-3">
                  <User className="text-gray-500 dark:text-gray-400" size={20} />
                  <p><strong className="font-medium text-gray-600 dark:text-gray-300">Name:</strong> <span className="text-gray-800 dark:text-gray-100">{profile.full_name || 'N/A'}</span></p>
                </div>
                <div className="flex items-center space-x-3">
                  <Hash className="text-gray-500 dark:text-gray-400" size={20} />
                  <p><strong className="font-medium text-gray-600 dark:text-gray-300">Student ID:</strong> <span className="text-gray-800 dark:text-gray-100">{profile.student_id || 'N/A'}</span></p>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="text-gray-500 dark:text-gray-400" size={20} />
                  <p><strong className="font-medium text-gray-600 dark:text-gray-300">Email:</strong> <span className="text-gray-800 dark:text-gray-100">{user.email || 'N/A'}</span></p>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="text-gray-500 dark:text-gray-400" size={20} />
                  <p><strong className="font-medium text-gray-600 dark:text-gray-300">Phone:</strong> <span className="text-gray-800 dark:text-gray-100">{profile.phone_number || 'N/A'}</span></p>
                </div>
              </div>
              {/* Add Edit Profile Button if needed */}
              {/* <button className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-300">Edit Profile</button> */}
            </div>

            {/* Balance and Order History Column */}
            <div className="space-y-8"> {/* Increased gap */}
              {/* Balance Card */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl rounded-lg p-6 text-center transform hover:scale-105 transition duration-300"> {/* Added hover effect */}
                <h2 className="text-lg font-medium mb-2">Account Balance</h2>
                <p className="text-4xl font-bold"> {/* Removed custom font class for now */}
                  ${balance.toFixed(2)}
                </p>
              </div>

              {/* Order History Card/Link */}
              <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 text-center border border-gray-200 dark:border-gray-700"> {/* Added border */}
                <History className="mx-auto text-green-500 mb-3" size={28} /> {/* Added icon */}
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">Order History</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">View your past cafeteria orders.</p>
                <Link
                  to="/student/cafeteria/order-history"
                  className="inline-flex items-center px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition duration-300 shadow hover:shadow-md"
                >
                  View History
                </Link>
              </div>
            </div>
          </div>
        </>
      )} {/* Closing fragment */}
    </div>
  );
};

export default StudentProfile;
