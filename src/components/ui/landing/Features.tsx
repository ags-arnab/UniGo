import { useRef } from 'react';
import { Card, CardFooter, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import { Tooltip } from "@heroui/tooltip";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  AcademicCapIcon,
  BuildingStorefrontIcon,
  CalendarIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  UserGroupIcon,
  ClockIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  CheckBadgeIcon,
  ArrowRightIcon,
  StarIcon,
  BellAlertIcon
} from '@heroicons/react/24/outline';

// Enhanced feature data with more detailed information and improved tooltips
const features = [
  {
    title: "Cafeteria Ordering",
    description: "Seamless food ordering with real-time tracking, customization options, and allergen filtering.",
    icon: <BuildingStorefrontIcon className="w-6 h-6" />,
    color: "primary",
    link: "/docs#cafeteria-ordering", // Updated link
    highlights: [
      {
        icon: <ClockIcon className="w-4 h-4" />, 
        text: "Order 30 mins in advance", 
        tooltip: "Place orders up to 30 minutes before pickup time, with options for specific time slots throughout the day"
      },
      { 
        icon: <BellAlertIcon className="w-4 h-4" />, 
        text: "Real-time notifications", 
        tooltip: "Receive instant updates about your order status, from preparation to ready-for-pickup, via in-app and email notifications"
      },
      { 
        icon: <CheckBadgeIcon className="w-4 h-4" />, 
        text: "Allergen filtering", 
        tooltip: "Filter menu items based on your specific dietary restrictions and allergen preferences stored in your profile"
      }
    ]
  },
  {
    title: "Event Management",
    description: "Discover, register, and participate in university events, tours, workshops, and activities.",
    icon: <CalendarIcon className="w-6 h-6" />,
    color: "secondary",
    link: "/docs#event-management", // Updated link
    highlights: [
      {
        icon: <AcademicCapIcon className="w-4 h-4" />, 
        text: "Club activities & tours", 
        tooltip: "Browse and register for university club activities, campus tours, and special events organized by student groups"
      },
      { 
        icon: <UserGroupIcon className="w-4 h-4" />, 
        text: "Networking events", 
        tooltip: "Find and join career fairs, industry meetups, and networking opportunities with potential employers and alumni"
      },
      { 
        icon: <ChartBarIcon className="w-4 h-4" />, 
        text: "Capacity management", 
        tooltip: "Real-time tracking of event capacity with waitlist options when events reach maximum attendance limits"
      }
    ]
  },
  {
    title: "Campus Marketplace",
    description: "Buy and sell university items from books to electronics in a secure campus marketplace.",
    icon: <ShoppingBagIcon className="w-6 h-6" />,
    color: "success",
    link: "/docs#campus-marketplace", // Updated link
    highlights: [
      {
        icon: <StarIcon className="w-4 h-4" />, 
        text: "Vendor ratings & reviews", 
        tooltip: "Access detailed ratings and authentic reviews from other students to make informed purchasing decisions"
      },
      { 
        icon: <CurrencyDollarIcon className="w-4 h-4" />, 
        text: "Secure transactions", 
        tooltip: "All financial transactions are processed through the university's secure payment system with fraud protection"
      },
      { 
        icon: <CheckBadgeIcon className="w-4 h-4" />, 
        text: "Verified vendors", 
        tooltip: "Every vendor on the platform undergoes university verification to ensure legitimacy and accountability"
      }
    ]
  },
  {
    title: "Payment Processing",
    description: "Integrated payment system with university accounts, detailed history, and refund management.",
    icon: <CreditCardIcon className="w-6 h-6" />,
    color: "warning",
    link: "/docs#payment-processing", // Updated link
    highlights: [
      {
        icon: <CurrencyDollarIcon className="w-4 h-4" />, 
        text: "Student account integration", 
        tooltip: "Payments are directly integrated with your university financial account, eliminating the need for external payment methods"
      },
      { 
        icon: <ChartBarIcon className="w-4 h-4" />, 
        text: "Transaction history", 
        tooltip: "Access comprehensive transaction records with detailed information about all purchases across cafeteria, events, and marketplace"
      },
      { 
        icon: <CheckBadgeIcon className="w-4 h-4" />, 
        text: "Automated refunds", 
        tooltip: "Request and receive refunds automatically for canceled orders or events directly to your university account"
      }
    ]
  }
];

