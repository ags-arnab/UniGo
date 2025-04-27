import { supabase } from '@/lib/supabaseClient';

// Club profile data with personalization fields
export interface ClubProfile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  banner_url?: string | null;
  description?: string | null;
  email?: string | null;
  created_at: string;
  updated_at: string;
  role: string;
}

// Payload for updating club profile
export interface UpdateClubProfilePayload {
  full_name?: string;
  avatar_url?: string | null;
  banner_url?: string | null;
  description?: string | null;
  email?: string | null;
}

export const ClubsController = {
  // Get all club profiles for public display
  async getAllClubs(): Promise<ClubProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, banner_url, description, email, created_at, updated_at, role')
      .eq('role', 'club')
      .order('full_name');

    if (error) {
      console.error('Error fetching clubs:', error);
      throw new Error(`Failed to fetch clubs: ${error.message}`);
    }

    return (data || []) as ClubProfile[];
  },

  // Get a specific club's profile
  async getClubProfile(clubId: string): Promise<ClubProfile> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, banner_url, description, email, created_at, updated_at, role')
      .eq('id', clubId)
      .eq('role', 'club')
      .single();

    if (error) {
      console.error(`Error fetching club profile for ${clubId}:`, error);
      throw new Error(`Failed to fetch club profile: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('Club profile not found');
    }

    return data as ClubProfile;
  },

  // Update the current club's profile (must be logged in as the club)
  async updateClubProfile(profileData: UpdateClubProfilePayload): Promise<ClubProfile> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      console.error('Error getting session or user:', sessionError);
      throw new Error('User must be logged in to update club profile');
    }
    
    const clubId = session.user.id;
    
    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', clubId)
      .select('id, full_name, avatar_url, banner_url, description, email, created_at, updated_at, role')
      .single();
      
    if (error) {
      console.error('Error updating club profile:', error);
      throw new Error(`Failed to update club profile: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('Profile updated but no data returned');
    }
    
    return data as ClubProfile;
  },
  
  // Upload a banner image for the club
  async uploadBannerImage(file: File): Promise<string> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error('User must be logged in to upload images');
    }
    
    const clubId = session.user.id;
    const fileExt = file.name.split('.').pop();
    const fileName = `${clubId}-banner-${Date.now()}.${fileExt}`;
    const filePath = `${clubId}/${fileName}`;
    
    const { error } = await supabase.storage
      .from('club-banners')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
      
    if (error) {
      console.error('Error uploading banner image:', error);
      throw new Error(`Failed to upload banner image: ${error.message}`);
    }
    
    // Get the public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('club-banners')
      .getPublicUrl(filePath);
      
    return publicUrl;
  },
  
  // Upload a logo/avatar image for the club
  async uploadLogoImage(file: File): Promise<string> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error('User must be logged in to upload images');
    }
    
    const clubId = session.user.id;
    const fileExt = file.name.split('.').pop();
    const fileName = `${clubId}-logo-${Date.now()}.${fileExt}`;
    const filePath = `${clubId}/${fileName}`;
    
    const { error } = await supabase.storage
      .from('club-logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
      
    if (error) {
      console.error('Error uploading logo image:', error);
      throw new Error(`Failed to upload logo image: ${error.message}`);
    }
    
    // Get the public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('club-logos')
      .getPublicUrl(filePath);
      
    return publicUrl;
  }
};
