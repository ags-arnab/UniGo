import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import ClubSidebar from '@/components/club/ClubSidebar'; // Import the new sidebar
// Optional: Import a shared header/navbar if applicable
// import SharedHeader from '@/components/SharedHeader';

// Loading fallback for lazy-loaded routes within the dashboard
const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-secondary"></div>
  </div>
);

const ClubDashboardLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-default-50 overflow-hidden">
      {/* Sidebar */}
      <ClubSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Optional: Shared Header */}
        {/* <SharedHeader /> */}

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-default-100 p-6">
          {/* Outlet renders the matched nested route component */}
          <Suspense fallback={<LoadingFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default ClubDashboardLayout;
