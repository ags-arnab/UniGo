import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardBody, CardFooter } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
// Removed Modal imports
import { AuthController } from '@/controllers/authController';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth hook
import { AuthError } from '@supabase/supabase-js'; // Import AuthError
import { addToast } from "@heroui/react"; // Import addToast
import { AcademicCapIcon, EyeIcon, EyeSlashIcon, LockClosedIcon } from '@heroicons/react/24/outline'; // Removed CheckCircleIcon

const ResetPassword: React.FC = () => {
  // const location = useLocation(); // No longer needed to extract token
  const navigate = useNavigate();
  // Token is handled implicitly by Supabase session after clicking email link

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Use loading from context, manage errors locally
  const { loading: isLoading } = useAuth();
  // Removed localError state
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  // Removed isSuccessModalOpen state

  const togglePasswordVisibility = () => setIsPasswordVisible(!isPasswordVisible);
  const toggleConfirmPasswordVisibility = () => setIsConfirmPasswordVisible(!isConfirmPasswordVisible);

   // Removed useEffect for clearing localError

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Removed setLocalError(null);

    // Client-side validation using toasts
    if (password !== confirmPassword) {
      addToast({ title: 'Password Mismatch', description: 'Passwords do not match.', color: 'warning' });
      return;
    }
    if (password.length < 8) {
      addToast({ title: 'Password Too Short', description: 'Password must be at least 8 characters long.', color: 'warning' });
      return;
    }

    // isLoading comes from useAuth hook

    try {
      // Call controller with only the new password
      await AuthController.resetPassword(password);
      // Show success toast and navigate
      addToast({
        title: 'Password Reset Successful',
        description: 'You can now sign in with your new password.',
        color: 'success'
      });
      navigate('/auth/login'); // Navigate after successful reset
    } catch (err) {
      // Use addToast for errors
      console.error("Reset password page caught error:", err);
      let errorMessage = "An unexpected error occurred while resetting the password.";
      if (err instanceof AuthError || err instanceof Error) {
        errorMessage = err.message;
        // Handle specific errors if needed, e.g., expired token
        if (errorMessage.toLowerCase().includes('token has expired')) {
          errorMessage = 'Your password reset link has expired. Please request a new one.';
        }
      }
      addToast({
        title: 'Reset Failed',
        description: errorMessage,
        color: 'danger'
      });
    }
    // isLoading state change is handled by the AuthContext
  };

  // Removed redirectToLogin function

  // Password strength indicator
  const getPasswordStrength = (password: string): { strength: string; color: string } => {
    if (password.length === 0) return { strength: 'Empty', color: 'default' };
    if (password.length < 6) return { strength: 'Weak', color: 'danger' };
    if (password.length < 10) return { strength: 'Medium', color: 'warning' };
    return { strength: 'Strong', color: 'success' };
  };
  
  const passwordStrength = getPasswordStrength(password);

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
          <p className="text-default-600">Create a new password</p>
        </div>

        <Card className="shadow-lg border-none">
          <CardBody className="gap-6 p-6">
            {/* Removed local error display div */}

            <div className="space-y-2 text-center mb-2">
              <p className="text-default-600">
                Enter your new password below. Make sure it's secure and you'll remember it.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-default-700">
                  New Password
                </label>
                <Input
                  id="password"
                  type={isPasswordVisible ? "text" : "password"}
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  startContent={<LockClosedIcon className="w-4 h-4 text-default-400" />}
                  endContent={
                    <button type="button" onClick={togglePasswordVisibility} className="focus:outline-none">
                      {isPasswordVisible ? (
                        <EyeSlashIcon className="w-4 h-4 text-default-400" />
                      ) : (
                        <EyeIcon className="w-4 h-4 text-default-400" />
                      )}
                    </button>
                  }
                  isRequired
                />
                
                {/* Password strength indicator */}
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-default-500">Password strength:</span>
                      <span className={`text-xs text-${passwordStrength.color}`}>{passwordStrength.strength}</span>
                    </div>
                    <div className="w-full bg-default-200 rounded-full h-1">
                      <div 
                        className={`h-1 rounded-full bg-${passwordStrength.color}`} 
                        style={{ width: password.length > 10 ? '100%' : `${(password.length / 10) * 100}%` }}
                      ></div>
                    </div>
                    <div className="mt-2 text-xs text-default-500">
                      Use at least 8 characters, including uppercase, lowercase, numbers, and special characters.
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-default-700">
                  Confirm New Password
                </label>
                <Input
                  id="confirmPassword"
                  type={isConfirmPasswordVisible ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  startContent={<LockClosedIcon className="w-4 h-4 text-default-400" />}
                  endContent={
                    <button type="button" onClick={toggleConfirmPasswordVisibility} className="focus:outline-none">
                      {isConfirmPasswordVisible ? (
                        <EyeSlashIcon className="w-4 h-4 text-default-400" />
                      ) : (
                        <EyeIcon className="w-4 h-4 text-default-400" />
                      )}
                    </button>
                  }
                  isRequired
                  // Removed isInvalid prop
                />
              </div>

              {/* Use isLoading from context */}
              <Button
                type="submit"
                color="primary"
                className="w-full font-medium mt-4"
                isLoading={isLoading}
                // Disable button only if loading or fields empty
                isDisabled={isLoading || !password || !confirmPassword}
              >
                Set New Password
              </Button>
            </form>
          </CardBody>
          <CardFooter className="justify-center px-6 py-4 border-t border-default-100">
            <p className="text-default-600 text-sm">
              <Link to="/auth/login" className="text-primary font-medium hover:underline">
                Back to Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>

      {/* Removed Success Modal */}
    </div>
  );
};

export default ResetPassword;
