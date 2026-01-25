const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// @route   GET /api/courses
// @desc    Get all courses (with filters)
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { targetAudience, location, status, search } = req.query;

        let query = {};

        if (targetAudience) query.targetAudience = targetAudience;
        if (location) query.location = location;
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const courses = await Course.find(query)
            .populate('teacher', 'name email specialization')
            .populate('jober', 'name email')
            .sort('-createdAt');

        res.json({ success: true, count: courses.length, data: courses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/courses/:id
// @desc    Get single course
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('teacher', 'name email specialization photo')
            .populate('jober', 'name email');

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        res.json({ success: true, course });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/courses
// @desc    Create new course
// @access  Private (Admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        const course = await Course.create(req.body);
        res.status(201).json({ success: true, course });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/courses/:id
// @desc    Update course
// @access  Private (Admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        res.json({ success: true, course });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/courses/:id
// @desc    Delete course
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        await course.deleteOne();
        res.json({ success: true, message: 'Course deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/courses/:id/students
// @desc    Get enrolled students for a course
// @access  Private (Admin, Teacher)
router.get('/:id/students', protect, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ course: req.params.id, status: 'enrolled' })
            .populate('user', 'name email phone photo rollNo role');

        const students = enrollments.map(e => e.user);
        res.json({ success: true, count: students.length, students });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
