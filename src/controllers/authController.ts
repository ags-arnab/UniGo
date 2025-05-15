import { supabase } from '@/lib/supabaseClient'; // Import Supabase client
import { SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import { UserProfile } from '@/contexts/AuthContext'; // Import UserProfile type

// Define a type for vendor application data
interface VendorApplicationData {
  businessName: string;
  businessType: string;
  otherBusinessType?: string;
  contactPerson: string;
  email: string;
  phone: string;
  description: string;
  establishedYear: string;
  vendorType: string;
  universityAffiliation?: string;
  hasFoodLicense?: boolean;
  hasBusinessRegistration?: boolean;
  agreeToTerms: boolean;
  agreeToCommission: boolean;
  password?: string;
  // Optional fields for File objects from the form
  businessRegistrationDocFile?: File | null;
  foodHandlingDocFile?: File | null;
}


/**
 * Auth Controller - Handles all authentication business logic
 * Acts as an intermediary between the UI components (Views) and Supabase Auth.
 * State is managed globally via AuthContext.
 */
export class AuthController {
  /**
   * Attempts user login with provided credentials using Supabase.
   * @param credentials User email and password
   * @param intendedRole The role the user is attempting to log in as ('student' or 'vendor')
   * @returns Promise resolving with the validated UserProfile on success, throwing AuthError or custom Error on failure.
   */
  static async login(credentials: SignInWithPasswordCredentials, intendedRole: 'student' | 'vendor'): Promise<UserProfile> {
    // Check for either email or phone, depending on what SignInWithPasswordCredentials allows
    if (!('email' in credentials && credentials.email) && !('phone' in credentials && credentials.phone)) {
      throw new Error('Email or phone is required');
    }
    if (!credentials.password) {
       throw new Error('Password is required');
     }
     // 1. Attempt to sign in with Supabase Auth
     const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword(credentials);
 
     if (signInError) {
       console.error('Supabase login failed:', signInError);
       throw signInError; // Re-throw Supabase error for the UI to handle (e.g., invalid credentials)
     }

     if (!signInData.user) {
        // Should not happen if signInError is null, but good practice to check
        console.error('Supabase login succeeded but user data is missing.');
        throw new Error('Login failed: User data not found after authentication.');
     }

     // 2. Fetch the user's full profile from the 'profiles' table
     const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*') // Fetch all profile fields
        .eq('id', signInData.user.id)
        .single(); // Expecting exactly one profile

     if (profileError) {
        console.error('Error fetching user profile after login:', profileError);
        // Log the user out just in case the session was created but profile is inaccessible
        await supabase.auth.signOut();
        throw new Error('Login failed: Could not verify account status.');
     }

     if (!profileData) {
        console.error('User profile not found after login for user ID:', signInData.user.id);
        // Log the user out as profile is missing
        await supabase.auth.signOut();
        throw new Error('Login failed: User profile not found.');
     }

     // Cast the fetched data to UserProfile
     const profile = profileData as UserProfile;

     // 3. Check role and status *before* considering the login successful
     const actualRole = profile.role; // Role is already typed in UserProfile

     // Role Mismatch Check - Modified to allow 'club' role via 'vendor' portal
     if (actualRole !== 'admin') { // Admins can log in via any portal (implicitly)
        // Check if the user is trying the wrong portal, *unless* they are a 'club' trying the 'vendor' portal
        const isClubUsingVendorPortal = (actualRole === 'club' && intendedRole === 'vendor');
        const isMarketplaceOperatorUsingVendorPortal = (actualRole === 'marketplace_operator' && intendedRole === 'vendor');

        if (actualRole !== intendedRole && !isClubUsingVendorPortal && !isMarketplaceOperatorUsingVendorPortal) {
            console.warn(`Role mismatch for user ${signInData.user.id}: Tried to log in as ${intendedRole}, but actual role is ${actualRole}. Signing out.`);
            await supabase.auth.signOut(); // Sign out FIRST

            // Determine the correct portal name based on the actual role
            let expectedPortal = 'Unknown';
            if (actualRole === 'student') expectedPortal = 'Student';
            else if (actualRole === 'vendor') expectedPortal = 'Vendor'; // Standard cafeteria vendor
            else if (actualRole === 'club') expectedPortal = 'Vendor'; // Clubs use the Vendor portal
            else if (actualRole === 'marketplace_operator') expectedPortal = 'Vendor'; // Marketplace Operators also use Vendor portal

            // Throw error AFTER sign out is processed
            throw new Error(`Incorrect login portal. You are registered as a ${actualRole}. Please use the ${expectedPortal} login.`);
        }
     }


     // Status Check (applies to all roles, including admin)
     if (profile.status !== 'active') {
       console.warn(`Login prevented for user ${signInData.user.id}: status is ${profile.status}. Signing out.`);
       await supabase.auth.signOut(); // Sign out FIRST
       let statusErrorMsg = 'Login failed: Your account is not active.';
       if (profile.status === 'pending_approval') statusErrorMsg = 'Login failed: Your vendor account is pending approval.';
       if (profile.status === 'inactive') statusErrorMsg = 'Login failed: Your account is inactive.';
       if (profile.status === 'rejected') statusErrorMsg = 'Login failed: Your account has been rejected.';
       // Throw error AFTER sign out is processed
       throw new Error(statusErrorMsg);
     }

     // 5. If role matches and status is 'active', login is successful
     // Return the validated profile data. The AuthContext listener will eventually update too,
     // but the immediate navigation relies on this return value.
     console.log(`AuthController: Login successful for ${intendedRole} user: ${signInData.user.id}. Role and status verified.`);
     return profile; // Return the validated profile
   }

  /**
   * Logs out the current user using Supabase.
   * @returns Promise resolving on success, throwing AuthError on failure.
   */
  static async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Supabase logout failed:', error);
      throw error; // Re-throw Supabase error
    }
    // Success: onAuthStateChange in AuthContext will handle state updates.
    console.log('Supabase logout successful');
  }

  /**
   * Registers a new user using Supabase.
   * Requires email confirmation by default.
   * @param credentials User email and password. Options can include 'data' for profile info.
   * @returns Promise resolving on success, throwing AuthError on failure.
   */
  static async register(credentials: SignUpWithPasswordCredentials): Promise<void> {
     // Check for either email or phone
     if (!('email' in credentials && credentials.email) && !('phone' in credentials && credentials.phone)) {
       throw new Error('Email or phone is required for registration');
     }
     if (!credentials.password) {
        throw new Error('Password is required for registration');
     }
     // Add password strength check if desired
     if (credentials.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
     }

     const { data, error } = await supabase.auth.signUp(credentials);

     if (error) {
       console.error('Supabase registration failed:', error);
       throw error; // Re-throw Supabase error
     }

     // Handle cases based on user confirmation status
     if (data.user && data.user.identities && data.user.identities.length === 0) {
        // This might indicate an issue, like user already exists but is unconfirmed.
        // Supabase might return an error in this case anyway.
        const identifier = 'email' in credentials ? credentials.email : credentials.phone;
        console.warn('Registration attempt for potentially existing unconfirmed user:', identifier);
        // Consider throwing a specific error or returning info
        throw new Error('User might already exist but is unconfirmed. Check your email or try logging in.');
     } else if (data.session) {
        // User is created and logged in (e.g., if email confirmation is disabled)
        console.log('Supabase registration successful and user logged in.');
        // Explicitly sign out the user so they must consciously log in after registration
        await supabase.auth.signOut();
        console.log('User signed out after registration to prevent auto-login');
     } else if (data.user) {
        // User is created but requires confirmation (default)
        console.log('Supabase registration successful. Please check your email to confirm.');
     } else {
        // Unexpected case
        console.warn('Supabase registration returned unexpected data:', data);
        throw new Error('Registration completed with unexpected status.');
     }

     // The handle_new_user trigger in Supabase should create the profile entry.
     // The onAuthStateChange listener will pick up the session/user state.
  }

  /**
   * Sends a password reset request email using Supabase.
   * @param email User email
   * @returns Promise resolving on success, throwing AuthError on failure.
   */
  static async requestPasswordReset(email: string): Promise<void> {
    if (!email) {
      throw new Error('Email is required to reset password');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Optional: Specify the URL to redirect the user to after clicking the link
      // redirectTo: 'http://localhost:5173/reset-password', // Adjust URL as needed
    });

    if (error) {
      console.error('Supabase password reset request failed:', error);
      throw error; // Re-throw Supabase error
    }
    console.log(`Supabase: Password reset link sent successfully to ${email}`);
  }

  /**
   * Updates the user's password using Supabase.
   * This should be called when the user is on the password reset page,
   * having followed the link from the email. Supabase handles the token implicitly via the session.
   * @param newPassword The new password
   * @returns Promise resolving on success, throwing AuthError on failure.
   */
  static async resetPassword(newPassword: string): Promise<void> {
    if (!newPassword) {
      throw new Error('New password is required');
    }
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      console.error('Supabase password reset failed:', error);
      throw error; // Re-throw Supabase error
    }
    console.log('Supabase: Password reset successful.');
  }

  /**
   * Registers a new vendor user and submits their application details.
   * Handles user signup, document uploads (if provided), and application record creation.
   * @param applicationData Data from the vendor application/signup form, including password.
   * @returns Promise that resolves when the signup and submission completes successfully.
   * @throws Error if validation fails, signup fails, document upload fails, or application insertion fails.
   */
  static async registerAndApplyAsVendor(applicationData: VendorApplicationData): Promise<void> {
    // 1. Validate required fields (including password)
    if (!applicationData.email || !applicationData.password) {
      throw new Error('Email and password are required for registration.');
    }
     if (applicationData.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
     }
    if (!applicationData.businessName || !applicationData.contactPerson || !applicationData.phone || !applicationData.businessType || !applicationData.agreeToTerms || !applicationData.agreeToCommission) {
      throw new Error('Required application fields are missing. Please fill out the form completely.');
    }
    if (applicationData.businessType === 'other' && !applicationData.otherBusinessType) {
        throw new Error('Please specify the business type when selecting "Other".');
    }

    // 2. Sign up the user in Supabase Auth
    // Pass metadata to trigger the handle_new_user function correctly
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: applicationData.email,
      password: applicationData.password,
      options: {
        data: {
          is_vendor_application: 'true', // Signal to the trigger
          full_name: applicationData.contactPerson // Optionally pre-fill full_name
        }
      }
    });

    if (signUpError) {
      console.error('Supabase vendor signup failed:', signUpError);
      // Handle specific errors like user already exists
      if (signUpError.message.includes('User already registered')) {
         throw new Error('An account with this email already exists. Please log in or use a different email.');
      }
      throw new Error(`Account creation failed: ${signUpError.message}`);
    }

    if (!signUpData.user) {
      // This case might happen if email confirmation is required and fails,
      // or some other unexpected issue. The trigger wouldn't have run.
      console.error('Supabase signup did not return a user object.');
      throw new Error('Account creation succeeded but user data is missing. Please contact support.');
    }

    const userId = signUpData.user.id;
    console.log('Vendor user signed up successfully, ID:', userId);

    // 3. Upload documents (if provided) *after* user creation
    let businessRegPath: string | null = null;
    let foodHandlingPath: string | null = null;

    const uploadFile = async (file: File, type: 'business_registration' | 'food_handling'): Promise<string | null> => {
       if (!file) return null;
       console.log(`Uploading ${type} document for user ${userId}...`);
       const fileExt = file.name.split('.').pop();
       const fileName = `${type}_${Date.now()}.${fileExt}`;
       // Use the confirmed userId in the path
       const filePath = `public/vendor-applications/${userId}/${fileName}`;

       const { data, error: uploadError } = await supabase.storage
         .from('vendor-documents') // Ensure this bucket name is correct
         .upload(filePath, file, {
           cacheControl: '3600',
           upsert: false,
         });

       if (uploadError) {
         console.error(`Upload error (${type}) for user ${userId}:`, uploadError);
         // Don't block application submission entirely, but log the error.
         // Maybe add a flag to the application record indicating upload failure?
         // For now, we'll proceed without the path but log the error.
         // Alternatively, throw to prevent submission without successful upload:
         throw new Error(`Failed to upload ${type === 'business_registration' ? 'Business Registration' : 'Food Handling'} document: ${uploadError.message}`);
       }

       console.log(`Uploaded ${type} for user ${userId} to:`, data?.path);
       return data?.path ?? null; // Return the path stored by Supabase
     };

     // Perform uploads
     if (applicationData.businessRegistrationDocFile) {
       businessRegPath = await uploadFile(applicationData.businessRegistrationDocFile, 'business_registration');
     }
     if (applicationData.foodHandlingDocFile) {
       foodHandlingPath = await uploadFile(applicationData.foodHandlingDocFile, 'food_handling');
     }

    // 4. Prepare application data for insertion (including generated paths)
    const applicationRecord = {
      user_id: userId,
      business_name: applicationData.businessName,
      business_type: applicationData.businessType,
      other_business_type: applicationData.businessType === 'other' ? applicationData.otherBusinessType : null, // Only save if type is 'other'
      contact_person: applicationData.contactPerson,
      email: applicationData.email, // Store the email provided in the form
      phone: applicationData.phone,
      description: applicationData.description || null, // Use null if empty
      established_year: applicationData.establishedYear ? parseInt(applicationData.establishedYear, 10) : null, // Convert to number or null
      vendor_type: applicationData.vendorType,
      university_affiliation: applicationData.universityAffiliation || null,
      has_food_license: applicationData.hasFoodLicense, // Boolean flags indicating if documents were intended to be provided
      has_business_registration: applicationData.hasBusinessRegistration, // Boolean flags indicating if documents were intended to be provided
      // Add the generated document paths from uploads
      business_registration_doc_path: businessRegPath,
      food_handling_doc_path: foodHandlingPath,
      // status defaults to 'pending' in the database
      // submitted_at defaults to now() in the database
      // agreeToTerms and agreeToCommission are implicitly true by submission, not stored directly
    };

    // 5. Insert application details into vendor_applications table
    console.log('Attempting to insert vendor application details:', applicationRecord);
    const { error: insertError } = await supabase
      .from('vendor_applications')
      .insert([applicationRecord]);

    if (insertError) {
      console.error('Supabase vendor application insert failed:', insertError);
      // Note: If this fails, the user account exists but the application doesn't.
      // Consider cleanup logic or more robust error handling/retry?
      // For now, throw an error indicating application submission failure.
      // TODO: Maybe delete the user if application insert fails? Or mark profile as needing application?
      throw new Error(`Account created, but failed to submit application details: ${insertError.message}`);
    }

    // 6. Explicitly sign out the user to prevent auto-login, since vendors need to wait for approval
    // Check if a session was created (might not be if email confirmation is enabled)
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('Failed to sign out vendor applicant after application submission:', signOutError);
      } else {
        console.log('Vendor applicant signed out after application submission to prevent auto-login');
      }
    }

    console.log('Vendor application details successfully submitted to Supabase for user:', userId);
    // Success: The UI will show the success modal.
    // The user profile status is 'pending_approval' due to the trigger.
  }

  // Removed checkAuthStatus - Handled by AuthContext listener
  // Removed getCurrentUser - Use useAuth() hook from AuthContext
  // Removed clearError - Error handling should be done in UI components
}
