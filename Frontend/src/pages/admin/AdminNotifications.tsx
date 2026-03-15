/**
 * ADMIN NOTIFICATIONS PAGE
 * =========================
 * 
 * This page allows admins to:
 * 1. View all notifications they've created
 * 2. Create new system-wide notifications
 * 3. Send notifications to:
 *    - All Students
 *    - All Vendors
 *    - Specific User
 * 4. Delete notifications
 * 5. View read status and notification history
 * 
 * SECURITY:
 * - Protected by ProtectedRoute (role must be "admin")
 * - Backend validates recipient type and userId
 * - Only admin can create notifications (enforced by authorizeRoles middleware)
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  Plus,
  Trash2,
  Users,
  User,
  Store,
  Calendar,
  Search,
  LoaderCircle,
  X,
  CheckCircle,
  AlertCircle,
  Send
} from 'lucide-react';
import API from '../../lib/api';
import { createNotification, getNotifications, deleteNotification } from '../../lib/adminApi';

interface Notification {
  _id: string;
  title: string;
  message: string;
  recipientType: 'AllStudents' | 'AllVendors' | 'SpecificUser';
  userId?: {
    _id: string;
    name: string;
    email: string;
  };
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  readBy?: Array<{
    userId: {
      _id: string;
      name: string;
      email: string;
    };
    readAt: string;
  }>;
  createdAt: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'student' | 'vendor' | 'admin';
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function AdminNotifications() {
  // State Management
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    recipientType: 'AllStudents' as 'AllStudents' | 'AllVendors' | 'SpecificUser',
    userId: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Toast Helper
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToast({ id, type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch Notifications
  const fetchNotifications = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const response = await getNotifications({
        page,
        limit: 10,
        search: search || undefined
      });
      setNotifications(response.data.notifications);
      setTotalPages(response.data.pagination.pages);
      setCurrentPage(page);
    } catch (err) {
      console.error('Fetch notifications error:', err);
      showToast('error', 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for specific user selector
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await API.get('/admin/students');
      const students = response.data.students || [];

      const vendorsResponse = await API.get('/admin/vendors');
      const vendors = vendorsResponse.data.vendors || [];

      setAllUsers([...students, ...vendors].slice(0, 50)); // Limit to 50 for performance
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, []);

  // Form Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }

    if (!formData.message.trim()) {
      errors.message = 'Message is required';
    }

    if (formData.recipientType === 'SpecificUser' && !formData.userId) {
      errors.userId = 'User is required for specific recipient';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create Notification
  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('error', 'Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        recipientType: formData.recipientType
      };

      if (formData.recipientType === 'SpecificUser') {
        (payload as any).userId = formData.userId;
      }

      const response = await createNotification(payload);

      if (response.data.success) {
        showToast('success', 'Notification sent successfully! ✨');

        // Reset form
        setFormData({
          title: '',
          message: '',
          recipientType: 'AllStudents',
          userId: ''
        });
        setFormErrors({});
        setShowCreateForm(false);

        // Refresh notifications list
        fetchNotifications(1);
      }
    } catch (err: any) {
      console.error('Create notification error:', err);
      showToast('error', err.response?.data?.message || 'Failed to create notification');
    }
  };

  // Delete Notification
  const handleDeleteNotification = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return;

    try {
      setDeleting(id);
      const response = await deleteNotification(id);

      if (response.data.success) {
        showToast('success', 'Notification deleted successfully');
        fetchNotifications(currentPage, searchTerm);
      }
    } catch (err: any) {
      console.error('Delete notification error:', err);
      showToast('error', err.response?.data?.message || 'Failed to delete notification');
    } finally {
      setDeleting(null);
    }
  };

  // Handle Search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
    if (e.target.value.length > 0 || searchTerm.length > 0) {
      // Debounce search
      const timer = setTimeout(() => {
        fetchNotifications(1, e.target.value);
      }, 500);
      return () => clearTimeout(timer);
    }
  };

  // Get Recipient Label
  const getRecipientLabel = (notif: Notification) => {
    if (notif.recipientType === 'AllStudents') {
      return <span className="flex items-center gap-2">
        <Users size={16} className="text-indigo-600" />
        All Students
      </span>;
    } else if (notif.recipientType === 'AllVendors') {
      return <span className="flex items-center gap-2">
        <Store size={16} className="text-green-600" />
        All Vendors
      </span>;
    } else {
      return <span className="flex items-center gap-2">
        <User size={16} className="text-blue-600" />
        {notif.userId?.name || 'Unknown User'}
      </span>;
    }
  };

  return (
    <div className="admin-notifications-page min-h-screen bg-slate-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Bell size={32} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
              <p className="text-slate-500 mt-1">Send system-wide announcements to students, vendors, or specific users</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              showCreateForm
                ? 'bg-red-100 text-red-700 border border-red-300'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {showCreateForm ? (
              <>
                <X size={20} />
                Close
              </>
            ) : (
              <>
                <Plus size={20} />
                New Notification
              </>
            )}
          </motion.button>
        </div>

        {/* Create Notification Form */}
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-2xl p-8 mb-8 shadow-sm"
          >
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Send size={24} className="text-indigo-600" />
              Create New Notification
            </h2>

            <form onSubmit={handleCreateNotification} className="space-y-6">
              {/* Title Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Notification Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (formErrors.title) {
                      setFormErrors({ ...formErrors, title: '' });
                    }
                  }}
                  placeholder="e.g., System Maintenance, New Feature Available"
                  className={`w-full px-4 py-3 bg-white border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    formErrors.title
                      ? 'border-red-500 focus:ring-red-500/50'
                      : 'border-slate-200 focus:ring-indigo-500/50 focus:border-indigo-500'
                  }`}
                />
                {formErrors.title && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.title}</p>
                )}
              </div>

              {/* Message Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Message *
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => {
                    setFormData({ ...formData, message: e.target.value });
                    if (formErrors.message) {
                      setFormErrors({ ...formErrors, message: '' });
                    }
                  }}
                  placeholder="Enter your notification message here..."
                  rows={4}
                  className={`w-full px-4 py-3 bg-white border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all resize-none ${
                    formErrors.message
                      ? 'border-red-500 focus:ring-red-500/50'
                      : 'border-slate-200 focus:ring-indigo-500/50 focus:border-indigo-500'
                  }`}
                />
                {formErrors.message && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.message}</p>
                )}
              </div>

              {/* Recipient Type Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['AllStudents', 'AllVendors', 'SpecificUser'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, recipientType: type, userId: '' });
                      if (formErrors.userId) {
                        setFormErrors({ ...formErrors, userId: '' });
                      }
                    }}
                    className={`p-4 rounded-lg border-2 transition-all flex items-center justify-center gap-3 font-semibold ${
                      formData.recipientType === type
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {type === 'AllStudents' && <Users size={20} />}
                    {type === 'AllVendors' && <Store size={20} />}
                    {type === 'SpecificUser' && <User size={20} />}
                    {type.replace(/([A-Z])/g, ' $1').trim()}
                  </button>
                ))}
              </div>

              {/* Specific User Selector */}
              {formData.recipientType === 'SpecificUser' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Select User *
                  </label>
                  <select
                    value={formData.userId}
                    onChange={(e) => {
                      setFormData({ ...formData, userId: e.target.value });
                      if (formErrors.userId) {
                        setFormErrors({ ...formErrors, userId: '' });
                      }
                    }}
                    disabled={loadingUsers}
                    className={`w-full px-4 py-3 bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all disabled:opacity-50 ${
                      formErrors.userId ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-200'
                    }`}
                  >
                    <option value="">
                      {loadingUsers ? 'Loading users...' : 'Choose a user...'}
                    </option>
                    {allUsers.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.name} ({user.email}) - {user.role}
                      </option>
                    ))}
                  </select>
                  {formErrors.userId && (
                    <p className="text-red-600 text-sm mt-1">{formErrors.userId}</p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <Send size={18} />
                  Send Notification
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({
                      title: '',
                      message: '',
                      recipientType: 'AllStudents',
                      userId: ''
                    });
                    setFormErrors({});
                  }}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-all"
                >
                  Cancel
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearch}
              placeholder="Search notifications by title or message..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 px-6 py-4 rounded-lg font-semibold flex items-center gap-3 shadow-lg z-50 ${
              toast.type === 'success'
                ? 'bg-green-50 border border-green-300 text-green-800'
                : toast.type === 'error'
                ? 'bg-red-50 border border-red-300 text-red-800'
                : 'bg-blue-50 border border-blue-300 text-blue-800'
            }`}
          >
            {toast.type === 'success' && <CheckCircle size={20} />}
            {toast.type === 'error' && <AlertCircle size={20} />}
            {toast.type === 'info' && <Bell size={20} />}
            {toast.message}
          </motion.div>
        )}

        {/* Notifications List */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Notification History</h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <LoaderCircle size={48} className="text-indigo-600 animate-spin mx-auto mb-4" />
                <p className="text-slate-500">Loading notifications...</p>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center"
            >
              <Bell size={48} className="text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 text-lg">
                {searchTerm ? 'No notifications match your search' : 'No notifications created yet'}
              </p>
              {!searchTerm && (
                <p className="text-slate-500 mt-2">Create your first notification to get started</p>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {notifications.map((notif, idx) => (
                <motion.div
                  key={notif._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white border border-slate-200 rounded-xl p-6 hover:border-slate-300 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-1">{notif.title}</h3>
                      <p className="text-slate-600 line-clamp-2">{notif.message}</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDeleteNotification(notif._id)}
                      disabled={deleting === notif._id}
                      className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                    >
                      {deleting === notif._id ? (
                        <LoaderCircle size={20} className="animate-spin" />
                      ) : (
                        <Trash2 size={20} />
                      )}
                    </motion.button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Recipient Type</p>
                      <div className="text-sm text-slate-700">{getRecipientLabel(notif)}</div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-1">Created By</p>
                      <p className="text-sm text-slate-700">{notif.createdBy?.name || 'Unknown'}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-1">Date & Time</p>
                      <p className="text-sm text-slate-700 flex items-center gap-2">
                        <Calendar size={14} />
                        {new Date(notif.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-1">Read Status</p>
                      <p className="text-sm text-indigo-600">
                        {notif.readBy?.length || 0} read
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8 pt-8 border-t border-slate-200">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => fetchNotifications(currentPage - 1, searchTerm)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </motion.button>

              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <motion.button
                    key={page}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => fetchNotifications(page, searchTerm)}
                    className={`px-3 py-2 rounded-lg transition-all ${
                      currentPage === page
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {page}
                  </motion.button>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => fetchNotifications(currentPage + 1, searchTerm)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
