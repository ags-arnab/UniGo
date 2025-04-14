import React from 'react';
import Hero from '@/components/ui/landing/Hero';
import Features from '@/components/ui/landing/Features';
import UserRoles from '@/components/ui/landing/UserRoles';
import HowItWorks from '@/components/ui/landing/HowItWorks';
import FAQ from '@/components/ui/landing/FAQ';
import CTA from '@/components/ui/landing/CTA';

const Home: React.FC = () => {
  return (
    <div className="overflow-hidden bg-default-50">
      {/* Hero Section */}
      <Hero />
      
      {/* Features Section */}
      <Features />
      
      {/* User Roles Section */}
      <UserRoles />
      
      {/* How It Works Section */}
      <HowItWorks />
      
      {/* FAQ Section */}
      <FAQ />
      
      {/* Call to Action Section */}
      <CTA />
    </div>
  );
};

export default Home;