const Features = () => {
  const sectionRef = useRef<HTMLElement>(null);
  
  // Use a container-based scroll approach instead of document scroll
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });
  
  // Transform the scroll progress to match the visual effect in UserRoles
  const titleOpacity = useTransform(scrollYProgress, [0, 0.2], [0.3, 1]);
  const titleY = useTransform(scrollYProgress, [0, 0.2], [50, 0]);

  return (
    <section
      ref={sectionRef}
      className="py-8 relative overflow-hidden bg-default-50" 
      id="features"
    >
      {/* Added Hero background elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Soft gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-tl from-secondary/5 to-transparent"></div>
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 bg-dot-pattern opacity-[0.04]"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section header with parallax effects */}
        <motion.div 
          className="text-center mb-20"
          style={{
            opacity: titleOpacity,
            y: titleY
          }}
        >
          {/* Section chip */}
          <Chip color="primary" variant="flat" className="mb-6 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              <span className="text-primary-600 font-medium">Platform Capabilities</span>
            </div>
          </Chip>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-default-900 to-default-700 dark:from-default-100 dark:to-default-300">
            Powerful Features for Modern Campus Life
          </h2>
          
          <p className="text-default-600 text-lg max-w-2xl mx-auto">
            UniGo brings together essential services in one unified platform to enhance every aspect of university experience
          </p>
        </motion.div>
        
        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div 
              key={index} 
              className="h-full"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ 
                duration: 0.5,
                delay: index * 0.1 
              }}
              whileHover={{ 
                y: -5,
                transition: { duration: 0.2 }
              }}
            >
              <Card 
                className="h-full bg-content1/70 backdrop-blur-sm border border-content2/20 overflow-hidden"
                isPressable
              >
                {/* Visual flair - top gradient bar - Only shown for non-cafeteria cards */}
                {feature.title !== "Cafeteria Ordering" && (
                  <div className={`h-1 w-full bg-gradient-to-r from-${feature.color} to-${feature.color}-500/70`} />
                )}
                
                <CardHeader className="p-6 flex flex-col">
                  {/* Icon and title row */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-${feature.color}/10 text-${feature.color}`}>
                      {feature.icon}
                    </div>
                    <div className="flex flex-col">
                      <div className={`text-xs font-medium text-${feature.color}`}>Module {index + 1}</div>
                      <h3 className={`text-xl font-semibold text-${feature.color}`}>{feature.title}</h3>
                    </div>
                  </div>
                  
                  {/* Description */}
                  <p className="text-default-500 mb-6">{feature.description}</p>
                  
                  {/* Feature highlights with enhanced tooltips */}
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {feature.highlights.map((highlight, idx) => (
                      <Tooltip 
                        key={idx} 
                        content={
                          <div className="max-w-xs p-1">
                            <p className="text-sm">{highlight.tooltip}</p>
                          </div>
                        }
                        delay={200}
                        closeDelay={100}
                      >
                        <Chip 
                          variant="flat" 
                          className="cursor-help"
                          color={feature.color as any}
                          startContent={highlight.icon}
                        >
                          <span className="text-xs">{highlight.text}</span>
                        </Chip>
                      </Tooltip>
                    ))}
                  </div>
                </CardHeader>

                <Divider />

                <CardFooter className="p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-default-500">
                      {feature.title === "Cafeteria Ordering" ? "Order now" :
                       feature.title === "Event Management" ? "Explore events" :
                       feature.title === "Campus Marketplace" ? "Shop now" : "Manage payments"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="flat"
                    color={feature.color as any}
                    href={feature.link}
                    as="a"
                    endContent={<ArrowRightIcon className="w-4 h-4" />}
                  >
                    Learn More
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
        
        {/* Call to action */}
        <div className="mt-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Button
              as="a"
              href="/docs"
              variant="shadow"
              color="primary"
              size="lg"
              className="font-medium px-8"
              endContent={<ArrowRightIcon className="w-4 h-4" />}
            >
              Explore All UniGo Features
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Features;
