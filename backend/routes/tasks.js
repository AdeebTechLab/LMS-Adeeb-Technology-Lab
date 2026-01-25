const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadSubmission } = require('../config/cloudinary');
const PaidTask = require('../models/PaidTask');
const User = require('../models/User');

// @route   GET /api/tasks
// @desc    Get all tasks
// @access  Public (for browsing), but different views based on role
router.get('/', async (req, res) => {
    try {
        const { status, search } = req.query;

        let query = {};
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { skills: { $regex: search, $options: 'i' } }
            ];
        }

        const tasks = await PaidTask.find(query)
            .populate('assignedTo', 'name email')
            .populate('applicants.user', 'name email phone skills experience portfolio completedTasks rating')
            .populate('messages.sender', 'name role')
            .sort('-createdAt');

        res.json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/tasks
// @desc    Create new task
// @access  Private (Admin)
router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        const task = await PaidTask.create({
            ...req.body,
            createdBy: req.user.id
        });

        res.status(201).json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/tasks/:id/apply
// @desc    Apply for a task
// @access  Private (Job role)
router.post('/:id/apply', protect, authorize('job'), async (req, res) => {
    try {
        const { message } = req.body;
        const task = await PaidTask.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        if (task.status !== 'open') {
            return res.status(400).json({ success: false, message: 'Task is not open for applications' });
        }

        // Check if already applied
        const alreadyApplied = task.applicants.some(
            a => a.user.toString() === req.user.id
        );
        if (alreadyApplied) {
            return res.status(400).json({ success: false, message: 'Already applied for this task' });
        }

        task.applicants.push({
            user: req.user.id,
            message,
            appliedAt: new Date()
        });

        await task.save();

        res.json({ success: true, message: 'Application submitted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/tasks/:id/assign
// @desc    Assign task to an applicant
// @access  Private (Admin)
router.put('/:id/assign', protect, authorize('admin'), async (req, res) => {
    try {
        const { userId } = req.body;
        const task = await PaidTask.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        task.assignedTo = userId;
        task.assignedAt = new Date();
        task.status = 'assigned';

        await task.save();

        res.json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/tasks/:id/submit
// @desc    Submit task work
// @access  Private (Assigned user)
router.post('/:id/submit', protect, uploadSubmission.single('file'), async (req, res) => {
    try {
        const { notes, projectLink, accountDetails } = req.body;
        const task = await PaidTask.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        if (task.assignedTo.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        task.submission = {
            notes,
            projectLink,
            fileUrl: req.file ? req.file.path : null,
            accountDetails,
            submittedAt: new Date()
        };
        task.status = 'submitted';

        await task.save();

        res.json({ success: true, message: 'Work submitted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/tasks/:id/complete
// @desc    Verify and mark payment sent
// @access  Private (Admin)
router.put('/:id/complete', protect, authorize('admin'), async (req, res) => {
    try {
        const task = await PaidTask.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        task.status = 'completed';
        task.paymentSent = true;
        task.paymentSentAt = new Date();

        await task.save();

        // Update user's completed tasks count
        await User.findByIdAndUpdate(task.assignedTo, {
            $inc: { completedTasks: 1 }
        });

        res.json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/tasks/my
// @desc    Get tasks for current job user
// @access  Private (Job role)
router.get('/my', protect, authorize('job'), async (req, res) => {
    try {
        // Get tasks where user applied or is assigned
        const tasks = await PaidTask.find({
            $or: [
                { 'applicants.user': req.user.id },
                { assignedTo: req.user.id }
            ]
        })
            .populate('messages.sender', 'name role')
            .sort('-createdAt');

        res.json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/tasks/:id/messages
// @desc    Get chat messages for a task
// @access  Private (Admin or Assigned User)
router.get('/:id/messages', protect, async (req, res) => {
    try {
        const task = await PaidTask.findById(req.params.id)
            .populate('messages.sender', 'name role');

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        // Check authorization
        const isAdmin = req.user.role === 'admin';
        const isAssigned = task.assignedTo && task.assignedTo.toString() === req.user.id;

        if (!isAdmin && !isAssigned) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        res.json({ success: true, messages: task.messages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/tasks/:id/messages
// @desc    Add a message to task chat
// @access  Private (Admin or Assigned User)
router.post('/:id/messages', protect, async (req, res) => {
    try {
        const { text } = req.body;
        const task = await PaidTask.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        // Check if user is admin or the assigned user
        const isAdmin = req.user.role === 'admin';
        const isAssigned = task.assignedTo && task.assignedTo.toString() === req.user.id;

        if (!isAdmin && !isAssigned) {
            return res.status(403).json({ success: false, message: 'Not authorized to chat on this task' });
        }

        task.messages.push({
            sender: req.user.id,
            text,
            createdAt: new Date()
        });

        await task.save();

        // Populate sender details for the response
        const updatedTask = await PaidTask.findById(task._id).populate('messages.sender', 'name role');
        const newMessage = updatedTask.messages[updatedTask.messages.length - 1];

        res.json({ success: true, message: newMessage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/tasks/:id/read
// @desc    Mark messages as read
// @access  Private (Admin or Assigned User)
router.put('/:id/read', protect, async (req, res) => {
    try {
        const task = await PaidTask.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        const isAdmin = req.user.role === 'admin';
        const isAssigned = task.assignedTo && task.assignedTo.toString() === req.user.id;

        if (!isAdmin && !isAssigned) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (isAdmin) {
            task.lastReadByAdmin = new Date();
        } else {
            task.lastReadByJober = new Date();
        }

        await task.save();

        res.json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/tasks/:id
// @desc    Permanently delete a task
// @access  Private (Admin or Assigned User)
router.delete('/:id', protect, async (req, res) => {
    try {
        const task = await PaidTask.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        // Check if user is admin or the assigned user
        const isAdmin = req.user.role === 'admin';
        const isAssigned = task.assignedTo && task.assignedTo.toString() === req.user.id;

        if (!isAdmin && !isAssigned) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this task' });
        }

        await PaidTask.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: 'Task permanently deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
