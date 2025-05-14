import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClubController } from '@/controllers/clubController';
import { CreateEventPayload } from '@/types/events';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Input,
  Textarea,
  Switch,
  Calendar, // Added Calendar component
  Popover,
  PopoverTrigger,
  PopoverContent,
  addToast
} from "@heroui/react"; // Adjust imports based on actual library
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import {
  getLocalTimeZone,
  today,
  toZoned,
  ZonedDateTime // Use ZonedDateTime for combined date and time
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


const CreateEventView: React.FC = () => {
  const navigate = useNavigate();

  // Use ZonedDateTime for state fields that combine date and time
  const [formData, setFormData] = useState<Partial<Omit<CreateEventPayload, 'event_datetime' | 'end_time' | 'registration_deadline'> & {
    event_datetime: ZonedDateTime | null;
    end_time: ZonedDateTime | null;
    registration_deadline: ZonedDateTime | null;
  }>>({
    title: '',
    description: '',
    event_datetime: null,
    end_time: null,
    registration_deadline: null, // Correctly initialize
    venue: '',
    total_seats: 0,
    is_paid: false,
    payment_amount: 0.00,
    sponsors: [],
    is_seminar: false,
    guests: [],
    banner_image_path: null, // Will be set after upload
  });
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({}); // For basic validation feedback
  // State for raw comma-separated input strings
  const [guestInput, setGuestInput] = useState('');
  const [sponsorInput, setSponsorInput] = useState('');


  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value,
    }));
    // Clear specific error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSwitchChange = (name: keyof CreateEventPayload, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked,
      // Reset payment amount if is_paid is turned off
      ...(name === 'is_paid' && !checked && { payment_amount: 0.00 }),
    }));
  };

  // Removed the old handleDateTimeChange for input type="datetime-local"

   // Updated handler for DatePicker component (date only)
   const handleDatePickerChange = (name: 'event_datetime' | 'end_time' | 'registration_deadline', value: ZonedDateTime | null) => {
     setFormData(prev => ({
       ...prev,
       [name]: value,
     }));
     // Clear error for the specific field
     if (errors[name]) {
       setErrors(prev => ({ ...prev, [name]: '' }));
     }
   };
   
  // New handler for time input fields
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
          // Create a new date object based on today if no date was selected
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
      // TODO: Implement image preview if needed
    } else {
      setBannerImageFile(null);
    }
  };

  // Basic validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title?.trim()) newErrors.title = 'Event title is required.';
    if (!formData.event_datetime) newErrors.event_datetime = 'Event start date and time are required.';

    // Compare ZonedDateTime objects directly using .toAbsoluteString()
    if (
      formData.event_datetime &&
      formData.end_time &&
      formData.end_time.toAbsoluteString() <= formData.event_datetime.toAbsoluteString()
    ) {
      newErrors.end_time = 'End date/time must be after the start date/time.';
    }

    if (formData.total_seats === undefined || formData.total_seats < 0) newErrors.total_seats = 'Total seats must be 0 or more.';
    if (formData.is_paid && (!formData.payment_amount || formData.payment_amount <= 0)) {
      newErrors.payment_amount = 'Payment amount is required for paid events and must be positive.';
    }
    // Add more validation as needed (e.g., end time after start time)
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
    setFormData(updatedFormData); // Update state

    // Now validate using the updated state (need to pass it or wait for re-render, passing is safer)
    // Let's adjust validateForm to accept data or rely on the updated state if validation is simple
    // For simplicity here, we'll assume validateForm uses the latest formData state after the update.
    // A more robust way might involve validating the 'updatedFormData' object directly.

    // Re-validate after updating state (or adjust validateForm)
    // Note: Direct validation after setState might use stale state. Let's adjust validateForm slightly if needed
    // or perform validation logic here directly on 'updatedFormData'.
    // Sticking to original validateForm for now, assuming it reads latest state or is simple enough.

    if (!validateForm()) { // This might use slightly stale state if validation is complex
      addToast({ title: 'Validation Error', description: 'Please fix the errors in the form.', color: 'warning' });
      return;
    }
    // Ensure validation uses the *intended* data
    // It's safer to validate the processed data directly if validateForm relies on async state
    // const isValid = validateProcessedForm(updatedFormData); // Hypothetical adjusted validation
    // if (!isValid) { ... return; }


    setLoading(true);

    try {
      // --- TODO: Implement Banner Image Upload ---
      // 1. Upload bannerImageFile to Supabase Storage (e.g., 'event-assets' bucket)
      // 2. Get the public URL or path of the uploaded image
      // 3. Set formData.banner_image_path = uploadedImagePath;
      let uploadedImagePath: string | null = null;
      if (bannerImageFile) {
         // Placeholder for upload logic - replace with actual Supabase storage upload call
         console.warn("Image upload not implemented yet. Skipping banner image.");
         // Example (needs proper implementation):
         // uploadedImagePath = await uploadEventBanner(bannerImageFile, eventId); // Need eventId or handle path differently
         // For now, just log it
         console.log("Selected banner file:", bannerImageFile.name);
      }
      // --- End Upload Placeholder ---


      // Prepare payload using the most up-to-date data in updatedFormData
      // Convert ZonedDateTime to standard Date, then to ISO string
      const eventDate = zonedDateTimeToDate(updatedFormData.event_datetime ?? null); // Use updatedFormData
      const endDate = zonedDateTimeToDate(updatedFormData.end_time ?? null); // Use updatedFormData
      const deadlineDate = zonedDateTimeToDate(updatedFormData.registration_deadline ?? null); // Use updatedFormData

      const payload: CreateEventPayload = {
        // Use fields from updatedFormData consistently
        title: updatedFormData.title!,
        description: updatedFormData.description || null,
        venue: updatedFormData.venue || null,
        total_seats: updatedFormData.total_seats ?? 0,
        is_paid: updatedFormData.is_paid ?? false,
        payment_amount: updatedFormData.is_paid ? (updatedFormData.payment_amount ?? 0) : null,
        sponsors: updatedFormData.sponsors || [], // Already using updatedFormData
        is_seminar: updatedFormData.is_seminar ?? false,
        guests: updatedFormData.guests || [], // Already using updatedFormData
        banner_image_path: uploadedImagePath,
        // Add converted date/time fields derived from updatedFormData
        event_datetime: eventDate ? eventDate.toISOString() : '',
        end_time: endDate ? endDate.toISOString() : null,
        registration_deadline: deadlineDate ? deadlineDate.toISOString() : null,
      };

      // Ensure event_datetime is not empty before sending
      if (!payload.event_datetime) {
          throw new Error("Event start date and time cannot be empty.");
      }


      await ClubController.createEvent(payload);

      addToast({ title: 'Success', description: 'Event created successfully!', color: 'success' });
      navigate('/club/dashboard/events'); // Redirect back to the event list

    } catch (err) {
      console.error("Error creating event:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create event. Please try again.';
      addToast({ title: 'Error Creating Event', description: errorMessage, color: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-center gap-3">
         <Button isIconOnly variant="light" onPress={() => navigate(-1)} aria-label="Back">
           <ArrowLeftIcon className="w-5 h-5" />
         </Button>
        <h1 className="text-xl font-semibold text-default-800">Create New Club Event</h1>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardBody className="space-y-5 p-6">
          {/* Title */}
          <Input
            label="Event Title"
            name="title"
            value={formData.title}
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
            value={formData.description ?? ''} // Ensure string, never null/undefined
            onChange={handleInputChange}
            placeholder="Detailed information about the event..."
            minRows={3}
          />

          {/* Date & Time separately */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          // Convert CalendarDate to ZonedDateTime
                          const selectedZonedDate = toZoned(date, getLocalTimeZone());
                          // Preserve time if already set
                          const newZonedDateTime = formData.event_datetime ? 
                            selectedZonedDate.set({
                              hour: formData.event_datetime.hour,
                              minute: formData.event_datetime.minute
                            }) : 
                            selectedZonedDate;
                          handleDatePickerChange('event_datetime', newZonedDateTime);
                        }
                      }}
                      minValue={today(getLocalTimeZone())}
                      className="rounded-md border shadow-md"
                    />
                  </PopoverContent>
                </Popover>
                {errors.event_datetime && (
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
                />
              </div>
            </div>
            
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
                          // Convert CalendarDate to ZonedDateTime
                          const selectedZonedDate = toZoned(date, getLocalTimeZone());
                          // Preserve time if already set
                          const newZonedDateTime = formData.end_time ? 
                            selectedZonedDate.set({
                              hour: formData.end_time.hour,
                              minute: formData.end_time.minute
                            }) : 
                            selectedZonedDate;
                          handleDatePickerChange('end_time', newZonedDateTime);
                        }
                      }}
                      minValue={formData.event_datetime || today(getLocalTimeZone())}
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
                  name="end_time_time"
                  onChange={handleTimeChange}
                  value={formData.end_time ? 
                    `${formData.end_time.hour.toString().padStart(2, '0')}:${formData.end_time.minute.toString().padStart(2, '0')}` 
                    : ''}
                />
              </div>
            </div>
          </div>

           {/* Venue */}
           <Input
             label="Venue / Location"
             name="venue"
             value={formData.venue ?? ''} // Ensure string for null/undefined
             onChange={handleInputChange}
             placeholder="e.g., University Auditorium, Online Zoom Link"
           />

           {/* Registration Deadline using Calendar in Popover (like other date pickers) */}
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
                          // Convert CalendarDate to ZonedDateTime (removed 'any' cast)
                          const selectedZonedDate = toZoned(date, getLocalTimeZone());
                          // Preserve time if already set
                          const newZonedDateTime = formData.registration_deadline ? 
                           selectedZonedDate.set({
                             hour: formData.registration_deadline.hour,
                             minute: formData.registration_deadline.minute
                           }) : 
                           selectedZonedDate;
                         handleDatePickerChange('registration_deadline', newZonedDateTime);
                       }
                     }}
                     minValue={today(getLocalTimeZone())}
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
                 name="registration_deadline_time"
                 onChange={handleTimeChange}
                 value={formData.registration_deadline ? 
                   `${formData.registration_deadline.hour.toString().padStart(2, '0')}:${formData.registration_deadline.minute.toString().padStart(2, '0')}` 
                   : ''}
               />
             </div>
           </div>

           {/* Seats */}
           <Input
             label="Total Seats"
             name="total_seats"
             type="number"
             min="0"
             value={String(formData.total_seats ?? 0)} // Explicitly convert number to string
             onChange={handleInputChange}
             placeholder="0"
             isRequired
             errorMessage={errors.total_seats}
             isInvalid={!!errors.total_seats}
           />

           {/* Paid Event Toggle & Amount */}
           <div className="flex items-center gap-4">
             <Switch
               isSelected={formData.is_paid}
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
                 value={String(formData.payment_amount ?? 0.00)} // Explicitly convert number to string
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
             isSelected={formData.is_seminar}
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
             <input
               type="file"
               id="bannerImageFile"
               name="bannerImageFile"
               accept="image/*"
               onChange={handleFileChange}
               className="block w-full text-sm text-default-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-secondary-50 file:text-secondary-700 hover:file:bg-secondary-100 cursor-pointer"
             />
             {bannerImageFile && <p className="text-xs text-default-600 mt-1">Selected: {bannerImageFile.name}</p>}
             <p className="text-xs text-default-500 mt-1">Upload an image to display for the event.</p>
           </div>

        </CardBody>
        <CardFooter className="justify-end gap-3">
          <Button variant="bordered" onPress={() => navigate(-1)}>
            Cancel
          </Button>
          <Button
            type="submit"
            color="secondary"
            isLoading={loading}
            startContent={!loading && <CheckCircleIcon className="w-5 h-5" />}
          >
            {loading ? 'Creating Event...' : 'Create Event'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default CreateEventView;
