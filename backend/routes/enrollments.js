const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Fee = require('../models/Fee');

// @route   GET /api/enrollments/my
// @desc    Get current user's enrollments
// @access  Private
router.get('/my', protect, async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ user: req.user.id })
            .populate({
                path: 'course',
                populate: { path: 'teachers', select: 'name email specialization photo' }
            })
            .sort('-createdAt');

        // Calculate attendance stats for each enrollment
        const data = await Promise.all(enrollments.map(async (e) => {
            const eObj = e.toObject();
            const courseId = e.course?._id;

            if (courseId) {
                const totalClasses = await Attendance.countDocuments({ course: courseId });
                const attendedClasses = await Attendance.countDocuments({
                    course: courseId,
                    records: { $elemMatch: { user: req.user.id, status: 'present' } }
                });

                eObj.totalClasses = totalClasses;
                eObj.attendedClasses = attendedClasses;
                eObj.progress = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0;
            } else {
                eObj.totalClasses = 0;
                eObj.attendedClasses = 0;
                eObj.progress = 0;
            }

            return eObj;
        }));

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/enrollments
// @desc    Enroll in a course (creates pending enrollment with installments)
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { courseId, installments } = req.body;

        // Check if course exists and is active
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        if (!course.isActive) {
            return res.status(400).json({ success: false, message: 'Course is not active' });
        }

        // Check if already enrolled
        const existingEnrollment = await Enrollment.findOne({ user: req.user.id, course: courseId });
        if (existingEnrollment) {
            return res.status(400).json({ success: false, message: 'Already enrolled in this course' });
        }

        // Get user registration date
        const user = await User.findById(req.user.id);

        // Create enrollment with installments
        const enrollmentData = {
            user: req.user.id,
            course: courseId,
            status: 'pending', // Will change to 'enrolled' when first installment verified
            registrationDate: user.createdAt,
            feeStatus: 'pending',
            isActive: false // Will become true when first installment verified
        };

        // If installments provided, add them; otherwise create single default installment
        if (installments && installments.length > 0) {
            enrollmentData.installments = installments.map((inst, index) => ({
                installmentNumber: index + 1,
                amount: inst.amount,
                dueDate: inst.dueDate,
                status: 'pending'
            }));
        } else {
            // Single default installment for full fee
            enrollmentData.installments = [{
                installmentNumber: 1,
                amount: course.fee,
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
                status: 'pending'
            }];
        }

        const enrollment = await Enrollment.create(enrollmentData);

        // Also create a corresponding Fee record for the management system
        await Fee.create({
            user: req.user.id,
            course: courseId,
            totalFee: course.fee,
            installments: enrollmentData.installments.map(inst => ({
                amount: inst.amount,
                dueDate: inst.dueDate,
                status: 'pending'
            })),
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            enrollment,
            message: 'Enrollment created. Please submit payment for verification.'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/enrollments/:id/verify-installment
// @desc    Admin verifies an installment payment
// @access  Private (Admin)
router.put('/:id/verify-installment', protect, authorize('admin'), async (req, res) => {
    try {
        const { installmentNumber, paymentProof } = req.body;

        const enrollment = await Enrollment.findById(req.params.id);
        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        // Find the installment
        const installment = enrollment.installments.find(
            inst => inst.installmentNumber === installmentNumber
        );

        if (!installment) {
            return res.status(404).json({ success: false, message: 'Installment not found' });
        }

        // Update installment status
        installment.status = 'verified';
        installment.paidDate = new Date();
        installment.verifiedBy = req.user.id;
        installment.verifiedAt = new Date();
        if (paymentProof) installment.paymentProof = paymentProof;

        // Update enrollment status
        const allVerified = enrollment.installments.every(inst => inst.status === 'verified');
        const firstVerified = enrollment.installments[0].status === 'verified';

        if (allVerified) {
            enrollment.feeStatus = 'verified';
            enrollment.status = 'enrolled';
            enrollment.isActive = true;
            if (!enrollment.enrollmentDate) {
                enrollment.enrollmentDate = new Date();
                // Increment course enrolled count
                await Course.findByIdAndUpdate(enrollment.course, { $inc: { enrolledCount: 1 } });
            }
        } else if (firstVerified) {
            enrollment.feeStatus = 'partial';
            enrollment.status = 'enrolled';
            enrollment.isActive = true;
            if (!enrollment.enrollmentDate) {
                enrollment.enrollmentDate = new Date();
                // Increment course enrolled count
                await Course.findByIdAndUpdate(enrollment.course, { $inc: { enrolledCount: 1 } });
            }
        }

        await enrollment.save();

        res.json({
            success: true,
            enrollment,
            message: `Installment ${installmentNumber} verified successfully`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/enrollments/check-overdue
// @desc    Check and update overdue enrollments (cron job endpoint)
// @access  Private (Admin)
router.put('/check-overdue', protect, authorize('admin'), async (req, res) => {
    try {
        const now = new Date();
        const enrollments = await Enrollment.find({ isActive: true });

        let updatedCount = 0;

        for (const enrollment of enrollments) {
            const lastInstallment = enrollment.installments[enrollment.installments.length - 1];

            // Check if last installment is overdue
            if (lastInstallment &&
                lastInstallment.status !== 'verified' &&
                now > lastInstallment.dueDate) {

                enrollment.isActive = false;
                enrollment.feeStatus = 'overdue';
                enrollment.status = 'suspended';
                await enrollment.save();
                updatedCount++;
            }
        }

        res.json({
            success: true,
            message: `Checked enrollments. ${updatedCount} suspended due to overdue payments.`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/enrollments/:id/complete
// @desc    Mark enrollment as completed
// @access  Private (Admin)
router.put('/:id/complete', protect, authorize('admin'), async (req, res) => {
    try {
        const { grade, percentage } = req.body;

        const enrollment = await Enrollment.findByIdAndUpdate(
            req.params.id,
            {
                status: 'completed',
                grade,
                percentage,
                completedAt: new Date()
            },
            { new: true }
        );

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        res.json({ success: true, enrollment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/enrollments/all
// @desc    Get all enrollments (admin)
// @access  Private (Admin, Teacher)
router.get('/all', protect, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const enrollments = await Enrollment.find()
            .populate('user', 'name email rollNo role photo')
            .populate('course', 'title city durationMonths')
            .sort('-createdAt');

        res.json({ success: true, count: enrollments.length, data: enrollments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
