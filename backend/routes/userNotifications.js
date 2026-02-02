const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const UserNotification = require('../models/UserNotification');

// @route   GET /api/user-notifications
// @desc    Get all notifications for current user
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const notifications = await UserNotification.find({ user: req.user.id })
            .populate('relatedUser', 'name email')
            .populate('relatedTask', 'title')
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({
            success: true,
            data: notifications
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/user-notifications/unread-count
// @desc    Get count of unread notifications
// @access  Private
router.get('/unread-count', protect, async (req, res) => {
    try {
        const count = await UserNotification.countDocuments({
            user: req.user.id,
            isRead: false
        });

        res.json({
            success: true,
            count
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/user-notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
    try {
        const notification = await UserNotification.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { isRead: true, readAt: new Date() },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.json({
            success: true,
            data: notification
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/user-notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.put('/mark-all-read', protect, async (req, res) => {
    try {
        await UserNotification.updateMany(
            { user: req.user.id, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/user-notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const notification = await UserNotification.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id
        });

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.json({
            success: true,
            message: 'Notification deleted'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
