import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Save } from 'lucide-react';
import { VendorCafeteriaController, VendorSettings } from '@/controllers/vendorCafeteriaController';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Textarea, // For working hours JSON for now
  Switch,
  CircularProgress,
} from "@heroui/react";

// Type for form data, aligning with VendorSettings but allowing string inputs
interface SettingsFormData {
  shopName: string;
  workingHours: string; // Store JSON as string in form
  isOpen: boolean;
  orderLimit: string | number; // Allow string input for number
}

// Helper to safely parse integers
const safeParseInt = (value: string | number | undefined): number | null | undefined => {
    if (value === null || value === undefined || value === '') return null; // Allow clearing the limit
    if (typeof value === 'number') return Math.floor(value);
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? undefined : parsed; // undefined indicates parsing error
    }
    return undefined; // Error if empty string after trim or other invalid input
};

export default function ShopSettingsView() {
  const [_settings, setSettings] = useState<VendorSettings | null>(null);
  const [formData, setFormData] = useState<SettingsFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedSettings = await VendorCafeteriaController.getVendorSettings();
      setSettings(fetchedSettings);
      if (fetchedSettings) {
        setFormData({
          shopName: fetchedSettings.shopName || '',
          // Stringify workingHours JSON for Textarea, handle null/undefined
          workingHours: fetchedSettings.workingHours ? JSON.stringify(fetchedSettings.workingHours, null, 2) : '',
          isOpen: fetchedSettings.isOpen,
          orderLimit: fetchedSettings.orderLimit ?? '', // Use empty string if null/undefined
        });
      } else {
        // Handle case where settings don't exist yet (e.g., new vendor)
        // Initialize form with defaults
         setFormData({
             shopName: '',
             workingHours: '[]', // Default to empty JSON array string
             isOpen: true,
             orderLimit: '',
         });
         // Optionally show a message indicating settings need to be created
         // setError("Vendor settings not found. Please save your initial settings.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleFormValueChange = (name: keyof SettingsFormData, value: string | boolean) => {
    setFormData(prev => prev ? { ...prev, [name]: value } : null);
    setFormError(null); // Clear error on change
    setSaveSuccess(false); // Clear success message
  };

  const handleFormSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!formData || isSaving) return;

    setIsSaving(true);
    setFormError(null);
    setSaveSuccess(false);
    setError(null);

    // Validate and parse form data
    let parsedWorkingHours: any | undefined = undefined;
    try {
      parsedWorkingHours = formData.workingHours.trim() ? JSON.parse(formData.workingHours) : null;
    } catch (jsonError) {
      setFormError("Working Hours must be valid JSON or empty.");
      setIsSaving(false);
      return;
    }

    const parsedOrderLimit = safeParseInt(formData.orderLimit);
    if (parsedOrderLimit === undefined) { // Check for parsing error
        setFormError("Order Limit must be a valid number or empty.");
        setIsSaving(false);
        return;
    }
     if (parsedOrderLimit !== null && parsedOrderLimit < 0) {
         setFormError("Order Limit cannot be negative.");
         setIsSaving(false);
         return;
     }


    const updateData: Partial<Omit<VendorSettings, 'id' | 'vendorId' | 'createdAt' | 'updatedAt'>> = {
      shopName: formData.shopName || null, // Store empty string as null? Or keep empty string? DB allows null.
      workingHours: parsedWorkingHours,
      isOpen: formData.isOpen,
      orderLimit: parsedOrderLimit, // Send null if empty or parsed as null
    };

    try {
      // Note: updateVendorSettings handles the case where settings might not exist yet
      // if the underlying Supabase call uses upsert, or if we add create logic.
      // Assuming updateVendorSettings works correctly based on vendor_id RLS.
      await VendorCafeteriaController.updateVendorSettings(updateData);
      setSaveSuccess(true);
      // Optionally refetch settings to confirm, though optimistic update is usually fine
      // fetchSettings();
      // Update local state optimistically
      setSettings(prev => ({
          ...(prev || { id: '', vendorId: '', createdAt: new Date(), updatedAt: new Date() }), // Provide defaults if prev is null
          ...updateData,
          updatedAt: new Date() // Update timestamp locally
      } as VendorSettings));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><CircularProgress label="Loading settings..." /></div>;
  }

  if (error && !formData) { // Show general fetch error only if form couldn't be initialized
     return <div className="p-4 text-danger-800 bg-danger-50 rounded-lg">{error}</div>;
  }

  return (
    <Card>
      <CardHeader className="border-b border-divider">
        <h1 className="text-2xl font-semibold">Shop Settings</h1>
      </CardHeader>
      <CardBody>
        {formData ? (
          <form onSubmit={handleFormSubmit} className="space-y-6">
            {error && ( // Show general save error
                <div className="p-3 text-sm text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert">
                    <AlertCircle className="inline w-4 h-4 mr-2" />{error}
                </div>
            )}
             {formError && ( // Show specific form validation error
                <div className="p-3 text-sm text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert">
                    <AlertCircle className="inline w-4 h-4 mr-2" />{formError}
                </div>
            )}
            {saveSuccess && (
                <div className="p-3 text-sm text-success-800 rounded-lg bg-success-50 dark:bg-gray-800 dark:text-success-400" role="alert">
                    Settings saved successfully!
                </div>
            )}

            <Input
              label="Shop Name"
              name="shopName"
              value={formData.shopName}
              onValueChange={(v) => handleFormValueChange('shopName', v)}
              placeholder="Enter your shop or counter name"
            />

            <Textarea
              label="Working Hours (JSON Format)"
              name="workingHours"
              value={formData.workingHours}
              onValueChange={(v) => handleFormValueChange('workingHours', v)}
              placeholder='e.g., [{"day": "Monday", "open": "09:00", "close": "17:00"}, ...]'
              description="Enter operating hours as a JSON array. Leave empty if not applicable."
              minRows={5}
              isInvalid={formError?.toLowerCase().includes('working hours')}
            />

            <Input
              label="Order Limit"
              name="orderLimit"
              type="number"
              value={String(formData.orderLimit)} // Input expects string
              onValueChange={(v) => handleFormValueChange('orderLimit', v)}
              placeholder="Max concurrent orders (optional)"
              description="Leave empty for no limit."
              min={0}
              isInvalid={formError?.toLowerCase().includes('order limit')}
            />

            <Switch
              isSelected={formData.isOpen}
              onValueChange={(v) => handleFormValueChange('isOpen', v)}
              name="isOpen"
            >
              Shop is currently open for orders
            </Switch>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                color="primary"
                isLoading={isSaving}
                startContent={!isSaving && <Save className="h-5 w-5" />}
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        ) : (
           // This case should ideally not be reached if loading/error handled above
           <p>Settings data is unavailable.</p>
        )}
      </CardBody>
    </Card>
  );
}
