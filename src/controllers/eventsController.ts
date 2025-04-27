import { supabase } from '@/lib/supabaseClient';
import { EventRegistrationData, EventData } from '@/types/events'; // Added EventData

export const EventsController = {

  /**
   * Registers the currently logged-in user for a specific event.
   * Assumes the user is authenticated.
   * @param eventId The ID of the event to register for.
   * @returns The newly created registration record.
   */
  async registerForEvent(eventId: string): Promise<EventRegistrationData> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      console.error('Error getting session or user:', sessionError);
      throw new Error('User must be logged in to register for an event.');
    }
    const studentId = session.user.id;

    // Prepare data for insertion
    // Status defaults to 'reserved' in the DB based on migration 035
    const registrationData = {
      event_id: eventId,
      student_id: studentId,
      // expires_at might need to be set based on event.is_paid, potentially in a trigger or function later
    };

    console.log(`Attempting to register student ${studentId} for event ${eventId}`);

    const { data, error } = await supabase
      .from('event_registrations')
      .insert([registrationData])
      .select()
      .single(); // Expecting one row back

    if (error) {
      // Handle potential unique constraint violation (already registered) gracefully
      if (error.code === '23505') { // PostgreSQL unique violation code
         console.warn(`User ${studentId} already registered for event ${eventId}.`);
         // Optionally fetch the existing registration instead of throwing an error
         const existing = await this.getRegistrationStatus(eventId, studentId);
         if (existing) return existing;
         // If fetch fails for some reason, re-throw original error
      }
      console.error('Error creating event registration:', error);
      throw new Error(`Failed to register for event: ${error.message}`);
    }
    if (!data) {
      throw new Error('Registration created but no data returned.');
    }

    console.log('Registration successful:', data);
    return data as EventRegistrationData;
  },

  /**
   * Gets the registration status for a specific student and event.
   * @param eventId The ID of the event.
   * @param studentId The ID of the student.
   * @returns The registration record if found, otherwise null.
   */
  async getRegistrationStatus(eventId: string, studentId: string): Promise<EventRegistrationData | null> {
    if (!eventId || !studentId) return null;

    const { data, error } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('event_id', eventId)
      .eq('student_id', studentId)
      .maybeSingle(); // Use maybeSingle as registration might not exist

    if (error) {
      console.error(`Error fetching registration status for event ${eventId}, student ${studentId}:`, error);
      // Don't throw an error, just return null or handle specific errors if needed
      return null;
    }

    return data as EventRegistrationData | null;
  },

   /**
    * Gets the count of active registrations (reserved or paid) for an event.
    * @param eventId The ID of the event.
    * @returns The number of active registrations.
    */
   async getEventRegistrationCount(eventId: string): Promise<number> {
     if (!eventId) return 0;

     const { count, error } = await supabase
       .from('event_registrations')
       .select('*', { count: 'exact', head: true }) // Use count feature
       .eq('event_id', eventId)
       .in('status', ['reserved', 'paid']); // Only count active statuses

     if (error) {
       console.error(`Error fetching registration count for event ${eventId}:`, error);
       return 0; // Return 0 on error
     }

     return count ?? 0;
   },

   /**
    * Registers the currently logged-in user for a PAID event by calling the RPC function.
    * This function handles balance deduction and registration atomically on the backend.
    * @param eventId The ID of the paid event to register for.
    * @returns The newly created/updated registration record.
    */
   async registerAndPayForEvent(eventId: string): Promise<EventRegistrationData> {
     const { data: { session }, error: sessionError } = await supabase.auth.getSession();
     if (sessionError || !session?.user) {
       console.error('Error getting session or user:', sessionError);
       throw new Error('User must be logged in to register.');
     }
     // No need to pass studentId, the function uses auth.uid()

     console.log(`Attempting to register and pay for event ${eventId} via RPC.`);

     const { data, error } = await supabase.rpc('register_and_pay_event', {
       p_event_id: eventId
     });

     if (error) {
       console.error('Error calling register_and_pay_event RPC:', error);
       // Attempt to parse PostgreSQL error messages for user-friendly feedback
       if (error.message.includes('INSUFFICIENT_FUNDS')) {
           throw new Error('Insufficient balance to register for this event.');
       } else if (error.message.includes('REGISTRATION_CLOSED')) {
           throw new Error('The registration deadline has passed.');
       } else if (error.message.includes('ALREADY_REGISTERED')) {
           throw new Error('You are already registered for this event.');
       } else if (error.message.includes('SEATS_FULL')) {
           throw new Error('Sorry, this event is full.');
       }
       // Generic error for other cases
       throw new Error(`Failed to register for paid event: ${error.message}`);
     }

     if (!data) {
       // This shouldn't happen if the RPC function returns the record on success
       throw new Error('Registration successful, but no data returned from RPC.');
     }

     console.log('Paid registration successful via RPC:', data);
     // The RPC function returns the registration record directly
     return data as EventRegistrationData;
   },

   // TODO: Add function to cancel a 'reserved' registration if needed
   // async cancelRegistration(registrationId: string): Promise<void> { ... }

   /**
    * Gets all event registrations for the currently logged-in student, including event details.
    * @returns An array of registration records, each including nested event data.
    */
   async getMyEventRegistrations(): Promise<(EventRegistrationData & { events: EventData | null })[]> {
     const { data: { session }, error: sessionError } = await supabase.auth.getSession();
     if (sessionError || !session?.user) {
       console.error('Error getting session or user:', sessionError);
       throw new Error('User must be logged in to fetch registrations.');
     }
     const studentId = session.user.id;

     const { data, error } = await supabase
       .from('event_registrations')
       .select(`
         *,
         events (*)
       `)
       .eq('student_id', studentId)
       .order('registration_time', { ascending: false });

     if (error) {
       console.error(`Error fetching registrations for student ${studentId}:`, error);
       throw new Error(`Failed to fetch event registrations: ${error.message}`);
     }

     // The type assertion might need adjustment based on how Supabase returns the joined data
     return (data || []) as (EventRegistrationData & { events: EventData | null })[];
   },

};
