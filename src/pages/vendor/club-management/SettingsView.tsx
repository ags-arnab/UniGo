// filepath: /Users/arnab/Documents/boopityboop/UniGo/src/pages/vendor/club-management/SettingsView.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ClubsController, ClubProfile, UpdateClubProfilePayload } from '@/controllers/clubsController';
import { supabase } from '@/lib/supabaseClient';
import { addToast } from "@heroui/react";

const SettingsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [_clubProfile, setClubProfile] = useState<ClubProfile | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // Form fields
  const [clubName, setClubName] = useState('');
  const [clubDescription, setClubDescription] = useState('');
  const [clubEmail, setClubEmail] = useState('');
  
  useEffect(() => {
    const loadClubProfile = async () => {
      try {
        setLoading(true);
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          addToast({
            title: "Error",
            description: "You must be logged in"
            // type: "error" // Removed as per TS error
          });
          return;
        }
        
        const clubId = session.user.id;
        const profile = await ClubsController.getClubProfile(clubId);
        setClubProfile(profile);
        
        // Set form values
        setClubName(profile.full_name || '');
        setClubDescription(profile.description || '');
        setClubEmail(profile.email || '');
        
        // Set previews
        setBannerPreview(profile.banner_url || null);
        setLogoPreview(profile.avatar_url || null);
      } catch (error) {
        console.error('Error loading club profile:', error);
        addToast({
          title: "Error",
          description: "Failed to load club profile"
          // type: "error" // Removed as per TS error
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadClubProfile();
  }, []);
  
  const handleSave = async () => {
    try {
      setSaving(true);
      
      const updateData: UpdateClubProfilePayload = {
        full_name: clubName,
        description: clubDescription,
        email: clubEmail
      };
      
      const updatedProfile = await ClubsController.updateClubProfile(updateData);
      setClubProfile(updatedProfile);
      addToast({
        title: "Success",
        description: "Club profile updated successfully"
        // type: "success" // Removed as per TS error
      });
    } catch (error) {
      console.error('Error saving club profile:', error);
      addToast({
        title: "Error",
        description: "Failed to save club profile"
        // type: "error" // Removed as per TS error
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      
      const file = event.target.files[0];
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        addToast({
          title: "Error",
          description: "Please upload an image file"
          // type: "error" // Removed as per TS error
        });
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        addToast({
          title: "Error",
          description: "Image must be less than 5MB"
          // type: "error" // Removed as per TS error
        });
        return;
      }
      
      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setBannerPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Upload to storage
      const publicUrl = await ClubsController.uploadBannerImage(file);
      
      // Update profile with new banner URL
      const updateData: UpdateClubProfilePayload = {
        banner_url: publicUrl
      };
      
      const updatedProfile = await ClubsController.updateClubProfile(updateData);
      setClubProfile(updatedProfile);
      addToast({
        title: "Success",
        description: "Banner uploaded successfully"
        // type: "success" // Removed as per TS error
      });
    } catch (error) {
      console.error('Error uploading banner:', error);
      addToast({
        title: "Error",
        description: "Failed to upload banner"
        // type: "error" // Removed as per TS error
      });
    }
  };
  
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      
      const file = event.target.files[0];
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        addToast({
          title: "Error",
          description: "Please upload an image file"
          // type: "error" // Removed as per TS error
        });
        return;
      }
      
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        addToast({
          title: "Error", 
          description: "Image must be less than 2MB"
          // type: "error" // Removed as per TS error
        });
        return;
      }
      
      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Upload to storage
      const publicUrl = await ClubsController.uploadLogoImage(file);
      
      // Update profile with new avatar URL
      const updateData: UpdateClubProfilePayload = {
        avatar_url: publicUrl
      };
      
      const updatedProfile = await ClubsController.updateClubProfile(updateData);
      setClubProfile(updatedProfile);
      addToast({
        title: "Success",
        description: "Logo uploaded successfully"
        // type: "success" // Removed as per TS error
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      addToast({
        title: "Error",
        description: "Failed to upload logo"
        // type: "error" // Removed as per TS error
      });
    }
  };
  
  if (loading) {
    return <div className="p-4">Loading club profile...</div>;
  }
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-6">Club Personalization</h1>
      
      <div className="space-y-8">
        {/* Club Banner Section */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-medium mb-3">Club Banner</h2>
          <div 
            className="relative w-full h-48 bg-gray-100 rounded-lg mb-2 overflow-hidden flex items-center justify-center"
            style={{
              backgroundImage: bannerPreview ? `url(${bannerPreview})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {!bannerPreview && <span className="text-gray-400">No banner uploaded</span>}
          </div>
          <input 
            ref={bannerInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg"
            onChange={handleBannerUpload}
            className="hidden"
          />
          <button 
            onClick={() => bannerInputRef.current?.click()}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
          >
            Upload Banner
          </button>
          <p className="text-sm text-gray-600 mt-1">
            Recommended size: 1200 x 300 pixels (max 5MB)
          </p>
        </div>
        
        {/* Club Logo Section */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-medium mb-3">Club Logo</h2>
          <div className="flex items-center space-x-4">
            <div 
              className="w-24 h-24 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center"
              style={{
                backgroundImage: logoPreview ? `url(${logoPreview})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {!logoPreview && <span className="text-gray-400">No logo</span>}
            </div>
            <div>
              <input 
                ref={logoInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button 
                onClick={() => logoInputRef.current?.click()}
                className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
              >
                Upload Logo
              </button>
              <p className="text-sm text-gray-600 mt-1">
                Square image, 512 x 512 pixels recommended (max 2MB)
              </p>
            </div>
          </div>
        </div>
        
        {/* Club Details Section */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-medium mb-3">Club Details</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="clubName" className="block text-sm font-medium text-gray-700 mb-1">
                Club Name
              </label>
              <input
                id="clubName"
                type="text"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="clubEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Club Email
              </label>
              <input
                id="clubEmail"
                type="email"
                value={clubEmail}
                onChange={(e) => setClubEmail(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="clubDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Club Description
              </label>
              <textarea
                id="clubDescription"
                value={clubDescription}
                onChange={(e) => setClubDescription(e.target.value)}
                rows={4}
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe your club, its mission, and activities..."
              ></textarea>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Details'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
