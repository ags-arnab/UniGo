import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
      <p className="mt-4 mb-8">The page you are looking for does not exist.</p>
      <Link to="/" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/80">
        Return to Home
      </Link>
    </div>
  );
};

export default NotFound;