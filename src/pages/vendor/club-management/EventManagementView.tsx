import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClubController } from '@/controllers/clubController';
import { EventData } from '@/types/events';
import { Button, Card, CardBody, CardHeader, Spinner, Tooltip } from "@heroui/react"; // Assuming Spinner & Tooltip exist
import { PlusIcon, PencilIcon, TrashIcon, UsersIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'; // Changed AlertCircleIcon to ExclamationCircleIcon

const EventManagementView: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedEvents = await ClubController.getClubEvents();
      setEvents(fetchedEvents);
    } catch (err) {
      console.error("Error fetching club events:", err);
      setError(err instanceof Error ? err.message : 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleDelete = async (eventId: string, eventTitle: string) => {
    // TODO: Add confirmation modal
    if (window.confirm(`Are you sure you want to delete the event "${eventTitle}"? This action cannot be undone.`)) {
      try {
        await ClubController.deleteEvent(eventId);
        // Refetch events after deletion
        fetchEvents();
        // TODO: Add success toast
      } catch (err) {
        console.error("Error deleting event:", err);
        setError(err instanceof Error ? err.message : 'Failed to delete event.');
        // TODO: Add error toast
      }
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return 'Invalid Date';
    }
  };

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-default-800">Event Management</h1>
        <Button
          color="secondary"
          startContent={<PlusIcon className="w-5 h-5" />}
          onPress={() => navigate('/club/dashboard/events/create')} // Navigate to create page
        >
          Create New Event
        </Button>
      </CardHeader>
      <CardBody>
        {loading && (
          <div className="flex justify-center items-center py-10">
            <Spinner label="Loading events..." color="secondary" />
          </div>
        )}
        {error && (
          <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded relative" role="alert">
            <ExclamationCircleIcon className="w-5 h-5 inline mr-2" /> {/* Use ExclamationCircleIcon */}
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-default-200">
              <thead className="bg-default-100">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-default-500 uppercase tracking-wider">Title</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-default-500 uppercase tracking-wider">Date & Time</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-default-500 uppercase tracking-wider">Venue</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-default-500 uppercase tracking-wider">Total Seats</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-default-500 uppercase tracking-wider">Remaining Seats</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-default-500 uppercase tracking-wider">Paid</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-default-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-default-200">
                {events.length > 0 ? (
                  events.map((event) => (
                    <tr key={event.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-default-900">{event.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-default-600">{formatDate(event.event_datetime)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-default-600">{event.venue || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-default-600">{event.total_seats ?? 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-default-600">
                        {/* Calculate remaining seats */}
                        {typeof event.total_seats === 'number' && typeof event.active_registration_count === 'number'
                          ? event.total_seats - event.active_registration_count
                          : (event.total_seats === 0 ? 'Unlimited' : 'N/A') /* Handle 0 seats as unlimited or show N/A */
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-default-600">
                        {event.is_paid ? `Yes (${event.payment_amount?.toFixed(2) ?? '0.00'})` : 'No'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Tooltip content="View Registrations">
                           <Button isIconOnly variant="light" size="sm" onPress={() => navigate(`/club/dashboard/events/${event.id}/registrations`)}> {/* Placeholder Nav */}
                             <UsersIcon className="w-4 h-4 text-primary" />
                           </Button>
                         </Tooltip>
                         <Tooltip content="Edit Event">
                           <Button isIconOnly variant="light" size="sm" onPress={() => navigate(`/club/dashboard/events/edit/${event.id}`)}> {/* Placeholder Nav */}
                             <PencilIcon className="w-4 h-4 text-secondary" />
                           </Button>
                         </Tooltip>
                         <Tooltip content="Delete Event">
                           <Button isIconOnly variant="light" size="sm" color="danger" onPress={() => handleDelete(event.id, event.title)}>
                             <TrashIcon className="w-4 h-4" />
                           </Button>
                         </Tooltip>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-default-500">No events found. Create your first event!</td> {/* Updated colSpan */}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default EventManagementView;
