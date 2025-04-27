import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { CafeteriaController } from '@/controllers/studentCafeteriaController';
import { EventsController } from '@/controllers/eventsController'; // Import EventsController
import { EventRegistrationData, EventData } from '@/types/events'; // Import event types
import {
  Spinner,
  Card,
  CardHeader,
  CardBody,
  Switch,
  Listbox,
  ListboxItem,
  Chip // For status display
} from '@heroui/react';
import { User, Hash, Mail, Phone, History, TicketIcon } from 'lucide-react'; // Added TicketIcon

// Define the type for registrations with nested event data
type MyRegistrationWithEvent = EventRegistrationData & { events: EventData | null };

const StudentProfile: React.FC = () => {
  const { user, profile, loading: authLoading, profileError } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(true);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  // State for event registrations
  const [myRegistrations, setMyRegistrations] = useState<MyRegistrationWithEvent[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState<boolean>(true);
  const [registrationsError, setRegistrationsError] = useState<string | null>(null);
  const [showActiveEvents, setShowActiveEvents] = useState<boolean>(true); // Toggle state

  // Fetch Balance
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
        setBalanceError('User not authenticated.');
        setLoadingBalance(false);
      }
    };
    if (!authLoading && profile) fetchBalance();
    else if (!authLoading && !profile) setLoadingBalance(false);
  }, [user, profile, authLoading]);

  // Fetch Event Registrations
  useEffect(() => {
    const fetchRegistrations = async () => {
      if (user?.id) {
        setLoadingRegistrations(true);
        setRegistrationsError(null);
        try {
          const regs = await EventsController.getMyEventRegistrations();
          setMyRegistrations(regs);
        } catch (err) {
          console.error("Error fetching event registrations:", err);
          setRegistrationsError(err instanceof Error ? err.message : 'Failed to load registrations.');
        } finally {
          setLoadingRegistrations(false);
        }
      } else if (!authLoading) {
        setLoadingRegistrations(false); // No user, no fetch
      }
    };
    if (!authLoading && user) fetchRegistrations();
    else if (!authLoading && !user) setLoadingRegistrations(false);
  }, [user, authLoading]); // Rerun when user or authLoading changes

  // Filter registrations based on toggle
  const filteredRegistrations = useMemo(() => {
    const activeStatuses: string[] = ['reserved', 'paid'];
    const pastStatuses: string[] = ['attended', 'cancelled'];
    const targetStatuses = showActiveEvents ? activeStatuses : pastStatuses;
    return myRegistrations.filter(reg => targetStatuses.includes(reg.status));
  }, [myRegistrations, showActiveEvents]);

  // Combine loading states
  const isPageLoading = authLoading || loadingBalance || loadingRegistrations;
  // Combine error states (prefer profile error if it exists)
  const pageError = profileError?.message || balanceError || registrationsError;

  // Helper to get status chip color
  const getStatusColor = (status: string): "success" | "warning" | "default" | "primary" => {
     switch (status) {
       case 'paid': return 'success';
       case 'reserved': return 'warning';
       case 'attended': return 'primary';
       case 'cancelled': return 'default';
       default: return 'default';
     }
   };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">My Profile</h1>

      {/* Display loading spinner */}
      {isPageLoading && (
        <div className="flex justify-center items-center h-40">
          <Spinner color="secondary" size="lg" label="Loading profile data..." />
        </div>
      )}

      {/* Display error message */}
      {pageError && !isPageLoading && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {pageError}</span>
        </div>
      )}

      {/* Display content when loaded and no errors */}
      {!isPageLoading && !pageError && user && profile && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Student Details Card */}
            <div className="md:col-span-2 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-6">Personal Information</h2>
              <div className="space-y-4">
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
            </div>

            {/* Balance and Order History Column */}
            <div className="space-y-8">
              {/* Balance Card */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl rounded-lg p-6 text-center transform hover:scale-105 transition duration-300">
                <h2 className="text-lg font-medium mb-2">Account Balance</h2>
                <p className="text-4xl font-bold">
                  {balance !== null ? `$${balance.toFixed(2)}` : <Spinner size="sm" color="current"/>}
                </p>
              </div>

              {/* Order History Card/Link */}
              <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 text-center border border-gray-200 dark:border-gray-700">
                <History className="mx-auto text-green-500 mb-3" size={28} />
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">Cafeteria Orders</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">View your past food orders.</p>
                <Link
                  to="/student/cafeteria/order-history"
                  className="inline-flex items-center px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition duration-300 shadow hover:shadow-md"
                >
                  View Cafeteria History
                </Link>
              </div>
            </div>
          </div>

          {/* My Event Registrations Card */}
          <Card className="shadow-lg border border-gray-200 dark:border-gray-700">
            <CardHeader className="flex justify-between items-center p-6">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">My Event Registrations</h2>
              <Switch isSelected={showActiveEvents} onValueChange={setShowActiveEvents}>
                {showActiveEvents ? 'Active' : 'Past'}
              </Switch>
            </CardHeader>
            <CardBody className="p-6">
              {loadingRegistrations && <Spinner label="Loading registrations..." color="secondary" />}
              {registrationsError && !loadingRegistrations && (
                 <p className="text-danger text-center">{registrationsError}</p>
              )}
              {!loadingRegistrations && !registrationsError && (
                filteredRegistrations.length > 0 ? (
                  <Listbox aria-label="Event Registrations" variant="flat">
                    {filteredRegistrations.map((reg) => (
                      <ListboxItem
                        key={reg.id}
                        // Remove 'as' and 'to' props
                        className="mb-2 p-0 border rounded-md hover:bg-default-100 dark:hover:bg-default-50" // Remove padding from item itself
                        startContent={<TicketIcon className="w-5 h-5 ml-3 mr-3 text-secondary" />} // Adjust margin if needed
                        endContent={
                           <Chip size="sm" color={getStatusColor(reg.status)} variant="flat" className="mr-3"> {/* Add margin */}
                             {reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                           </Chip>
                         }
                        textValue={reg.events?.title || 'Event'} // Add textValue for accessibility/filtering
                      >
                        {/* Wrap content in Link */}
                        <Link to={`/student/events/details/${reg.event_id}`} className="flex flex-col w-full px-3 py-2">
                          <span className="font-medium text-default-800">{reg.events?.title || 'Event details missing'}</span>
                          {reg.events?.event_datetime && (
                            <span className="text-xs text-default-500">
                              {new Date(reg.events.event_datetime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          )}
                        </Link> {/* Add closing Link tag */}
                      </ListboxItem>
                    ))}
                  </Listbox>
                ) : (
                  <p className="text-center text-default-500 py-4">
                    No {showActiveEvents ? 'active' : 'past'} event registrations found.
                  </p>
                )
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
};

export default StudentProfile;
