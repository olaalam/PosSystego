import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const user = sessionStorage.getItem('user');
  const cashierId = sessionStorage.getItem('cashier_id');
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user is authenticated but has no active cashier selected, redirect to /cashier
  if (!cashierId && location.pathname !== '/cashier') {
    return <Navigate to="/cashier" replace />;
  }

  // If user already has an active cashier / shift, prevent accessing /cashier
  if (cashierId && location.pathname === '/cashier') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
