const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Fee = require('../models/Fee');
const { uploadPhoto } = require('../config/cloudinary');

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/users/pending-counts
// @desc    Get count of unverified users grouped by role (admin only)
// @access  Private/Admin
router.get('/pending-counts', protect, authorize('admin'), async (req, res) => {
    try {
        const counts = await User.aggregate([
            { $match: { isVerified: false, role: { $ne: 'admin' } } },
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        // Transform into a simpler object: { student: 5, teacher: 2, ... }
        const result = counts.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});

        // Count pending fees (installments that are 'submitted' OR 'pending')
        const feeCounts = await Fee.aggregate([
            { $unwind: '$installments' },
            { $match: { 'installments.status': { $in: ['submitted', 'pending'] } } },
            { $count: 'count' }
        ]);

        // Add to result (default to 0 if no results)
        result.fees = feeCounts.length > 0 ? feeCounts[0].count : 0;

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/users/role/:role
// @desc    Get users by role (admin only)
// @access  Private/Admin
router.get('/role/:role', protect, authorize('admin'), async (req, res) => {
    try {
        const users = await User.find({ role: req.params.role }).select('-password');
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Private/Admin
router.get('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/users/:id
// @desc    Update user (admin only)
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), uploadPhoto.single('photo'), async (req, res) => {
    try {
        const updateData = { ...req.body };

        // If photo uploaded, update path
        if (req.file) {
            updateData.photo = req.file.path;
        }

        const user = await User.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true
        }).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (admin only)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/users/:id/verify
// @desc    Verify a user (admin only)
// @access  Private/Admin
router.put('/:id/verify', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            {
                isVerified: true,
                verifiedAt: new Date(),
                verifiedBy: req.user._id
            },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: user, message: 'User verified successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/users/:id/unverify
// @desc    Unverify a user (admin only)
// @access  Private/Admin
router.put('/:id/unverify', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            {
                isVerified: false,
                verifiedAt: null,
                verifiedBy: null
            },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: user, message: 'User verification revoked' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/users/role/:role/verified
// @desc    Get only verified users by role (authenticated users only)
// @access  Private
router.get('/role/:role/verified', protect, async (req, res) => {
    try {
        const users = await User.find({ role: req.params.role, isVerified: true }).select('-password');
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
