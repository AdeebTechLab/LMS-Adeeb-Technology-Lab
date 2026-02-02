const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const DailyTask = require('../models/DailyTask');
const Course = require('../models/Course');
const Fee = require('../models/Fee');

// Helper function to check if student has overdue fees (more than 7 days past due)
const hasOverdueFee = async (userId, courseId) => {
    const fee = await Fee.findOne({ user: userId, course: courseId });
    if (!fee || !fee.installments || fee.installments.length === 0) {
        return false; // No fee record, allow submission
    }

    const now = new Date();
    for (const inst of fee.installments) {
        if (inst.status !== 'verified' && inst.status !== 'paid') {
            const dueDate = new Date(inst.dueDate);
            const daysPastDue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
            if (daysPastDue > 7) {
                return true; // Has overdue fee
            }
        }
    }
    return false;
};

// @route   POST /api/daily-tasks
// @desc    Submit a daily task (Intern / Student)
// @access  Private (Intern, Student)
router.post('/', protect, authorize('intern', 'student'), async (req, res) => {
    try {
        const { courseId, content, workLink, taskId } = req.body;

        // Verify enrollment/course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        // Check for overdue fee payment (more than 7 days past due)
        const isOverdue = await hasOverdueFee(req.user.id, courseId);
        if (isOverdue) {
            return res.status(403).json({ 
                success: false, 
                message: 'You have an overdue fee payment. Please pay your installment to submit daily tasks.',
                code: 'FEE_OVERDUE'
            });
        }

        let task;
        if (taskId) {
            // Resubmission case
            task = await DailyTask.findOne({ _id: taskId, user: req.user.id });
            if (!task) {
                return res.status(404).json({ success: false, message: 'Task not found or unauthorized' });
            }
            if (task.status !== 'rejected') {
                return res.status(400).json({ success: false, message: 'Only rejected tasks can be resubmitted' });
            }

            task.content = content || task.content;
            task.workLink = workLink !== undefined ? workLink : task.workLink;
            task.status = 'submitted';
            task.marks = 0;
            task.feedback = '';
            await task.save();
        } else {
            // New submission
            task = await DailyTask.create({
                user: req.user.id,
                course: courseId,
                content,
                workLink
            });
        }

        res.status(taskId ? 200 : 201).json({
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
            .populate('user', 'name email rollNo photo role')
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
// @access  Private (Intern, Student)
router.get('/my/:courseId', protect, authorize('intern', 'student'), async (req, res) => {
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
        const { marks, feedback, status } = req.body;

        let task = await DailyTask.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        task.marks = marks !== undefined ? marks : task.marks;
        task.feedback = feedback || task.feedback;
        task.gradedBy = req.user.id;
        task.gradedAt = Date.now();
        task.status = status || 'graded';

        await task.save();

        res.json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/daily-tasks/:id
// @desc    Delete a daily task (Teacher, Admin, or Owner if pending)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const task = await DailyTask.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        // Only allow teacher/admin or the owner (if not verified yet)
        const isTeacher = req.user.role === 'teacher' || req.user.role === 'admin';
        const isOwner = task.user.toString() === req.user.id;

        if (!isTeacher && !isOwner) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (isOwner && !isTeacher && task.status === 'verified') {
            return res.status(400).json({ success: false, message: 'Cannot delete a verified task' });
        }

        await task.deleteOne();

        res.json({
            success: true,
            message: 'Task deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
