import React, { useState } from 'react';
import { motion } from "framer-motion";
import { Card } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Link } from "@heroui/link";
import { 
  QuestionMarkCircleIcon, 
  CheckCircleIcon 
} from "@heroicons/react/24/outline";

// Reduced to 6 cards as requested
const faqs = [
  {
    question: "What is UniGo?",
    answer: "UniGo is a comprehensive university management platform that integrates cafeteria ordering, club event management, and a marketplace system designed specifically for university communities."
  },
  {
    question: "Who can use the UniGo platform?",
    answer: "UniGo serves three primary user roles: Students who can order meals and register for events, Vendors who provide services through storefronts, and Administrators who oversee and manage platform operations."
  },
  {
    question: "How do I create an account?",
    answer: "Students and administrators can register directly through our sign-up page. Vendors need to submit an application that requires approval from university administrators."
  },
  {
    question: "Is payment information secure on UniGo?",
    answer: "Yes, we prioritize security. UniGo integrates securely with university payment systems and does not store sensitive financial information directly on the platform."
  },
  {
    question: "How does the cafeteria ordering system work?",
    answer: "Students can browse cafeteria menus with real-time availability, customize orders based on preferences and allergens, select pickup or delivery times, and track their order status throughout preparation."
  },
  {
    question: "Can club leaders create and manage events?",
    answer: "Yes, approved clubs can create event listings with comprehensive details, manage registrations, collect fees through the platform, and send automated notifications to participants."
  }
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 }}
};

// Move the styles to a CSS class that we'll inject into the document
const flipCardStyles = `
  .faq-perspective {
    perspective: 2000px;
    height: 180px;
  }
  
  .flip-card {
    position: relative;
    width: 100%;
    height: 100%;
    transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    transform-style: preserve-3d;
  }
  
  .is-flipped {
    transform: rotateY(180deg);
  }
  
  .flip-card-front,
  .flip-card-back {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    border-radius: 1rem !important;
    overflow: auto; /* Changed from hidden to auto to allow scrolling on small screens */
  }
  
  .flip-card-back {
    transform: rotateY(180deg);
  }
  
  @media (hover: hover) {
    .flip-card:hover {
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }
  }
  
  /* Mobile optimizations */
  @media (max-width: 640px) {
    .faq-perspective {
      height: 200px; /* Increased height on mobile */
    }
    
    .flip-card-front,
    .flip-card-back {
      padding-bottom: 8px;
    }
    
    .flip-card-front .text-lg,
    .flip-card-back .text-base {
      font-size: 0.95rem;
    }
  }
`;

const FAQ: React.FC = () => {
  const [flippedCards, setFlippedCards] = useState<{[key: number]: boolean}>({});

  // Add the styles to the document when the component mounts
  React.useEffect(() => {
    // Create a style element
    const styleElement = document.createElement('style');
    styleElement.innerHTML = flipCardStyles;
    document.head.appendChild(styleElement);
    
    // Cleanup function to remove the style when component unmounts
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const flipCard = (index: number) => {
    setFlippedCards(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <section className="pt-8 relative overflow-hidden bg-default-50" id="faq">
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
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Frequently Asked Questions</h2>
          <p className="text-default-600 text-lg max-w-2xl mx-auto">
            Find answers to common questions about the UniGo platform
          </p>
        </motion.div>

        <motion.div 
          className="max-w-5xl mx-auto"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {/* Updated to a 2x3 grid as requested */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {faqs.map((faq, index) => (
              <motion.div 
                key={index}
                variants={item}
                className="faq-perspective w-full"
              >
                <div 
                  className={`flip-card cursor-pointer ${flippedCards[index] ? 'is-flipped' : ''}`}
                  onClick={() => flipCard(index)}
                >
                  {/* Front side - Question with updated colors */}
                  <Card className="flip-card-front bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-800/50 shadow-md rounded-xl">
                    <div className="flex items-center p-6 h-full">
                      <QuestionMarkCircleIcon className="w-10 h-10 text-blue-600 dark:text-blue-400 mr-4 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{faq.question}</h3>
                        <p className="text-sm text-default-500 mt-2">
                          Click to reveal answer
                        </p>
                      </div>
                    </div>
                  </Card>
                  
                  {/* Back side - Answer with updated colors */}
                  <Card className="flip-card-back bg-gradient-to-r from-teal-50 to-emerald-100 dark:from-teal-900/40 dark:to-emerald-800/50 shadow-md rounded-xl">
                    <div className="flex p-6 h-full">
                      <CheckCircleIcon className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mr-4 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-default-600 text-sm sm:text-base">{faq.answer}</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </motion.div>
            ))}
          </div>
          
          <motion.div 
            className="mt-12 mb-12 text-center"
            variants={item}
          >
            <Divider className="my-8" />
            <p className="text-default-600 mb-4">
              Still have questions? We're here to help!
            </p>
            <Link 
              href="/about" 
              color="primary" 
              size="lg" 
              showAnchorIcon
            >
              Contact Support
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
