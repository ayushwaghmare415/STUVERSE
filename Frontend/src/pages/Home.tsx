import { Link, Navigate } from 'react-router-dom';
import StudentDashboard from './StudentDashboard';

export default function Home() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.role === 'student') {
        return <StudentDashboard />;
      } else if (user.role === 'vendor') {
        return <Navigate to="/vendor" replace />;
      } else if (user.role === 'admin') {
        return <Navigate to="/admin" replace />;
      }
    } catch (error) {
      // Invalid user data, clear storage and show login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-2xl bg-white rounded-2xl shadow-md border border-slate-100 p-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Welcome to STUVERSE</h1>
        <p className="text-slate-600 mb-6">Discover exclusive student discounts. Please log in to see personalized discounts.</p>
        <div className="flex gap-4 justify-center">
          <Link to="/login" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Login</Link>
          <Link to="/register" className="px-4 py-2 border border-slate-200 rounded-lg">Register</Link>
        </div>
      </div>
    </div>
  );
}
