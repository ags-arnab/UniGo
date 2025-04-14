import React, { useState, useRef, useEffect } from 'react';
import { Card, CardBody, CardHeader, CardFooter } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { 
  CheckBadgeIcon,
  AcademicCapIcon,
  ShoppingBagIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";

// Enhanced user role data with additional information
const userRoles = [
  {
    key: "students",
    label: "Students",
    color: "primary",
    icon: <AcademicCapIcon className="w-5 h-5" />,
    description: "Access cafeteria ordering, event registration, and university marketplace all in one place.",
    benefits: [
      "Order meals with customization and allergen filtering",
      "Browse and register for university events and tours",
      "Shop from university vendors in the marketplace",
      "Manage your profile and preferences",
      "Track your payment history and refund requests"
    ],
    ctaText: "Create Student Account",
    ctaLink: "/auth/register",
    stats: {
      avgTimeSpared: "42 min/day",
      satisfaction: 92,
      avgSavings: "$130/month"
    },
    featuredImage: "/assets/student-dashboard.png",
    graph: "/assets/student-usage-graph.png"
  },
  {
    key: "vendors",
    label: "Vendors",
    color: "secondary",
    icon: <ShoppingBagIcon className="w-5 h-5" />,
    description: "Manage your cafeteria, club, or store products with powerful vendor tools.",
    benefits: [
      "Create customizable storefronts for your products",
      "Manage incoming orders and track fulfillment",
      "Create events and manage registrations",
      "Access performance analytics for your business",
      "Receive secure payments through the platform"
    ],
    ctaText: "Apply as Vendor",
    ctaLink: "/auth/vendor-application",
    stats: {
      avgSalesIncrease: "+30%",
      orderAccuracy: 99,
      customerReturn: "75%"
    },
    featuredImage: "/assets/vendor-dashboard.png",
    graph: "/assets/vendor-sales-graph.png"
  },
  {
    key: "admins",
    label: "Administrators",
    color: "success",
    icon: <UserGroupIcon className="w-5 h-5" />,
    description: "Comprehensive tools to oversee and manage all university platform operations.",
    benefits: [
      "Monitor and manage users across the platform",
      "Approve vendor applications and monitor activity",
      "Oversee cafeteria operations and inventory",
      "Manage university events and marketplace",
      "Access detailed analytics and reporting"
    ],
    ctaText: "Administrator Access",
    ctaLink: "/auth/login",
    stats: {
      operationalEfficiency: "+45%",
      dataInsights: "Real-time",
      paperworkReduced: "87%"
    },
    featuredImage: "/assets/admin-dashboard.png",
    graph: "/assets/admin-metrics-graph.png"
  }
];

const UserRoles: React.FC = () => {
  const { scrollY } = useScroll();
  const [activeTab, setActiveTab] = useState("students");
  const [_hovered, _setHovered] = useState<string | null>(null);
  const [tabPositions, setTabPositions] = useState<{ [key: string]: { left: number, width: number } }>({});
  const tabRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  
  // Parallax effects
  const titleOpacity = useTransform(scrollY, [800, 1000], [0.3, 1]);
  const titleY = useTransform(scrollY, [800, 1000], [50, 0]);

  // Function to handle tab change
  const handleTabChange = (key: React.Key) => {
    setActiveTab(key as string);
  };

  // Effect to measure tab positions for smooth sliding indicator
  useEffect(() => {
    const updateTabPositions = () => {
      const newTabPositions: { [key: string]: { left: number, width: number } } = {};
      
      Object.keys(tabRefs.current).forEach((key) => {
        const element = tabRefs.current[key];
        if (element) {
          newTabPositions[key] = {
            left: element.offsetLeft,
            width: element.offsetWidth
          };
        }
      });
      
      setTabPositions(newTabPositions);
    };
    
    // Initial measurement
    updateTabPositions();
    
    // Update on window resize
    window.addEventListener('resize', updateTabPositions);
    return () => window.removeEventListener('resize', updateTabPositions);
  }, []);

  return (
    <section className="py-8 relative overflow-hidden bg-default-50" id="user-roles"> 
      {/* Added Hero background elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Soft gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-tl from-secondary/5 to-transparent"></div>
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 bg-dot-pattern opacity-[0.04]"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div 
          className="text-center mb-20"
          style={{
            opacity: titleOpacity,
            y: titleY
          }}
        >
          {/* Modern section chip */}
          <Chip color="secondary" variant="flat" className="mb-6 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
              </span>
              <span className="text-secondary-600 font-medium">Tailored for Everyone</span>
            </div>
          </Chip>
          
          <motion.h2 
            className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-default-900 to-default-700 dark:from-default-100 dark:to-default-300"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            One Platform, Multiple Personas
          </motion.h2>
          <motion.p 
            className="text-default-600 text-lg max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Discover how UniGo adapts to the unique needs of students, vendors, and administrators
          </motion.p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          {/* Custom tabs with smooth animations */}
          <div className="relative w-full max-w-lg mx-auto">
            {/* Tab list */}
            <div className="bg-default-50/50 backdrop-blur-md p-1.5 rounded-full shadow-lg border border-default-200 mb-6 w-full flex justify-center overflow-x-auto">
              {userRoles.map((role) => (
                <button
                  key={role.key}
                  ref={el => tabRefs.current[role.key] = el}
                  onClick={() => handleTabChange(role.key)}
                  className={`relative z-10 h-10 md:h-12 px-4 md:px-8 text-sm md:text-base rounded-full transition-colors duration-300 ${
                    activeTab === role.key 
                      ? `text-${role.color}` 
                      : 'text-default-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:block">
                      {role.icon}
                    </span>
                    <span className="font-medium">{role.label}</span>
                  </div>
                </button>
              ))}
              
              {/* Sliding indicator */}
              {tabPositions[activeTab] && (
                <motion.div
                  className="absolute top-1.5 left-0 h-10 md:h-12 bg-white dark:bg-default-800 rounded-full shadow-md z-0"
                  initial={false}
                  animate={{
                    x: tabPositions[activeTab].left,
                    width: tabPositions[activeTab].width,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                  }}
                />
              )}
            </div>
            
            {/* Tab content with smooth transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ 
                  duration: 0.3,
                  ease: "easeInOut"
                }}
              >
                {userRoles.map((role) => (
                  activeTab === role.key && (
                    <Card key={role.key} className="overflow-hidden border-none shadow-xl">
                      <CardHeader className={`bg-${role.color} dark:bg-${role.color}-600 px-6 py-8 relative`}>
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 opacity-10">
                          <svg width="156" height="156" viewBox="0 0 156 156" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="78" cy="78" r="78" fill="white" />
                            <circle cx="78" cy="78" r="48" fill="white" />
                            <circle cx="78" cy="78" r="28" fill="white" />
                          </svg>
                        </div>
                        
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="text-white">
                            <Chip 
                              color={role.color as any} 
                              variant="solid" 
                              className="mb-3"
                              startContent={
                                <span className="text-white">{role.icon}</span>
                              }
                            >
                              <span className="text-white text-xs font-medium">{role.key.toUpperCase()}</span>
                            </Chip>
                            <h3 className="text-3xl font-bold mb-2 text-white">{role.label}</h3>
                            <p className="text-white max-w-xl">{role.description}</p>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardBody className="p-0">
                        <div className="grid grid-cols-1 gap-0">
                          {/* Left side: Benefits */}
                          <div className="p-6 border-default-100">
                            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <span className={`text-${role.color}`}>
                                <CheckBadgeIcon className="w-5 h-5" />
                              </span>
                              Key Benefits
                            </h4>
                            <div className="space-y-3">
                              {role.benefits.map((benefit, index) => (
                                <motion.div
                                  key={index}
                                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-default-50 transition-colors"
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                  whileHover={{ x: 5 }}
                                >
                                  <div className={`flex-shrink-0 w-6 h-6 rounded-full bg-${role.color}/20 flex items-center justify-center text-${role.color} text-xs font-bold`}>
                                    {index + 1}
                                  </div>
                                  <p className="text-default-600">{benefit}</p>
                                </motion.div>
                              ))}
                            </div>
                            
                            {/* Learn more section */}
                            <div className="bg-gradient-to-r from-default-100 to-default-50 rounded-lg p-5 mt-6">
                              <h4 className="font-medium mb-2">Ready to get started?</h4>
                              <p className="text-default-600 text-sm mb-4">
                                Join thousands of {role.label.toLowerCase().replace('for ', '')} already using UniGo to streamline campus operations.
                              </p>
                              <div className="flex">
                                <Button
                                  as={Link}
                                  href={role.ctaLink}
                                  color={role.color as any}
                                  variant="solid"
                                  size="md"
                                  className="font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-white"
                                  startContent={
                                    <span className="flex items-center justify-center mr-1">
                                      {role.key === "students" ? (
                                        <AcademicCapIcon className="w-4 h-4" />
                                      ) : role.key === "vendors" ? (
                                        <ShoppingBagIcon className="w-4 h-4" />
                                      ) : (
                                        <UserGroupIcon className="w-4 h-4" />
                                      )}
                                    </span>
                                  }
                                >
                                  {role.ctaText}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardBody>
                      
                      <CardFooter className="justify-center py-4 bg-default-50/50 border-t border-default-100">
                        <p className="text-default-500 text-sm">
                          More questions? <Link href="/about" className={`text-${role.color}`}>Contact our support team</Link> for personalized assistance.
                        </p>
                      </CardFooter>
                    </Card>
                  )
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UserRoles;
