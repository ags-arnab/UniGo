import React from 'react';
import { Card, CardHeader, CardBody } from "@heroui/react";

const AdminDashboard: React.FC = () => {
  return (
    <Card className="p-4 md:p-6 m-4">
      <CardHeader>
        {/* Using standard h1 as HeroUI might not have a dedicated Heading component, or it might be part of @heroui/react */}
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      </CardHeader>
      <CardBody>
        <p>Main administrative dashboard with platform overview.</p>
        {/* Placeholder for future dashboard widgets/content */}
      </CardBody>
    </Card>
  );
};

export default AdminDashboard;
