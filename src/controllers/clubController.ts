import { supabase } from '@/lib/supabaseClient';
import { UserProfile } from '@/contexts/AuthContext'; // Assuming UserProfile includes role
import { EventData, CreateEventPayload, UpdateEventPayload, EventRegistrationData, EventWithClubInfo, EventRegistrationStatus } from '@/types/events'; // Import shared & extended types

// Define the specific structure expected from the getAllClubRegistrations query
export type ClubRegistrationDetails = {
  id: string; // registration id
  event_id: string;
  student_id: string; // the foreign key UUID to profiles.id
  registration_time: string;
  status: EventRegistrationStatus;
  payment_intent_id: string | null;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
    student_id: string | null; // the actual student registration ID (text)
  } | null;
  events: {
    id: string;
    title: string | null;
  } | null;
};


export const ClubController = {

  // Function to create a new event for the currently logged-in club
  async createEvent(eventData: CreateEventPayload): Promise<EventData> {
    // Get current user session to extract club_id (user's profile ID)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      console.error('Error getting session or user:', sessionError);
      throw new Error('User must be logged in to create an event.');
    }
    const clubId = session.user.id;

    // Prepare data for insertion, ensuring club_id is set
    const dataToInsert = {
      ...eventData,
      club_id: clubId,
    };

    console.log('Attempting to insert event:', dataToInsert);

    const { data, error } = await supabase
      .from('events')
      .insert([dataToInsert])
      .select() // Select the newly created row
      .single(); // Expecting a single row back

    if (error) {
      console.error('Error creating event:', error);
      throw new Error(`Failed to create event: ${error.message}`);
    }
    if (!data) {
      throw new Error('Event created but no data returned.');
    }

    console.log('Event created successfully:', data);
    return data as EventData;
  },

  // Function to get all events belonging to the currently logged-in club
  async getClubEvents(): Promise<EventData[]> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      console.error('Error getting session or user:', sessionError);
      throw new Error('User must be logged in to fetch their events.');
    }
    const clubId = session.user.id;

    // Fetch events and the count of active registrations
    const { data, error } = await supabase
      .from('events')
      // Select all event columns and the count of related active registrations
      .select(`
        *,
        active_registration_count:event_registrations(count)
      `)
      // Filter the count to include only 'paid' or 'reserved' statuses
      .in('event_registrations.status', ['paid', 'reserved'])
      .eq('club_id', clubId) // RLS should also enforce this, but explicit check is good
      .order('event_datetime', { ascending: true });

    if (error) {
      console.error('Error fetching club events:', error);
      throw new Error(`Failed to fetch club events: ${error.message}`);
    }

    // Process the data to extract the count correctly
    const processedData = (data || []).map(event => {
      // The count might be nested in an array, extract it
      const countData = event.active_registration_count as any; // Cast to handle potential structure
      const count = Array.isArray(countData) && countData.length > 0 ? countData[0].count : 0;
      return {
        ...event,
        active_registration_count: count,
      };
    });


    return processedData as EventData[];
  },

  // Function to update an existing event belonging to the currently logged-in club
  async updateEvent(eventId: string, eventData: UpdateEventPayload): Promise<EventData> {
     const { data: { session }, error: sessionError } = await supabase.auth.getSession();
     if (sessionError || !session?.user) {
       console.error('Error getting session or user:', sessionError);
       throw new Error('User must be logged in to update an event.');
     }

     // Remove club_id from update payload if present, as it shouldn't change
     const { club_id, ...updatePayload } = eventData as any;

     console.log(`Attempting to update event ${eventId} with payload:`, updatePayload);

     const { data, error } = await supabase
       .from('events')
       .update(updatePayload)
       .eq('id', eventId)
       // RLS enforces that the user can only update their own events (where club_id = auth.uid())
       .select()
       .single();

     if (error) {
       console.error(`Error updating event ${eventId}:`, error);
       throw new Error(`Failed to update event: ${error.message}`);
     }
     if (!data) {
        throw new Error('Event updated but no data returned.');
     }

     console.log(`Event ${eventId} updated successfully:`, data);
     return data as EventData;
  },

  // Function to delete an event belonging to the currently logged-in club
  async deleteEvent(eventId: string): Promise<void> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      console.error('Error getting session or user:', sessionError);
      throw new Error('User must be logged in to delete an event.');
    }
    // RLS policy ensures only the owning club can delete

    console.log(`Attempting to delete event ${eventId}`);

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);
      // RLS enforces ownership check

    if (error) {
      console.error(`Error deleting event ${eventId}:`, error);
      throw new Error(`Failed to delete event: ${error.message}`);
    }

    console.log(`Event ${eventId} deleted successfully.`);
  },

  // Function to get all events with basic club info (e.g., for student view)
  // Optionally filter by clubId if needed
  async getAllEvents(filterClubId?: string): Promise<EventWithClubInfo[]> {
    // Select event data and join with profiles (aliased as clubs) to get club name
    let query = supabase
      .from('events')
      .select(`
        *,
        clubs:profiles (
          full_name
        )
      `)
      .order('event_datetime', { ascending: true });

    if (filterClubId) {
      query = query.eq('club_id', filterClubId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching all events with club info:', error);
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    // Cast the result first to any[], then to the extended type as a workaround for type inference issues
    return (data || []) as any[] as EventWithClubInfo[];
  },

  // Function to get a single event by ID with club info (e.g., for event detail page)
  async getEventById(eventId: string): Promise<EventWithClubInfo | null> {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        clubs:profiles (
          full_name
        )
      `)
      .eq('id', eventId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: Row not found, which is okay
      console.error(`Error fetching event ${eventId}:`, error);
      throw new Error(`Failed to fetch event details: ${error.message}`);
    }

    return data as EventWithClubInfo | null;
  },

  // Function to get registrations for a specific event (for club owner view)
  async getEventRegistrations(eventId: string): Promise<EventRegistrationData[]> {
    // Ensure user is logged in and potentially the owner of the event (RLS should handle this)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      console.error('Error getting session or user:', sessionError);
      throw new Error('User must be logged in to view event registrations.');
    }
    // We might add an explicit check here to see if the event belongs to the user's club
    // const eventDetails = await this.getEventById(eventId);
    // if (eventDetails?.club_id !== session.user.id) {
    //   throw new Error('You do not have permission to view registrations for this event.');
    // }

    console.log(`Fetching registrations for event ${eventId}`);

    // Join with profiles table to get student names
    const { data, error } = await supabase
      .from('event_registrations')
      // Select all registration fields and specific profile fields (adjust as needed)
      .select(`
        *,
        profiles (
          id,
          full_name,
          email
        )
      `)
      .eq('event_id', eventId)
      .order('registration_time', { ascending: false }); // Order by registration time

    if (error) {
      console.error(`Error fetching registrations for event ${eventId}:`, error);
      throw new Error(`Failed to fetch event registrations: ${error.message}`);
    }

    console.log(`Fetched ${data?.length ?? 0} registrations for event ${eventId}`);
    // The data structure will now include a 'profiles' object for each registration
    // We might need to adjust the EventRegistrationData type or handle the nested structure in the component
    return (data || []) as any[]; // Use 'any' for now, or update type definition
  },

  // Function to get the profile data for a specific club ID
  async getClubProfile(clubId: string): Promise<UserProfile | null> {
    // Ensure the user is fetching their own profile or handle permissions if needed
    // RLS policy on 'profiles' table should allow users to view their own profile.

    console.log(`Fetching profile for club ID: ${clubId}`);

    const { data, error } = await supabase
      .from('profiles')
      .select('*') // Select all profile fields, including balance
      .eq('id', clubId)
      .single(); // Expecting a single profile

    if (error && error.code !== 'PGRST116') { // PGRST116: Row not found
      console.error(`Error fetching profile for club ${clubId}:`, error);
      throw new Error(`Failed to fetch club profile: ${error.message}`);
    }

    if (!data) {
      console.warn(`Profile not found for club ID: ${clubId}`);
      return null;
    }

    console.log(`Profile fetched successfully for club ${clubId}`);
    // Assuming UserProfile type includes balance and other necessary fields
    return data as UserProfile;
  },

  // Function to get aggregated analytics data for the club
  async getClubAnalyticsData(clubId: string): Promise<any> { // Define a proper type later
    console.log(`Fetching analytics data for club ID: ${clubId}`);

    // 1. Fetch all events for the club
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, payment_amount, is_paid') // Select necessary fields
      .eq('club_id', clubId);

    if (eventsError) {
      console.error(`Error fetching events for analytics (club ${clubId}):`, eventsError);
      throw new Error(`Failed to fetch events for analytics: ${eventsError.message}`);
    }
    if (!events) {
      return { totalEvents: 0, totalRegistrations: 0, totalPaidRegistrations: 0, totalRevenue: 0 }; // No events found
    }

    const eventIds = events.map(e => e.id);
    const totalEvents = events.length;

    // 2. Fetch all registrations for those events
    const { data: registrations, error: regsError } = await supabase
      .from('event_registrations')
      .select('event_id, status') // Select necessary fields
      .in('event_id', eventIds); // Filter by the club's event IDs

    if (regsError) {
      console.error(`Error fetching registrations for analytics (club ${clubId}):`, regsError);
      throw new Error(`Failed to fetch registrations for analytics: ${regsError.message}`);
    }

    const totalRegistrations = registrations?.length ?? 0;
    const totalPaidRegistrations = registrations?.filter(r => r.status === 'paid').length ?? 0;

    // 3. Calculate total revenue from paid registrations for paid events
    let totalRevenue = 0;
    if (registrations) {
      const paidEventIds = new Set(events.filter(e => e.is_paid && e.payment_amount && e.payment_amount > 0).map(e => e.id));
      const paidEventMap = new Map(events.map(e => [e.id, e.payment_amount ?? 0]));

      registrations.forEach(reg => {
        if (reg.status === 'paid' && paidEventIds.has(reg.event_id)) {
          totalRevenue += paidEventMap.get(reg.event_id) ?? 0;
        }
      });
    }

    const analyticsData = {
      totalEvents,
      totalRegistrations,
      totalPaidRegistrations,
      totalRevenue,
    };

    console.log(`Analytics data fetched for club ${clubId}:`, analyticsData);
    return analyticsData;
  },

  // Function to get ALL registrations for ALL events belonging to the club
  async getAllClubRegistrations(clubId: string): Promise<ClubRegistrationDetails[]> {
    console.log(`Fetching all registrations for club ID: ${clubId}`);

    // 1. Fetch all event IDs for the club
    const { data: clubEvents, error: eventsError } = await supabase
      .from('events')
      .select('id') // Only need IDs
      .eq('club_id', clubId);

    if (eventsError) {
      console.error(`Error fetching event IDs for club ${clubId}:`, eventsError);
      throw new Error(`Failed to fetch event IDs: ${eventsError.message}`);
    }
    if (!clubEvents || clubEvents.length === 0) {
      console.log(`No events found for club ${clubId}. Returning empty registrations.`);
      return []; // No events, so no registrations
    }

    const eventIds = clubEvents.map(e => e.id);

    // 2. Fetch all registrations for those event IDs, joining with profiles and events
    const { data: registrations, error: regsError } = await supabase
      .from('event_registrations')
      .select(`
        *,
        profiles ( id, full_name, email, student_id ),
        events ( id, title )
      `)
      .in('event_id', eventIds) // Filter by the club's event IDs
      .order('registration_time', { ascending: false });

    if (regsError) {
      console.error(`Error fetching all registrations for club ${clubId}:`, regsError);
      throw new Error(`Failed to fetch all registrations: ${regsError.message}`);
    }

    console.log(`Fetched ${registrations?.length ?? 0} total registrations for club ${clubId}`);

    // Log the structure of the first item if it exists
    if (registrations && registrations.length > 0) {
      console.log('Sample registration data structure:', JSON.stringify(registrations[0], null, 2));
    }

    // Return the data, letting TypeScript infer or using the defined type
    return (registrations || []) as ClubRegistrationDetails[];
  },

};
