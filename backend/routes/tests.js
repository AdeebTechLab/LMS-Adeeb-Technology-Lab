const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Test = require('../models/Test');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const mongoose = require('mongoose');

// @route   GET /api/tests/course/:courseId
// @desc    Get all tests for a course
// @access  Private
router.get('/course/:courseId', protect, async (req, res) => {
    try {
        let query = Test.find({ course: req.params.courseId })
            .populate('createdBy', 'name')
            .sort('-createdAt');

        // Only populate submission details for teachers/admins
        if (req.user.role === 'teacher' || req.user.role === 'admin') {
            query = query.populate('submissions.user', 'name photo rollNo');
        }

        const tests = await query;

        // If student, filter out answers from questions to prevent cheating
        if (req.user.role === 'student' || req.user.role === 'intern') {
            const userId = req.user.id.toString();
            
            const studentTests = tests.filter(test => {
                const isAssigned = test.assignTo === 'all' || test.assignedUsers?.some(id => id.toString() === userId);
                const isPublished = !test.scheduledAt || new Date(test.scheduledAt) <= new Date();
                return isAssigned && isPublished;
            });

            const sanitizedTests = studentTests.map(test => {
                const testObj = test.toObject();
                // Filter submissions to only show current user's
                testObj.submissions = testObj.submissions.filter(s => {
                    const subUserId = (s.user._id || s.user).toString();
                    return subUserId === userId;
                });
                
                // Remove correctOption from questions if user hasn't submitted yet
                if (testObj.submissions.length === 0) {
                    testObj.questions = testObj.questions.map(q => {
                        const { correctOption, ...rest } = q;
                        return rest;
                    });
                }
                return testObj;
            });
            return res.json({ success: true, tests: sanitizedTests });
        }

        res.json({ success: true, tests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/tests
// @desc    Create a new test
// @access  Private (Teacher, Admin)
router.post('/', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const { courseId, title, description, questions, duration, dueDate, scheduledAt, assignTo, assignedUsers } = req.body;

        const totalMarks = questions.length;

        const test = await Test.create({
            course: courseId,
            title,
            description,
            questions,
            totalMarks,
            duration,
            dueDate: dueDate || null,
            scheduledAt: scheduledAt || null,
            assignTo: assignTo || 'all',
            assignedUsers: assignedUsers || [],
            createdBy: req.user.id
        });

        res.status(201).json({ success: true, test });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/tests/:id/submit
// @desc    Submit test answers and auto-grade
// @access  Private (Student, Intern)
router.post('/:id/submit', protect, async (req, res) => {
    try {
        const { answers } = req.body;
        const test = await Test.findById(req.params.id);

        if (!test) {
            return res.status(404).json({ success: false, message: 'Test not found' });
        }

        // Check if already submitted
        const existingSubmission = test.submissions.find(
            s => s.user.toString() === req.user.id
        );

        if (existingSubmission) {
            return res.status(400).json({ success: false, message: 'Test already submitted' });
        }

        // Auto-grading logic
        let score = 0;
        const processedAnswers = answers.map(ans => {
            const question = test.questions.id(ans.questionId);
            if (question && question.correctOption === ans.selectedOption) {
                score += 1;
            }
            return ans;
        });

        const submission = {
            user: req.user.id,
            answers: processedAnswers,
            score,
            totalPossibleScore: test.totalMarks,
            submittedAt: new Date()
        };

        test.submissions.push(submission);
        await test.save();

        res.json({ 
            success: true, 
            message: 'Test submitted and graded successfully',
            score,
            totalMarks: test.totalMarks,
            questions: test.questions // Now including correctOption
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/tests/:id
// @desc    Update a test
// @access  Private (Teacher, Admin)
router.put('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const { title, description, questions, duration, dueDate, scheduledAt, assignTo, assignedUsers } = req.body;

        const totalMarks = questions ? questions.length : 0;

        const updatedData = {
            title,
            description,
            questions,
            totalMarks,
            duration,
            dueDate: dueDate || null,
            scheduledAt: scheduledAt || null,
            assignTo: assignTo || 'all',
            assignedUsers: assignedUsers || []
        };

        const test = await Test.findByIdAndUpdate(req.params.id, updatedData, { new: true });

        if (!test) {
            return res.status(404).json({ success: false, message: 'Test not found' });
        }

        res.json({ success: true, test });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/tests/:id
// @desc    Delete a test
// @access  Private (Teacher, Admin)
router.delete('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const test = await Test.findById(req.params.id);
        if (!test) return res.status(404).json({ success: false, message: 'Test not found' });
        
        await test.deleteOne();
        res.json({ success: true, message: 'Test deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
