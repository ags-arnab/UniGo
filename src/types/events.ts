// Shared type definitions related to Events and Registrations

// Matches the 'events' table structure after migration 035
export interface EventData {
  id: string;
  club_id: string;
  title: string; // Renamed from name
  description?: string | null;
  event_datetime: string; // Renamed from start_time (ISO string)
  end_time?: string | null; // (ISO string)
  venue?: string | null; // Renamed from location
  banner_image_path?: string | null; // Renamed from image_path
  total_seats: number; // Added
  is_paid: boolean; // Added
  payment_amount?: number | null; // Added (numeric in DB, number here)
  sponsors?: string[] | null; // Added (text array)
  is_seminar: boolean; // Added
  guests?: string[] | null; // Added (text array)
  registration_deadline?: string | null; // Added (ISO string)
  created_at: string; // (ISO string)
  updated_at: string; // (ISO string)
}

// Extended type for events that includes basic club information
export interface EventWithClubInfo extends EventData {
  clubs: { // Assuming the join alias is 'clubs'
    full_name: string | null; // From profiles table
    // Add other profile fields if needed
  } | null; // Allow null if join fails or club_id is invalid
}


// Type for the event registration status enum
export type EventRegistrationStatus = 'reserved' | 'paid' | 'cancelled' | 'attended';

// Matches the 'event_registrations' table structure
export interface EventRegistrationData {
  id: string;
  event_id: string;
  student_id: string;
  registration_time: string; // (ISO string)
  status: EventRegistrationStatus;
  payment_intent_id?: string | null;
  paid_at?: string | null; // (ISO string)
  expires_at?: string | null; // (ISO string)
  created_at: string; // (ISO string)
  updated_at: string; // (ISO string)
}


// --- Payload types for Controller functions ---

// Interface for data used when *creating* an event
// Omits fields automatically set by DB or derived later
export interface CreateEventPayload {
  title: string;
  description?: string | null;
  event_datetime: string | Date; // Allow Date for input convenience
  end_time?: string | Date | null;
  venue?: string | null;
  banner_image_path?: string | null; // Path obtained after upload
  total_seats: number;
  is_paid: boolean;
  payment_amount?: number | null;
  sponsors?: string[] | null;
  is_seminar: boolean;
  guests?: string[] | null;
  registration_deadline?: string | Date | null;
}

// Interface for data used when *updating* an event
// Most fields are optional. ID is required via controller argument.
export type UpdateEventPayload = Partial<Omit<CreateEventPayload, 'banner_image_path'>> & {
  // Include banner_image_path separately if allowing updates after re-upload
  banner_image_path?: string | null;
};

// Interface for data used when *creating* an event registration
export interface CreateEventRegistrationPayload {
  event_id: string;
  // student_id is usually implicit from the logged-in user
  // status defaults to 'reserved'
  // expires_at might be calculated based on event.is_paid
}

// Interface for data used when *updating* an event registration (e.g., confirming payment)
export interface UpdateEventRegistrationPayload {
  status?: EventRegistrationStatus;
  payment_intent_id?: string | null;
  paid_at?: string | Date | null;
  expires_at?: string | Date | null; // Could be cleared on payment
}
