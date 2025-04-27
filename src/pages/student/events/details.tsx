import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ClubController } from '@/controllers/clubController';
import { EventsController } from '@/controllers/eventsController';
import { EventWithClubInfo, EventRegistrationData } from '@/types/events';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Image,
  Button,
  Spinner,
  Chip,
  Avatar,
  addToast // Using HeroUI's built-in toast
} from "@heroui/react";
import { ArrowLeftIcon, CalendarDaysIcon, MapPinIcon, CurrencyDollarIcon, UsersIcon, ClockIcon, CheckCircleIcon, XCircleIcon, UserGroupIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline'; // Added UserGroupIcon, BuildingStorefrontIcon

const StudentEventDetails: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<EventWithClubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegisteringFree, setIsRegisteringFree] = useState(false); // State specifically for free registration clicks
  const [userRegistration, setUserRegistration] = useState<EventRegistrationData | null>(null);
  const [registrationCount, setRegistrationCount] = useState<number>(0);
  const [isDeadlinePassed, setIsDeadlinePassed] = useState<boolean>(false);

  // --- State for Tap & Hold (Paid Events) ---
  const [holdStatus, setHoldStatus] = useState<'idle' | 'holding' | 'processing' | 'success' | 'error'>('idle');
  const [holdProgress, setHoldProgress] = useState(0);
  const [holdErrorMsg, setHoldErrorMsg] = useState<string | null>(null);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const HOLD_DURATION = 1500; // 1.5 seconds
  // --- End State for Tap & Hold ---

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  // Fetch event details and user's registration status
  const fetchDetailsAndStatus = useCallback(async () => {
    if (!eventId) {
      setError("Event ID not found in URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setUserRegistration(null);
    setRegistrationCount(0);
    setIsDeadlinePassed(false);
    setHoldStatus('idle'); // Reset hold status on fetch
    setHoldProgress(0);
    setHoldErrorMsg(null);

    try {
      const fetchedEvent = await ClubController.getEventById(eventId);
      if (!fetchedEvent) throw new Error("Event not found.");
      setEvent(fetchedEvent);

      if (fetchedEvent.registration_deadline) {
        const deadline = new Date(fetchedEvent.registration_deadline);
        if (deadline < new Date()) setIsDeadlinePassed(true);
      }

      const count = await EventsController.getEventRegistrationCount(eventId);
      setRegistrationCount(count);

      if (user?.id) {
        const registration = await EventsController.getRegistrationStatus(eventId, user.id);
        // Only set if registration is active (paid or reserved)
        if (registration && (registration.status === 'paid' || registration.status === 'reserved')) {
            setUserRegistration(registration);
        } else {
            setUserRegistration(null); // Treat cancelled/expired as not registered for button display
        }
      }

    } catch (err) {
      console.error("Error fetching event details or status:", err);
      setError(err instanceof Error ? err.message : 'Failed to load event data.');
    } finally {
      setLoading(false);
    }
  }, [eventId, user]);

  useEffect(() => {
    fetchDetailsAndStatus();
  }, [fetchDetailsAndStatus]);

  // --- Tap & Hold Logic (Paid Events) ---
  const clearTimers = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const startHold = () => {
    if (!eventId || userRegistration || holdStatus === 'processing' || holdStatus === 'success' || !event?.is_paid) {
      return;
    }
    clearTimers();
    setHoldStatus('holding');
    setHoldProgress(0);
    setHoldErrorMsg(null);

    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const progress = Math.min(100, (elapsedTime / HOLD_DURATION) * 100);
      setHoldProgress(progress);
      if (progress >= 100) {
        clearInterval(progressIntervalRef.current!);
        progressIntervalRef.current = null;
      }
    }, 50);

    holdTimeoutRef.current = setTimeout(async () => {
      clearTimers();
      setHoldStatus('processing');
      setHoldProgress(100);
      addToast({ title: 'Processing Payment', description: 'Deducting fee...', color: 'default' });

      try {
        const newRegistration = await EventsController.registerAndPayForEvent(eventId);
        setUserRegistration(newRegistration); // Update main registration state
        setHoldStatus('success'); // Keep success state for button display
        addToast({ title: 'Success', description: 'Successfully registered!', color: 'success' });
        // Refetch count
        const count = await EventsController.getEventRegistrationCount(eventId);
        setRegistrationCount(count);
      } catch (error: any) {
        console.error("Paid registration failed:", error);
        const friendlyMessage = error.message || 'Registration failed. Please try again.';
        setHoldStatus('error');
        setHoldErrorMsg(friendlyMessage);
        addToast({ title: 'Registration Error', description: friendlyMessage, color: 'danger' });
        // Reset after a delay
        setTimeout(() => {
          setHoldStatus('idle');
          setHoldProgress(0);
          setHoldErrorMsg(null);
        }, 3000);
      }
    }, HOLD_DURATION);
  };

  const cancelHold = () => {
    if (holdStatus === 'holding') {
      clearTimers();
      setHoldStatus('idle');
      setHoldProgress(0);
    }
  };
  // --- End Tap & Hold Logic ---

  // --- Simple Click Logic (Free Events) ---
  const handleFreeRegister = async () => {
    if (!eventId || event?.is_paid || userRegistration || isDeadlinePassed || (event && event.total_seats > 0 && registrationCount >= event.total_seats)) {
      addToast({ title: 'Info', description: 'Registration not possible or invalid action.', color: 'default' });
      return;
    }
    if (!user) {
      addToast({ title: 'Error', description: 'You must be logged in to register.', color: 'danger' });
      return;
    }

    setIsRegisteringFree(true);
    try {
      const newRegistration = await EventsController.registerForEvent(eventId);
      setUserRegistration(newRegistration);
      if (newRegistration.status !== 'cancelled') {
        setRegistrationCount(prev => prev + 1);
      }
      addToast({ title: 'Success', description: 'Successfully registered for the event!', color: 'success' });
    } catch (err) {
      console.error("Error registering for free event:", err);
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      addToast({ title: 'Registration Error', description: message, color: 'danger' });
    } finally {
      setIsRegisteringFree(false);
    }
  };
  // --- End Simple Click Logic ---

  // --- Render Logic ---
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Spinner label="Loading event details..." color="secondary" size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Card className="bg-danger-50 border-danger-200">
          <CardBody className="text-danger-700">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
            <Button variant="light" onPress={() => navigate(-1)} className="mt-4">
              Go Back
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!event) {
    return <div className="container mx-auto p-4 md:p-6 text-center text-default-500">Event not found.</div>;
  }

  // Determine registration button state
  const getRegistrationButton = () => {
    const isFull = event.total_seats > 0 && registrationCount >= event.total_seats;

    // 1. Already Registered?
    if (userRegistration) {
      let statusText = userRegistration.status.charAt(0).toUpperCase() + userRegistration.status.slice(1);
      let buttonColor: "success" | "warning" | "default" = "success";
      if (userRegistration.status === 'reserved') {
        statusText = event.is_paid ? 'Reserved (Payment Pending)' : 'Reserved';
        buttonColor = "warning";
      }
      // Note: 'cancelled' status is handled by userRegistration being null due to fetch logic
      return <Button color={buttonColor} variant="flat" disabled>{statusText}</Button>;
    }

    // 2. Registration Closed?
    if (isDeadlinePassed) {
      return <Button color="default" variant="flat" disabled>Registration Closed</Button>;
    }

    // 3. Seats Full?
    if (isFull) {
      return <Button color="default" variant="flat" disabled>Seats Full</Button>;
    }

    // 4. Not Logged In?
    if (!user) {
      return <Button as={Link} to="/auth/login" color="secondary" variant="bordered">Login to Register</Button>;
    }

    // 5. Paid Event - Tap & Hold Button
    if (event.is_paid) {
      let buttonText: React.ReactNode = `Tap & Hold to Register (৳${event.payment_amount?.toFixed(2)})`;
      let buttonColor: "secondary" | "success" | "danger" = "secondary";
      let isDisabled = false;

      switch (holdStatus) {
        case 'holding':
          buttonText = "Keep Holding...";
          break;
        case 'processing':
          buttonText = "Processing...";
          isDisabled = true;
          break;
        case 'success': // Should be caught by userRegistration check, but as fallback
          buttonText = <><CheckCircleIcon className="w-5 h-5 mr-1 inline-block" /> Registered</>;
          buttonColor = "success";
          isDisabled = true;
          break;
        case 'error':
          buttonText = <><XCircleIcon className="w-5 h-5 mr-1 inline-block" /> Failed</>;
          buttonColor = "danger";
          // isDisabled = false; // Allow retry after timeout resets state
          break;
      }

      return (
        <div className="w-full flex flex-col items-center"> {/* Wrapper for button and error message */}
          <Button
            color={buttonColor}
            variant={holdStatus === 'holding' ? "flat" : "solid"}
            size="lg" // Make button larger on details page
            fullWidth
            onMouseDown={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchStart={startHold}
            onTouchEnd={cancelHold}
            disabled={isDisabled}
            className={`relative overflow-hidden transition-all duration-150 ${holdStatus === 'holding' ? 'opacity-80' : ''} ${isDisabled ? 'cursor-default' : ''}`}
            aria-live="polite"
          >
            {/* Progress Bar Background */}
            {(holdStatus === 'holding' || holdStatus === 'processing') && (
              <span
                className={`absolute inset-0 bg-secondary/40`}
                style={{
                  width: `${holdProgress}%`,
                  transition: 'width 0.05s linear',
                  zIndex: 1,
                }}
                aria-hidden="true"
              />
            )}
            {/* Button Text and Icon */}
            <span className="relative z-10 flex items-center justify-center gap-1">
              {buttonText}
            </span>
          </Button>
          {/* Display error message below button */}
          {holdStatus === 'error' && holdErrorMsg && (
            <p className="text-danger-600 text-xs mt-1 text-center w-full">{holdErrorMsg}</p>
          )}
        </div>
      );
    }

    // 6. Free Event - Simple Register Button
    return (
      <Button
        color="secondary"
        size="lg" // Make button larger on details page
        onPress={handleFreeRegister}
        isLoading={isRegisteringFree}
        disabled={isRegisteringFree}
      >
        {isRegisteringFree ? 'Registering...' : 'Register Now (Free)'}
      </Button>
    );
  };

  // --- Main Return ---
  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <Button
        isIconOnly
        variant="light"
        onPress={() => navigate('/student/events')}
        aria-label="Back to Events"
        className="mb-4"
      >
        <ArrowLeftIcon className="w-5 h-5" />
      </Button>

      <Card>
        <CardHeader className="p-0 relative">
          <Image
            removeWrapper
            alt={event.title}
            className="z-0 w-full h-[250px] md:h-[350px] object-cover"
            src={event.banner_image_path || undefined}
            fallbackSrc={<Avatar icon={<CalendarDaysIcon/>} className="w-full h-[250px] md:h-[350px] text-default-400 bg-default-100"/>}
          />
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1 z-10">
             {event.is_seminar && <Chip color="primary" variant="solid" size="sm">Seminar</Chip>}
             {event.is_paid && <Chip color="success" variant="solid" size="sm">Paid</Chip>} {/* Changed Badge to Chip */}
          </div>
        </CardHeader>
        <CardBody className="p-6 space-y-4">
          <h1 className="text-3xl font-bold text-default-800">{event.title}</h1>
          {event.clubs?.full_name && (
            <p className="text-md text-default-600">Hosted by: <span className="font-semibold">{event.clubs.full_name}</span></p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-default-700">
            <div className="flex items-start gap-2">
              <CalendarDaysIcon className="w-5 h-5 mt-0.5 text-secondary flex-shrink-0"/>
              <div>
                <p className="font-medium">Date & Time</p>
                <p>{new Date(event.event_datetime).toLocaleDateString([], { dateStyle: 'full' })}</p>
                <p>
                  {new Date(event.event_datetime).toLocaleTimeString([], { timeStyle: 'short' })}
                  {event.end_time && ` - ${new Date(event.end_time).toLocaleTimeString([], { timeStyle: 'short' })}`}
                </p>
              </div>
            </div>
            {event.venue && (
              <div className="flex items-start gap-2">
                <MapPinIcon className="w-5 h-5 mt-0.5 text-secondary flex-shrink-0"/>
                <div>
                  <p className="font-medium">Venue</p>
                  <p>{event.venue}</p>
                </div>
              </div>
            )}
            {event.registration_deadline && (
              <div className="flex items-start gap-2">
                <ClockIcon className="w-5 h-5 mt-0.5 text-secondary flex-shrink-0"/>
                <div>
                  <p className="font-medium">Register Before</p>
                  <p>{new Date(event.registration_deadline).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <UsersIcon className="w-5 h-5 mt-0.5 text-secondary flex-shrink-0"/>
              <div>
                <p className="font-medium">Seats</p>
                <p>
                  {event.total_seats > 0
                    ? `${Math.max(0, event.total_seats - registrationCount)} remaining / ${event.total_seats} total`
                    : 'Not specified'}
                </p>
              </div>
            </div>
            {event.is_paid && (
              <div className="flex items-start gap-2">
                <CurrencyDollarIcon className="w-5 h-5 mt-0.5 text-secondary flex-shrink-0"/>
                <div>
                  <p className="font-medium">Registration Fee</p>
                  <p>BDT {event.payment_amount?.toFixed(2) ?? '0.00'}</p>
                </div>
              </div>
            )}
          </div>

          {event.description && (
            <div>
              <h2 className="text-xl font-semibold text-default-800 mb-2 mt-4">About the Event</h2>
              <p className="text-default-700 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Display Guests if available */}
          {event.guests && event.guests.length > 0 && (
            <div className="mt-4">
              <h2 className="text-xl font-semibold text-default-800 mb-2 flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5 text-secondary"/>
                Guests
              </h2>
              <div className="flex flex-wrap gap-2">
                {event.guests.map((guest, index) => (
                  <Chip key={`guest-${index}`} variant="flat" color="default">{guest}</Chip>
                ))}
              </div>
            </div>
          )}

          {/* Display Sponsors if available */}
          {event.sponsors && event.sponsors.length > 0 && (
            <div className="mt-4">
              <h2 className="text-xl font-semibold text-default-800 mb-2 flex items-center gap-2">
                 <BuildingStorefrontIcon className="w-5 h-5 text-secondary"/>
                 Sponsors
              </h2>
              <div className="flex flex-wrap gap-2">
                {event.sponsors.map((sponsor, index) => (
                  <Chip key={`sponsor-${index}`} variant="flat" color="default">{sponsor}</Chip>
                ))}
              </div>
            </div>
          )}

        </CardBody>
        <CardFooter className="p-6 border-t border-default-200 flex justify-end">
          {getRegistrationButton()}
        </CardFooter>
      </Card>
    </div>
  );
};

export default StudentEventDetails;
