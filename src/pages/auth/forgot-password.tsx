import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardBody, CardFooter } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { AuthController } from '@/controllers/authController'; // Import controller
import { addToast } from "@heroui/react"; // Import addToast
// Removed useAuthStore import
import { EnvelopeIcon, AcademicCapIcon } from '@heroicons/react/24/outline'; // Removed CheckCircleIcon

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Local loading state
  // Removed store loading/error state
  // Removed isSubmittedSuccessfully state

  // Removed useEffect for clearing store error and resetting success state

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    // Removed resetting success state
    setIsLoading(true); // Set local loading

    try {
      await AuthController.requestPasswordReset(email);
      // Show success toast
      addToast({
        title: 'Request Sent',
        description: `Password reset link sent to ${email}. Please check your inbox (and spam folder).`,
        color: 'success',
        timeout: 8000 // Longer timeout
      });
    } catch (err) {
      // Show error toast
      console.error("Forgot password page caught error:", err);
      let errorMessage = "An unexpected error occurred.";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      addToast({
        title: 'Request Failed',
        description: errorMessage,
        color: 'danger'
      });
    } finally {
      setIsLoading(false); // Reset local loading
    }
  };

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
          <p className="text-default-600">Reset your password</p>
        </div>

        <Card className="shadow-lg border-none">
          <CardBody className="gap-6 p-6">
            {/* Removed store error display */}
            {/* Removed conditional rendering based on isSubmittedSuccessfully */}
            <>
              <div className="space-y-2 text-center mb-2">
                <p className="text-default-600">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
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

                  {/* Use local isLoading state */}
                  <Button
                    type="submit"
                    color="primary"
                    className="w-full"
                    isLoading={isLoading}
                    // No need for onClick wrapper if form onSubmit handles it
                  >
                    Send Reset Link
                  </Button>
                </form>
              </>
          </CardBody>
          <CardFooter className="justify-center px-6 py-4 border-t border-default-100">
            <p className="text-default-600 text-sm">
              Remember your password?{" "}
              <Link to="/auth/login" className="text-primary font-medium hover:underline">
                Back to Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
