// src/components/PrivateRoute.jsx
import React from 'react';
import { Navigate } from 'react-router';

export default function PrivateRoute({ children }) {
  
  const isAuthorized = localStorage.getItem('isAuthorized');
  if (!isAuthorized) return <Navigate to="/login" replace />;
  return children;
}
