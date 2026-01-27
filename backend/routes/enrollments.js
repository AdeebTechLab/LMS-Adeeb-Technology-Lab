const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Fee = require('../models/Fee');
const Attendance = require('../models/Attendance');

// @route   GET /api/enrollments/my
// @desc    Get current user's enrollments
// @access  Private
router.get('/my', protect, async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ user: req.user.id })
            .populate({
                path: 'course',
                populate: { path: 'teacher', select: 'name' }
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
// @desc    Enroll in a course
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { courseId } = req.body;

        // Check if course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        // Check if already enrolled
        const existingEnrollment = await Enrollment.findOne({ user: req.user.id, course: courseId });
        if (existingEnrollment) {
            return res.status(400).json({ success: false, message: 'Already enrolled in this course' });
        }

        // Check max students
        if (course.enrolledCount >= course.maxStudents) {
            return res.status(400).json({ success: false, message: 'Course is full' });
        }

        // Create enrollment
        const enrollment = await Enrollment.create({
            user: req.user.id,
            course: courseId,
            status: 'pending'
        });

        // Create fee record
        // Create fee record with default full payment installment
        const feeAmount = course.fee || 0;
        await Fee.create({
            user: req.user.id,
            course: courseId,
            totalFee: feeAmount,
            installments: [{
                amount: feeAmount,
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
                status: 'pending'
            }]
        });

        // Increment enrolled count
        await Course.findByIdAndUpdate(courseId, { $inc: { enrolledCount: 1 } });

        res.status(201).json({ success: true, enrollment });
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
            .populate('user', 'name email rollNo role')
            .populate('course', 'title')
            .sort('-createdAt');

        res.json({ success: true, count: enrollments.length, data: enrollments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
