import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Define user types based on roles
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'vendor' | 'admin';
  status: 'pending_approval' | 'active' | 'inactive' | 'rejected';
  profileImage?: string;
  studentId?: string;
}

// Define auth store state
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  // State Setters (to be called by the controller)
  setUser: (user: User | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  logout: () => void; // Logout remains a simple state reset
}

// Create auth store with persistence and dev tools
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,

        // State Setters
        setUser: (user) => set({ user }),
        setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),

        // Logout action (simple state reset)
        logout: () => {
          set({ user: null, isAuthenticated: false, error: null, loading: false });
          // Optionally clear other related storage if needed
        },
      }),
      {
        name: 'unigo-auth-storage', // Storage key for localStorage
        // Persist only user and authentication status
        partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      }
    )
  )
);
