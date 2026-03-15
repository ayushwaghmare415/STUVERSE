/**
 * STUVERSE - ADMIN STUDENT MANAGEMENT PAGE
 * =========================================
 * 
 * SECURITY OVERVIEW:
 * - This component displays all students in a protected admin page
 * - Access is guarded by role-based middleware (Admin only)
 * - The backend ensures JWT token is valid and user role is 'admin'
 * - API endpoints return 403 if non-admin users attempt access
 * 
 * STUDENT MANAGEMENT OPERATIONS:
 * 1. VERIFY: Set isVerified=true → Student can login and claim offers
 * 2. BLOCK: Set isBlocked=true → Student cannot login or perform actions
 * 3. UNBLOCK: Set isBlocked=false → Restore student access
 * 4. DELETE: Permanently remove student and associated data
 * 
 * BLOCKED STUDENTS:
 * - Cannot login (authMiddleware checks isBlocked flag)
 * - Cannot claim offers (controller checks isBlocked)
 * - Admin can unblock to restore access
 * 
 * API ENDPOINTS USED:
 * GET /api/admin/students - Fetch students with pagination & search
 * PATCH /api/admin/students/:id/verify - Verify student
 * PATCH /api/admin/students/:id/block - Block student
 * PATCH /api/admin/students/:id/unblock - Unblock student  
 * DELETE /api/admin/students/:id - Delete student permanently
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, AlertCircle, CheckCircle2, XCircle, Trash2, Loader } from 'lucide-react';
import { cn } from '@/lib/utils';
import API from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface Student {
  _id: string;
  name: string;
  email: string;
  college: string;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const getStatusLabel = (student: Student): string => {
  if (student.isBlocked) return 'Blocked';
  if (!student.isVerified) return 'Pending';
  return 'Verified';
};

const getStatusColor = (student: Student) => {
  if (student.isBlocked) return 'bg-red-50 text-red-700 border-red-200';
  if (!student.isVerified) return 'bg-orange-50 text-orange-700 border-orange-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
};

export function StudentManagement() {
  // State management
  const [students, setStudents] = useState<Student[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch students from API
  const fetchStudents = async (page = 1, search = '', status = '') => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      // Add search parameters (search across name, email, college)
      if (search) {
        params.append('name', search);
      }

      // Note: isBlocked and isVerified filters can be added via additional parameters
      // The backend listStudents endpoint doesn't support these directly yet,
      // but they can be added for more advanced filtering if needed

      const { data } = await API.get(`/admin/students?${params}`);
      setStudents(data.students);
      setPagination(data.pagination);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to fetch students';
      setError(msg);
      console.error('Fetch students error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load students on component mount
  useEffect(() => {
    fetchStudents();
  }, []);

  // Handle search with debounce
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSuccess('');
    setError('');
  };

  // Trigger search after user stops typing
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchStudents(1, searchQuery, statusFilter);
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, statusFilter]);

  // Action handlers - these call the API endpoints with proper error handling
  
  const handleVerify = async (studentId: string) => {
    if (!confirm('Are you sure you want to verify this student?')) return;
    
    setActionLoading(studentId);
    try {
      await API.patch(`/admin/students/${studentId}/verify`);
      setSuccess('Student verified successfully!');
      // Refresh the list
      setTimeout(() => fetchStudents(pagination.page, searchQuery, statusFilter), 500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify student');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlock = async (studentId: string) => {
    if (!confirm('Are you sure you want to block this student?\nThey will not be able to login or claim offers.')) return;
    
    setActionLoading(studentId);
    try {
      await API.patch(`/admin/students/${studentId}/block`, {
        reason: 'Blocked by admin'
      });
      setSuccess('Student blocked successfully!');
      setTimeout(() => fetchStudents(pagination.page, searchQuery, statusFilter), 500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to block student');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblock = async (studentId: string) => {
    if (!confirm('Are you sure you want to unblock this student?')) return;
    
    setActionLoading(studentId);
    try {
      await API.patch(`/admin/students/${studentId}/unblock`);
      setSuccess('Student unblocked successfully!');
      setTimeout(() => fetchStudents(pagination.page, searchQuery, statusFilter), 500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to unblock student');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student permanently?\nThis action cannot be undone.')) return;
    
    setActionLoading(studentId);
    try {
      await API.delete(`/admin/students/${studentId}`);
      setSuccess('Student deleted successfully!');
      setTimeout(() => fetchStudents(pagination.page, searchQuery, statusFilter), 500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete student');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      fetchStudents(newPage, searchQuery, statusFilter);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Student Management
          </h1>
          <p className="text-slate-500 mt-1">
            View, verify, and manage all student accounts.
          </p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-700 text-sm"
        >
          <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
          <p>{success}</p>
        </motion.div>
      )}

      {error && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm"
        >
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <p>{error}</p>
        </motion.div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name, email, or college..." 
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          <div className="flex gap-4">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none outline-none min-w-40"
            >
              <option value="">All Statuses</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader className="h-8 w-8 text-indigo-600 animate-spin" />
            <p className="text-slate-500">Loading students...</p>
          </div>
        )}

        {/* Table */}
        {!isLoading && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">College</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Joined</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        No students found
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => (
                      <tr key={student._id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          {student.name}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{student.email}</td>
                        <td className="px-6 py-4 text-slate-600">{student.college}</td>
                        <td className="px-6 py-4">
                          <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border", getStatusColor(student))}>
                            {getStatusLabel(student)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {formatDistanceToNow(new Date(student.createdAt), { addSuffix: true })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Verify Button - only show if pending */}
                            {!student.isVerified && !student.isBlocked && (
                              <button 
                                onClick={() => handleVerify(student._id)}
                                disabled={actionLoading === student._id}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                                title="Verify student"
                              >
                                {actionLoading === student._id ? (
                                  <Loader className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                              </button>
                            )}

                            {/* Block/Unblock Button */}
                            {!student.isBlocked && (
                              <button 
                                onClick={() => handleBlock(student._id)}
                                disabled={actionLoading === student._id}
                                className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                                title="Block student"
                              >
                                {actionLoading === student._id ? (
                                  <Loader className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                              </button>
                            )}

                            {student.isBlocked && (
                              <button 
                                onClick={() => handleUnblock(student._id)}
                                disabled={actionLoading === student._id}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                                title="Unblock student"
                              >
                                {actionLoading === student._id ? (
                                  <Loader className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                              </button>
                            )}

                            {/* Delete Button */}
                            <button 
                              onClick={() => handleDelete(student._id)}
                              disabled={actionLoading === student._id}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                              title="Delete student"
                            >
                              {actionLoading === student._id ? (
                                <Loader className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {pagination.pages > 0 && (
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
                <span>
                  Showing {students.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} students
                </span>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Prev
                  </button>
                  {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={cn(
                          "px-3 py-1 rounded-md transition-colors",
                          pageNum === pagination.page
                            ? "bg-indigo-50 text-indigo-600 font-medium border border-indigo-200"
                            : "border border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {pagination.pages > 5 && <span className="px-2 py-1">...</span>}
                  <button 
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
