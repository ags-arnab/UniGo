import React, { useState } from 'react';
import { motion } from "framer-motion";
import { Card, CardBody, CardFooter } from "@heroui/card";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";

const testimonials = [
  {
    quote: "UniGo has completely transformed how we manage our campus food services. Students love the real-time tracking and our staff finds it incredibly efficient.",
    name: "Dr. Sarah Chen",
    role: "University Dining Director",
    avatar: "/assets/avatars/sarah.jpg",
    organization: "Eastwood University"
  },
  {
    quote: "As a club leader, I can now easily create and manage events. The platform handles registrations, payments, and even sends automated reminders to participants.",
    name: "Michael Johnson",
    role: "Student Club President",
    avatar: "/assets/avatars/michael.jpg",
    organization: "Adventure Society"
  },
  {
    quote: "The marketplace feature has been a game-changer for our campus business. We've increased our sales by 40% since moving our operations to UniGo.",
    name: "Emma Rodriguez",
    role: "Campus Vendor",
    avatar: "/assets/avatars/emma.jpg",
    organization: "Campus Bookstore"
  },
  {
    quote: "The administrative tools give us unprecedented insights into campus operations. We can now make data-driven decisions that improve student experience.",
    name: "Prof. James Wilson",
    role: "University Administrator",
    avatar: "/assets/avatars/james.jpg", 
    organization: "University Administration"
  },
  {
    quote: "As a student with dietary restrictions, I appreciate how easy it is to filter cafeteria options based on my allergen profile. It's made campus dining stress-free.",
    name: "Aisha Patel",
    role: "Undergraduate Student",
    avatar: "/assets/avatars/aisha.jpg",
    organization: "Computer Science Department"
  }
];

const Testimonials: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  
  const nextTestimonial = () => {
    setActiveIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };
  
  const prevTestimonial = () => {
    setActiveIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="py-8 relative overflow-hidden bg-default-50" id="testimonials">
      {/* Added Hero background elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Soft gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-tl from-secondary/5 to-transparent"></div>
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 bg-dot-pattern opacity-[0.04]"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10"> {/* Added relative z-10 */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6">What People Say</h2>
          <p className="text-default-600 text-lg max-w-2xl mx-auto">
            Hear from students, faculty, and vendors about their experience with UniGo
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <div className="overflow-hidden">
              <motion.div 
                className="flex"
                initial={false}
                animate={{ x: `-${activeIndex * 100}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                {testimonials.map((testimonial, index) => (
                  <div key={index} className="w-full flex-shrink-0">
                    <Card className="border border-default-200">
                      <CardBody className="p-8 text-center">
                        <div className="mb-6">
                          {/* Quote marks */}
                          <svg className="w-12 h-12 mx-auto text-primary/30" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z" />
                          </svg>
                        </div>
                        <p className="text-lg text-default-800 italic mb-8">"{testimonial.quote}"</p>
                        <Avatar
                          src={testimonial.avatar}
                          size="lg"
                          className="mx-auto mb-4"
                          showFallback
                          fallback={testimonial.name.charAt(0)}
                        />
                        <h4 className="text-xl font-bold">{testimonial.name}</h4>
                        <p className="text-default-600">{testimonial.role}</p>
                        <p className="text-default-500 text-sm">{testimonial.organization}</p>
                      </CardBody>
                      <CardFooter className="justify-center pt-0 pb-6">
                        <div className="flex gap-2">
                          {testimonials.map((_, idx) => (
                            <Button
                              key={idx}
                              onPress={() => setActiveIndex(idx)}
                              className={`min-w-unit-3 h-3 rounded-full p-0 ${
                                idx === activeIndex ? 'bg-primary' : 'bg-default-200'
                              }`}
                              aria-label={`Go to testimonial ${idx + 1}`}
                            />
                          ))}
                        </div>
                      </CardFooter>
                    </Card>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Navigation buttons */}
            <Button
              isIconOnly
              variant="flat"
              radius="full"
              className="absolute top-1/2 -translate-y-1/2 left-2 sm:-left-4 z-10 bg-background/60 backdrop-blur-md"
              onPress={prevTestimonial}
              aria-label="Previous testimonial"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <Button
              isIconOnly
              variant="flat"
              radius="full"
              className="absolute top-1/2 -translate-y-1/2 right-2 sm:-right-4 z-10 bg-background/60 backdrop-blur-md"
              onPress={nextTestimonial}
              aria-label="Next testimonial"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
