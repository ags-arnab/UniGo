// filepath: /Users/arnab/Documents/boopityboop/UniGo/src/components/ui/ClubsSlider.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClubsController, ClubProfile } from '@/controllers/clubsController';
import { Card, CardFooter, Avatar } from "@heroui/react"; // Import HeroUI components
import { AcademicCapIcon } from '@heroicons/react/24/outline'; // Import icon

// Default placeholder image if club has no banner
const DEFAULT_BANNER = '/images/default-club-banner.jpg';
// Default placeholder for logo
const DEFAULT_LOGO = '/images/default-club-logo.png';

const ClubsSlider: React.FC = () => {
  const [clubs, setClubs] = useState<ClubProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadClubs = async () => {
      try {
        setLoading(true);
        const clubsData = await ClubsController.getAllClubs();
        setClubs(clubsData);
      } catch (err) {
        console.error('Error loading clubs:', err);
        setError('Failed to load clubs. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadClubs();
  }, []);

  const handleClubClick = (clubId: string) => {
    // Navigate to the student-specific club events page (Corrected Path)
    navigate(`/student/events/clubs/${clubId}/events`); 
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-gray-200 h-12 w-12"></div>
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No clubs available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <h2 className="text-2xl font-bold mb-6 text-center">University Clubs</h2>
      
      {/* Added padding to the container to make space for buttons */}
      <div className="relative px-10"> 
        {/* Left scroll button - Adjusted positioning */}
        <button 
          className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white/80 rounded-full p-2 shadow z-30 hover:bg-white transition" // Increased z-index
          onClick={() => {
            const container = document.getElementById('clubs-slider');
            if (container) {
              container.scrollBy({ left: -300, behavior: 'smooth' });
            }
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        
        {/* Clubs slider */}
        <div 
          id="clubs-slider"
          className="flex overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {clubs.map((club) => (
            // Use HeroUI Card component
            <Card 
              key={club.id}
              isPressable 
              isHoverable
              className="min-w-[280px] max-w-[280px] h-48 mx-2 flex-shrink-0 snap-start relative overflow-hidden group" // Removed bg styles from Card
              // Removed style prop from Card
              onPress={() => handleClubClick(club.id)}
            >
              {/* Re-added Banner as Background Div */}
              <div 
                className="absolute inset-0 bg-cover bg-center z-0 transition-transform duration-300 group-hover:scale-110" // Scale banner on hover
                style={{ 
                  backgroundImage: `url(${club.banner_url || DEFAULT_BANNER})`,
                }}
              ></div>
              
              {/* Gradient Overlay - Ensure it covers the card */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent z-10 transition-opacity duration-300 group-hover:opacity-90"></div>

              {/* Content positioned over gradient */}
              <CardFooter className="absolute bottom-0 left-0 right-0 z-20 p-4 flex items-end justify-between">
                 <div className="flex items-center gap-3">
                    {/* Club Logo */}
                    <Avatar 
                      src={club.avatar_url || DEFAULT_LOGO} 
                      className="w-10 h-10 border-2 border-white" 
                      fallback={<Avatar icon={<AcademicCapIcon/>} className="w-10 h-10 text-default-400 bg-default-100"/>} // Fallback icon
                    />
                    {/* Club Name */}
                    <h3 className="font-semibold text-white text-lg truncate">{club.full_name}</h3>
                 </div>
                 {/* Optional: Add a small "View" indicator if needed */}
                 {/* <span className="text-xs text-white/80">View</span> */}
              </CardFooter>
            </Card>
          ))}
        </div>
        
        {/* Right scroll button - Adjusted positioning */}
        <button 
          className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white/80 rounded-full p-2 shadow z-30 hover:bg-white transition" // Increased z-index
          onClick={() => {
            const container = document.getElementById('clubs-slider');
            if (container) {
              container.scrollBy({ left: 300, behavior: 'smooth' });
            }
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
      
      {/* CSS for hiding scrollbar */}
    </div>
  );
};

// Add CSS to hide scrollbar
const hideScrollbarCSS = `
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
`;

// Inject the CSS into the document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = hideScrollbarCSS;
  document.head.appendChild(style);
}

export default ClubsSlider;
