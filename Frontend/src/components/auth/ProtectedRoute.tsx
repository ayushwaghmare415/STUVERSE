/**
 * PROTECTED ROUTE COMPONENT
 * ==========================
 * 
 * This component enforces role-based access control on the frontend.
 * It ensures that only authenticated users with the correct role can access certain pages.
 * 
 * SECURITY NOTES:
 * - Frontend routing should NOT be your only security measure
 * - The backend MUST also enforce role-based access via middleware
 * - All API endpoints protected with authorizeRoles middleware
 * - If user manually accesses /admin without proper role, backend will return 403
 * 
 * FLOW:
 * 1. Check if user is logged in (token + user data in localStorage)
 * 2. Verify user has required role
 * 3. If authorized: render component
 * 4. If not: redirect to login or home page
 */

import React from 'react';
import { Navigate } from 'react-router-dom';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'student' | 'vendor' | 'admin';
}

interface ProtectedRouteProps {
  element: React.ReactElement;
  requiredRole?: 'student' | 'vendor' | 'admin';
}

export function ProtectedRoute({ element, requiredRole = 'student' }: ProtectedRouteProps) {
  // Check if user is authenticated
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    // No authentication found, redirect to login
    return <Navigate to="/login" replace />;
  }

  try {
    const user: User = JSON.parse(userStr);

    // Check if user has required role
    if (requiredRole && user.role !== requiredRole) {
      // User doesn't have the required role, redirect to home
      return <Navigate to="/" replace />;
    }

    // User is authenticated and has required role, render the component
    return element;
  } catch (err) {
    console.error('Error parsing user data:', err);
    // Invalid user data, redirect to login
    return <Navigate to="/login" replace />;
  }
}
