import React from 'react';
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { motion } from "framer-motion";
import { Card, CardBody } from "@heroui/card";

const CTA: React.FC = () => {
  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };
  
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" }}
  };

  return (
    <section className="pb-16 md:pb-24 relative overflow-hidden bg-default-50"> 
      {/* Standard background elements from other sections */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Soft gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-tl from-secondary/5 to-transparent"></div>
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 bg-dot-pattern opacity-[0.04]"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={container}
          className="max-w-6xl mx-auto"
        >
          <Card className="border border-white/10 shadow-xl bg-background/80 backdrop-blur-xl overflow-hidden">
            {/* Gradient accent on top */}
            <div className="h-1.5 w-full bg-gradient-to-r from-primary to-secondary"></div>
            
            <CardBody className="p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <motion.div variants={item} className="text-center md:text-left">
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Ready to Transform Your Campus Experience?
                  </h2>
                  <p className="text-default-600 text-lg mb-6 max-w-2xl">
                    Join UniGo today and discover how our platform connects and simplifies university life for students, vendors, and administrators.
                  </p>
                </motion.div>
                
                <motion.div variants={item} className="flex flex-col sm:flex-row gap-4">
                  <Button
                    as={Link}
                    href="/auth/register"
                    color="primary"
                    size="lg"
                    className="font-medium px-8"
                    radius="full"
                    startContent={(
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                      </svg>
                    )}
                  >
                    Sign Up Now
                  </Button>
                  <Button
                    as={Link}
                    href="/docs"
                    variant="bordered"
                    size="lg"
                    className="font-medium"
                    radius="full"
                  >
                    Learn More
                  </Button>
                </motion.div>
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
