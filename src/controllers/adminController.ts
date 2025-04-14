import { supabase } from '@/lib/supabaseClient';

// Define a type for the application data, including profile info
// Adjust based on the actual columns in vendor_applications and profiles
export interface VendorApplicationWithProfile {
  id: string; // application id
  status: 'pending' | 'approved' | 'rejected';
  business_name: string;
  business_type: string;
  contact_person: string;
  email: string; // application email
  phone: string;
  description?: string | null;
  submitted_at: string;
  // Add document paths
  business_registration_doc_path?: string | null;
  food_handling_doc_path?: string | null;
  user_id: string; // user id from application
  profiles: { // Joined profile data
    id: string; // user id from profile
    email?: string | null; // user's auth email
    full_name?: string | null;
    avatar_url?: string | null;
    // Add other profile fields if needed
  }; // Expecting a single profile object
}

// Define the type for the update payload
interface UpdateApplicationPayload {
    status: 'approved' | 'rejected';
    reviewer_notes?: string | null;
    reviewed_at?: string; // ISO string
}

/**
 * Admin Controller - Handles admin-specific business logic using Supabase.
 * Assumes RLS policies are in place to restrict access to admins.
 */
export class AdminController {

  /**
   * Fetches all vendor applications, optionally filtering by status.
   * Joins with the profiles table to get user details.
   * Relies on RLS policy: "Allow admin full access on vendor_applications".
   * @param status Optional status to filter by ('pending', 'approved', 'rejected').
   * @returns Promise resolving to an array of VendorApplicationWithProfile objects.
   */
  static async getVendorApplications(status?: 'pending' | 'approved' | 'rejected'): Promise<VendorApplicationWithProfile[]> {
    let query = supabase
      .from('vendor_applications')
      .select(`
        id,
        user_id,
        status,
        business_name,
        business_type,
        contact_person,
        email,
        phone,
        description,
        submitted_at,
        business_registration_doc_path,
        food_handling_doc_path,
        profiles (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .order('submitted_at', { ascending: true }); // Show oldest first

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching vendor applications:', error);
      throw error;
    }

    // Explicitly cast the fetched data and handle potential nulls/arrays
    const applications: VendorApplicationWithProfile[] = (data || []).map((app: any) => {
      // Ensure profiles is an object, not an array or null/undefined
      const profileData = Array.isArray(app.profiles) ? app.profiles[0] : app.profiles;

      return {
        id: app.id,
        status: app.status,
        business_name: app.business_name,
        business_type: app.business_type,
        contact_person: app.contact_person,
        email: app.email,
        phone: app.phone,
        description: app.description,
        submitted_at: app.submitted_at,
        business_registration_doc_path: app.business_registration_doc_path, // Include the path
        food_handling_doc_path: app.food_handling_doc_path,             // Include the path
        user_id: app.user_id,
        profiles: { // Construct the profile object safely
          id: profileData?.id || '', // Provide default empty string if null
          email: profileData?.email || null,
          full_name: profileData?.full_name || null,
          avatar_url: profileData?.avatar_url || null,
        },
      };
    });

    return applications;
  }

  /**
   * Updates the status of a vendor application and optionally the user's role.
   * Relies on RLS policies for admin access to vendor_applications and profiles.
   * IMPORTANT: This should ideally be handled in a Supabase Edge Function for atomicity
   * (update application status AND user role in one transaction).
   * Doing it client-side has risks if one step fails.
   * @param applicationId The ID of the application to update.
   * @param payload The update payload { status: 'approved' | 'rejected', reviewer_notes?: string }.
   * @param userId The ID of the user associated with the application.
   * @returns Promise resolving when the update is complete.
   */
  static async reviewVendorApplication(
      applicationId: string,
      payload: Omit<UpdateApplicationPayload, 'reviewed_at' | 'status'> & { status: 'approved' | 'rejected' }, // Ensure status is present
      userId: string
  ): Promise<void> {
    console.log(`Attempting to ${payload.status} application ${applicationId} for user ${userId}`);

    if (!applicationId || !userId) {
        throw new Error("Application ID and User ID are required.");
    }

    const functionName = payload.status === 'approved'
        ? 'approve_vendor_application'
        : 'reject_vendor_application';

    const functionArgs = {
        p_application_id: applicationId,
        p_user_id: userId,
        p_reviewer_notes: payload.reviewer_notes || null
    };

    console.log(`Calling RPC function: ${functionName} with args:`, functionArgs);

    // Call the appropriate database function
    const { error: rpcError } = await supabase.rpc(functionName, functionArgs);

    if (rpcError) {
        console.error(`Error calling ${functionName}:`, rpcError);
        throw new Error(`Failed to ${payload.status} application via RPC. Error: ${rpcError.message}`);
    }

    console.log(`Successfully called ${functionName} for application ${applicationId}.`);
  }

}
