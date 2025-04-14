import React, { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Chip } from "@heroui/chip"; // Changed Badge to Chip
import { Button } from "@heroui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@heroui/card";
import {
  UserPlusIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ChevronDoubleRightIcon,
  StarIcon,
  BoltIcon,
  CheckBadgeIcon,
  FireIcon,
  ArrowPathIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const steps = [
  {
    title: "Create Your Account",
    description: "Sign up as a student, vendor, or apply for administrator access to get started.",
    icon: <UserPlusIcon className="w-6 h-6" />,
    color: "primary",
    stepIcon: <UserPlusIcon className="w-6 h-6" />
  },
  {
    title: "Complete Your Profile",
    description: "Add your preferences, payment information, and customize your account settings.",
    icon: <UserCircleIcon className="w-6 h-6" />,
    color: "secondary",
    stepIcon: <UserCircleIcon className="w-6 h-6" />
  },
  {
    title: "Choose Your Service",
    description: "Access cafeteria ordering, events registration, or marketplace depending on your needs.",
    icon: <MagnifyingGlassIcon className="w-6 h-6" />,
    color: "success",
    stepIcon: <MagnifyingGlassIcon className="w-6 h-6" />
  },
  {
    title: "Place Orders or Register",
    description: "Order meals, register for events, or purchase marketplace items seamlessly.",
    icon: <DocumentTextIcon className="w-6 h-6" />,
    color: "warning",
    stepIcon: <DocumentTextIcon className="w-6 h-6" />
  },
  {
    title: "Enjoy & Manage",
    description: "Enjoy your services, track status, and manage your payments in one platform.",
    icon: <CheckCircleIcon className="w-6 h-6" />,
    color: "primary",
    stepIcon: <ShieldCheckIcon className="w-6 h-6" />
  }
];

const HowItWorks: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  const handleStepClick = (index: number) => {
    setActiveStep(index);
  };

  const handleNextStep = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  };

  return (
    // Changed bg-background to bg-default-50 and added overlay elements like Testimonials
    <section className="pt-16 relative overflow-hidden bg-default-50" id="how-it-works">
      {/* Added Hero background elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Soft gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-tl from-secondary/5 to-transparent"></div>
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 bg-dot-pattern opacity-[0.04]"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          {/* Replaced Badge with Chip */}
          <Chip color="primary" variant="flat" className="mb-3">Simple Process</Chip> 
          <h2 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-2">
            <StarIcon className="w-6 h-6 text-primary" />
            How UniGo Works
          </h2>
          <p className="text-default-600 text-lg max-w-2xl mx-auto">
            Getting started is easy — follow these simple steps to access all university services
          </p>
        </div>

        {/* Improved Step Progress Indicator */}
        <div className="max-w-4xl mx-auto mb-14 px-4">
          {/* Container for positioning line and circles */}
          <div className="relative h-14"> {/* Fixed height for alignment reference */}

            {/* Line (absolute, centered vertically within h-14 parent) */}
            <div className="absolute h-0.5 bg-default-200 left-7 right-7 top-1/2 -translate-y-1/2 z-0">
              {/* Progress Fill */}
              <div className="h-full bg-gradient-to-r from-primary via-secondary to-primary transition-all duration-500" style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}></div>
            </div>

            {/* Circles Container (relative, on top, flex, centered vertically) */}
            <div className="relative z-10 flex justify-between w-full h-full items-center">
              {steps.map((step, index) => (
                // Map directly to the button, remove wrapping div
                <motion.button
                  key={`circle-${index}`} // Key is now on the button
                  className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-all border-2 shadow-md ${
                    index <= activeStep
                      ? index === activeStep
                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                        : 'bg-white text-primary border-primary'
                      : 'bg-white text-default-500 border-default-200'
                  }`}
                  onClick={() => handleStepClick(index)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {index < activeStep ? (
                    <CheckCircleIcon className="w-6 h-6" />
                  ) : index === activeStep ? (
                    <ArrowPathIcon className="w-6 h-6 animate-spin-slow" />
                  ) : (
                    step.stepIcon
                  )}
                </motion.button>
              ))}
            </div>
          </div> {/* End of relative h-14 container */}

          {/* Titles Container (Separate, below circles) */}
          <div className="flex justify-between w-full mt-3"> {/* Removed padding */}
            {steps.map((step, index) => (
              <span
                key={`title-${index}`}
                className={`text-sm font-medium text-center ${ // Removed max-w-[100px]
                  index === activeStep ? 'text-primary' : 'text-default-600'
                } hidden md:block`}
              >
                {step.title}
              </span>
            ))}
          </div>
        </div>
        
        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`step-content-${activeStep}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="max-w-3xl mx-auto"
          >
            <Card className="shadow-lg bg-background border border-default-200">
              <CardHeader className="flex gap-4 px-6 pt-6">
                <div className={`w-14 h-14 rounded-xl bg-${steps[activeStep].color}/10 flex items-center justify-center`}>
                  {steps[activeStep].icon}
                </div>
                <div>
                  <p className="text-sm text-default-500">Step {activeStep + 1}</p>
                  <h3 className="text-2xl font-bold">{steps[activeStep].title}</h3>
                </div>
              </CardHeader>
              
              <CardBody className="px-6 py-6">
                <p className="text-default-600 text-lg mb-6">
                  {steps[activeStep].description}
                </p>
                
                {/* Feature List */}
                <div className="rounded-xl bg-default-50 p-5 border border-default-200">
                  <h4 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <BoltIcon className="w-5 h-5 text-primary" />
                    What you'll do in this step:
                  </h4>
                  <ul className="space-y-3">
                    {[1, 2, 3].map(item => (
                      <motion.li 
                        key={item} 
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-default-100 cursor-pointer transition-all"
                        whileHover={{ x: 5 }}
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <CheckBadgeIcon className="w-4 h-4" />
                        </div>
                        <span className="text-default-600">
                          {activeStep === 0 && `Create a secure ${item === 1 ? 'username' : item === 2 ? 'password' : 'profile'}`}
                          {activeStep === 1 && `Add your ${item === 1 ? 'personal info' : item === 2 ? 'payment methods' : 'preferences'}`}
                          {activeStep === 2 && `Browse ${item === 1 ? 'cafeteria options' : item === 2 ? 'upcoming events' : 'marketplace items'}`}
                          {activeStep === 3 && `Select ${item === 1 ? 'items' : item === 2 ? 'payment method' : 'delivery options'}`}
                          {activeStep === 4 && `Track ${item === 1 ? 'orders' : item === 2 ? 'events' : 'account activity'}`}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
                
                {/* Tip for current step */}
                <div className="mt-6 p-4 rounded-lg bg-default-100 flex items-start gap-3">
                  <FireIcon className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium mb-1">Pro Tip</p>
                    <p className="text-sm text-default-600">
                      {activeStep === 0 && "Use a strong password with a mix of letters, numbers, and special characters for better security."}
                      {activeStep === 1 && "Adding your dietary preferences helps us customize your cafeteria experience."}
                      {activeStep === 2 && "Students who browse all service options save 15% more on average!"}
                      {activeStep === 3 && "You can place orders up to 30 minutes before your desired pickup time."}
                      {activeStep === 4 && "Enable notifications to stay updated on your order status and upcoming events."}
                    </p>
                  </div>
                </div>
              </CardBody>

              <CardFooter className="px-6 pb-6 pt-0 flex justify-between">
                <Button 
                  variant="flat"
                  color="default"
                  disabled={activeStep === 0}
                  onClick={handlePrevStep}
                  startContent={<ArrowLeftIcon className="w-4 h-4" />}
                >
                  Previous
                </Button>
                
                <Button 
                  color="primary"
                  disabled={activeStep === steps.length - 1}
                  onClick={handleNextStep}
                  endContent={<ArrowRightIcon className="w-4 h-4" />}
                >
                  Next Step
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </AnimatePresence>
        
        {/* Next step preview */}
        {activeStep < steps.length - 1 && (
          <motion.div 
            className="mt-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-sm text-default-500 flex items-center justify-center gap-2">
              Up next: 
              <span className="font-medium text-primary flex items-center gap-1">
                {steps[activeStep + 1].title}
                <ChevronDoubleRightIcon className="w-3 h-3" />
              </span>
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default HowItWorks;
