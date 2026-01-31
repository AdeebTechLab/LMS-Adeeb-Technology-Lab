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
        // Use aggregation to get users with their enrollment stats
        const users = await User.aggregate([
            // 1. Match users by role
            { $match: { role: req.params.role } },

            // 2. Lookup Enrollments
            {
                $lookup: {
                    from: 'enrollments',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'enrollmentData'
                }
            },

            // 3. Add fields for stats
            {
                $addFields: {
                    totalEnrollments: { $size: '$enrollmentData' },
                    completedEnrollments: {
                        $size: {
                            $filter: {
                                input: '$enrollmentData',
                                as: 'e',
                                cond: { $eq: ['$$e.status', 'completed'] }
                            }
                        }
                    },
                    activeEnrollments: {
                        $size: {
                            $filter: {
                                input: '$enrollmentData',
                                as: 'e',
                                cond: { $in: ['$$e.status', ['enrolled', 'pending']] }
                            }
                        }
                    },
                    // Simplify courses list for display if needed
                    courses: {
                        $map: {
                            input: '$enrollmentData',
                            as: 'e',
                            in: '$$e.course' // This will be just IDs unless we lookup courses too, but usually simple stats are enough
                        }
                    }
                }
            },

            // 4. Project only necessary fields (exclude password)
            {
                $project: {
                    password: 0,
                    enrollmentData: 0 // Remove the heavy array, keep the stats
                }
            }
        ]);

        // Populate course titles separate if needed, or just return users
        // Since we need to show which courses they are in, we might want to populate.
        // But for now, let's just return the user data + stats.
        // To keep compatibility with existing code, we ensure the structure matches what Mongoose .find() returns
        // Aggregation returns plain objects, not Mongoose documents.

        // We also need to populate 'verifiedBy' manually or via another lookup if strictly needed,
        // but likely the frontend just checks 'isVerified'.

        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Error fetching users by role:', error);
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
        console.log(`[USER DELETE] Admin ${req.user.id} is attempting to PERMANENTLY DELETE user: ${req.params.id}`);
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            console.log(`[USER DELETE] Failed: User ${req.params.id} not found.`);
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        console.log(`[USER DELETE] Success: User ${user.name} (${user.email}) has been DELETED.`);
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        console.error('[USER DELETE] Error:', error);
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
