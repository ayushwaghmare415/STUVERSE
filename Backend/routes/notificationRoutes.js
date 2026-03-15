const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticateUser, authorizeRoles } = require('../middleware/authorization');

/**
 * STUDENT NOTIFICATION ROUTES
 * ===========================
 * Routes for students to manage their notifications.
 * 
 * Business Rules:
 * - Students can only view their own notifications
 * - Notifications include: new offers approved, offers claimed, system announcements, expiry reminders
 * - Students can mark as read or delete notifications
 */

/**
 * GET /api/notifications/student/:id
 * ==================================
 * Fetch notifications for a student by ID (student can fetch their own; admin can fetch any)
 */
router.get('/student/:id', authenticateUser, authorizeRoles('Student', 'Admin'), async (req, res) => {
  try {
    const studentId = req.params.id;

    // Students can only access their own notifications
    if (req.user.role.toLowerCase() !== 'admin' && req.user._id.toString() !== studentId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const notifications = await Notification.find({
      $or: [
        { recipientType: 'Student' },
        { recipientType: 'AllUsers' },
        { userId: studentId }
      ]
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      notifications
    });
  } catch (err) {
    console.error('Get student notifications error:', err);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

/**
 * GET /api/notifications/student
 * ==============================
 * Fetch notifications for the logged-in student
 * 
 * Query: recipientType = "Student" OR "AllUsers" OR userId = studentId
 * Sort: latest first
 * 
 * Response: Array of notifications with title, message, isRead, createdAt
 */
router.get('/student', authenticateUser, authorizeRoles('Student'), async (req, res) => {
  try {
    const studentId = req.user._id;

    const notifications = await Notification.find({
      $or: [
        { recipientType: 'Student' },
        { recipientType: 'AllUsers' },
        { userId: studentId }
      ]
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      notifications
    });
  } catch (err) {
    console.error('Get student notifications error:', err);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * =================================
 * Mark a notification as read for the student
 * 
 * Business Logic:
 * - Verify the notification belongs to the student
 * - Set isRead = true
 */
router.patch('/:id/read', authenticateUser, authorizeRoles('Student'), async (req, res) => {
  try {
    const notificationId = req.params.id;
    const studentId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        $or: [
          { recipientType: 'Student' },
          { recipientType: 'AllUsers' },
          { userId: studentId }
        ]
      },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification
    });
  } catch (err) {
    console.error('Mark notification as read error:', err);
    res.status(500).json({ message: 'Server error marking notification as read' });
  }
});

/**
 * DELETE /api/notifications/:id
 * =============================
 * Allow student to delete a notification from their list
 * 
 * Business Logic:
 * - Verify the notification belongs to the student
 * - Remove the notification
 */
router.delete('/:id', authenticateUser, authorizeRoles('Student'), async (req, res) => {
  try {
    const notificationId = req.params.id;
    const studentId = req.user._id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      $or: [
        { recipientType: 'Student' },
        { recipientType: 'AllUsers' },
        { userId: studentId }
      ]
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ message: 'Server error deleting notification' });
  }
});

module.exports = router;
