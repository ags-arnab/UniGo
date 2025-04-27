import React, { useState, useEffect, useCallback } from 'react';
import { ClubController } from '@/controllers/clubController'; // Assuming controller exists
import { useAuth } from '@/contexts/AuthContext'; // Assuming AuthContext provides user info
import {
  Card,
  CardBody,
  CardHeader,
  Spinner,
  // Potentially add chart components if needed later
} from "@heroui/react";
import { ChartBarIcon, ExclamationCircleIcon, CalendarDaysIcon, UsersIcon, CurrencyBangladeshiIcon } from '@heroicons/react/24/outline';

// Define a type for the analytics data we expect
interface ClubAnalyticsData {
  totalEvents: number;
  totalRegistrations: number;
  totalPaidRegistrations: number;
  totalRevenue: number;
  // Add more specific analytics fields as needed
}

const ClubAnalyticsView: React.FC = () => {
  const { user } = useAuth(); // Get the current user
  const [analyticsData, setAnalyticsData] = useState<ClubAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!user?.id) {
      setError("User not authenticated.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch actual analytics data using the controller function
      const data = await ClubController.getClubAnalyticsData(user.id);
      if (data) {
        // Assuming the controller returns data matching ClubAnalyticsData interface
        setAnalyticsData(data);
      } else {
        // Handle case where data might be null or undefined from controller
        setError('Could not retrieve analytics data.');
        setAnalyticsData(null);
      }


    } catch (err) {
      console.error("Error fetching club analytics:", err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <Card>
      <CardHeader className="flex items-center gap-3">
        <ChartBarIcon className="w-6 h-6 text-primary-600" />
        <h1 className="text-xl font-semibold text-default-800">
          Club Analytics Overview
        </h1>
      </CardHeader>
      <CardBody>
        {loading && (
          <div className="flex justify-center items-center py-10">
            <Spinner label="Loading analytics..." color="primary" />
          </div>
        )}
        {error && (
          <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded relative" role="alert">
            <ExclamationCircleIcon className="w-5 h-5 inline mr-2" />
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}
        {!loading && !error && analyticsData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            {/* Stat Card: Total Events */}
            <Card shadow="sm" className="p-4 bg-secondary-50">
              <div className="flex items-center gap-3 mb-2">
                <CalendarDaysIcon className="w-6 h-6 text-secondary-600" />
                <p className="text-sm font-medium text-secondary-700">Total Events</p>
              </div>
              <p className="text-3xl font-bold text-secondary-800">{analyticsData.totalEvents}</p>
            </Card>

            {/* Stat Card: Total Registrations */}
            <Card shadow="sm" className="p-4 bg-primary-50">
              <div className="flex items-center gap-3 mb-2">
                <UsersIcon className="w-6 h-6 text-primary-600" />
                <p className="text-sm font-medium text-primary-700">Total Registrations</p>
              </div>
              <p className="text-3xl font-bold text-primary-800">{analyticsData.totalRegistrations}</p>
              <p className="text-xs text-default-500 mt-1">({analyticsData.totalPaidRegistrations} paid)</p>
            </Card>

            {/* Stat Card: Total Revenue */}
            <Card shadow="sm" className="p-4 bg-success-50">
              <div className="flex items-center gap-3 mb-2">
                <CurrencyBangladeshiIcon className="w-6 h-6 text-success-600" />
                <p className="text-sm font-medium text-success-700">Total Revenue</p>
              </div>
              <p className="text-3xl font-bold text-success-800">৳{analyticsData.totalRevenue.toFixed(2)}</p>
            </Card>

            {/* Add more stat cards or charts here */}

          </div>
        )}
         {!loading && !error && !analyticsData && (
           <p className="text-center text-default-500">Could not retrieve analytics data.</p>
         )}
      </CardBody>
    </Card>
  );
};

export default ClubAnalyticsView;
