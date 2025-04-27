// filepath: /Users/arnab/Documents/boopityboop/UniGo/src/pages/student/ClubEventsPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ClubsController, ClubProfile } from '@/controllers/clubsController';
import { EventData } from '@/types/events'; // Use EventData for now, might need EventWithClubInfo if club details needed per event
import { supabase } from '@/lib/supabaseClient';
import {
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Image,
  Chip,
  Button,
  Avatar,
  Spinner // Added Spinner for loading state consistency
} from "@heroui/react"; // Import HeroUI components
import { CalendarDaysIcon, ClockIcon, MapPinIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'; // Import icons

// Default placeholder images
const DEFAULT_BANNER = '/images/default-club-banner.jpg';
const DEFAULT_LOGO = '/images/default-club-logo.png';

const ClubEventsPage: React.FC = () => {
  const { clubId } = useParams<{ clubId?: string }>();
  const [club, setClub] = useState<ClubProfile | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadClubAndEvents = async () => {
      if (!clubId) {
        setError('Club ID is missing');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Load club profile
        const clubData = await ClubsController.getClubProfile(clubId);
        setClub(clubData);

        // Load club events
        // We need to modify this to get events for a specific club rather than the logged-in club
        const eventsData = await loadClubEvents(clubId);
        setEvents(eventsData);
      } catch (err) {
        console.error('Error loading club or events:', err);
        setError('Failed to load club details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadClubAndEvents();
  }, [clubId]);

  // Helper function to load events for a specific club
  const loadClubEvents = async (clubId: string): Promise<EventData[]> => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('club_id', clubId)
      .order('event_datetime', { ascending: true });

    if (error) {
      console.error('Error fetching club events:', error);
      throw new Error(`Failed to fetch club events: ${error.message}`);
    }

    return (data || []) as EventData[];
  };

  // Use Spinner for loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex justify-center items-center min-h-[60vh]">
        <Spinner label="Loading club details..." color="secondary" size="lg" />
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 text-center">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="text-red-700">{error || 'Club not found'}</p>
          <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Club Banner and Info */}
      <div className="mb-8">
        <div 
          className="w-full h-64 bg-cover bg-center rounded-lg overflow-hidden relative"
          style={{ backgroundImage: `url(${club.banner_url || DEFAULT_BANNER})` }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end">
            <div className="p-6 flex items-center">
              <div 
                className="w-24 h-24 rounded-full border-4 border-white bg-cover bg-center"
                style={{ backgroundImage: `url(${club.avatar_url || DEFAULT_LOGO})` }}
              ></div>
              <div className="ml-4">
                <h1 className="text-3xl font-bold text-white">{club.full_name}</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Club Description - Using HeroUI Card */}
      <Card className="mb-8">
        <CardBody>
          <h2 className="text-2xl font-semibold mb-4 text-default-800">About the Club</h2>
          <p className="text-default-700"> {/* Use default text color from HeroUI */}
            {club.description || 'This club has not provided a description yet.'}
          </p>
        </CardBody>
      </Card>

      {/* Club Events */}
      <div>
        <h2 className="text-2xl font-semibold mb-6">Upcoming Events</h2>
        
        {events.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-600">No events scheduled at this time.</p>
            <p className="text-gray-500 mt-2">Check back later for updates!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              // Use HeroUI Card for each event
              <Card key={event.id} isHoverable isPressable className="h-full flex flex-col">
                <CardHeader className="p-0 relative">
                  <Image
                    removeWrapper
                    alt={event.title}
                    className="z-0 w-full h-[180px] object-cover"
                    src={event.banner_image_path || undefined} // Use undefined if path is null/empty
                    fallbackSrc={<Avatar icon={<CalendarDaysIcon/>} className="w-full h-[180px] text-default-400 bg-default-100"/>} // Simple fallback
                   />
                    {/* Indicators */}
                    <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-10">
                       {event.is_seminar && <Chip color="primary" variant="solid" size="sm">Seminar</Chip>}
                       {event.is_paid && <Chip color="success" variant="solid" size="sm">Paid</Chip>}
                    </div>
                 </CardHeader>
                <CardBody className="flex-grow p-4 space-y-2">
                  <h3 className="text-lg font-semibold text-default-800 line-clamp-2">{event.title}</h3>
                  {/* Removed club name as it's redundant on this page */}
                  <div className="flex items-center text-sm text-default-600 gap-1">
                     <CalendarDaysIcon className="w-4 h-4 flex-shrink-0"/>
                     <span>{formatDate(event.event_datetime)}</span> {/* Use formatDate helper */}
                  </div>
                  <div className="flex items-center text-sm text-default-600 gap-1">
                     <ClockIcon className="w-4 h-4 flex-shrink-0"/>
                     <span>
                        {new Date(event.event_datetime).toLocaleTimeString([], { timeStyle: 'short' })}
                        {event.end_time && ` - ${new Date(event.end_time).toLocaleTimeString([], { timeStyle: 'short' })}`}
                     </span>
                  </div>
                  {event.venue && (
                    <div className="flex items-center text-sm text-default-600 gap-1">
                      <MapPinIcon className="w-4 h-4"/>
                      <span>{event.venue}</span>
                    </div>
                  )}
                   {event.is_paid && event.payment_amount && (
                     <div className="flex items-center text-sm text-default-600 gap-1">
                       <CurrencyDollarIcon className="w-4 h-4"/>
                       <span>BDT {Number(event.payment_amount).toFixed(2)}</span> {/* Ensure numeric conversion */}
                     </div>
                   )}
                  {event.description && <p className="mt-1 text-sm text-default-700 line-clamp-3">{event.description}</p>}
                </CardBody>
                 <CardFooter className="pt-0">
                   {/* Corrected Link to student event details page */}
                   <Button
                     as={Link}
                     to={`/student/events/details/${event.id}`} // Corrected route
                     color="secondary"
                     variant="flat"
                     size="sm"
                     fullWidth
                   >
                     View Details & Register
                   </Button>
                 </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubEventsPage;
