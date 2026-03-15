import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bell, Check, Trash2, Loader2, BellRing } from 'lucide-react';
import toast from 'react-hot-toast';
import { getStudentNotifications, markNotificationAsRead, deleteNotification } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Notification {
  _id: string;
  title: string;
  message: string;
  recipientType: string;
  userId?: string;
  isRead: boolean;
  createdAt: string;
}

export function StudentNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getStudentNotifications();
      setNotifications(response.data.notifications);
    } catch (err: any) {
      if (err.response?.status === 401) {
        // Token invalid, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      setError(err.response?.data?.message || 'Failed to load notifications');
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Mark as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      setActionLoading(notificationId);
      await markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      toast.success('Notification marked as read');
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      toast.error(err.response?.data?.message || 'Failed to mark as read');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete notification
  const handleDelete = async (notificationId: string) => {
    try {
      setActionLoading(notificationId);
      await deleteNotification(notificationId);
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
      toast.success('Notification deleted');
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      toast.error(err.response?.data?.message || 'Failed to delete notification');
    } finally {
      setActionLoading(null);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) {
      return diffInHours < 1 ? 'Just now' : `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  // Count unread
  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center min-h-96"
      >
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="h-8 w-8 text-indigo-600" />
            {unreadCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
            <p className="text-slate-600">Stay updated with offers and announcements</p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
          <button
            onClick={fetchNotifications}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Notifications List */}
      {!loading && !error && notifications.length > 0 && (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <motion.div
              key={notification._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "bg-white rounded-lg border p-6 transition-all",
                notification.isRead
                  ? "border-slate-200 bg-slate-50/50"
                  : "border-indigo-200 bg-white shadow-sm"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Title and Status */}
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={cn(
                      "font-semibold",
                      notification.isRead ? "text-slate-700" : "text-slate-900"
                    )}>
                      {notification.title}
                    </h3>
                    {!notification.isRead && (
                      <BellRing className="h-4 w-4 text-indigo-600" />
                    )}
                  </div>

                  {/* Message */}
                  <p className={cn(
                    "text-sm mb-3 leading-relaxed",
                    notification.isRead ? "text-slate-600" : "text-slate-800"
                  )}>
                    {notification.message}
                  </p>

                  {/* Date */}
                  <p className="text-xs text-slate-500">
                    {formatDate(notification.createdAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  {!notification.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(notification._id)}
                      disabled={actionLoading === notification._id}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {actionLoading === notification._id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      Mark Read
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(notification._id)}
                    disabled={actionLoading === notification._id}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {actionLoading === notification._id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border border-slate-200">
          <Bell className="h-16 w-16 text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium mb-2">No notifications yet</p>
          <p className="text-slate-500 text-sm text-center max-w-sm">
            You'll receive notifications about new offers, system announcements, and offer updates here.
          </p>
        </div>
      )}
    </motion.div>
  );
}