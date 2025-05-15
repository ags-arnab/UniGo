import React, { useState, useEffect, ChangeEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient'; // Assuming supabase client is here
import { Button, Input, Textarea, Card, CardBody, CardHeader, addToast } from '@heroui/react'; // Assuming HeroUI components

interface StorefrontData {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
  banner_url: string | null;
  is_active: boolean;
  operator_id: string;
}

const MarketplaceStorefrontManagement: React.FC = () => {
  const { profile, user } = useAuth();
  const [storefront, setStorefront] = useState<StorefrontData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [currentBannerUrl, setCurrentBannerUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchStorefrontData = async () => {
      if (!user || !profile || profile.role !== 'marketplace_operator') {
        setLoading(false);
        // addToast({ title: 'Error', description: 'User not authorized or not found.', color: 'danger' });
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('storefronts')
          .select('*')
          .eq('operator_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { 
          throw error;
        }
        if (data) {
          setStorefront(data as StorefrontData);
          setName(data.name);
          setDescription(data.description || '');
          setCurrentLogoUrl(data.logo_url);
          setCurrentBannerUrl(data.banner_url);
        } else {
          addToast({ title: 'Storefront Info', description: 'No storefront record found, or it is being created. If new, refresh in a moment.', color: 'default' });
        }
      } catch (err: any) {
        console.error('Error fetching storefront data:', err);
        addToast({ title: 'Fetch Error', description: err.message || 'Could not load storefront data.', color: 'danger' });
      } finally {
        setLoading(false);
      }
    };

    fetchStorefrontData();
  }, [user, profile]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    if (e.target.files && e.target.files[0]) {
      if (type === 'logo') setLogoFile(e.target.files[0]);
      if (type === 'banner') setBannerFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File, bucket: string, path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { 
        cacheControl: '3600',
        upsert: true 
    });
    if (error) {
      throw new Error(`Failed to upload ${file.name}: ${error.message}`);
    }
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storefront || !user) {
      addToast({ title: 'Error', description: 'Storefront or user data not available.', color: 'danger'});
      return;
    }
    setSaving(true);

    let newLogoUrl = storefront.logo_url;
    let newBannerUrl = storefront.banner_url;

    try {
      if (logoFile) {
        const logoPath = `${user.id}/logo-${Date.now()}.${logoFile.name.split('.').pop()}`;
        newLogoUrl = await uploadFile(logoFile, 'storefront-logos', logoPath); // Changed bucket ID
        setCurrentLogoUrl(newLogoUrl); 
      }
      if (bannerFile) {
        const bannerPath = `${user.id}/banner-${Date.now()}.${bannerFile.name.split('.').pop()}`;
        newBannerUrl = await uploadFile(bannerFile, 'storefront-banners', bannerPath); // Changed bucket ID
        setCurrentBannerUrl(newBannerUrl); 
      }

      const updates = {
        name,
        description,
        logo_url: newLogoUrl,
        banner_url: newBannerUrl,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('storefronts')
        .update(updates)
        .eq('id', storefront.id);

      if (updateError) throw updateError;

      addToast({ title: 'Success', description: 'Storefront updated successfully!', color: 'success' });
      setStorefront(prev => prev ? { ...prev, ...updates } : null);
      setLogoFile(null); 
      setBannerFile(null);
    } catch (err: any) {
      console.error('Error saving storefront:', err);
      addToast({ title: 'Save Error', description: err.message || 'Could not save storefront details.', color: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading storefront data...</p>;
  if (!profile || profile.role !== 'marketplace_operator') return <p>You are not authorized to manage a storefront.</p>;

  return (
    <Card className="max-w-2xl mx-auto my-8">
      <CardHeader>
        <h1 className="text-2xl font-bold">Manage Your Storefront</h1>
      </CardHeader>
      <CardBody>
        {storefront ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="storeName" className="block text-sm font-medium text-gray-700">Store Name</label>
              <Input id="storeName" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full" />
            </div>
            <div>
              <label htmlFor="storeDescription" className="block text-sm font-medium text-gray-700">Description</label>
              <Textarea id="storeDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-1 block w-full" />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="logoUpload" className="block text-sm font-medium text-gray-700">Store Logo</label>
              {currentLogoUrl && <img src={currentLogoUrl} alt="Current logo" className="h-20 w-20 object-cover rounded-md mb-2" />}
              <Input id="logoUpload" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} className="block w-full text-sm" />
              {logoFile && <p className='text-xs text-gray-500'>New logo: {logoFile.name}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="bannerUpload" className="block text-sm font-medium text-gray-700">Store Banner</label>
              {currentBannerUrl && <img src={currentBannerUrl} alt="Current banner" className="h-32 w-full object-cover rounded-md mb-2" />}
              <Input id="bannerUpload" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} className="block w-full text-sm" />
              {bannerFile && <p className='text-xs text-gray-500'>New banner: {bannerFile.name}</p>}
            </div>

            <Button type="submit" color="primary" isLoading={saving} className="w-full">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        ) : (
          <p>Storefront data is loading or not found. If you've just been approved, it might take a moment for your storefront to be fully ready. Try refreshing.</p>
        )}
      </CardBody>
    </Card>
  );
};

export default MarketplaceStorefrontManagement; 