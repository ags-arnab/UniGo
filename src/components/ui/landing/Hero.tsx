import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, HTMLMotionProps, PanInfo } from "framer-motion";
import { Button } from "@heroui/button";
import { Link } from '@heroui/link';
import { Avatar } from "@heroui/avatar";
import { Badge } from "@heroui/badge";
import { Card } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Tooltip } from "@heroui/tooltip";
import { 
  ShoppingBagIcon,
  BellIcon,
  CalendarIcon,
  Bars3Icon,
  UsersIcon,
  BuildingStorefrontIcon,
  ChevronDoubleDownIcon,
  CreditCardIcon
} from '@heroicons/react/24/solid';

// Add type for motion components
type MotionDivProps = HTMLMotionProps<"div">;

const Hero: React.FC = () => {
  const { scrollY } = useScroll();
  const [activePreview, setActivePreview] = useState<string>("events"); // Start with middle card
  
  // Clean, minimal parallax effect values
  const titleY = useTransform(scrollY, [0, 300], [0, -30]);
  const opacityTitle = useTransform(scrollY, [0, 300], [1, 0.7]);
  const imageScale = useTransform(scrollY, [0, 300], [1, 1.05]);

  // Platform features with tooltips
  const platformFeatures = [
    { 
      key: "cafeteria", 
      icon: <BuildingStorefrontIcon className="w-5 h-5" />, 
      label: "Cafeteria", 
      tooltip: "Order meals from campus cafeterias",
      color: "primary" as const
    },
    { 
      key: "events", 
      icon: <CalendarIcon className="w-5 h-5" />, 
      label: "Events", 
      tooltip: "Browse and register for university events",
      color: "secondary" as const
    },
    { 
      key: "marketplace", 
      icon: <ShoppingBagIcon className="w-5 h-5" />, 
      label: "Marketplace", 
      tooltip: "Buy and sell university items",
      color: "success" as const
    },
    { 
      key: "payments", 
      icon: <CreditCardIcon className="w-5 h-5" />, 
      label: "Payments", 
      tooltip: "Process secure payments",
      color: "warning" as const
    }
  ] as const;

  const handlePreviewClick = (id: string) => {
    setActivePreview(id);
  };

  const previewCards = [
    {
      id: "main",
      title: "Dashboard",
      scale: 1,
      rotate: -35,
      translateX: -200,
      translateY: 0,
      zIndex: activePreview === "main" ? 30 : 10,
      color: "primary",
      position: "left"
    },
    {
      id: "events",
      title: "Events",
      scale: 1,
      rotate: 0,
      translateX: 0,
      translateY: 0,
      zIndex: activePreview === "events" ? 30 : 20,
      color: "secondary",
      position: "center"
    },
    {
      id: "marketplace",
      title: "Marketplace",
      scale: 1,
      rotate: 35,
      translateX: 200,
      translateY: 0,
      zIndex: activePreview === "marketplace" ? 30 : 0,
      color: "success",
      position: "right"
    }
  ] as const;

  const handleDragEnd = (_: any, info: PanInfo) => {
    const swipeThreshold = 30; // Lower threshold for easier card switching
    const cards = ["main", "events", "marketplace"];
    const currentIndex = cards.indexOf(activePreview);
    
    if (Math.abs(info.offset.x) > swipeThreshold) {
      if (info.offset.x > 0) {
        // Swipe right - go to previous or last card (circular)
        const newIndex = currentIndex > 0 ? currentIndex - 1 : cards.length - 1;
        setActivePreview(cards[newIndex]);
      } else if (info.offset.x < 0) {
        // Swipe left - go to next or first card (circular)
        const newIndex = currentIndex < cards.length - 1 ? currentIndex + 1 : 0;
        setActivePreview(cards[newIndex]);
      }
    } else if (Math.abs(info.velocity.x) > 300) {
      // Also check velocity for quick swipes with small distance
      if (info.velocity.x > 0) {
        // Swipe right - go to previous or last card (circular)
        const newIndex = currentIndex > 0 ? currentIndex - 1 : cards.length - 1;
        setActivePreview(cards[newIndex]);
      } else if (info.velocity.x < 0) {
        // Swipe left - go to next or first card (circular)
        const newIndex = currentIndex < cards.length - 1 ? currentIndex + 1 : 0;
        setActivePreview(cards[newIndex]);
      }
    }
  };

  const calculateCardPosition = (cardId: string) => {
    const cards = ["main", "events", "marketplace"];
    const activeIndex = cards.indexOf(activePreview);
    const cardIndex = cards.indexOf(cardId);
    
    // Calculate relative position (-1 for left, 0 for center, 1 for right)
    let relativePosition = cardIndex - activeIndex;
    
    // Adjust for circular movement
    if (relativePosition === 2) relativePosition = -1;
    if (relativePosition === -2) relativePosition = 1;

    // Different styling for mobile and desktop
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    
    // Base values for positioning
    const baseSpacing = isMobile ? 
      Math.min(window.innerWidth * 0.7, 280) : // Mobile spacing
      Math.min(window.innerWidth * 0.15, 200);  // Desktop spacing

    return {
      x: relativePosition * baseSpacing,
      rotate: relativePosition * (isMobile ? 8 : 10),
      scale: isMobile ? 
        (relativePosition === 0 ? 1 : 0.9) : // Less scale difference on mobile
        (relativePosition === 0 ? 1.1 : 0.85),
      opacity: 1,
      zIndex: 30 - Math.abs(relativePosition) * 5, // Smoother z-index transitions
    };
  };

  // Define notification cards based on active preview
  const getNotificationCards = (activePreview: string) => {
    const notificationSets = {
      main: [
        {
          id: "cafeteria-order",
          title: "Lunch Order",
          subtitle: "Ready for pickup",
          color: "success",
          icon: <BuildingStorefrontIcon className="w-3 h-3" />
        },
        {
          id: "new-message",
          title: "New Message",
          subtitle: "From Admin",
          color: "primary",
          icon: <BellIcon className="w-3 h-3" />
        },
        {
          id: "payment-due",
          title: "Payment Due",
          subtitle: "Course Materials",
          color: "warning",
          icon: <ShoppingBagIcon className="w-3 h-3" />
        }
      ],
      events: [
        {
          id: "event-reminder",
          title: "Event Today",
          subtitle: "Tech Workshop",
          color: "secondary",
          icon: <CalendarIcon className="w-3 h-3" />
        },
        {
          id: "new-event",
          title: "New Event",
          subtitle: "Career Fair",
          color: "primary",
          icon: <CalendarIcon className="w-3 h-3" />
        },
        {
          id: "event-update",
          title: "Time Changed",
          subtitle: "Coding Contest",
          color: "warning",
          icon: <CalendarIcon className="w-3 h-3" />
        }
      ],
      marketplace: [
        {
          id: "price-drop",
          title: "Price Drop",
          subtitle: "Study Materials",
          color: "success",
          icon: <ShoppingBagIcon className="w-3 h-3" />
        },
        {
          id: "new-listing",
          title: "New Listing",
          subtitle: "Calculator",
          color: "primary",
          icon: <ShoppingBagIcon className="w-3 h-3" />
        },
        {
          id: "order-shipped",
          title: "Order Shipped",
          subtitle: "Textbooks",
          color: "warning",
          icon: <ShoppingBagIcon className="w-3 h-3" />
        }
      ]
    };

    return notificationSets[activePreview as keyof typeof notificationSets] || notificationSets.main;
  };

  // Update generateNotificationPosition to create a responsive horizontal row
  const generateNotificationPosition = (index: number) => {
    // Calculate a responsive horizontal gap based on viewport width
    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 640;
    
    // Smaller gap for mobile to prevent overlap
    const horizontalGap = isSmallScreen ? 
      Math.min(100, window.innerWidth * 0.25) : // Mobile: smaller gap
      Math.min(150, window.innerWidth * 0.15); // Desktop: original gap
    
    const offsetX = (index - 1) * horizontalGap; // Center the middle card (index 1)
    
    return {
      x: offsetX,
      y: -120 // Keep the same vertical position
    };
  };

  const [notificationState, setNotificationState] = useState(() => ({
    positions: [0, 1, 2].map((index) => generateNotificationPosition(index)),
    hasAnimated: false
  }));

  // Update positions when active preview changes or on window resize
  useEffect(() => {
    const updatePositions = () => {
      setNotificationState(prev => ({
        positions: [0, 1, 2].map((index) => generateNotificationPosition(index)),
        hasAnimated: prev.hasAnimated
      }));
    };

    // Update positions immediately
    updatePositions();
    
    // Add resize event listener to handle responsive layout changes
    window.addEventListener('resize', updatePositions);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', updatePositions);
    };
  }, [activePreview]);

  // Mark animations as completed after initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      setNotificationState(prev => ({
        ...prev,
        hasAnimated: true
      }));
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Add counter animation state
  const [count, setCount] = useState({ students: 0, vendors: 0, universities: 0 });
  
  useEffect(() => {
    const duration = 2000;
    const steps = 50;
    const interval = duration / steps;
    
    const animate = (_: number, end: number, setter: (value: number) => void) => {
      let current = 0;
      const increment = end / steps;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
          setter(end);
          clearInterval(timer);
        } else {
          setter(Math.floor(current));
        }
      }, interval);
    };

    animate(0, 12000, (value) => setCount(prev => ({ ...prev, students: value })));
    animate(0, 320, (value) => setCount(prev => ({ ...prev, vendors: value })));
    animate(0, 24, (value) => setCount(prev => ({ ...prev, universities: value })));
  }, []);

  return (
    <section className="relative overflow-hidden bg-default-50 min-h-screen flex items-center justify-center py-8 sm:py-16">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Soft gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-tl from-secondary/5 to-transparent"></div>
        
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 bg-dot-pattern opacity-[0.04]"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10 flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-[4vh] lg:gap-[6vw] w-full">
          {/* Left side content */}
          <motion.div 
            className="flex-1 text-center lg:text-left mb-[4vh] lg:mb-0"
            style={{ 
              y: titleY,
              opacity: opacityTitle
            }}
          >
            {/* Enhanced banner with Chip component */}
            <div className="mb-6 flex justify-center lg:justify-start">
              <div className="flex items-center gap-3 bg-secondary-500/10 px-5 py-3 rounded-full shadow-md hover:shadow-lg transition-all duration-300">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary-500"></span>
                </div>
                <Chip
                  color="secondary"
                  variant="flat"
                  className="text-sm font-bold tracking-wider"
                >
                  Modern University Platform
                </Chip>
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary-500"></span>
                </div>
              </div>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Uni</span>
              <span>Go</span>
              <span className="block text-3xl md:text-4xl font-bold mt-4">
                Your Complete University Platform
              </span>
            </h1>
            
            {/* Description with tooltips for key features */}
            <p className="text-lg text-default-600 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Seamlessly connecting 
              <Tooltip content="Students can order meals, attend events, and shop in the marketplace">
                <span className="text-primary font-medium mx-1 cursor-help border-b border-dashed border-primary">students</span>
              </Tooltip>
              , 
              <Tooltip content="Vendors can create stores, manage orders, and track performance">
                <span className="text-secondary font-medium mx-1 cursor-help border-b border-dashed border-secondary">vendors</span>
              </Tooltip>
              , and 
              <Tooltip content="Administrators can oversee operations and manage users">
                <span className="text-success font-medium mx-1 cursor-help border-b border-dashed border-success">administrators</span>
              </Tooltip>
              in one unified platform.
            </p>
            
            {/* Action buttons with proper styling */}
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <Button 
                as={Link} 
                href="/auth/register" 
                color="primary" 
                size="lg"
                className="px-8 font-medium"
                startContent={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z" clipRule="evenodd" />
                  </svg>
                }
              >
                Get Started
              </Button>
              
              <Button 
                as={Link} 
                href="/docs" 
                variant="bordered" 
                size="lg"
                className="px-8 font-medium"
                endContent={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M12.97 3.97a.75.75 0 011.06 0l7.5 7.5a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 11-1.06-1.06l6.22-6.22H3a.75.75 0 010-1.5h16.19l-6.22-6.22a.75.75 0 010-1.06z" clipRule="evenodd" />
                  </svg>
                }
              >
                Learn More
              </Button>
            </div>
            
            {/* Platform features with tooltips and better icons */}
            <div className="mt-12 flex flex-wrap gap-3 justify-center lg:justify-start">
              {platformFeatures.map((feature) => (
                <Tooltip key={feature.key} content={feature.tooltip} className="max-w-xs">
                  <Chip 
                    className="px-3 py-2 cursor-help" 
                    color={feature.color as any}
                    variant="flat"
                    startContent={feature.icon}
                  >
                    {feature.label}
                  </Chip>
                </Tooltip>
              ))}
            </div>
            
            {/* User stats */}
            <div className="mt-12 grid grid-cols-3 gap-2 w-full max-w-md mx-auto lg:mx-0">
              <div className="bg-content1/30 backdrop-blur-sm rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-primary">
                  {count.students >= 1000 ? `${(count.students / 1000).toFixed(0)}K+` : count.students}
                </p>
                <p className="text-xs text-default-500 mt-1">Active Students</p>
              </div>
              <div className="bg-content1/30 backdrop-blur-sm rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-secondary">{count.vendors}+</p>
                <p className="text-xs text-default-500 mt-1">Campus Vendors</p>
              </div>
              <div className="bg-content1/30 backdrop-blur-sm rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-success">{count.universities}+</p>
                <p className="text-xs text-default-500 mt-1">Universities</p>
              </div>
            </div>
          </motion.div>

          {/* Right side: Preview cards */}
          <motion.div className="flex-1 mt-[3vh] lg:mt-0 w-full overflow-visible" style={{ scale: imageScale }}>
            <div className="relative w-[min(100%,90vw)] lg:w-full h-[clamp(250px,60vh,600px)] mx-auto overflow-visible">
              {/* Notification Cards Container */}
              <div className="absolute w-full flex justify-center z-50 -top-[min(4vh,2rem)] sm:-top-[min(6vh,3rem)] left-0 right-0">
                <div className="relative w-[min(460px,90vw)] flex justify-center items-center">
                  <AnimatePresence mode="sync">
                    {getNotificationCards(activePreview).map((notification, index) => {
                      // Calculate responsive horizontal position for notification cards
                      const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 640;
                      const gap = isSmallScreen ? 
                        Math.min(100, window.innerWidth * 0.25) : // Mobile: smaller gap
                        Math.min(150, window.innerWidth * 0.15);  // Desktop: original gap
                      
                      const horizontalOffset = (index - 1) * gap;
                      
                      return (
                        <motion.div
                          key={`${notification.id}-${activePreview}`}
                          className="absolute shadow-lg rounded-lg bg-background border border-default-200 p-1.5"
                          style={{
                            width: isSmallScreen ? 
                              "clamp(80px, 25vw, 120px)" :  // Smaller width on mobile
                              "clamp(120px, 30vw, 140px)",  // Original width on desktop
                            transform: `translateX(${horizontalOffset}px)`,
                            zIndex: 50 - Math.abs(index - 1)
                          }}
                          initial={!notificationState.hasAnimated ? { 
                            y: -20,
                            opacity: 0,
                            scale: 0.5
                          } : { 
                            opacity: 1,
                            scale: 0.95
                          }}
                          animate={{ 
                            y: 0,
                            opacity: 1,
                            scale: 0.95,
                            x: horizontalOffset,
                            transition: {
                              type: "spring",
                              stiffness: 400,
                              damping: 30
                            }
                          }}
                          exit={{
                            opacity: notificationState.hasAnimated ? 1 : 0,
                            scale: notificationState.hasAnimated ? 1 : 0.5,
                            transition: { duration: 0.2 }
                          }}
                        >
                          <div className="flex gap-1.5">
                            <div 
                              className={`w-5 h-5 ${isSmallScreen ? 'w-4 h-4' : 'w-5 h-5'} rounded-full bg-${notification.color}/20 flex items-center justify-center flex-shrink-0 text-${notification.color}`}
                            >
                              {notification.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`${isSmallScreen ? 'text-[9px]' : 'text-[10px]'} font-medium truncate`}>{notification.title}</p>
                              <p className={`${isSmallScreen ? 'text-[9px]' : 'text-[10px]'} text-default-400 truncate`}>{notification.subtitle}</p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
              
              {/* Mobile and Desktop Views */}
              <div className={`relative w-full h-full flex items-center justify-center perspective-1000 overflow-visible ${
                typeof window !== 'undefined' && window.innerWidth < 640 ? 'mobile-cards' : ''
              }`}>
                {/* Preview Cards (Removed AnimatePresence wrapper) */}
                {previewCards.map((preview) => {
                    const position = calculateCardPosition(preview.id);
                    
                    return (
                      <motion.div
                        key={preview.id}
                        className="absolute w-[clamp(250px,80vw,320px)] sm:w-[clamp(250px,70vw,320px)] cursor-pointer touch-pan-x"
                        style={{ 
                          zIndex: position.zIndex,
                          transformStyle: 'preserve-3d',
                          pointerEvents: 'auto', // Allow all cards to be clickable, not just active one
                          touchAction: 'pan-x',
                          willChange: 'transform',
                        }}
                        initial={{ y: 0 }} // Explicitly set initial y
                        // Define animation targets - Apply bobbing to all cards
                        animate={{
                          x: position.x,
                          rotate: position.rotate,
                          scale: position.scale,
                          opacity: position.opacity,
                          y: [0, -4, 0], // Apply bobbing animation to ALL cards
                        }}
                        // Define transitions: default spring for layout, specific loop for y
                        transition={{
                          // Default spring for layout changes (x, rotate, scale, opacity)
                          type: "spring",
                          stiffness: 350, // Original stiffness
                          damping: 25,   // Original damping
                          mass: 0.8,
                          // Specific loop for y-axis bobbing animation
                          y: {
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            repeatType: "loop"
                          }
                        }}
                        drag={activePreview === preview.id ? "x" : false}
                        dragConstraints={{ left: -100, right: 100 }}
                        dragElastic={0.1}
                        dragMomentum={true}
                        dragTransition={{
                          power: 0.1,
                          timeConstant: 200,
                          modifyTarget: (target) => Math.round(target / 50) * 50
                        }}
                        onDragEnd={handleDragEnd}
                        onClick={() => handlePreviewClick(preview.id)}
                        // Removed whileHover effect
                      >
                        {/* Card content */}
                        <div className={`relative rounded-xl overflow-hidden border border-default-200 shadow-xl bg-background ${
                          activePreview === preview.id ? 'shadow-2xl ring-2 ring-primary/20' : ''
                        }`}
                          style={{
                            height: 'clamp(250px, 60vh, 300px)',
                            width: '100%'
                          }}>
                          {/* Card header with color based on preview type */}
                          <div className={`bg-${preview.color} px-3 py-2 flex items-center justify-between`}>
                            <div className="flex items-center gap-1.5">
                              <div className="bg-white w-5 h-5 rounded-full flex items-center justify-center">
                                <span className="text-primary font-bold text-xs">U</span>
                              </div>
                              <span className="text-white font-semibold text-xs">{preview.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Avatar size="sm" className="w-4 h-4" />
                              <Bars3Icon className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          
                          {/* Card content based on preview type */}
                          {preview.id === "main" && (
                            <div className="p-2">
                              {/* Top stats */}
                              <div className="grid grid-cols-2 gap-1.5 mb-3">
                                <Card className="p-2 bg-primary-50">
                                  <div className="flex items-center gap-1.5">
                                    <div className="p-1.5 rounded-full bg-primary/10">
                                      <UsersIcon className="w-3 h-3 text-primary" />
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-default-600">Users</p>
                                      <p className="text-sm font-bold text-primary">2.4k</p>
                                    </div>
                                  </div>
                                </Card>
                                <Card className="p-2 bg-secondary-50">
                                  <div className="flex items-center gap-1.5">
                                    <div className="p-1.5 rounded-full bg-secondary/10">
                                      <CalendarIcon className="w-3 h-3 text-secondary" />
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-default-600">Events</p>
                                      <p className="text-sm font-bold text-secondary">12</p>
                                    </div>
                                  </div>
                                </Card>
                              </div>

                              {/* Quick Actions */}
                              <div className="mb-3">
                                <h3 className="text-xs font-semibold mb-1.5">Quick Actions</h3>
                                <div className="grid grid-cols-3 gap-1.5">
                                  <Button size="sm" variant="flat" color="primary" className="h-12 flex-col gap-0.5 p-1">
                                    <CalendarIcon className="w-4 h-4" />
                                    <span className="text-[10px]">Events</span>
                                  </Button>
                                  <Button size="sm" variant="flat" color="secondary" className="h-12 flex-col gap-0.5 p-1">
                                    <ShoppingBagIcon className="w-4 h-4" />
                                    <span className="text-[10px]">Market</span>
                                  </Button>
                                  <Button size="sm" variant="flat" color="warning" className="h-12 flex-col gap-0.5 p-1">
                                    <BellIcon className="w-4 h-4" />
                                    <span className="text-[10px]">Alerts</span>
                                  </Button>
                                </div>
                              </div>

                              {/* Recent Activity */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <h3 className="text-xs font-semibold">Recent</h3>
                                  <Button size="sm" variant="light" className="text-[10px] h-6 min-w-0 px-2">View All</Button>
                                </div>
                                <Card className="p-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                      <BuildingStorefrontIcon className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium">New Order</p>
                                        <Badge color="success" variant="flat" className="text-[10px] px-1">Placed</Badge>
                                      </div>
                                      <p className="text-[10px] text-default-400">Cafeteria • Now</p>
                                    </div>
                                  </div>
                                </Card>
                              </div>
                            </div>
                          )}
                          
                          {preview.id === "events" && (
                            <div className="p-2">
                              <div className="space-y-2">
                                <Card className="p-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                                      <CalendarIcon className="w-5 h-5 text-secondary" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-xs font-medium">Tech Workshop</p>
                                      <p className="text-[10px] text-default-400">Tomorrow, 2 PM</p>
                                      <div className="flex items-center gap-1 mt-1">
                                        <Badge color="secondary" variant="flat" className="text-[8px]">12 Spots Left</Badge>
                                        <Badge color="success" variant="flat" className="text-[8px]">Free</Badge>
                                      </div>
                                    </div>
                                    <Button size="sm" variant="flat" color="secondary" className="text-[10px] h-6">
                                      Join
                                    </Button>
                                  </div>
                                </Card>

                                <Card className="p-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                                      <CalendarIcon className="w-5 h-5 text-warning" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-xs font-medium">Coding Competition</p>
                                      <p className="text-[10px] text-default-400">This Weekend</p>
                                      <div className="flex items-center gap-1 mt-1">
                                        <Badge color="warning" variant="flat" className="text-[8px]">5 Teams</Badge>
                                        <Badge color="primary" variant="flat" className="text-[8px]">$500 Prize</Badge>
                                      </div>
                                    </div>
                                    <Button size="sm" variant="flat" color="warning" className="text-[10px] h-6">
                                      Register
                                    </Button>
                                  </div>
                                </Card>

                                <Card className="p-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                                      <CalendarIcon className="w-5 h-5 text-success" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-xs font-medium">Career Fair</p>
                                      <p className="text-[10px] text-default-400">Next Week</p>
                                      <div className="flex items-center gap-1 mt-1">
                                        <Badge color="success" variant="flat" className="text-[8px]">20+ Companies</Badge>
                                      </div>
                                    </div>
                                    <Button size="sm" variant="flat" color="success" className="text-[10px] h-6">
                                      RSVP
                                    </Button>
                                  </div>
                                </Card>
                              </div>
                            </div>
                          )}
                          
                          {preview.id === "marketplace" && (
                            <div className="p-2">
                              <div className="grid grid-cols-2 gap-2">
                                <Card className="p-2">
                                  <div className="aspect-square rounded-lg bg-success/10 mb-2" />
                                  <p className="text-[10px] font-medium">Study Guide</p>
                                  <p className="text-[10px] text-success">$12.99</p>
                                </Card>
                                <Card className="p-2">
                                  <div className="aspect-square rounded-lg bg-warning/10 mb-2" />
                                  <p className="text-[10px] font-medium">Calculator</p>
                                  <p className="text-[10px] text-warning">$24.99</p>
                                </Card>
                              </div>
                            </div>
                          )}
                        </div> {/* Close card content div */}
                      </motion.div>
                    );
                  })}
                {/* End Preview Cards */}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Scroll indicator with proper typing */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <motion.div
          className="w-6 h-10 rounded-full border border-default-300 flex items-start justify-center p-1.5"
          animate={{ y: [0, 5, 0] } as MotionDivProps["animate"]}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: "easeInOut",
          }}
        >
          <ChevronDoubleDownIcon className="w-4 h-4 text-primary animate-bounce" />
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
