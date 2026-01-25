const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const DailyTask = require('../models/DailyTask');
const Course = require('../models/Course');

// @route   POST /api/daily-tasks
// @desc    Submit a daily task (Intern)
// @access  Private (Intern)
router.post('/', protect, authorize('intern'), async (req, res) => {
    try {
        const { courseId, content, workLink } = req.body;

        // Verify enrollment/course exists (optional but good practice)
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        const task = await DailyTask.create({
            user: req.user.id,
            course: courseId,
            content,
            workLink
        });

        res.status(201).json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/daily-tasks/course/:courseId
// @desc    Get all daily tasks for a course (Teacher)
// @access  Private (Teacher, Admin)
router.get('/course/:courseId', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const tasks = await DailyTask.find({ course: req.params.courseId })
            .populate('user', 'name email rollNo photo')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/daily-tasks/my/:courseId
// @desc    Get my daily tasks for a specific course (Intern)
// @access  Private (Intern)
router.get('/my/:courseId', protect, authorize('intern'), async (req, res) => {
    try {
        const tasks = await DailyTask.find({
            course: req.params.courseId,
            user: req.user.id
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/daily-tasks/:id/grade
// @desc    Grade a daily task (Teacher)
// @access  Private (Teacher)
router.put('/:id/grade', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const { marks, feedback } = req.body;

        let task = await DailyTask.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        task.marks = marks;
        task.feedback = feedback;
        task.gradedBy = req.user.id;
        task.gradedAt = Date.now();
        task.status = 'graded';

        await task.save();

        res.json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
