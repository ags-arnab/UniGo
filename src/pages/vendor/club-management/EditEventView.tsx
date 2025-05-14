import React, { useState, useEffect, ChangeEvent, FormEvent, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClubController } from '@/controllers/clubController';
import { UpdateEventPayload } from '@/types/events';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Input,
  Textarea,
  Switch,
  Spinner,
  addToast, // Assuming addToast exists
  Calendar, // Added Calendar component
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@heroui/react"; // Adjust imports based on actual library
import { ArrowLeftIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabaseClient'; // Import Supabase client
import {
  ZonedDateTime,
  parseAbsoluteToLocal,
  getLocalTimeZone,
  today,
  toZoned, // Use toZoned for CalendarDate -> ZonedDateTime
} from "@internationalized/date";

// Helper function to convert ZonedDateTime to Date or null
const zonedDateTimeToDate = (zonedDate: ZonedDateTime | null): Date | null => {
  if (!zonedDate) return null;
  try {
    return zonedDate.toDate();
  } catch (e) {
    console.error("Error converting ZonedDateTime to Date:", e);
    return null;
  }
};

// Helper function to convert ISO string or Date to ZonedDateTime or null
const dateToZonedDateTime = (date: string | Date | null | undefined): ZonedDateTime | null => {
  if (!date) return null;
  try {
    // If it's already a Date object, use it directly
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return null; // Invalid date check
    // Convert the Date object's UTC time to the local time zone
    return parseAbsoluteToLocal(dateObj.toISOString());
  } catch (e) {
    console.error("Error converting date string/object to ZonedDateTime:", e);
    return null;
  }
};


const EditEventView: React.FC = () => {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  // Update state to use ZonedDateTime for date/time fields
  const [formData, setFormData] = useState<Partial<Omit<UpdateEventPayload, 'event_datetime' | 'end_time' | 'registration_deadline'> & {
    event_datetime: ZonedDateTime | null;
    end_time: ZonedDateTime | null;
    registration_deadline: ZonedDateTime | null;
  }>>({});
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({}); // For basic validation feedback
  // State for raw comma-separated input strings
  const [guestInput, setGuestInput] = useState('');
  const [sponsorInput, setSponsorInput] = useState('');


  // Fetch existing event data
  const fetchEventData = useCallback(async () => {
    if (!eventId) {
      setError("Event ID not found in URL.");
      setInitialLoading(false);
      return;
    }
    setInitialLoading(true);
    setError(null);
    try {
      const eventData = await ClubController.getEventById(eventId);
      if (!eventData) {
        throw new Error("Event not found.");
      }
      // Pre-fill form data, converting dates to ZonedDateTime
      setFormData({
        title: eventData.title,
        description: eventData.description,
        event_datetime: dateToZonedDateTime(eventData.event_datetime),
        end_time: dateToZonedDateTime(eventData.end_time),
        venue: eventData.venue,
        total_seats: eventData.total_seats,
        is_paid: eventData.is_paid,
        payment_amount: eventData.payment_amount,
        sponsors: eventData.sponsors,
        is_seminar: eventData.is_seminar,
        guests: eventData.guests,
        registration_deadline: dateToZonedDateTime(eventData.registration_deadline),
        banner_image_path: eventData.banner_image_path, // Keep existing path
      });
      // Initialize raw input states from fetched data
      setGuestInput(eventData.guests?.join(',') ?? '');
      setSponsorInput(eventData.sponsors?.join(',') ?? '');
    } catch (err) {
      console.error("Error fetching event data:", err);
      setError(err instanceof Error ? err.message : 'Failed to load event data.');
    } finally {
      setInitialLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);


  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value,
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSwitchChange = (name: keyof UpdateEventPayload, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked,
      ...(name === 'is_paid' && !checked && { payment_amount: 0.00 }),
    }));
  };


  // Handler for DatePicker component (date only)
  const handleDatePickerChange = (name: 'event_datetime' | 'end_time' | 'registration_deadline', value: ZonedDateTime | null) => {
    if (!value) {
      setFormData(prev => ({ ...prev, [name]: null }));
      return;
    }
    // Preserve time if already set when changing only the date part
    const currentDateTime = formData[name];
    const newZonedDateTime = currentDateTime ?
      value.set({
        hour: currentDateTime.hour,
        minute: currentDateTime.minute,
        second: currentDateTime.second,
        millisecond: currentDateTime.millisecond
      }) :
      value; // If no previous time, use the date picker's default time (usually midnight)

    setFormData(prev => ({
      ...prev,
      [name]: newZonedDateTime,
    }));
    // Clear error for the specific field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handler for time input fields (Updated to match CreateEventView logic)
  const handleTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const correspondingDateField = name.replace('_time', '') as 'event_datetime' | 'end_time' | 'registration_deadline';

    if (value) { // Proceed only if a time value is provided
      const [hours, minutes] = value.split(':').map(Number);

      setFormData(prev => {
        const currentDate = prev[correspondingDateField];
        let updatedDateTime: ZonedDateTime;

        if (currentDate) {
          // Update time on existing date
          updatedDateTime = currentDate.set({ hour: hours, minute: minutes });
        } else {
          // Create a new date object based on today if no date was selected (less likely in edit, but consistent)
          const todayDate = today(getLocalTimeZone());
          updatedDateTime = toZoned(todayDate, getLocalTimeZone()).set({ hour: hours, minute: minutes });
           console.warn(`Time set for ${correspondingDateField} without a date selected. Using today's date.`);
        }
        
        // Clear error for the corresponding datetime field if it exists
        if (errors[correspondingDateField]) { // Check external errors state directly
           setErrors(currentErrors => {
             const updatedErrors = {...currentErrors};
             delete updatedErrors[correspondingDateField]; // Remove the specific error
             return updatedErrors;
           });
        }

        return {
          ...prev,
          [correspondingDateField]: updatedDateTime,
        };
      });
    } else {
      // Optional: Handle case where time input is cleared.
      // Could reset time to 00:00 or do nothing.
      // Current behavior: If cleared, the value binding shows empty.
    }
  };


  // Removed handleCommaSeparatedChange as we'll pass setters directly

  // Removed handleCommaSeparatedBlur - processing will happen on submit


  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBannerImageFile(e.target.files[0]);
      // Clear existing banner path if a new file is selected
      setFormData(prev => ({ ...prev, banner_image_path: null }));
    } else {
      setBannerImageFile(null);
      // If file input is cleared, we might want to revert to original path?
      // For now, let's assume clearing means removing the banner unless a new one is uploaded.
      // Or fetch original data again if needed.
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    // Removed duplicate declaration below
    if (!formData.title?.trim()) newErrors.title = 'Event title is required.';
    if (!formData.event_datetime) newErrors.event_datetime = 'Event start date and time are required.';

    // Compare ZonedDateTime objects if both exist
    if (
      formData.event_datetime &&
      formData.end_time &&
      formData.end_time.compare(formData.event_datetime) <= 0 // Use compare method
    ) {
      newErrors.end_time = 'End date/time must be after the start date/time.';
    }
     if (
       formData.event_datetime &&
       formData.registration_deadline &&
       formData.registration_deadline.compare(formData.event_datetime) > 0 // Use compare method
     ) {
       newErrors.registration_deadline = 'Registration deadline cannot be after the event starts.';
     }

    if (formData.total_seats === undefined || formData.total_seats < 0) newErrors.total_seats = 'Total seats must be 0 or more.';
    if (formData.is_paid && (!formData.payment_amount || formData.payment_amount <= 0)) {
      newErrors.payment_amount = 'Payment amount is required for paid events and must be positive.';
    }
    // Add more validation as needed
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Process comma-separated inputs into arrays before validation/submission
    const processedGuests = guestInput.split(',').map(item => item.trim()).filter(item => item !== '');
    const processedSponsors = sponsorInput.split(',').map(item => item.trim()).filter(item => item !== '');

    // Update formData state synchronously before validation
    const updatedFormData = {
      ...formData,
      guests: processedGuests,
      sponsors: processedSponsors,
    };
    // Update state directly before validation (safer than relying on async update)
    // setFormData(updatedFormData); // This might be async

    // Validate using the processed data directly or adjust validateForm
    // For now, we assume validateForm uses the component's state, so we update it first.
    setFormData(updatedFormData);

    // Re-validate after attempting state update. Might still be slightly async.
    // A safer approach is to pass updatedFormData to validateForm if possible.
    if (!eventId || !validateForm()) {
       addToast({ title: 'Validation Error', description: 'Please fix the errors in the form.', color: 'warning' });
      return;
    }

    setLoading(true);

    try {
      let uploadedImagePath: string | null | undefined = formData.banner_image_path; // Keep existing if no new file

      // --- Implement Banner Image Upload ---
      if (bannerImageFile) {
        setLoading(true); // Indicate upload activity (already set, but good for clarity)
        const fileExt = bannerImageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`; // Unique filename
        const filePath = `event-assets/${eventId}/${fileName}`; // <<< Corrected path structure

        try {
          console.log(`Uploading banner to: ${filePath}`);
          const { error: uploadError } = await supabase.storage
            .from('event-assets') // <<< Updated bucket name
            .upload(filePath, bannerImageFile, {
              cacheControl: '3600', // Cache for 1 hour
              upsert: true, // Overwrite if file exists for this path
            });

          if (uploadError) {
            console.error("Supabase upload error:", uploadError);
            throw new Error(`Failed to upload banner image: ${uploadError.message}`);
          }

          // Get the public URL to store in the database
          const { data: urlData } = supabase.storage
            .from('event-assets') // <<< Updated bucket name
            .getPublicUrl(filePath);

          uploadedImagePath = urlData?.publicUrl || filePath; // Store the public URL or path
          console.log("Banner uploaded successfully. Path/URL:", uploadedImagePath);
          setBannerImageFile(null); // Clear file state after successful upload

        } catch (uploadErr) {
           console.error("Error during banner upload:", uploadErr);
           addToast({
             title: 'Upload Error',
             description: uploadErr instanceof Error ? uploadErr.message : 'An unexpected error occurred during banner upload.',
             color: 'danger'
           });
           setLoading(false); // Stop loading indicator
           return; // Prevent further execution if upload fails
        }
        // setLoading(false); // Keep loading until event update finishes
      }
      // --- End Upload Implementation ---

      // --- End Upload Implementation ---

      // Prepare payload, converting ZonedDateTime back to ISO strings
      const eventDate = zonedDateTimeToDate(formData.event_datetime ?? null);
      const endDate = zonedDateTimeToDate(formData.end_time ?? null);
      const deadlineDate = zonedDateTimeToDate(formData.registration_deadline ?? null);

      const payload: UpdateEventPayload = {
        title: formData.title!,
        description: formData.description || null,
        // Convert dates back to ISO strings for the backend
        event_datetime: eventDate ? eventDate.toISOString() : '', // Ensure not null/undefined if required
        end_time: endDate ? endDate.toISOString() : null,
        venue: formData.venue || null,
        banner_image_path: uploadedImagePath, // Use new path if uploaded, else existing
        total_seats: updatedFormData.total_seats ?? 0, // Use updatedFormData
        is_paid: updatedFormData.is_paid ?? false, // Use updatedFormData
        payment_amount: updatedFormData.is_paid ? (updatedFormData.payment_amount ?? 0) : null, // Use updatedFormData
        sponsors: updatedFormData.sponsors || null, // Use processed sponsors from updatedFormData
        is_seminar: updatedFormData.is_seminar ?? false, // Use updatedFormData
        guests: updatedFormData.guests || null, // Use processed guests from updatedFormData
        registration_deadline: deadlineDate ? deadlineDate.toISOString() : null,
      };

       // Ensure event_datetime is not empty before sending
       if (!payload.event_datetime) {
           throw new Error("Event start date and time cannot be empty.");
       }

      // Call the actual update function
      await ClubController.updateEvent(eventId, payload);

      addToast({ title: 'Success', description: 'Event updated successfully!', color: 'success' });
      navigate('/club/dashboard/events'); // Redirect back to the event list

    } catch (err) {
      console.error("Error updating event:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update event. Please try again.';
      addToast({ title: 'Error Updating Event', description: errorMessage, color: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Card>
        <CardBody className="flex justify-center items-center py-10">
          <Spinner label="Loading event details..." color="secondary" />
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
           <h1 className="text-xl font-semibold text-danger-700">Error Loading Event</h1>
        </CardHeader>
        <CardBody>
          <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded relative" role="alert">
            <ExclamationCircleIcon className="w-5 h-5 inline mr-2" />
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
           <Button variant="light" onPress={() => navigate(-1)} className="mt-4">
             Go Back
           </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex items-center gap-3">
         <Button isIconOnly variant="light" onPress={() => navigate('/club/dashboard/events')} aria-label="Back to Events">
           <ArrowLeftIcon className="w-5 h-5" />
         </Button>
        <h1 className="text-xl font-semibold text-default-800">Edit Event</h1>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardBody className="space-y-5 p-6">
          {/* Title */}
          <Input
            label="Event Title"
            name="title"
            value={formData.title ?? ''}
            onChange={handleInputChange}
            placeholder="e.g., Annual Tech Symposium"
            isRequired
            errorMessage={errors.title}
            isInvalid={!!errors.title}
          />

          {/* Description */}
          <Textarea
            label="Description"
            name="description"
            value={formData.description ?? ''}
            onChange={handleInputChange}
            placeholder="Detailed information about the event..."
            minRows={3}
          />

          {/* Date & Time using Popover/Calendar + Time Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date/Time */}
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-default-700 mb-1">
                  Start Date {errors.event_datetime && <span className="text-danger">*</span>}
                </label>
                <Popover>
                  <PopoverTrigger>
                    <Button
                      variant="bordered"
                      className="w-full justify-start h-10 px-3"
                      color={errors.event_datetime ? "danger" : "default"}
                    >
                      {formData.event_datetime ?
                        formData.event_datetime.toDate().toLocaleDateString() :
                        "Select a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      value={formData.event_datetime}
                      onChange={(date) => {
                        if (date) {
                          const selectedZonedDate = toZoned(date, getLocalTimeZone());
                          handleDatePickerChange('event_datetime', selectedZonedDate);
                        } else {
                           handleDatePickerChange('event_datetime', null);
                        }
                      }}
                      // minValue={today(getLocalTimeZone())} // Allow past dates for editing? Maybe remove minValue.
                      className="rounded-md border shadow-md"
                    />
                  </PopoverContent>
                </Popover>
                {errors.event_datetime && !errors.title && ( // Show only if title is valid, avoid double msg
                  <p className="text-xs text-danger mt-1">{errors.event_datetime}</p>
                )}
              </div>
              <div>
                <Input
                  type="time"
                  label="Start Time"
                  name="event_datetime_time" // <-- Fix: Changed name to match handleTimeChange logic
                  onChange={handleTimeChange}
                  value={formData.event_datetime ?
                    `${formData.event_datetime.hour.toString().padStart(2, '0')}:${formData.event_datetime.minute.toString().padStart(2, '0')}`
                    : ''}
                  isRequired
                  isDisabled={!formData.event_datetime} // Disable if no date selected
                />
              </div>
            </div>

            {/* End Date/Time */}
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-default-700 mb-1">
                  End Date (Optional) {errors.end_time && <span className="text-danger">*</span>}
                </label>
                <Popover>
                  <PopoverTrigger>
                    <Button
                      variant="bordered"
                      className="w-full justify-start h-10 px-3"
                      color={errors.end_time ? "danger" : "default"}
                    >
                      {formData.end_time ?
                        formData.end_time.toDate().toLocaleDateString() :
                        "Select end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      value={formData.end_time}
                      onChange={(date) => {
                         if (date) {
                           const selectedZonedDate = toZoned(date, getLocalTimeZone());
                           handleDatePickerChange('end_time', selectedZonedDate);
                         } else {
                            handleDatePickerChange('end_time', null);
                         }
                      }}
                      minValue={formData.event_datetime || undefined} // Min end date is start date
                      className="rounded-md border shadow-md"
                    />
                  </PopoverContent>
                </Popover>
                 {errors.end_time && (
                   <p className="text-xs text-danger mt-1">{errors.end_time}</p>
                 )}
              </div>
              <div>
                <Input
                  type="time"
                  label="End Time (Optional)"
                  name="end_time_time" // Connects to handleTimeChange logic
                  onChange={handleTimeChange}
                  value={formData.end_time ?
                    `${formData.end_time.hour.toString().padStart(2, '0')}:${formData.end_time.minute.toString().padStart(2, '0')}`
                    : ''}
                  isDisabled={!formData.end_time} // Disable if no date selected
                />
              </div>
            </div>
          </div>

           {/* Venue */}
           <Input
             label="Venue / Location"
             name="venue"
             value={formData.venue ?? ''}
             onChange={handleInputChange}
             placeholder="e.g., University Auditorium, Online Zoom Link"
           />

           {/* Registration Deadline */}
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-default-700 mb-1">
                  Registration Deadline (Optional) {errors.registration_deadline && <span className="text-danger">*</span>}
                </label>
                <Popover>
                  <PopoverTrigger>
                    <Button
                      variant="bordered"
                      className="w-full justify-start h-10 px-3"
                      color={errors.registration_deadline ? "danger" : "default"}
                    >
                      {formData.registration_deadline ?
                        formData.registration_deadline.toDate().toLocaleDateString() :
                        "Select deadline date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      value={formData.registration_deadline}
                       onChange={(date) => {
                          if (date) {
                            const selectedZonedDate = toZoned(date, getLocalTimeZone());
                            handleDatePickerChange('registration_deadline', selectedZonedDate);
                          } else {
                             handleDatePickerChange('registration_deadline', null);
                          }
                       }}
                      // minValue={today(getLocalTimeZone())} // Allow past deadlines for editing?
                      maxValue={formData.event_datetime || undefined} // Deadline must be before or on event start date
                      className="rounded-md border shadow-md"
                    />
                  </PopoverContent>
                </Popover>
                 {errors.registration_deadline && (
                   <p className="text-xs text-danger mt-1">{errors.registration_deadline}</p>
                 )}
              </div>
              <div>
                <Input
                  type="time"
                  label="Deadline Time (Optional)"
                  name="registration_deadline_time" // Connects to handleTimeChange
                  onChange={handleTimeChange}
                  value={formData.registration_deadline ?
                    `${formData.registration_deadline.hour.toString().padStart(2, '0')}:${formData.registration_deadline.minute.toString().padStart(2, '0')}`
                    : ''}
                  isDisabled={!formData.registration_deadline} // Disable if no date selected
                />
              </div>
            </div>


           {/* Seats */}
           <Input
             label="Total Seats"
             name="total_seats"
             type="number"
             min="0"
             value={String(formData.total_seats ?? 0)}
             onChange={handleInputChange}
             placeholder="0"
             isRequired
             errorMessage={errors.total_seats}
             isInvalid={!!errors.total_seats}
           />

           {/* Paid Event Toggle & Amount */}
           <div className="flex items-center gap-4">
             <Switch
               isSelected={formData.is_paid ?? false}
               onValueChange={(checked) => handleSwitchChange('is_paid', checked)}
             >
               Paid Event?
             </Switch>
             {formData.is_paid && (
               <Input
                 label="Payment Amount (BDT)"
                 name="payment_amount"
                 type="number"
                 min="0.01"
                 step="0.01"
                 value={String(formData.payment_amount ?? 0.00)}
                 onChange={handleInputChange}
                 placeholder="e.g., 500.00"
                 isRequired={formData.is_paid}
                 errorMessage={errors.payment_amount}
                 isInvalid={!!errors.payment_amount}
                 className="flex-1"
               />
             )}
           </div>

           {/* Seminar Toggle */}
           <Switch
             isSelected={formData.is_seminar ?? false}
             onValueChange={(checked) => handleSwitchChange('is_seminar', checked)}
           >
             Is this a Seminar?
           </Switch>

           {/* Guests (Comma-separated) */}
           <Input
             label="Guests (Optional, comma-separated)"
             name="guests"
             value={guestInput} // Bind to raw input state
             onChange={(e) => setGuestInput(e.target.value)} // Pass setter directly
             // Removed onBlur handler
             placeholder="e.g., Dr. Jane Doe, Prof. John Smith"
           />

           {/* Sponsors (Comma-separated) */}
           <Input
             label="Sponsors (Optional, comma-separated)"
             name="sponsors"
             value={sponsorInput} // Bind to raw input state
             onChange={(e) => setSponsorInput(e.target.value)} // Pass setter directly
             // Removed onBlur handler
             placeholder="e.g., Tech Corp, Uni Alumni Assoc."
           />

           {/* Banner Image Upload */}
           <div>
             <label htmlFor="bannerImageFile" className="block text-sm font-medium text-default-700 mb-1">
               Banner Image (Optional)
             </label>
             {formData.banner_image_path && !bannerImageFile && (
                <div className="mb-2 text-sm text-default-600">
                    Current Banner: <a href={formData.banner_image_path} target="_blank" rel="noopener noreferrer" className="text-secondary underline">{formData.banner_image_path.split('/').pop()}</a>
                    {/* TODO: Display actual image preview */}
                </div>
             )}
             <input
               type="file"
               id="bannerImageFile"
               name="bannerImageFile"
               accept="image/*"
               onChange={handleFileChange}
               className="block w-full text-sm text-default-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-secondary-50 file:text-secondary-700 hover:file:bg-secondary-100 cursor-pointer"
             />
             {bannerImageFile && <p className="text-xs text-default-600 mt-1">New file selected: {bannerImageFile.name}</p>}
             <p className="text-xs text-default-500 mt-1">Upload a new image to replace the existing banner, or leave empty to keep the current one.</p>
           </div>

        </CardBody>
        <CardFooter className="justify-end gap-3">
          <Button variant="bordered" onPress={() => navigate('/club/dashboard/events')}>
            Cancel
          </Button>
          <Button
            type="submit"
            color="secondary"
            isLoading={loading}
            startContent={!loading && <CheckCircleIcon className="w-5 h-5" />}
          >
            {loading ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default EditEventView;
