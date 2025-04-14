import React from 'react';
import { Card, CardHeader, CardBody } from "@heroui/react";

const AdminDashboardOverview: React.FC = () => {
  return (
    <Card className="p-4 md:p-6 m-4">
      <CardHeader>
        <h1 className="text-2xl font-semibold">System Overview</h1>
      </CardHeader>
      <CardBody>
        <p>High-level insights into the platform performance and statistics.</p>
        {/* Placeholder for future overview widgets/charts */}
      </CardBody>
    </Card>
  );
};

export default AdminDashboardOverview;
