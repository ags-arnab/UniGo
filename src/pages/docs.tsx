import React, { useState, useEffect, useRef } from 'react';
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Link } from "@heroui/link";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import { motion } from "framer-motion";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
} from "@heroui/navbar";
import {
  InformationCircleIcon,
  RocketLaunchIcon,
  BuildingStorefrontIcon,
  CalendarIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  AcademicCapIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  QuestionMarkCircleIcon,
  LifebuoyIcon,
  CheckCircleIcon,
  UserPlusIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

// --- Data (Keep as is) ---
const gettingStartedSteps = [
  { title: "Create Your Account", description: "Sign up as a student, vendor, or apply for administrator access.", icon: <UserPlusIcon className="w-6 h-6" />, color: "primary" },
  { title: "Complete Your Profile", description: "Add preferences, payment info, and customize settings.", icon: <UserCircleIcon className="w-6 h-6" />, color: "secondary" },
  { title: "Choose Your Service", description: "Access cafeteria, events, or marketplace.", icon: <MagnifyingGlassIcon className="w-6 h-6" />, color: "success" },
  { title: "Place Orders or Register", description: "Order meals, register for events, or buy items.", icon: <DocumentTextIcon className="w-6 h-6" />, color: "warning" },
  { title: "Enjoy & Manage", description: "Track status and manage payments.", icon: <ShieldCheckIcon className="w-6 h-6" />, color: "primary" }
];
const coreFeatures = [
  { id: "cafeteria-ordering", title: "Cafeteria Ordering", description: "Seamless food ordering with real-time tracking, customization, and allergen filtering.", icon: <BuildingStorefrontIcon className="w-6 h-6" />, color: "primary", details: ["Order 30 mins in advance", "Real-time notifications", "Allergen filtering"] },
  { id: "event-management", title: "Event Management", description: "Discover, register, and participate in university events, tours, and workshops.", icon: <CalendarIcon className="w-6 h-6" />, color: "secondary", details: ["Club activities & tours", "Networking events", "Capacity management"] },
  { id: "campus-marketplace", title: "Campus Marketplace", description: "Buy and sell university items securely.", icon: <ShoppingBagIcon className="w-6 h-6" />, color: "success", details: ["Vendor ratings & reviews", "Secure transactions", "Verified vendors"] },
  { id: "payment-processing", title: "Payment Processing", description: "Integrated payments, detailed history, and refund management.", icon: <CreditCardIcon className="w-6 h-6" />, color: "warning", details: ["Student account integration", "Transaction history", "Automated refunds"] }
];
const userGuides = [
  { id: "for-students", title: "For Students", icon: <AcademicCapIcon className="w-6 h-6" />, color: "primary", benefits: ["Order meals with customization", "Browse & register for events", "Shop from university vendors", "Manage profile & preferences", "Track payments & refunds"] },
  { id: "for-vendors", title: "For Vendors", icon: <ShoppingBagIcon className="w-6 h-6" />, color: "secondary", benefits: ["Create customizable storefronts", "Manage orders & fulfillment", "Create events & manage registrations", "Access performance analytics", "Receive secure payments"] },
  { id: "for-administrators", title: "For Administrators", icon: <UserGroupIcon className="w-6 h-6" />, color: "success", benefits: ["Monitor & manage users", "Approve vendor applications", "Oversee cafeteria operations", "Manage university events & marketplace", "Access detailed analytics & reporting"] }
];
const faqs = [
  { question: "What is UniGo?", answer: "UniGo is a comprehensive university management platform integrating cafeteria ordering, event management, and a marketplace for university communities." },
  { question: "Who can use UniGo?", answer: "Students (order meals, register events), Vendors (provide services), and Administrators (oversee operations)." },
  { question: "How do I create an account?", answer: "Students/admins register directly. Vendors submit an application for approval." },
  { question: "Is payment information secure?", answer: "Yes, UniGo integrates securely with university payment systems and doesn't store sensitive financial data directly." },
  { question: "How does cafeteria ordering work?", answer: "Browse menus, customize orders (allergens, preferences), select pickup/delivery times, and track status." },
  { question: "Can clubs manage events?", answer: "Yes, approved clubs can create listings, manage registrations, collect fees, and send notifications." }
];
const techStack = ["React", "TypeScript", "Vite", "HeroUI", "Tailwind CSS", "React Router", "Context API"];

// --- Navigation Items ---
const navItems = [
  { id: "introduction", title: "Introduction", icon: InformationCircleIcon },
  { id: "getting-started", title: "Getting Started", icon: RocketLaunchIcon },
  { id: "core-features", title: "Core Features", icon: WrenchScrewdriverIcon },
  { id: "user-guides", title: "User Guides", icon: UserGroupIcon },
  { id: "faq", title: "FAQ", icon: QuestionMarkCircleIcon },
  { id: "technical-overview", title: "Technical Overview", icon: WrenchScrewdriverIcon }, // Re-using icon
  { id: "support", title: "Support", icon: LifebuoyIcon },
];

// --- Docs Component ---
const Docs: React.FC = () => {
  const [activeSection, setActiveSection] = useState('introduction');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  // --- Intersection Observer for Active Section Highlighting ---
  useEffect(() => {
    const observerOptions = {
      root: null, // relative to document viewport
      rootMargin: '-20% 0px -80% 0px', // Trigger when section is in the middle 20% of the viewport
      threshold: 0 // Trigger as soon as any part enters/leaves the margin
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all sections
    Object.values(sectionRefs.current).forEach(ref => {
      if (ref) observer.observe(ref);
    });

    // Cleanup
    return () => {
      Object.values(sectionRefs.current).forEach(ref => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, []); // Run only once on mount

  // --- Smooth Scroll ---
  const handleNavClick = (id: string, event: React.MouseEvent) => {
    event.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      // Smooth scroll with offset for header height
      const headerOffset = 80; // Adjust as needed based on your header/navbar height
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
      setActiveSection(id); // Immediately update active section
      setIsMobileMenuOpen(false); // Close mobile menu on click
    }
  };

  return (
    <div className="bg-default-50 min-h-screen">
      {/* Header with Mobile Navigation */}
      <Navbar 
        className="bg-gradient-to-r from-primary to-secondary py-3 text-white shadow-md sticky top-0 z-50"
        maxWidth="full"
        isBordered={false}
      >
        <NavbarContent className="sm:hidden pr-3" justify="start">
          <NavbarMenuToggle 
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"} 
            className="text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          />
        </NavbarContent>
        
        <NavbarContent className="mx-auto max-w-7xl px-4 w-full" justify="start">
          <NavbarBrand className="flex flex-col items-start">
            <h1 className="text-xl md:text-3xl font-bold">UniGo Documentation</h1>
            <p className="text-sm md:text-md text-white/90 hidden md:block">
              Your comprehensive guide to the UniGo platform.
            </p>
          </NavbarBrand>
        </NavbarContent>
        
        <NavbarMenu className="pt-6 bg-background z-50">
          <div className="px-2 py-2 bg-default-50 rounded-md mb-4">
            <h2 className="text-lg font-semibold mb-2 px-2">On this page</h2>
            <nav>
              <ul className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`#${item.id}`}
                      onClick={(e) => handleNavClick(item.id, e)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-md transition-colors duration-150 ${
                        activeSection === item.id
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-default-600 hover:bg-default-100 hover:text-default-800'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 flex-shrink-0 ${activeSection === item.id ? 'text-primary' : 'text-default-400'}`} />
                      <span>{item.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </NavbarMenu>
      </Navbar>

      {/* Main Content Area with Sidebar */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sidebar Navigation - Desktop Only */}
          <aside className="hidden lg:block lg:w-1/4 lg:sticky lg:h-[calc(100vh-120px)]" style={{ top: "100px" }}>
            <Card className="p-4 shadow-md border border-default-100 bg-background max-h-full overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4 px-2 sticky top-0 bg-background pt-1 pb-2 z-10">On this page</h3>
              <nav className="pb-4">
                <ul>
                  {navItems.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`#${item.id}`}
                        onClick={(e) => handleNavClick(item.id, e)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-150 ${
                          activeSection === item.id
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-default-600 hover:bg-default-100 hover:text-default-800'
                        }`}
                      >
                        <item.icon className={`w-5 h-5 flex-shrink-0 ${activeSection === item.id ? 'text-primary' : 'text-default-400'}`} />
                        <span>{item.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </Card>
          </aside>

          {/* Documentation Content */}
          <div className="lg:w-3/4 space-y-16">

            {/* Introduction Section */}
            <section id="introduction" ref={el => sectionRefs.current['introduction'] = el} className="scroll-mt-24">
              <Card className="shadow-lg border border-default-100 overflow-hidden">
                <CardHeader className="p-6 bg-gradient-to-r from-primary/10 to-secondary/10">
                  <h2 className="text-2xl font-semibold flex items-center gap-2 text-primary">
                    <InformationCircleIcon className="w-7 h-7" />
                    Introduction to UniGo
                  </h2>
                </CardHeader>
                <CardBody className="p-6 space-y-4 text-default-700">
                  <p>Welcome to UniGo, the all-in-one platform designed to streamline and enhance the university experience. UniGo integrates essential campus services into a single, user-friendly interface.</p>
                  <p>Our platform connects <Chip color="primary" variant="flat" size="sm">Students</Chip>, <Chip color="secondary" variant="flat" size="sm">Vendors</Chip> (including cafeterias, clubs, and campus shops), and <Chip color="success" variant="flat" size="sm">Administrators</Chip>, simplifying daily tasks like ordering food, managing events, and buying/selling goods within the university community.</p>
                  <p>This documentation will guide you through the features and functionalities available to each user role.</p>
                </CardBody>
              </Card>
            </section>

            {/* Getting Started Section */}
            <section id="getting-started" ref={el => sectionRefs.current['getting-started'] = el} className="scroll-mt-24">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3 text-secondary">
                <RocketLaunchIcon className="w-8 h-8" />
                Getting Started
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gettingStartedSteps.map((step, index) => (
                   <motion.div
                     key={index}
                     initial={{ opacity: 0, y: 20 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true, amount: 0.3 }}
                     transition={{ duration: 0.5, delay: index * 0.1 }}
                   >
                    <Card className={`h-full text-center p-6 border-t-4 border-${step.color} shadow-md hover:shadow-xl transition-shadow bg-background`}>
                      <div className={`w-12 h-12 rounded-full bg-${step.color}/10 text-${step.color} flex items-center justify-center mx-auto mb-4`}>
                        {step.icon}
                      </div>
                      <h3 className="font-semibold text-lg mb-2">Step {index + 1}: {step.title}</h3>
                      <p className="text-sm text-default-600">{step.description}</p>
                    </Card>
                   </motion.div>
                ))}
              </div>
            </section>

            {/* Core Features Section */}
            <section id="core-features" ref={el => sectionRefs.current['core-features'] = el} className="scroll-mt-24">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3 text-success">
                <WrenchScrewdriverIcon className="w-8 h-8" />
                Core Features
              </h2>
              <div className="space-y-6">
                {coreFeatures.map((feature, index) => (
                  <Card key={index} id={feature.id} className="shadow-lg border border-default-100 overflow-hidden transition-shadow hover:shadow-xl bg-background scroll-mt-24">
                    <CardHeader className={`p-5 bg-${feature.color}/10 flex flex-col sm:flex-row items-start sm:items-center gap-3`}>
                      <div className={`flex items-center gap-3 text-${feature.color} mb-2 sm:mb-0`}>
                        <span className="bg-white p-2 rounded-lg shadow-sm">{feature.icon}</span>
                        <h3 className={`text-xl font-semibold`}>{feature.title}</h3>
                      </div>
                      <p className="text-default-700 text-sm sm:text-base sm:ml-auto flex-1">{feature.description}</p>
                    </CardHeader>
                    <CardBody className="p-5">
                      <h4 className="font-medium text-sm text-default-500 mb-2">Key Highlights:</h4>
                      <ul className="space-y-1 text-sm text-default-600 list-inside grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {feature.details.map((detail, i) => (
                          <li key={i} className="flex items-center gap-2 bg-default-50 p-2 rounded-md border border-default-100">
                            <CheckCircleIcon className={`w-4 h-4 text-${feature.color}/70 flex-shrink-0`} />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </section>

            {/* User Guides Section */}
            <section id="user-guides" ref={el => sectionRefs.current['user-guides'] = el} className="scroll-mt-24">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3 text-warning">
                <UserGroupIcon className="w-8 h-8" />
                User Guides
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {userGuides.map((guide, index) => (
                  <Card key={index} id={guide.id} className="shadow-lg border border-default-100 bg-background hover:shadow-xl transition-shadow h-full flex flex-col scroll-mt-24">
                    <CardHeader className={`p-5 bg-${guide.color}/10 flex items-center gap-3`}>
                      <span className={`text-${guide.color}`}>{guide.icon}</span>
                      <h3 className={`text-xl font-semibold text-${guide.color}`}>{guide.title}</h3>
                    </CardHeader>
                    <CardBody className="p-5 flex-grow">
                      <p className="text-sm text-default-600 mb-3">Key benefits and functionalities:</p>
                      <ul className="space-y-2">
                        {guide.benefits.map((benefit, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-default-700">
                            <CheckCircleIcon className={`w-4 h-4 text-${guide.color}/70 mt-0.5 flex-shrink-0`} />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" ref={el => sectionRefs.current['faq'] = el} className="scroll-mt-24">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3 text-primary">
                <QuestionMarkCircleIcon className="w-8 h-8" />
                Frequently Asked Questions
              </h2>
              <Card className="shadow-lg border border-default-100 bg-background">
                <CardBody className="p-6">
                  <Accordion selectionMode="multiple" variant="bordered">
                    {faqs.map((faq, index) => (
                      <AccordionItem
                        key={index}
                        title={faq.question}
                        aria-label={`FAQ ${index + 1}`}
                        className="border-b border-default-100 last:border-b-0"
                      >
                        <p className="text-default-600 pb-3 pt-1">{faq.answer}</p>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardBody>
              </Card>
            </section>

            {/* Technical Overview Section */}
            <section id="technical-overview" ref={el => sectionRefs.current['technical-overview'] = el} className="scroll-mt-24">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3 text-secondary">
                <WrenchScrewdriverIcon className="w-8 h-8" />
                Technical Overview
              </h2>
              <Card className="shadow-lg border border-default-100 bg-background">
                <CardBody className="p-6">
                  <p className="text-default-700 mb-4">UniGo leverages a modern technology stack for a robust and scalable platform:</p>
                  <div className="flex flex-wrap gap-2">
                    {techStack.map((tech, index) => (
                      <Chip key={index} color="default" variant="bordered" size="sm">{tech}</Chip> // Changed variant/size
                    ))}
                  </div>
                  <p className="text-default-700 mt-4">The platform follows the Model-View-Controller (MVC) architectural pattern, promoting maintainability and clear separation of concerns between the user interface, business logic, and data management.</p>
                </CardBody>
              </Card>
            </section>

            {/* Support Section */}
            <section id="support" ref={el => sectionRefs.current['support'] = el} className="scroll-mt-24">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3 text-success">
                <LifebuoyIcon className="w-8 h-8" />
                Support
              </h2>
              <Card className="shadow-lg border border-default-100 bg-gradient-to-r from-success/5 to-teal/5">
                <CardBody className="p-8 text-center">
                  <h3 className="text-xl font-semibold mb-3">Need Assistance?</h3>
                  <p className="text-default-700 mb-5 max-w-md mx-auto">Our support team is ready to help with any questions or issues you might encounter while using UniGo.</p>
                  <Button
                    as={Link}
                    href="/about" // Assuming '/about' has contact info
                    color="success" // Changed color
                    variant="solid"
                    size="lg"
                    className="shadow-md"
                    endContent={<ArrowRightIcon className="w-4 h-4" />}
                  >
                    Contact Support Team
                  </Button>
                </CardBody>
              </Card>
            </section>

          </div>
        </div>
      </div>

      {/* Footer Separator */}
      <div className="container mx-auto px-4">
        <Divider className="my-12" />
      </div>

      {/* Footer */}
      <footer className="text-center pb-12 text-default-500 text-sm">
        &copy; {new Date().getFullYear()} UniGo Platform. All rights reserved.
      </footer>
    </div>
  );
};

export default Docs;
