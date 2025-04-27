import React, { useState, ChangeEvent } from 'react'; // Import ChangeEvent
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardBody, CardFooter, CardHeader } from "@heroui/card";
import { Input, Textarea } from "@heroui/input";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { Divider } from "@heroui/divider";
import { Select, SelectItem } from "@heroui/select"; // Import Select and SelectItem
import { RadioGroup, Radio } from "@heroui/radio";
import { AuthController } from '@/controllers/authController';
import { addToast } from "@heroui/react"; // Ensure addToast is imported
import {
  BuildingStorefrontIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserIcon,
  IdentificationIcon,
  LockClosedIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  DocumentArrowUpIcon // Import icon for upload
} from '@heroicons/react/24/outline';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Progress } from "@heroui/progress";
import { Chip } from "@heroui/chip";
// Remove supabase import - upload logic moved to controller
// import { supabase } from '@/lib/supabaseClient';

// Business types for vendor selection
const businessTypes = [
  { label: "Cafeteria/Food Service", value: "food" },
  { label: "Campus Store", value: "store" },
  { label: "Student Club", value: "club" },
  { label: "Event Organizer", value: "events" },
  { label: "Academic Services", value: "academic" },
  { label: "Other", value: "other" }
];

const VendorApplication: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const maxSteps = 3;
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [businessRegistrationDoc, setBusinessRegistrationDoc] = useState<File | null>(null);
  const [foodHandlingDoc, setFoodHandlingDoc] = useState<File | null>(null);
  // Remove uploadProgress state - no longer needed in frontend
  // const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    businessName: '',
    businessType: '',
    otherBusinessType: '',
    contactPerson: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',

    // Step 2: Business Details
    description: '',
    establishedYear: '', // Keep as string for input
    vendorType: 'new',
    universityAffiliation: '',

    // Step 3: Terms & Requirements
    hasFoodLicense: false,
    hasBusinessRegistration: false,
    agreeToTerms: false,
    agreeToCommission: false,
    // Paths will be added during submission after upload
    // business_registration_doc_path: '',
    // food_handling_doc_path: '',
  });

  // --- Input Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Removed clearing stepErrors
  };

  const handleListboxChange = (name: string, selection: React.Key | Set<React.Key> | null) => {
    let value = '';
    if (selection instanceof Set) {
      const firstKey = Array.from(selection)[0];
      value = firstKey ? String(firstKey) : '';
    } else if (selection !== null) {
      value = String(selection);
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Removed clearing stepErrors
  };

  const handleCheckboxChange = (name: string, isSelected: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: isSelected }));
    // Removed clearing stepErrors
  };

  const handleRadioChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Removed clearing stepErrors
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files.length > 0) {
      const file = files[0];
      if (name === 'businessRegistrationDoc') {
        setBusinessRegistrationDoc(file);
      } else if (name === 'foodHandlingDoc') {
        setFoodHandlingDoc(file);
      }
      // Remove uploadProgress update
      // setUploadProgress(prev => ({ ...prev, [name]: 0 }));
    } else {
      // Handle file removal if necessary
      if (name === 'businessRegistrationDoc') {
        setBusinessRegistrationDoc(null);
      } else if (name === 'foodHandlingDoc') {
        setFoodHandlingDoc(null);
      }
      // Remove uploadProgress update
      // setUploadProgress(prev => ({ ...prev, [name]: 0 }));
    }
  };


  // --- Step Validation ---
  const validateStep = (): boolean => {
    let isValid = true;
    const showToast = (message: string) => {
      addToast({ title: 'Validation Error', description: message, color: 'warning' });
      isValid = false;
    };

    if (currentStep === 1) {
      if (!formData.businessName.trim()) showToast('Business Name is required.');
      if (!formData.businessType) showToast('Business Type is required.');
      if (formData.businessType === 'other' && !formData.otherBusinessType.trim()) showToast('Please specify the business type.');
      if (!formData.contactPerson.trim()) showToast('Contact Person is required.');
      if (!formData.email.trim()) showToast('Business Email is required.');
      else if (!/\S+@\S+\.\S+/.test(formData.email)) showToast('Invalid email format.');
      if (!formData.phone.trim()) showToast('Phone Number is required.');
      else if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(formData.phone.replace(/[\s\-()]/g, ''))) showToast('Invalid Bangladesh phone number format (e.g., 01XXXXXXXXX or +8801XXXXXXXXX).');
      if (!formData.password) showToast('Password is required.');
      else if (formData.password.length < 8) showToast('Password must be at least 8 characters long.');
      if (!formData.confirmPassword) showToast('Confirm Password is required.');
      else if (formData.password !== formData.confirmPassword) showToast('Passwords do not match.');
    } else if (currentStep === 2) {
      if (formData.establishedYear && (isNaN(parseInt(formData.establishedYear)) || parseInt(formData.establishedYear) < 1900 || parseInt(formData.establishedYear) > new Date().getFullYear())) {
        showToast('Please enter a valid established year.');
      }
    } else if (currentStep === 3) {
      if (!formData.agreeToCommission) showToast('You must agree to the commission structure.');
      if (!formData.agreeToTerms) showToast('You must agree to the Terms and Conditions.');
    }

    // Removed setStepErrors
    return isValid;
  };

  // --- Navigation Handlers ---
  const handleNextStep = () => {
    // Removed setError(null);
    if (validateStep()) {
      if (currentStep < maxSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevStep = () => {
    // Removed setError(null);
    // Removed setStepErrors({});
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // --- Form Submission ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Removed setError(null);

    if (!validateStep()) {
      return; // Don't submit if final step validation fails
    }

    setIsLoading(true);
    // Remove uploadProgress reset
    // setUploadProgress({});

    try {
      // Determine application type flag based on business type
      const isClubApplication = formData.businessType === 'club'; // Assuming 'club' is the value for Student Club

      // Prepare data, including the File objects and application type flag
      const finalFormData = {
        ...formData,
        businessRegistrationDocFile: businessRegistrationDoc, // Pass the File object
        foodHandlingDocFile: foodHandlingDoc,           // Pass the File object
        // Add the appropriate flag for the backend trigger
        is_club_application: isClubApplication,
        is_vendor_application: !isClubApplication,
      };

      console.log('Submitting form data (including files and flags) to controller:', finalFormData);
      // Controller now handles the upload internally and should use the flags
      await AuthController.registerAndApplyAsVendor(finalFormData);
      setIsSuccessModalOpen(true); // Show success modal

    } catch (err) {
      console.error("Vendor application submission caught error:", err);
      let errorMessage = "An unknown error occurred during submission.";
      let errorTitle = "Submission Failed";

      if (err instanceof Error) {
        errorMessage = err.message;
        // Check for specific error for existing user
        if (errorMessage.toLowerCase().includes('user already registered') || errorMessage.toLowerCase().includes('already exists') || errorMessage.includes('account with this email already exists')) {
          errorTitle = "Account Exists";
          errorMessage = "An account with this email already exists. Please log in or use a different email.";
        }
      }
      addToast({
        title: errorTitle,
        description: errorMessage,
        color: 'danger'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect after success modal
  const redirectToLogin = () => {
    setIsSuccessModalOpen(false); // Close modal first
    navigate('/auth/login');
  };

  // Helper to get step title
  const getStepTitle = (step: number): string => {
    switch (step) {
      case 1: return "Basic Information";
      case 2: return "Business Details";
      case 3: return "Requirements & Terms";
      default: return "Vendor Application";
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-default-50 to-default-100 py-10 px-4">
      <div className="w-full max-w-3xl">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="h-14 w-14 rounded-full bg-secondary/10 flex items-center justify-center ring-4 ring-secondary/20">
              <BuildingStorefrontIcon className="h-8 w-8 text-secondary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-default-900">Vendor Application</h1>
          <p className="text-default-600 mt-1">Join the UniGo platform in {maxSteps} easy steps.</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 px-2">
          <Progress
            aria-label="Application Progress"
            value={(currentStep / maxSteps) * 100}
            label={`${getStepTitle(currentStep)} (Step ${currentStep} of ${maxSteps})`}
            showValueLabel={true}
            color="secondary"
            size="md"
            classNames={{
              label: "text-sm font-medium text-default-700",
              value: "text-secondary font-semibold",
              indicator: "bg-gradient-to-r from-secondary-300 to-secondary-500"
            }}
          />
        </div>

        <Card className="shadow-xl border-none overflow-hidden">
          <CardHeader className="flex items-center justify-between gap-3 px-6 py-4 bg-gradient-to-r from-secondary-50 to-secondary-100 border-b border-secondary-200">
             <div className="flex items-center gap-3">
               <div className="rounded-full w-8 h-8 bg-white/50 flex items-center justify-center ring-1 ring-secondary/30">
                 {currentStep === 1 && <UserIcon className="w-5 h-5 text-secondary-700" />}
                 {currentStep === 2 && <IdentificationIcon className="w-5 h-5 text-secondary-700" />}
                 {currentStep === 3 && <DocumentTextIcon className="w-5 h-5 text-secondary-700" />}
               </div>
               <div>
                 <h3 className="text-lg font-semibold text-secondary-900">{getStepTitle(currentStep)}</h3>
                 <p className="text-secondary-700 text-sm">Please fill out the details for this step.</p>
               </div>
             </div>
             <Chip color="secondary" variant="flat" size="sm">Step {currentStep}/{maxSteps}</Chip>
          </CardHeader>

          {/* Use form tag around the entire CardBody for final submission */}
          <form onSubmit={handleSubmit}>
            <CardBody className="gap-6 p-6 md:p-8">
              {/* Removed general submission error display div */}

              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1">
                      <label htmlFor="businessName" className="text-sm font-medium text-default-700">
                        Business Name<span className="text-danger">*</span>
                      </label>
                      <Input
                        id="businessName"
                        name="businessName"
                         placeholder="Your Company LLC"
                         value={formData.businessName}
                         onChange={handleInputChange}
                         // Removed isInvalid and errorMessage
                         isRequired
                       />
                     </div>
                    <div className="space-y-1">
                      <label htmlFor="businessType" className="text-sm font-medium text-default-700">
                        Business Type<span className="text-danger">*</span>
                      </label>
                      <Select
                        id="businessType" // Add id for label association
                        name="businessType" // Add name
                        aria-label="Business Type" // Keep aria-label or use label prop
                        placeholder="Select a business type"
                         variant="bordered"
                         selectedKeys={formData.businessType ? [formData.businessType] : []}
                         onSelectionChange={(selection) => handleListboxChange("businessType", selection as Set<React.Key>)}
                         // Removed isInvalid and errorMessage
                         isRequired // Add isRequired
                         className="w-full"
                       >
                        {businessTypes.map((type) => (
                          <SelectItem key={type.value} textValue={type.label}> {/* Removed value, added textValue */}
                            {type.label}
                          </SelectItem>
                        ))}
                      </Select>
                      {/* Removed separate error message p tag */}
                    </div>
                  </div>

                  {formData.businessType === 'other' && (
                    <div className="space-y-1">
                      <label htmlFor="otherBusinessType" className="text-sm font-medium text-default-700">
                        Please specify other business type<span className="text-danger">*</span>
                      </label>
                      <Input
                        id="otherBusinessType"
                        name="otherBusinessType"
                         placeholder="e.g., Tutoring Service"
                         value={formData.otherBusinessType}
                         onChange={handleInputChange}
                         // Removed isInvalid and errorMessage
                         isRequired={formData.businessType === 'other'}
                       />
                     </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                     <div className="space-y-1">
                      <label htmlFor="contactPerson" className="text-sm font-medium text-default-700">
                        Contact Person<span className="text-danger">*</span>
                      </label>
                      <Input
                        id="contactPerson"
                        name="contactPerson"
                        placeholder="John Doe"
                         value={formData.contactPerson}
                         onChange={handleInputChange}
                         startContent={<UserIcon className="w-4 h-4 text-default-400" />}
                         // Removed isInvalid and errorMessage
                         isRequired
                       />
                     </div>
                    <div className="space-y-1">
                      <label htmlFor="email" className="text-sm font-medium text-default-700">
                        Business Email<span className="text-danger">*</span>
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="contact@yourcompany.com"
                         value={formData.email}
                         onChange={handleInputChange}
                         startContent={<EnvelopeIcon className="w-4 h-4 text-default-400" />}
                         // Removed isInvalid and errorMessage
                         isRequired
                       />
                     </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="phone" className="text-sm font-medium text-default-700">
                      Phone Number<span className="text-danger">*</span>
                    </label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                         value={formData.phone}
                         onChange={handleInputChange}
                         startContent={<PhoneIcon className="w-4 h-4 text-default-400" />}
                         // Removed isInvalid and errorMessage
                         isRequired
                       />
                     </div>

                  <Divider className="my-4" />
                  <p className="text-sm font-medium text-default-700">Create Your Account Password</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1">
                      <label htmlFor="password"className="text-sm font-medium text-default-700">
                        Password<span className="text-danger">*</span>
                      </label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Enter secure password"
                         value={formData.password}
                         onChange={handleInputChange}
                         startContent={<LockClosedIcon className="w-4 h-4 text-default-400" />}
                         // Removed isInvalid and errorMessage
                         isRequired
                       />
                     </div>
                    <div className="space-y-1">
                      <label htmlFor="confirmPassword"className="text-sm font-medium text-default-700">
                        Confirm Password<span className="text-danger">*</span>
                      </label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                         value={formData.confirmPassword}
                         onChange={handleInputChange}
                         startContent={<LockClosedIcon className="w-4 h-4 text-default-400" />}
                         // Removed isInvalid and errorMessage
                         isRequired
                       />
                     </div>
                  </div>
                </div>
              )}

              {/* Step 2: Business Details */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <label htmlFor="description" className="text-sm font-medium text-default-700">
                      Business Description <span className="text-default-500 text-xs">(Optional)</span>
                    </label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Tell us about your business, products, or services..."
                      value={formData.description}
                      onChange={handleInputChange}
                      minRows={4} // Corrected props for Textarea
                      maxRows={8} // Corrected props for Textarea
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1">
                      <label htmlFor="establishedYear" className="text-sm font-medium text-default-700">
                        Established Year <span className="text-default-500 text-xs">(Optional)</span>
                      </label>
                      <Input
                        id="establishedYear"
                        name="establishedYear"
                        type="number"
                        placeholder={`e.g., ${new Date().getFullYear() - 2}`}
                        value={formData.establishedYear}
                        onChange={handleInputChange}
                        min="1900"
                        max={new Date().getFullYear().toString()}
                        // Removed isInvalid and errorMessage
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="vendorType" className="text-sm font-medium text-default-700">
                        Vendor Type
                      </label>
                      <RadioGroup
                        name="vendorType"
                        value={formData.vendorType}
                        onValueChange={(value) => handleRadioChange("vendorType", value)}
                        orientation="horizontal"
                        className="mt-1"
                      >
                        <Radio value="new">New Vendor</Radio>
                        <Radio value="existing">Existing Partnership</Radio>
                      </RadioGroup>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="universityAffiliation" className="text-sm font-medium text-default-700">
                      University Affiliation <span className="text-default-500 text-xs">(If applicable)</span>
                    </label>
                    <Input
                      id="universityAffiliation"
                      name="universityAffiliation"
                      placeholder="e.g., Computer Science Club, Athletics Dept."
                      value={formData.universityAffiliation}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Requirements & Terms */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-default-700">
                      Required Documents/Licenses <span className="text-default-500 text-xs">(If applicable)</span>
                    </label>
                    <div className="flex flex-col sm:flex-row gap-4 p-3 bg-default-50 rounded-lg border border-default-200">
                      <Checkbox
                        isSelected={formData.hasFoodLicense}
                        onValueChange={(isSelected) => handleCheckboxChange("hasFoodLicense", isSelected)}
                        size="md"
                      >
                        <span className="text-sm text-default-700">Food Handling License</span>
                      </Checkbox>
                      <Checkbox
                        isSelected={formData.hasBusinessRegistration}
                        onValueChange={(isSelected) => handleCheckboxChange("hasBusinessRegistration", isSelected)}
                         size="md"
                      >
                        <span className="text-sm text-default-700">Business Registration Document</span>
                      </Checkbox>
                    </div>
                    {/* <p className="text-xs text-default-500">You may be asked to provide copies of relevant documents upon approval.</p> */}
                  </div>

                  {/* File Upload Section */}
                  <div className="space-y-4">
                     <label className="text-sm font-medium text-default-700 block">
                       Upload Documents <span className="text-default-500 text-xs">(PDF format preferred)</span>
                     </label>

                     {/* Business Registration Upload */}
                     <div className="p-4 border border-dashed border-default-300 rounded-lg bg-default-50">
                       <label htmlFor="businessRegistrationDoc" className="text-sm font-medium text-default-800 flex items-center gap-2 cursor-pointer">
                         <DocumentArrowUpIcon className="w-5 h-5 text-default-500"/>
                         Business Registration Document
                         {businessRegistrationDoc && <span className="text-xs text-success font-medium ml-2">(File Selected)</span>}
                       </label>
                       <input
                         type="file"
                         id="businessRegistrationDoc"
                         name="businessRegistrationDoc"
                         accept=".pdf,image/*" // Allow PDF and common image types
                         onChange={handleFileChange}
                         className="block w-full text-sm text-default-500 mt-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-secondary-50 file:text-secondary-700 hover:file:bg-secondary-100 cursor-pointer"
                       />
                       {businessRegistrationDoc && (
                        <p className="text-xs text-default-600 mt-1 truncate">Selected: {businessRegistrationDoc.name}</p>
                       )}
                       {/* Remove Progress Indicator */}
                       {/* {uploadProgress['business_registration'] > 0 && uploadProgress['business_registration'] < 100 && (
                         <Progress size="sm" value={uploadProgress['business_registration']} color="secondary" className="mt-1" aria-label="Business Reg Upload Progress"/>
                       )} */}
                      </div>

                     {/* Food Handling License Upload */}
                     <div className="p-4 border border-dashed border-default-300 rounded-lg bg-default-50">
                       <label htmlFor="foodHandlingDoc" className="text-sm font-medium text-default-800 flex items-center gap-2 cursor-pointer">
                         <DocumentArrowUpIcon className="w-5 h-5 text-default-500"/>
                         Food Handling License/Certificate
                         {foodHandlingDoc && <span className="text-xs text-success font-medium ml-2">(File Selected)</span>}
                       </label>
                       <input
                         type="file"
                         id="foodHandlingDoc"
                         name="foodHandlingDoc"
                         accept=".pdf,image/*"
                         onChange={handleFileChange}
                         className="block w-full text-sm text-default-500 mt-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-secondary-50 file:text-secondary-700 hover:file:bg-secondary-100 cursor-pointer"
                       />
                       {foodHandlingDoc && (
                        <p className="text-xs text-default-600 mt-1 truncate">Selected: {foodHandlingDoc.name}</p>
                       )}
                       {/* Remove Progress Indicator */}
                       {/* {uploadProgress['food_handling'] > 0 && uploadProgress['food_handling'] < 100 && (
                         <Progress size="sm" value={uploadProgress['food_handling']} color="secondary" className="mt-1" aria-label="Food Handling Upload Progress"/>
                       )} */}
                      </div>
                     <p className="text-xs text-default-500">Upload relevant documents if applicable. You can proceed without them for now.</p>
                   </div>


                  <Divider className="my-4"/>

                  <div className="space-y-4 p-3 bg-default-50 rounded-lg border border-default-200">
                     <p className="text-sm font-medium text-default-800 mb-2">Agreements<span className="text-danger">*</span></p>
                    <Checkbox
                      name="agreeToCommission" // Added name for potential error mapping
                       isSelected={formData.agreeToCommission}
                       onValueChange={(isSelected) => handleCheckboxChange("agreeToCommission", isSelected)}
                       // Removed isInvalid
                       size="md"
                     >
                       <span className="text-sm text-default-700">I agree to the platform's standard <Link to="/docs/commission" target="_blank" className="text-secondary hover:underline">commission structure</Link>.<span className="text-danger">*</span></span>
                     </Checkbox>
                     {/* Removed stepError display */}

                     <Checkbox
                       name="agreeToTerms" // Added name for potential error mapping
                       isSelected={formData.agreeToTerms}
                       onValueChange={(isSelected) => handleCheckboxChange("agreeToTerms", isSelected)}
                       // Removed isInvalid
                       size="md"
                     >
                       <span className="text-sm text-default-700">I have read and agree to the <Link to="/docs/vendor-terms" target="_blank" className="text-secondary hover:underline">UniGo Vendor Terms and Conditions</Link>.<span className="text-danger">*</span></span>
                     </Checkbox>
                     {/* Removed stepError display */}
                   </div>
                 </div>
               )}

            </CardBody>

            {/* Navigation Buttons */}
            <CardFooter className="flex justify-between items-center px-6 py-4 border-t border-default-100 bg-default-50">
              <Button
                variant="bordered"
                color="default"
                onPress={handlePrevStep}
                isDisabled={currentStep === 1 || isLoading}
                startContent={<ArrowLeftIcon className="w-4 h-4" />}
              >
                Previous
              </Button>

              {currentStep < maxSteps ? (
                <Button
                  color="secondary"
                  onPress={handleNextStep}
                  endContent={<ArrowRightIcon className="w-4 h-4" />}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit" // Changed to type="submit" for the final step
                  color="secondary"
                  isLoading={isLoading}
                  isDisabled={isLoading} // Let validation handle enabling/disabling based on errors
                  endContent={<CheckCircleIcon className="w-5 h-5" />}
                >
                  Submit Application
                </Button>
              )}
            </CardFooter>
          </form> {/* Close form tag */}
        </Card>

        <div className="text-center mt-6">
            <p className="text-default-600 text-sm">
              Already have a vendor account?{" "}
              <Link to="/auth/login" className="text-secondary font-medium hover:underline">
                Sign in here
              </Link>
            </p>
        </div>
      </div>

      {/* Success Modal (remains the same) */}
      <Modal
        isOpen={isSuccessModalOpen}
        onOpenChange={setIsSuccessModalOpen}
        isDismissable={false}
        backdrop="blur"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 items-center text-center pt-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-secondary/10 mb-3 border-4 border-secondary/20">
              <CheckCircleIcon className="h-8 w-8 text-secondary" />
            </div>
             Application Submitted
           </ModalHeader>
           <ModalBody className="text-center pb-4">
             <p className="font-medium text-lg mb-1 text-default-800">Thank you for applying!</p>
             <p className="text-default-600 mb-4">
               Your vendor application and account request have been received.
             </p>
             <div className="bg-secondary-50 border border-secondary-100 p-4 rounded-lg text-sm text-secondary-800">
               <p className="font-semibold mb-2">What happens next?</p>
               <ol className="list-decimal list-inside text-left space-y-1">
                <li>Our team will review your application (usually within 2-3 business days).</li>
                <li>You will receive an email notification once a decision is made.</li>
                <li>If approved, you can sign in using the credentials you created via the Login page.</li>
              </ol>
            </div>
          </ModalBody>
          <ModalFooter className="justify-center pb-6">
            <Button color="secondary" variant="solid" onPress={redirectToLogin} className="px-8">
              Return to Login
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default VendorApplication;
