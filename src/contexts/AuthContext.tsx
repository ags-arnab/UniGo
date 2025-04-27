import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient'; // Adjust path if needed

// Define the shape of the profile data we expect
// Corresponds to the 'profiles' table structure
export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  role: 'student' | 'vendor' | 'admin' | 'club'; // Matches the user_role enum, added 'club'
  status?: 'active' | 'inactive' | 'pending' | 'pending_approval' | 'rejected';
  phone_number?: string;
  student_id?: string;
  balance?: number; // Added balance field
  created_at?: string;
  updated_at?: string;
}

// Define the shape of the context value
interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean; // Tracks initial auth check (session/user)
  profileLoading: boolean; // Tracks profile fetch status
  profileError: Error | null;
  isAuthenticated: boolean; // Convenience flag
  isAdmin: boolean; // Convenience flag
  isVendor: boolean; // Convenience flag
  isStudent: boolean; // Convenience flag
  isClub: boolean; // Convenience flag for Club role
  logout: () => Promise<void>; // Renamed from signOut
  // Removed setAuthenticatedUser, startLoginAttempt, endLoginAttempt
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define the props for the AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

// Create the AuthProvider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<Error | null>(null);
  // Removed isLoginAttempt state

  useEffect(() => {
    // Set initial loading state true. The listener will set it to false.
    setLoading(true);

    // --- Auth State Change Listener ---
    // Handles initial session, sign in, sign out, token refresh etc.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('Auth state changed (event, session):', _event, session);

        // --- NEW LOADING LOGIC ---
        // We only want the main 'loading' state to be true on the initial mount.
        // Subsequent events should update data but not trigger the top-level loading
        // state if the user is already considered authenticated, to prevent flicker.
        // The initial setLoading(true) is outside this listener. This listener's
        // primary job regarding loading is to set it to false once the initial
        // state is determined.

        const currentUser = session?.user ?? null;

        if (!currentUser) {
          // Handle logout/no session
          console.log('AuthContext: No user session found or SIGNED_OUT. Resetting state.');
          setSession(null);
          setUser(null);
          setProfile(null);
          setProfileError(null);
          // Handle logout/no session
          console.log('AuthContext: No user session found or SIGNED_OUT. Resetting state.');
          setSession(null);
          setUser(null);
          setProfile(null);
          setProfileError(null);
          // Ensure loading is false after resetting state.
          if (loading) setLoading(false); // Stop initial loading
          setProfileLoading(false); // Also stop profile loading if we log out
          return;
        }

        // --- Session exists ---
        // Set basic auth state first and stop initial loading
        console.log(`AuthContext: Session found for user ${currentUser.id}. Setting base session/user.`);
        setSession(session);
        setUser(currentUser);
        setProfileError(null); // Clear previous errors
        if (loading) setLoading(false); // Stop initial loading NOW

        // --- Process profile asynchronously ---
        setProfileLoading(true); // Start profile loading indicator
        try {
          console.log(`AuthContext: Fetching profile for user ${currentUser.id}...`);
          const { data: profileData, error: profileFetchError, status } = await supabase
            .from('profiles')
            .select('id, role, status, full_name, email, avatar_url, phone_number, student_id')
            .eq('id', currentUser.id)
            .single();

          // --- State Update Logic ---
          // Decide final state based on profile fetch results
          // --- MODIFIED ERROR HANDLING ---
          if (profileFetchError && status !== 406) {
            console.error('AuthContext: Error fetching profile:', profileFetchError);
            // DON'T clear session/user if Supabase session is still valid.
            // Only clear profile and set the error. Keep existing session/user.
            setSession(session); // Keep session from event
            setUser(currentUser); // Keep user from event
            setProfile(null);
            setProfileError(profileFetchError);
          } else if (profileData) {
            const userProfile = profileData as UserProfile;
            console.log(`AuthContext: Profile found for user ${currentUser.id}. Status: ${userProfile.status}.`);
            if (userProfile.status === 'active') {
              // SUCCESS CASE: Profile active. Set the state.
              // Use the session object from the event trigger
              console.log(`AuthContext: Setting active session state for user ${currentUser.id}.`);
              setSession(session);
              setUser(currentUser);
              setProfile(userProfile);
              setProfileError(null);
            } else {
              // Profile exists but status is not active.
              // Keep the session/user from Supabase, but clear the profile and set an error.
               console.warn(`AuthContext: User ${currentUser.id} profile status is ${userProfile.status}. Clearing profile and setting error, but keeping session.`);
               let statusErrorMsg = 'Your account is not active.';
               // Make pending message more generic or role-specific
               if (userProfile.status === 'pending_approval') {
                 statusErrorMsg = `Your ${userProfile.role || 'account'} application is pending approval.`;
               }
               if (userProfile.status === 'inactive') statusErrorMsg = 'Your account is inactive.';
               if (userProfile.status === 'rejected') statusErrorMsg = 'Your account application has been rejected.';
              // setSession(null); // DO NOT CLEAR SESSION
              // setUser(null);    // DO NOT CLEAR USER
              setProfile(null); // Clear profile data as it's not usable
              setProfileError(new Error(statusErrorMsg)); // Set appropriate error
            }
          } else {
            // Profile not found (status 406 or data is null).
            // --- MODIFIED ERROR HANDLING ---
            const notFoundError = new Error(`AuthContext: Profile not found for user ${currentUser.id}. Ensure profile exists.`);
            console.warn(notFoundError.message);
            // DON'T clear session/user if Supabase session is still valid.
            // Only clear profile and set the error. Keep existing session/user.
            setSession(session); // Keep session from event
            setUser(currentUser); // Keep user from event
            setProfile(null);
            setProfileError(notFoundError);
          }
        } catch (error) {
          // --- MODIFIED ERROR HANDLING ---
          const fetchError = error instanceof Error ? error : new Error('AuthContext: Unknown error during profile fetch.');
          console.error('AuthContext: Error in profile fetch logic:', fetchError);
          // DON'T clear session/user if Supabase session is still valid.
          // Only clear profile and set the error. Keep existing session/user.
          setSession(session); // Keep session from event
          setUser(currentUser); // Keep user from event
          setProfile(null);
            setProfileError(fetchError);
        } finally {
          // Stop profile loading indicator
          setProfileLoading(false);
          console.log('AuthContext: Finished processing profile fetch.');
          // Note: Initial 'loading' state is already set to false earlier
        }
      }
    );

    // Cleanup
    return () => {
      console.log('AuthContext: Unsubscribing auth listener.');
      authListener?.subscription.unsubscribe();
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // Function to log out - Let the listener handle state updates including loading
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
      // Potentially set an error state here if needed, though usually handled by UI reacting to logout
    }
  };

  // Derived state: isAuthenticated now relies primarily on session and user.
  // Components needing profile data should check profile and profileError.
  const isAuthenticated = !!session && !!user;
  // Roles depend on profile being successfully loaded AND authenticated
  const isAdmin = isAuthenticated && !!profile && profile.role === 'admin';
  const isVendor = isAuthenticated && !!profile && profile.role === 'vendor';
  const isStudent = isAuthenticated && !!profile && profile.role === 'student';
  const isClub = isAuthenticated && !!profile && profile.role === 'club'; // Calculate isClub flag

  // Final Context value - defined INSIDE AuthProvider
  const value: AuthContextType = {
    session,
    user,
    profile,
    loading, // Initial auth check loading
    profileLoading, // Profile fetch loading
    profileError, // Expose error state
    isAuthenticated,
    isAdmin,
    isVendor,
    isStudent,
    isClub, // Add isClub to context value
    logout,
  };

  // Provide the context value to children components
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; // End of AuthProvider component

// Custom hook to use the AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
