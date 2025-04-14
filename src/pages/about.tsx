import React from 'react';
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Link } from "@heroui/link";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import {
  InformationCircleIcon,
  RocketLaunchIcon,
  EyeIcon,
  UsersIcon,
  EnvelopeIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const AboutPage: React.FC = () => {
  return (
    <div className="bg-default-50 min-h-screen">
      {/* Header Section */}
      <header className="bg-gradient-to-r from-secondary to-success py-16 text-white shadow-md mb-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About UniGo</h1>
          <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto">
            Learn more about our mission, vision, and the team behind the UniGo platform.
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 pb-12">
        <div className="max-w-4xl mx-auto space-y-10">

          {/* About UniGo Section */}
          <Card className="shadow-lg border border-default-100">
            <CardHeader className="p-6 bg-default-100/50">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <InformationCircleIcon className="w-7 h-7 text-primary" />
                What is UniGo?
              </h2>
            </CardHeader>
            <CardBody className="p-6 text-default-700">
              <p>
                UniGo is a comprehensive university management platform designed to streamline campus life for students, faculty, and vendors. We aim to create a seamless digital experience that connects all aspects of university life, making campus management more efficient and enjoyable for everyone involved.
              </p>
            </CardBody>
          </Card>

          {/* Mission Section */}
          <Card className="shadow-lg border border-default-100">
            <CardHeader className="p-6 bg-default-100/50">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <RocketLaunchIcon className="w-7 h-7 text-secondary" />
                Our Mission
              </h2>
            </CardHeader>
            <CardBody className="p-6 text-default-700">
              <p>
                To create a seamless digital experience that connects all aspects of university life,
                from academics to daily campus activities, making university management more efficient and enjoyable.
              </p>
            </CardBody>
          </Card>

          {/* Vision Section */}
          <Card className="shadow-lg border border-default-100">
            <CardHeader className="p-6 bg-default-100/50">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <EyeIcon className="w-7 h-7 text-success" />
                Our Vision
              </h2>
            </CardHeader>
            <CardBody className="p-6 text-default-700">
              <p>
                To revolutionize how universities operate by providing an all-in-one digital solution
                that enhances communication, streamlines operations, and improves the overall campus experience.
              </p>
            </CardBody>
          </Card>

          {/* Team & Contact Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Team Card */}
            <Card className="shadow-lg border border-default-100">
              <CardHeader className="p-6 bg-default-100/50">
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <UsersIcon className="w-7 h-7 text-warning" />
                  Our Team
                </h2>
              </CardHeader>
              <CardBody className="p-6 text-default-700">
                <p>
                  UniGo is developed by a team of passionate developers and university administrators
                  who understand the unique challenges of campus management and are dedicated to building the best possible platform.
                </p>
              </CardBody>
            </Card>

            {/* Contact Card */}
            <Card className="shadow-lg border border-default-100">
              <CardHeader className="p-6 bg-default-100/50">
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <EnvelopeIcon className="w-7 h-7 text-info" />
                  Contact Us
                </h2>
              </CardHeader>
              <CardBody className="p-6 text-default-700">
                <p className="mb-4">
                  Have questions, feedback, or partnership inquiries? We'd love to hear from you!
                </p>
                <Button
                  as={Link}
                  href="mailto:contact@unigo.com"
                  color="primary"
                  variant="solid"
                  endContent={<ArrowRightIcon className="w-4 h-4" />}
                >
                  Email Us: contact@unigo.com
                </Button>
              </CardBody>
            </Card>
          </div>

        </div>
      </main>

      {/* Footer Separator */}
      <div className="container mx-auto px-4">
        <Divider className="my-8" />
      </div>

      {/* Footer */}
      <footer className="text-center pb-8 text-default-500 text-sm">
        &copy; {new Date().getFullYear()} UniGo Platform. All rights reserved.
      </footer>
    </div>
  );
};

export default AboutPage;
