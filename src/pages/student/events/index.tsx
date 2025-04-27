import React, { useState, useEffect, useMemo } from 'react';
import { ClubController } from '@/controllers/clubController'; // Import the controller
import { EventWithClubInfo } from '@/types/events'; // Import the extended type
import { Link } from 'react-router-dom'; // For linking to event details later
import {
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Image,
  Input,
  Switch,
  Chip, // Use Chip for both indicators
  Spinner,
  Button, // Added Button for details link
  Avatar // Added Avatar for fallback
} from "@heroui/react"; // Import HeroUI components
import { MagnifyingGlassIcon, CalendarDaysIcon, MapPinIcon, CurrencyDollarIcon, AcademicCapIcon, ClockIcon } from '@heroicons/react/24/outline'; // Import icons (Added ClockIcon)
import ClubsSlider from '@/components/ui/ClubsSlider'; // Import the ClubsSlider component

const StudentEvents: React.FC = () => {
  const [allEvents, setAllEvents] = useState<EventWithClubInfo[]>([]); // Store all fetched events
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSeminarsOnly, setShowSeminarsOnly] = useState(false);
  const [showPaidOnly, setShowPaidOnly] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all events with club info
        const fetchedEvents = await ClubController.getAllEvents();
        setAllEvents(fetchedEvents);
      } catch (err) {
        console.error("Error fetching events:", err);
        setError(err instanceof Error ? err.message : 'Failed to load events.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []); // Empty dependency array means this runs once on mount

  // Memoized filtered events
  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = searchTermLower === '' ||
        event.title.toLowerCase().includes(searchTermLower) ||
        (event.clubs?.full_name && event.clubs.full_name.toLowerCase().includes(searchTermLower));

      const matchesSeminar = !showSeminarsOnly || event.is_seminar;
      const matchesPaid = !showPaidOnly || event.is_paid;

      return matchesSearch && matchesSeminar && matchesPaid;
    });
  }, [allEvents, searchTerm, showSeminarsOnly, showPaidOnly]);

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-2 text-default-800">Events</h1>
      <p className="text-default-600 mb-6">Browse available university and club events.</p>

      {/* Clubs Slider Section */}
      <div className="mb-8"> {/* Added margin below slider */}
        <ClubsSlider />
      </div>
      <hr className="my-8 border-default-200" /> {/* Added a divider */}

      {/* Search and Filter Controls */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-center">
        <Input
          isClearable
          placeholder="Search by event or club name..."
          startContent={<MagnifyingGlassIcon className="w-5 h-5 text-default-400" />}
          value={searchTerm}
          onClear={() => setSearchTerm('')}
          onValueChange={setSearchTerm}
          className="flex-grow"
        />
        <div className="flex gap-4 items-center flex-wrap">
          <Switch isSelected={showSeminarsOnly} onValueChange={setShowSeminarsOnly}>
            Seminars Only
          </Switch>
          <Switch isSelected={showPaidOnly} onValueChange={setShowPaidOnly}>
            Paid Events Only
          </Switch>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <Spinner label="Loading events..." color="secondary" size="lg" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="bg-danger-50 border-danger-200">
          <CardBody className="text-danger-700">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </CardBody>
        </Card>
      )}

      {/* Event Grid */}
      {!loading && !error && (
        filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEvents.map((event) => (
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
                       {event.is_paid && <Chip color="success" variant="solid" size="sm">Paid</Chip>} {/* Changed variant to solid */}
                    </div>
                 </CardHeader>
                <CardBody className="flex-grow p-4 space-y-2">
                  <h3 className="text-lg font-semibold text-default-800 line-clamp-2">{event.title}</h3>
                  {event.clubs?.full_name && (
                     <p className="text-sm text-default-500">By: {event.clubs.full_name}</p>
                  )}
                  <div className="flex items-center text-sm text-default-600 gap-1">
                     <CalendarDaysIcon className="w-4 h-4 flex-shrink-0"/>
                     <span>{new Date(event.event_datetime).toLocaleDateString([], { dateStyle: 'medium' })}</span>
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
                       <span>BDT {event.payment_amount.toFixed(2)}</span>
                     </div>
                   )}
                  {event.description && <p className="mt-1 text-sm text-default-700 line-clamp-3">{event.description}</p>}
                </CardBody>
                 <CardFooter className="pt-0">
                   {/* Link to details page - adjust path as needed */}
                   <Button
                     as={Link}
                     to={`/student/events/details/${event.id}`} // Ensure this route exists
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
        ) : (
          <div className="text-center text-default-500 py-20">
             <AcademicCapIcon className="w-16 h-16 mx-auto text-default-300 mb-4"/>
             <p>No events match your current filters.</p>
          </div>
        )
      )}
    </div>
  );
};

export default StudentEvents;
