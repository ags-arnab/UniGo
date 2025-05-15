import React, { useState } from 'react'; // Added useEffect
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardBody, CardFooter, Input, Button, Divider, Tabs, Tab, addToast } from "@heroui/react";
import { AuthController } from '@/controllers/authController';
import { useAuth } from '@/contexts/AuthContext';
import { AuthError } from '@supabase/supabase-js'; // Import Session type
import {
  AcademicCapIcon,
  EyeIcon,
  EyeSlashIcon, 
  LockClosedIcon, 
  EnvelopeIcon, 
  UserIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';

const Login: React.FC = () => {
  const navigate = useNavigate();
  // Get state from AuthContext (reverted: no setAuthenticatedUser, etc.)
  const { loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<string>("student"); // Keep tab state for UI
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Local loading state for submission

  const toggleVisibility = () => setIsVisible(!isVisible);

  // Removed the useEffect hook that handled initial redirects.
  // Relying on AuthGuard and navigation triggered by AuthContext state change.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Removed startLoginAttempt()

    try {
      // Call login controller. It throws error on failure, returns profile on success.
      // AuthController.login returns the validated profile on success
      const validatedProfile = await AuthController.login(
        { email, password },
        activeTab as 'student' | 'vendor'
      );

      // If AuthController.login succeeds (no error thrown), navigate immediately.
      // The AuthContext listener will update state, and Guards will handle loading/access.
      addToast({ title: 'Login Successful', description: 'Redirecting...', color: 'success' });

      if (validatedProfile.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (validatedProfile.role === 'student') {
        navigate('/student/cafeteria', { replace: true });
      } else if (validatedProfile.role === 'marketplace_operator') {
        navigate('/vendor/marketplace-management', { replace: true });
      } else if (validatedProfile.role === 'vendor') {
        navigate('/vendor/dashboard', { replace: true });
      } else if (validatedProfile.role === 'club') {
        // Redirect clubs to their new dedicated dashboard
        navigate('/club/dashboard/events', { replace: true });
      }

    } catch (err) {
      // Handle errors (including those from AuthController.login)
      console.error("Login page caught error:", err);
      let errorMessage = "An unexpected error occurred.";
      if (err instanceof AuthError || err instanceof Error) {
        errorMessage = err.message; // Use the specific error message
      }
      addToast({
        title: 'Login Failed',
        description: errorMessage,
        color: 'danger'
      });
      // No navigation needed on error
    } finally {
      setIsSubmitting(false); // Stop loading indicator
      // Removed endLoginAttempt()
    }
  };

  // Render loading indicator if AuthContext is still loading initially
  if (authLoading) {
    // return <LoadingSpinner />; // Or your preferred loading indicator
    return null; // Or a minimal loading state
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-default-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <AcademicCapIcon className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-default-900">UniGo</h1>
          <p className="text-default-600">Sign in to your account</p>
        </div>

        <Card className="shadow-lg border-none">
          <CardBody className="gap-6 p-6">
            {/* Removed local error display div */}

            {/* User role tabs for login - Corrected Structure with Tab */}
            <Tabs 
              aria-label="Login Options" 
              selectedKey={activeTab} 
              onSelectionChange={(key) => setActiveTab(key as string)}
              className="flex justify-center"
              classNames={{
                tabList: "gap-8 mx-auto",
                cursor: "w-full",
              }}
            >
              <Tab
                key="student"
                title={ // Title prop contains the JSX for the tab label
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    <span>Student</span>
                  </div>
                }
              /> {/* Self-closing: Content is now outside the Tabs */}

              <Tab
                 key="vendor"
                 title={ // Title prop contains the JSX for the tab label
                   <div className="flex items-center gap-2">
                     <BuildingStorefrontIcon className="w-4 h-4" />
                     <span>Vendor</span>
                   </div>
                 }
               /> {/* Self-closing: Content is now outside the Tabs */}
            </Tabs>

            {/* Shared Login Form - Moved outside Tabs */}
            <form onSubmit={handleSubmit} className="space-y-5 mt-6"> {/* Added margin-top */}
              <div className="space-y-2">
                {/* Use standard HTML label */}
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
                <div className="flex justify-between">
                  {/* Use standard HTML label */}
                  <label htmlFor="password" className="text-sm font-medium text-default-700">
                    Password
                  </label>
                  {/* Use Button component for consistency and fix TS error */}
                   <Button
                     as={Link}
                     to="/auth/forgot-password"
                     variant="light" // Changed from link
                     color="primary"
                     size="sm"
                     className="font-semibold p-0 h-auto" // Adjust padding/height if needed
                   >
                     Forgot password?
                   </Button>
                </div>
                <Input
                  id="password"
                  type={isVisible ? "text" : "password"}
                  placeholder="Enter your password"
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

              {/* Remember me checkbox removed for now - requires session handling logic */}
              {/* <div className="flex items-center justify-between"> ... </div> */}

              {/* Use local isSubmitting state for the button */}
              <Button
                type="submit"
                color={activeTab === "student" ? "primary" : "secondary"}
                className="w-full font-medium"
                isLoading={isSubmitting} // Use local state here
              >
                Sign In {activeTab === "student" ? "as Student" : "as Vendor"}
              </Button>
            </form>

            <div className="flex items-center gap-4 py-2">
              <Divider className="flex-1" />
              <p className="text-sm text-default-500">OR</p>
              <Divider className="flex-1" />
            </div>

            {/* Optional: Google Sign-in Button */}
            {/* <div className="flex flex-col gap-3">
              <Button
                variant="bordered"
                startContent={ ... google icon svg ... }
              >
                Sign in with Google
              </Button>
            </div> */}
          </CardBody>
          <CardFooter className="justify-center px-6 py-4 border-t border-default-100">
            {/* Dynamic link based on active tab */}
            {activeTab === "student" ? (
              <p className="text-default-600 text-sm">
                Don't have an account?{" "}
                <Button as={Link} to="/auth/register" variant="light" color="primary" size="sm" className="font-semibold p-0 h-auto">
                  Sign up
                </Button>
              </p>
            ) : (
              <p className="text-default-600 text-sm">
                Don't have a vendor account?{" "}
                 <Button as={Link} to="/auth/vendor-application" variant="light" color="secondary" size="sm" className="font-semibold p-0 h-auto">
                   Apply as a vendor
                 </Button>
              </p>
            )}
          </CardFooter>
        </Card>

        {/* Switch Tab Link */}
         <div className="text-center mt-4">
           <p className="text-default-500 text-xs">
             {activeTab === "student" ? "Are you a vendor?" : "Are you a student?"}{" "}
             <Button
               variant="light"
               color={activeTab === "student" ? "secondary" : "primary"}
               size="sm"
               className="font-semibold p-0 h-auto"
               onPress={() => setActiveTab(activeTab === "student" ? "vendor" : "student")}
             >
               Switch to {activeTab === "student" ? "vendor" : "student"} login
             </Button>
           </p>
         </div>
      </div>
    </div>
  );
};

export default Login;
