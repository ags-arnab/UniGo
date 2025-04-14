import { useEventsStore, EventRegistration, Event } from "@/models/events";

/**
 * Events Controller - Handles all event management business logic
 * Acts as an intermediary between the UI components and the events store
 */
export class EventsController {
  /**
   * Fetches all available events
   * @returns Promise that resolves when events are loaded
   */
  static async fetchEvents(): Promise<Event[]> {
    try {
      await useEventsStore.getState().fetchEvents();
      return useEventsStore.getState().events;
    } catch (error) {
      console.error('Failed to fetch events:', error);
      throw error;
    }
  }

  /**
   * Fetches a specific event by ID
   * @param id Event ID to fetch
   * @returns Promise that resolves with the event data
   */
  static async getEventById(id: string): Promise<Event> {
    try {
      return await useEventsStore.getState().fetchEventById(id);
    } catch (error) {
      console.error(`Failed to fetch event with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Gets events that are marked as featured
   * @returns Array of featured events
   */
  static getFeaturedEvents(): Event[] {
    return useEventsStore.getState().featuredEvents;
  }

  /**
   * Applies filtering to events based on criteria
   * @param category Category to filter by, or 'All' for all categories
   * @param searchQuery Text search query
   * @returns Filtered events array
   */
  static filterEvents(category: string, searchQuery: string): Event[] {
    useEventsStore.getState().setFilter(category, searchQuery);
    return useEventsStore.getState().filteredEvents;
  }

  /**
   * Fetches event registrations for the current user
   * @returns Promise that resolves with user's registrations
   */
  static async getUserRegistrations(): Promise<EventRegistration[]> {
    try {
      await useEventsStore.getState().fetchUserRegistrations();
      return useEventsStore.getState().userRegistrations;
    } catch (error) {
      console.error('Failed to fetch user registrations:', error);
      throw error;
    }
  }

  /**
   * Registers the current user for an event
   * @param eventId ID of the event to register for
   * @param ticketCount Number of tickets to reserve
   * @returns Promise that resolves with the registration details
   */
  static async registerForEvent(eventId: string, ticketCount: number): Promise<EventRegistration> {
    if (!eventId) {
      throw new Error('Event ID is required');
    }

    if (ticketCount <= 0) {
      throw new Error('Ticket count must be at least 1');
    }

    try {
      return await useEventsStore.getState().registerForEvent(eventId, ticketCount);
    } catch (error) {
      console.error('Failed to register for event:', error);
      throw error;
    }
  }

  /**
   * Cancels an existing event registration
   * @param registrationId ID of the registration to cancel
   * @returns Promise that resolves when cancellation completes
   */
  static async cancelRegistration(registrationId: string): Promise<void> {
    if (!registrationId) {
      throw new Error('Registration ID is required');
    }

    try {
      await useEventsStore.getState().cancelRegistration(registrationId);
    } catch (error) {
      console.error('Failed to cancel registration:', error);
      throw error;
    }
  }

  /**
   * Checks if the user is registered for a specific event
   * @param eventId ID of the event to check
   * @returns Whether user is registered and registration details if available
   */
  static isUserRegistered(eventId: string): { registered: boolean, registration?: EventRegistration } {
    const userRegistrations = useEventsStore.getState().userRegistrations;
    const registration = userRegistrations.find(reg => reg.eventId === eventId && reg.status !== 'cancelled');
    
    return {
      registered: !!registration,
      registration
    };
  }
}
