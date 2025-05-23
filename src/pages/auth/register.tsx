import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardBody, CardFooter, Input, Button, Checkbox, Divider, Tabs, Tab, addToast } from "@heroui/react";
import { AuthController } from '@/controllers/authController';
import { useAuth } from '@/contexts/AuthContext';
import { AuthError } from '@supabase/supabase-js';
import {
  AcademicCapIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  IdentificationIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<string>("student");
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [businessType, setBusinessType] = useState(''); // Added business type field
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  // Use loading state from the context, manage errors locally
  const { loading: isLoading } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const toggleVisibility = () => setIsVisible(!isVisible);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation using toasts
    if (!agreedToTerms) {
      addToast({ title: 'Terms Required', description: 'You must agree to the terms and conditions.', color: 'warning' });
      return;
    }
    if (password !== confirmPassword) {
      addToast({ title: 'Password Mismatch', description: 'Passwords do not match.', color: 'warning' });
      return;
    }
     if (password.length < 8) {
       addToast({ title: 'Password Too Short', description: 'Password must be at least 8 characters long.', color: 'warning' });
       return;
     }
     if (!name) {
        addToast({ title: 'Missing Information', description: 'Full Name is required.', color: 'warning' });
        return;
     }
     if (!email) {
        addToast({ title: 'Missing Information', description: 'Email is required.', color: 'warning' });
        return;
     }

     if (selectedRole === 'student' && !studentId) {
        addToast({ title: 'Missing Information', description: 'Student ID is required for student registration.', color: 'warning' });
         return;
      }

     if (selectedRole === 'campus_store' && !businessType) {
        addToast({ title: 'Missing Information', description: 'Business Type is required for campus store registration.', color: 'warning' });
        return;
     }


    try {
      await AuthController.register({
        email,
        password,
        options: {
          data: {
            full_name: name,
            // Include student_id only if role is student
            student_id: selectedRole === 'student' ? studentId : undefined,
            phone: phone || undefined,
            // Pass the selected role and business type
            role: selectedRole, // Pass selected role
            business_type: selectedRole === 'campus_store' ? businessType : undefined // Pass business type if campus store
          }
        }
      });

      addToast({
        title: 'Registration Submitted',
        description: 'Please check your email to confirm your account.',
        color: 'success',
         timeout: 8000
       });
       navigate('/auth/login');

     } catch (err) {
      console.error("Registration page caught error:", err);
      let errorMessage = "An unexpected error occurred during registration.";
      let errorTitle = "Registration Failed";

      if (err instanceof AuthError || err instanceof Error) {
        errorMessage = err.message;
        if (errorMessage.toLowerCase().includes('user already registered') || errorMessage.toLowerCase().includes('already exists')) {
          errorTitle = "Account Exists";
          errorMessage = "An account with this email already exists. Please try logging in.";
        }
      }

      addToast({
        title: errorTitle,
        description: errorMessage,
         color: 'danger'
       });
     }
   };

  return (
    <div className="flex items-center justify-center min-h-screen bg-default-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <AcademicCapIcon className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-default-900">UniGo</h1>
          <p className="text-default-600">Create your account</p>
        </div>

        <Card className="shadow-lg border-none">
          <CardBody className="gap-4 p-6">
            <Tabs
              aria-label="Registration Type"
              selectedKey={selectedRole}
              onSelectionChange={(key) => setSelectedRole(key as string)}
              color="primary"
              variant="underlined"
              classNames={{
                base: "w-full",
                tabList: "gap-6",
                cursor: "w-full",
              }}
            >
              <Tab
                key="student"
                title={
                  <div className="flex items-center gap-2">
                    <AcademicCapIcon className="w-4 h-4" />
                    <span>Student</span>
                  </div>
                }
              />
               <Tab
                key="campus_store"
                title={
                  <div className="flex items-center gap-2">
                    <BuildingStorefrontIcon className="w-4 h-4" />
                    <span>Campus Store</span>
                  </div>
                }
              />
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-default-700">
                  Full Name
                </label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  startContent={<UserIcon className="w-4 h-4 text-default-400" />}
                  isRequired
                />
              </div>

              {/* Conditional fields based on selected role */}
              {selectedRole === 'student' && (
                <div className="space-y-2">
                  <label htmlFor="studentId" className="text-sm font-medium text-default-700">
                    Student ID
                  </label>
                  <Input
                    id="studentId"
                    placeholder="Enter your student ID"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    startContent={<IdentificationIcon className="w-4 h-4 text-default-400" />}
                    isRequired
                  />
                  <p className="text-xs text-default-500">
                    Your university-provided student identification number
                  </p>
                </div>
              )}

              {selectedRole === 'campus_store' && (
                 <div className="space-y-2">
                   <label htmlFor="businessType" className="text-sm font-medium text-default-700">
                     Business Type
                   </label>
                   <Input
                     id="businessType"
                     placeholder="e.g., Bookstore, Cafeteria, etc."
                     value={businessType}
                     onChange={(e) => setBusinessType(e.target.value)}
                     startContent={<BuildingStorefrontIcon className="w-4 h-4 text-default-400" />}
                     isRequired
                   />
                   <p className="text-xs text-default-500">
                     Specify the type of campus store
                   </p>
                 </div>
              )}


              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-default-700">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  startContent={<EnvelopeIcon className="w-4 h-4 text-default-400" />}
                  isRequired
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-default-700">
                  Phone number
                </label>
                <Input
                  id="phone"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  startContent={<PhoneIcon className="w-4 h-4 text-default-400" />}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-default-700">
                  Password
                </label>
                <Input
                  id="password"
                  type={isVisible ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  startContent={<LockClosedIcon className="w-4 h-4 text-default-400" />}
                  endContent={
                    <button type="button" onClick={toggleVisibility} className="focus:outline-none">
                      {isVisible ? (
                        <EyeSlashIcon className="w-4 h-4 text-default-400" />
                      ) : (
                        <EyeIcon className="w-4 h-4 text-default-400" />
                      )}
                    </button>
                  }
                  isRequired
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-default-700">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  startContent={<LockClosedIcon className="w-4 h-4 text-default-400" />}
                  isRequired
                />
              </div>

              <div className="mt-2">
                <Checkbox
                  isSelected={agreedToTerms}
                  onValueChange={setAgreedToTerms}
                  className="text-sm"
                >
                  <span className="text-sm text-default-600">
                    I agree to the{" "}
                    <Link to="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="text-primary hover=">
                      Privacy Policy
                    </Link>
                  </span>
                </Checkbox>
              </div>

              <Button
                type="submit"
                color="primary"
                className="w-full font-medium mt-6"
                isLoading={isLoading}
                isDisabled={!agreedToTerms || isLoading}
              >
                Create Account
              </Button>
            </form>

            <div className="flex items-center gap-4 my-2">
              <Divider className="flex-1" />
              <p className="text-sm text-default-500">OR</p>
              <Divider className="flex-1" />
            </div>

            <Button
              variant="bordered"
              fullWidth
              startContent={
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              }
            >
              Sign up with Google
            </Button>
          </CardBody>
          <CardFooter className="justify-center px-6 py-4 border-t border-default-100">
            <p className="text-default-600 text-sm">
              Already have an account?{" "}
              <Link to="/auth/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>

        <div className="text-center mt-4">
          <p className="text-default-500 text-xs">
            Are you a vendor?{" "}
            <Link to="/auth/vendor-application" className="text-primary hover:underline">
              Apply for a vendor account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
