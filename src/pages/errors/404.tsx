import React from 'react';
import { useErrorController } from '@/controllers/errorController';
import { ErrorModels } from '@/models/error';
import DefaultLayout from '@/layouts/default';

/**
 * NotFound component for displaying 404 error page
 * Following the MVC pattern:
 * - Model: ErrorModels.NOT_FOUND from error model
 * - View: The JSX rendered in this component
 * - Controller: useErrorController with navigation methods
 */
const NotFound: React.FC = () => {
  const { goToHome, goBack } = useErrorController();
  const errorData = ErrorModels.NOT_FOUND;

  return (
    <DefaultLayout>
      <div className="p-8 flex flex-col items-center justify-center min-h-[70vh] text-center">
        <h1 className="text-5xl font-bold text-red-600 mb-4">{errorData.code}</h1>
        <h2 className="text-3xl font-semibold mb-6">{errorData.message}</h2>
        <p className="text-lg text-gray-600 max-w-md mb-8">
          {errorData.description}
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={goBack} 
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Go Back
          </button>
          <button 
            onClick={goToHome} 
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/80 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default NotFound;