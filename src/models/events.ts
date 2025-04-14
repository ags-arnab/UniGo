import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Define event interface
export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  organizer: string;
  category: string;
  price: number;
  image: string;
  capacity: number;
  registeredCount: number;
  isFeatured: boolean;
  createdBy: string;
  createdAt: Date;
}

// Define event registration interface
export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'attended';
  registeredAt: Date;
  ticketCount: number;
  totalPrice: number;
  paymentStatus: 'pending' | 'completed' | 'refunded';
}

// Define events store state
interface EventsState {
  events: Event[];
  filteredEvents: Event[];
  featuredEvents: Event[];
  userRegistrations: EventRegistration[];
  selectedEvent: Event | null;
  loading: boolean;
  error: string | null;
  
  // Filter actions
  setFilter: (category: string, searchQuery: string) => void;
  
  // Event actions
  fetchEvents: () => Promise<void>;
  fetchEventById: (id: string) => Promise<Event>;
  
  // Registration actions
  fetchUserRegistrations: () => Promise<void>;
  registerForEvent: (eventId: string, ticketCount: number) => Promise<EventRegistration>;
  cancelRegistration: (registrationId: string) => Promise<void>;
}

// Create events store with dev tools
export const useEventsStore = create<EventsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      events: [],
      filteredEvents: [],
      featuredEvents: [],
      userRegistrations: [],
      selectedEvent: null,
      loading: false,
      error: null,
      
      // Set filter for events
      setFilter: (category: string, searchQuery: string) => {
        const { events } = get();
        
        const filtered = events.filter(event => 
          (category === 'All' || event.category === category) && 
          event.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        set({ filteredEvents: filtered });
      },
      
      // Fetch all events
      fetchEvents: async () => {
        set({ loading: true, error: null });
        
        try {
          // This would be replaced with an actual API call in production
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
          
          // Mock events data
          const mockEvents: Event[] = [
            {
              id: 'event-1',
              title: 'Annual Tech Symposium',
              description: 'Join us for presentations and discussions on the latest technology trends.',
              date: 'April 15, 2025',
              time: '10:00 AM - 4:00 PM',
              location: 'University Auditorium',
              organizer: 'Computer Science Club',
              category: 'Academic',
              price: 0,
              image: 'https://placehold.co/600x400',
              capacity: 200,
              registeredCount: 45,
              isFeatured: true,
              createdBy: 'club-admin-1',
              createdAt: new Date('2025-01-15')
            },
            {
              id: 'event-2',
              title: 'Basketball Tournament',
              description: 'Inter-university basketball competition with teams from across the region.',
              date: 'April 10-12, 2025',
              time: '9:00 AM - 6:00 PM',
              location: 'University Sports Complex',
              organizer: 'Sports Department',
              category: 'Sports',
              price: 5,
              image: 'https://placehold.co/600x400',
              capacity: 500,
              registeredCount: 230,
              isFeatured: false,
              createdBy: 'sports-admin',
              createdAt: new Date('2025-01-20')
            },
            {
              id: 'event-3',
              title: 'Cultural Fest',
              description: 'Celebrate cultural diversity with music, dance, and food from around the world.',
              date: 'April 20, 2025',
              time: '11:00 AM - 10:00 PM',
              location: 'University Plaza',
              organizer: 'Cultural Committee',
              category: 'Cultural',
              price: 10,
              image: 'https://placehold.co/600x400',
              capacity: 1000,
              registeredCount: 567,
              isFeatured: true,
              createdBy: 'cultural-admin',
              createdAt: new Date('2025-02-01')
            },
            {
              id: 'event-4',
              title: 'Resume Building Workshop',
              description: 'Learn how to create an impressive resume that stands out to employers.',
              date: 'April 5, 2025',
              time: '2:00 PM - 4:00 PM',
              location: 'Career Center',
              organizer: 'Career Services',
              category: 'Workshops',
              price: 0,
              image: 'https://placehold.co/600x400',
              capacity: 50,
              registeredCount: 42,
              isFeatured: false,
              createdBy: 'career-admin',
              createdAt: new Date('2025-02-15')
            },
            {
              id: 'event-5',
              title: 'Photography Club Meetup',
              description: 'Monthly meeting for photography enthusiasts to share tips and showcase work.',
              date: 'April 8, 2025',
              time: '5:00 PM - 7:00 PM',
              location: 'Arts Building, Room 202',
              organizer: 'Photography Club',
              category: 'Club Activities',
              price: 0,
              image: 'https://placehold.co/600x400',
              capacity: 30,
              registeredCount: 12,
              isFeatured: false,
              createdBy: 'photo-club-lead',
              createdAt: new Date('2025-03-01')
            },
            {
              id: 'event-6',
              title: 'Environmental Cleanup Day',
              description: 'Join us in cleaning up the university campus and surrounding areas.',
              date: 'April 22, 2025',
              time: '9:00 AM - 12:00 PM',
              location: 'Main Campus',
              organizer: 'Environmental Club',
              category: 'Club Activities',
              price: 0,
              image: 'https://placehold.co/600x400',
              capacity: 100,
              registeredCount: 37,
              isFeatured: false,
              createdBy: 'env-club-lead',
              createdAt: new Date('2025-03-10')
            }
          ];
          
          set({ 
            events: mockEvents, 
            filteredEvents: mockEvents,
            featuredEvents: mockEvents.filter(event => event.isFeatured),
            loading: false 
          });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to fetch events', loading: false });
        }
      },
      
      // Fetch event by ID
      fetchEventById: async (id: string) => {
        set({ loading: true, error: null });
        
        try {
          // This would be replaced with an actual API call in production
          await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
          
          // Find event from existing events or fetch from API
          const { events } = get();
          let event = events.find(e => e.id === id);
          
          if (!event) {
            // If event not in state, this would normally fetch from API
            // For mock purposes, we'll just throw an error
            throw new Error('Event not found');
          }
          
          set({ selectedEvent: event, loading: false });
          return event;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to fetch event', loading: false });
          throw error;
        }
      },
      
      // Fetch user event registrations
      fetchUserRegistrations: async () => {
        set({ loading: true, error: null });
        
        try {
          // This would be replaced with an actual API call in production
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
          
          // Mock user registrations
          const mockRegistrations: EventRegistration[] = [
            {
              id: 'reg-1',
              eventId: 'event-1',
              userId: 'current-user-id', // Would come from auth store in production
              status: 'confirmed',
              registeredAt: new Date(Date.now() - 604800000), // 1 week ago
              ticketCount: 1,
              totalPrice: 0, // Free event
              paymentStatus: 'completed'
            },
            {
              id: 'reg-2',
              eventId: 'event-3',
              userId: 'current-user-id',
              status: 'confirmed',
              registeredAt: new Date(Date.now() - 259200000), // 3 days ago
              ticketCount: 2,
              totalPrice: 20, // $10 per ticket
              paymentStatus: 'completed'
            }
          ];
          
          set({ userRegistrations: mockRegistrations, loading: false });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to fetch registrations', loading: false });
        }
      },
      
      // Register for an event
      registerForEvent: async (eventId: string, ticketCount: number) => {
        set({ loading: true, error: null });
        
        try {
          // This would be replaced with an actual API call in production
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
          
          const event = get().events.find(e => e.id === eventId);
          if (!event) {
            throw new Error('Event not found');
          }
          
          if (event.registeredCount + ticketCount > event.capacity) {
            throw new Error('Not enough tickets available');
          }
          
          // Create new registration
          const newRegistration: EventRegistration = {
            id: `reg-${Math.floor(Math.random() * 100000)}`,
            eventId,
            userId: 'current-user-id', // Would come from auth store in production
            status: 'confirmed',
            registeredAt: new Date(),
            ticketCount,
            totalPrice: event.price * ticketCount,
            paymentStatus: 'completed'
          };
          
          // Update events state with incremented registeredCount
          set(state => ({
            events: state.events.map(e => 
              e.id === eventId 
                ? { ...e, registeredCount: e.registeredCount + ticketCount } 
                : e
            ),
            filteredEvents: state.filteredEvents.map(e => 
              e.id === eventId 
                ? { ...e, registeredCount: e.registeredCount + ticketCount } 
                : e
            ),
            featuredEvents: state.featuredEvents.map(e => 
              e.id === eventId 
                ? { ...e, registeredCount: e.registeredCount + ticketCount } 
                : e
            ),
            userRegistrations: [...state.userRegistrations, newRegistration],
            loading: false
          }));
          
          return newRegistration;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to register for event', loading: false });
          throw error;
        }
      },
      
      // Cancel registration
      cancelRegistration: async (registrationId: string) => {
        set({ loading: true, error: null });
        
        try {
          // This would be replaced with an actual API call in production
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
          
          const registration = get().userRegistrations.find(r => r.id === registrationId);
          if (!registration) {
            throw new Error('Registration not found');
          }
          
          // Update the registration status
          set(state => ({
            userRegistrations: state.userRegistrations.map(r => 
              r.id === registrationId 
                ? { ...r, status: 'cancelled', paymentStatus: 'refunded' } 
                : r
            ),
            // Decrement the registeredCount for the event
            events: state.events.map(e => 
              e.id === registration.eventId 
                ? { ...e, registeredCount: e.registeredCount - registration.ticketCount } 
                : e
            ),
            filteredEvents: state.filteredEvents.map(e => 
              e.id === registration.eventId 
                ? { ...e, registeredCount: e.registeredCount - registration.ticketCount } 
                : e
            ),
            featuredEvents: state.featuredEvents.map(e => 
              e.id === registration.eventId 
                ? { ...e, registeredCount: e.registeredCount - registration.ticketCount } 
                : e
            ),
            loading: false
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to cancel registration', loading: false });
          throw error;
        }
      }
    })
  )
);