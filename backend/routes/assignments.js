const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadSubmission } = require('../config/cloudinary');
const Assignment = require('../models/Assignment');
const Enrollment = require('../models/Enrollment');

// @route   GET /api/assignments/course/:courseId
// @desc    Get assignments for a course
// @access  Private
router.get('/course/:courseId', protect, async (req, res) => {
    try {
        const assignments = await Assignment.find({ course: req.params.courseId })
            .populate('createdBy', 'name')
            .populate('submissions.user', 'name email rollNo photo')
            .sort('-createdAt');

        res.json({ success: true, assignments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/assignments
// @desc    Create assignment
// @access  Private (Teacher, Admin)
router.post('/', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const { courseId, title, description, dueDate, totalMarks, assignTo, assignedUsers: selectedUsers, selectedUsers: altSelectedUsers } = req.body;

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        let assignedUsers = [];
        if (assignTo === 'all') {
            // Get all enrolled users (including pending so they see it immediately)
            const enrollments = await Enrollment.find({ course: courseId });
            assignedUsers = enrollments.map(e => e.user);
        } else {
            assignedUsers = selectedUsers || altSelectedUsers || [];
        }

        const assignment = await Assignment.create({
            course: courseId,
            title,
            description,
            dueDate,
            totalMarks: totalMarks || 100,
            assignTo,
            assignedUsers,
            createdBy: req.user.id
        });

        res.status(201).json({ success: true, assignment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/assignments/:id/submit
// @desc    Submit assignment
// @access  Private (Student, Intern)
router.post('/:id/submit', protect, uploadSubmission.single('file'), async (req, res) => {
    try {
        const { notes } = req.body;
        const assignment = await Assignment.findById(req.params.id);

        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        // Check if user is assigned
        if (assignment.assignTo !== 'all' && !assignment.assignedUsers.includes(req.user.id)) {
            return res.status(403).json({ success: false, message: 'Not assigned to this assignment' });
        }

        // Check if already submitted
        const existingSubmission = assignment.submissions.find(
            s => s.user.toString() === req.user.id
        );
        if (existingSubmission) {
            return res.status(400).json({ success: false, message: 'Already submitted' });
        }

        // Add submission
        assignment.submissions.push({
            user: req.user.id,
            notes,
            fileUrl: req.file ? req.file.path : null,
            submittedAt: new Date()
        });

        await assignment.save();

        res.json({ success: true, message: 'Assignment submitted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/assignments/:assignmentId/grade/:submissionId
// @desc    Grade a submission
// @access  Private (Teacher, Admin)
router.put('/:assignmentId/grade/:submissionId', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const { marks, feedback } = req.body;
        const assignment = await Assignment.findById(req.params.assignmentId);

        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        const submission = assignment.submissions.id(req.params.submissionId);
        if (!submission) {
            return res.status(404).json({ success: false, message: 'Submission not found' });
        }

        submission.marks = marks;
        submission.feedback = feedback;
        submission.gradedBy = req.user.id;
        submission.gradedAt = new Date();

        await assignment.save();

        res.json({ success: true, assignment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/assignments/my
// @desc    Get assignments for current user
// @access  Private
router.get('/my', protect, async (req, res) => {
    try {
        // Get user's enrolled courses (including pending or completed)
        const enrollments = await Enrollment.find({ user: req.user.id });
        const courseIds = enrollments.map(e => e.course);

        // Get assignments for those courses
        const assignments = await Assignment.find({
            course: { $in: courseIds },
            $or: [
                { assignTo: 'all' },
                { assignedUsers: req.user.id }
            ]
        })
            .populate('course', 'title')
            .sort('-createdAt');

        res.json({ success: true, assignments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
