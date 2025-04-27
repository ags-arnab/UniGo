import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ClubController } from '@/controllers/clubController'; // Assuming controller exists
import { EventData } from '@/types/events'; // Import shared EventData type
// Import necessary UI components (e.g., Card, Avatar, etc.)

// Define type for Club Profile (Consider moving to a shared types file later)
interface ClubProfile {
  id: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  // Add other relevant profile fields if needed
}

// Removed local EventData interface definition

const ClubStorefrontView: React.FC = () => { // Renamed component
  const { clubId } = useParams<{ clubId: string }>();
  const [clubProfile] = useState<ClubProfile | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!clubId) {
        setError('Club ID not found in URL.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // TODO: Fetch club profile details (need a controller function for this)
        // For now, we'll just fetch events
        // const profile = await ClubController.getClubProfileById(clubId); // Placeholder
        // setClubProfile(profile);

        const clubEvents = await ClubController.getAllEvents(clubId);
        setEvents(clubEvents);

      } catch (err) {
        console.error("Error fetching club data:", err);
        setError(err instanceof Error ? err.message : 'Failed to load club information.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clubId]);

  if (loading) {
    return <div>Loading club details...</div>; // Replace with a proper spinner/skeleton
  }

  if (error) {
    return <div className="text-danger">Error: {error}</div>;
  }

  // TODO: Implement the actual storefront UI
  return (
    <div className="container mx-auto p-4">
      {/* Display Club Profile Info (when fetched) */}
      {clubProfile ? (
        <div>
          {/* <Avatar src={clubProfile.avatar_url} alt={clubProfile.full_name} /> */}
          <h1 className="text-3xl font-bold my-4">{clubProfile.full_name || 'Club Profile'}</h1>
          {/* Add other profile details */}
        </div>
      ) : (
         <h1 className="text-3xl font-bold my-4">Club Storefront (ID: {clubId})</h1>
      )}

      <hr className="my-6" />

      <h2 className="text-2xl font-semibold mb-4">Upcoming Events</h2>
      {events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <div key={event.id} className="border p-4 rounded-lg shadow">
              {/* Basic event card - enhance later */}
              <h3 className="text-lg font-semibold">{event.title}</h3> {/* Use title */}
              <p className="text-sm text-gray-600">
                {/* Use event_datetime */}
                {new Date(event.event_datetime).toLocaleString()}
                {event.end_time && ` - ${new Date(event.end_time).toLocaleString()}`}
              </p>
              {event.venue && <p className="text-sm">Venue: {event.venue}</p>} {/* Use venue */}
              {event.description && <p className="mt-2 text-sm">{event.description}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p>This club currently has no upcoming events listed.</p>
      )}
    </div>
  );
};

export default ClubStorefrontView; // Renamed export
