const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadSubmission } = require('../config/cloudinary');
const Assignment = require('../models/Assignment');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

// @route   GET /api/assignments/course/:courseId
// @desc    Get assignments for a course
// @access  Private (Teacher, Admin)
router.get('/course/:courseId', protect, authorize('teacher', 'admin'), async (req, res) => {
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
        const existingSubmissionIndex = assignment.submissions.findIndex(
            s => s.user.toString() === req.user.id
        );

        if (existingSubmissionIndex !== -1) {
            const existingSubmission = assignment.submissions[existingSubmissionIndex];
            // Only allow resubmission if it was rejected
            if (existingSubmission.status !== 'rejected') {
                return res.status(400).json({ success: false, message: 'Already submitted and not rejected' });
            }
            // Remove the old submission to allow adding a new one (or just overwrite it)
            assignment.submissions.splice(existingSubmissionIndex, 1);
        }

        // Add submission
        assignment.submissions.push({
            user: req.user.id,
            notes: notes || req.body.notes,
            fileUrl: req.file ? req.file.path : req.body.fileUrl || null,
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
        const { marks, feedback, status } = req.body;
        const assignment = await Assignment.findById(req.params.assignmentId);

        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        const submission = assignment.submissions.id(req.params.submissionId);
        if (!submission) {
            return res.status(404).json({ success: false, message: 'Submission not found' });
        }

        submission.marks = marks !== undefined ? marks : submission.marks;
        submission.feedback = feedback || submission.feedback;
        submission.status = status || 'graded';
        submission.gradedBy = req.user.id;
        submission.gradedAt = new Date();

        await assignment.save();

        res.json({ success: true, assignment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/assignments/my
// @desc    Get assignments for current user (only those created after user registration)
// @access  Private
router.get('/my', protect, async (req, res) => {
    try {
        // Get user's enrolled courses and registration date
        const enrollments = await Enrollment.find({ user: req.user.id });
        const courseIds = enrollments.map(e => e.course);

        // Get user registration date from first enrollment (all should have same registrationDate)
        const userRegistrationDate = enrollments.length > 0 && enrollments[0].registrationDate
            ? enrollments[0].registrationDate
            : new Date(0); // Fallback to epoch if no registration date

        // Get assignments for those courses
        const assignments = await Assignment.find({
            course: { $in: courseIds },
            $or: [
                {
                    createdAt: { $gte: userRegistrationDate },
                    assignTo: 'all'
                },
                { assignedUsers: req.user.id },
                { "submissions.user": req.user.id } // Always include if there's a submission
            ]
        })
            .populate('course', 'title')
            .sort('-createdAt');

        // SECURITY: Only return the current user's submission
        const sanitizedAssignments = assignments.map(assignment => {
            const assignmentObj = assignment.toObject();
            if (assignmentObj.submissions) {
                assignmentObj.submissions = assignmentObj.submissions.filter(
                    s => s.user.toString() === req.user.id
                );
            }
            return assignmentObj;
        });

        res.json({ success: true, assignments: sanitizedAssignments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/assignments/:id
// @desc    Update assignment
// @access  Private (Teacher, Admin)
router.put('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const assignment = await Assignment.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        res.json({ success: true, assignment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/assignments/:id
// @desc    Delete assignment
// @access  Private (Teacher, Admin)
router.delete('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);

        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        await assignment.deleteOne();
        res.json({ success: true, message: 'Assignment deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
