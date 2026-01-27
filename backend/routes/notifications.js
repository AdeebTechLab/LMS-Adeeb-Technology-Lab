const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Notification = require('../models/Notification');

// @route   GET /api/notifications/active
// @desc    Get active notifications for the current time
// @access  Private (All roles)
router.get('/active', protect, async (req, res) => {
    try {
        const now = new Date();
        const notifications = await Notification.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
        }).sort('-createdAt');

        res.json({ success: true, data: notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/notifications
// @desc    Get all notifications (Admin)
// @access  Private (Admin)
router.get('/', protect, authorize('admin'), async (req, res) => {
    try {
        const notifications = await Notification.find().sort('-createdAt');
        res.json({ success: true, data: notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/notifications
// @desc    Create a notification (Admin)
// @access  Private (Admin)
router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        const { title, message, type, startDate, endDate } = req.body;

        const notification = await Notification.create({
            title,
            message,
            type,
            startDate,
            endDate,
            createdBy: req.user.id
        });

        res.status(201).json({ success: true, data: notification });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/notifications/:id
// @desc    Update a notification (Admin)
// @access  Private (Admin)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        let notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        notification = await Notification.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.json({ success: true, data: notification });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification (Admin)
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        await notification.deleteOne();

        res.json({ success: true, message: 'Notification removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
