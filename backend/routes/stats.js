const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Fee = require('../models/Fee');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');

// @route   GET /api/stats/admin-dashboard
// @desc    Get dashboard stats for admin
// @access  Private (Admin)
router.get('/admin-dashboard', protect, authorize('admin'), async (req, res) => {
    try {
        const { startDate, endDate, month } = req.query;

        // Build Date Filter
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else if (month) {
            const [year, m] = month.split('-');
            const start = new Date(year, m - 1, 1);
            const end = new Date(year, m, 0, 23, 59, 59);
            dateFilter = { $gte: start, $lte: end };
        }

        // 1. Calculate Revenue from Verified Installments
        const feeQuery = {};
        if (Object.keys(dateFilter).length > 0) {
            feeQuery["installments.verifiedAt"] = dateFilter;
        }

        const fees = await Fee.find(feeQuery).populate('user', 'name').populate('course', 'title');

        let totalRevenue = 0;
        let recentSubmissions = [];

        fees.forEach(fee => {
            fee.installments.forEach(inst => {
                if (inst.status === 'verified') {
                    const verifiedDate = new Date(inst.verifiedAt);
                    // Check date filter if present
                    if (Object.keys(dateFilter).length > 0) {
                        if (verifiedDate >= dateFilter.$gte && verifiedDate <= dateFilter.$lte) {
                            totalRevenue += inst.amount;
                        }
                    } else {
                        totalRevenue += inst.amount;
                    }
                }

                // Add to recent submissions (unverified or absolute recent)
                if (inst.receiptUrl) {
                    recentSubmissions.push({
                        id: inst._id,
                        feeId: fee._id,
                        student: fee.user?.name || 'Unknown',
                        course: fee.course?.title || 'Unknown Course',
                        amount: inst.amount,
                        date: inst.paidAt || fee.createdAt,
                        status: inst.status === 'submitted' ? 'pending' : inst.status
                    });
                }
            });
        });

        // 2. Student Statistics (including interns)
        const [allStudents, allEnrollments] = await Promise.all([
            User.find({ role: { $in: ['student', 'intern'] } }),
            Enrollment.find().populate('user')
        ]);

        const totalStudents = allStudents.length;

        // Registered: Has at least one enrollment that is NOT pending or withdrawn (assuming enrolled/active)
        // Group enrollments by user
        const userEnrollments = {};
        allEnrollments.forEach(e => {
            // Skip if no user populated
            if (!e.user || !e.user._id) return;
            const userId = e.user._id.toString();
            if (!userEnrollments[userId]) userEnrollments[userId] = [];
            userEnrollments[userId].push(e);
        });

        let registeredCount = 0;
        let passoutCount = 0;

        allStudents.forEach(student => {
            const studentId = student._id.toString();
            const enrollments = userEnrollments[studentId] || [];
            const activeEnrollments = enrollments.filter(e => e.status === 'enrolled' || e.status === 'pending');
            const completedEnrollments = enrollments.filter(e => e.status === 'completed');

            if (activeEnrollments.length > 0) {
                registeredCount++;
            } else if (completedEnrollments.length > 0) {
                passoutCount++;
            }
        });

        // 3. Fee Status Graph Data
        const allFees = await Fee.find();
        let verifiedCount = 0;
        let pendingCount = 0;
        let rejectedCount = 0;

        allFees.forEach(fee => {
            fee.installments.forEach(inst => {
                if (inst.status === 'verified') verifiedCount++;
                else if (inst.status === 'pending' || inst.status === 'submitted') pendingCount++;
                else if (inst.status === 'rejected') rejectedCount++;
            });
        });

        res.json({
            success: true,
            data: {
                totalRevenue,
                studentStats: {
                    total: totalStudents,
                    registered: registeredCount,
                    passout: passoutCount
                },
                recentSubmissions: recentSubmissions.sort((a, b) => new Date(b.date) - new Date(a.date)),
                feeStatus: {
                    verified: verifiedCount,
                    pending: pendingCount,
                    rejected: rejectedCount
                }
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
