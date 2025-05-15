import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StorefrontViewPage from '../StorefrontViewPage';

const StorefrontRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/student/marketplace" replace />} />
      <Route path=":storefrontId" element={<StorefrontViewPage />} />
    </Routes>
  );
};

export default StorefrontRoutes; 