const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect, authorize } = require('../middleware/auth');
const GlobalMessage = require('../models/GlobalMessage');
const User = require('../models/User');

// @route   GET /api/chat/messages/:otherUserId
// @desc    Get messages with a specific user
// @access  Private (Admin or the user themselves)
router.get('/messages/:otherUserId', protect, async (req, res) => {
    try {
        const myId = req.user.id;
        const otherId = req.params.otherUserId;

        // Ensure authorization: Admin can see any chat, Users can only see their own chats
        if (req.user.role !== 'admin' && myId !== otherId) {
            // Check if this user is trying to fetch someone else's chat with admin
            // This case should be handled by logic: User chats with admin, so recipient is admin
        }

        const messages = await GlobalMessage.find({
            $or: [
                { sender: myId, recipient: otherId },
                { sender: otherId, recipient: myId }
            ]
        }).sort('createdAt');

        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/chat/messages
// @desc    Send a message
// @access  Private
router.post('/messages', protect, async (req, res) => {
    try {
        const { recipientId, text } = req.body;
        const senderId = req.user.id;

        const message = await GlobalMessage.create({
            sender: senderId,
            recipient: recipientId,
            text
        });

        const populatedMessage = await GlobalMessage.findById(message._id)
            .populate('sender', 'name role')
            .populate('recipient', 'name role');

        // Emit via socket for real-time update
        const io = req.app.get('io');
        if (io) {
            const socketData = {
                ...populatedMessage.toObject(),
                senderId: senderId,
                recipientId: recipientId,
                senderName: populatedMessage.sender.name
            };
            io.to(recipientId.toString()).emit('new_global_message', socketData);
            io.to(senderId.toString()).emit('new_global_message', socketData);
        }

        res.status(201).json({ success: true, data: populatedMessage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/chat/conversations
// @desc    Get list of conversations (Admin only)
// @access  Private (Admin)
router.get('/conversations', protect, authorize('admin'), async (req, res) => {
    try {
        // Aggregate to find unique users who have messaged admin or admin messaged them
        const adminId = new mongoose.Types.ObjectId(req.user.id);

        const conversations = await GlobalMessage.aggregate([
            {
                $match: {
                    $or: [{ sender: adminId }, { recipient: adminId }]
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ["$sender", adminId] },
                            "$recipient",
                            "$sender"
                        ]
                    },
                    lastMessage: { $first: "$text" },
                    lastMessageAt: { $first: "$createdAt" },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$recipient", adminId] }, { $eq: ["$isRead", false] }] },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: "$user" },
            {
                $project: {
                    _id: 1,
                    lastMessage: 1,
                    lastMessageAt: 1,
                    unreadCount: 1,
                    "user._id": 1,
                    "user.name": 1,
                    "user.role": 1,
                    "user.email": 1,
                    "user.photo": 1
                }
            },
            { $sort: { lastMessageAt: -1 } }
        ]);

        res.json({ success: true, data: conversations });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/chat/read/:senderId
// @desc    Mark messages as read
// @access  Private
router.put('/read/:senderId', protect, async (req, res) => {
    try {
        const recipientId = req.user.id;
        const senderId = req.params.senderId;

        await GlobalMessage.updateMany(
            { sender: senderId, recipient: recipientId, isRead: false },
            { $set: { isRead: true } }
        );

        res.json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/chat/unread
// @desc    Get total unread count for current user
// @access  Private
router.get('/unread', protect, async (req, res) => {
    try {
        const count = await GlobalMessage.countDocuments({
            recipient: req.user.id,
            isRead: false
        });
        res.json({ success: true, count });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// @route   POST /api/chat/action/clear-messages/:userId
// @desc    Delete ALL messages with a user (Admin only)
// @access  Private (Admin)
router.post('/action/clear-messages/:userId', protect, authorize('admin'), async (req, res) => {
    try {
        const adminId = req.user.id;
        const otherUserId = req.params.userId;

        console.log(`[CHAT CLEAR] Admin ${adminId} requested to CLEAR MESSAGES ONLY with User ${otherUserId}`);

        // 1. Verify User exists before doing anything
        const targetUser = await User.findById(otherUserId);
        if (!targetUser) {
            console.log(`[CHAT CLEAR] Failed: Target user ${otherUserId} not found.`);
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // 2. STRICTLY only delete messages from GlobalMessage collection
        const result = await GlobalMessage.deleteMany({
            $or: [
                { sender: adminId, recipient: otherUserId },
                { sender: otherUserId, recipient: adminId }
            ]
        });

        // 3. SECURE CHECK: Verify user still exists
        const userCheck = await User.findById(otherUserId);
        if (userCheck) {
            console.log(`[CHAT CLEAR] SUCCESS: Removed ${result.deletedCount} messages. VERIFIED: User ${userCheck.name} still exists in database.`);
        } else {
            console.error(`[CHAT CLEAR] CRITICAL ERROR: User ${otherUserId} was deleted during chat cleanup! This shouldn't happen.`);
        }

        res.json({
            success: true,
            message: 'Chat history cleared successfully. User account was NOT affected.',
            messagesRemoved: result.deletedCount
        });
    } catch (error) {
        console.error('[CHAT CLEAR] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =====================================================
// COURSE-BASED CHAT ROUTES
// =====================================================

const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

// @route   GET /api/chat/course/:courseId/messages/:userId
// @desc    Get messages in a course between two users
// @access  Private
router.get('/course/:courseId/messages/:userId', protect, async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const userId = req.params.userId;
        const myId = req.user.id;

        const messages = await GlobalMessage.find({
            course: courseId,
            $or: [
                { sender: myId, recipient: userId },
                { sender: userId, recipient: myId }
            ]
        }).sort('createdAt');

        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/chat/course/:courseId/send
// @desc    Send a message in a course
// @access  Private
router.post('/course/:courseId/send', protect, async (req, res) => {
    try {
        const { recipientId, text } = req.body;
        const courseId = req.params.courseId;
        const senderId = req.user.id;

        const message = await GlobalMessage.create({
            sender: senderId,
            recipient: recipientId,
            text,
            course: courseId
        });

        const populatedMessage = await GlobalMessage.findById(message._id)
            .populate('sender', 'name role')
            .populate('recipient', 'name role');

        // Emit via socket for real-time update
        const io = req.app.get('io');
        if (io) {
            const socketData = {
                ...populatedMessage.toObject(),
                senderId: senderId,
                recipientId: recipientId,
                senderName: populatedMessage.sender.name,
                course: courseId,
                courseId: courseId
            };
            io.to(recipientId.toString()).emit('new_global_message', socketData);
            io.to(senderId.toString()).emit('new_global_message', socketData);
        }

        res.status(201).json({ success: true, data: populatedMessage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/chat/teacher/courses
// @desc    Get teacher's courses with enrolled students for chat
// @access  Private (Teacher)
router.get('/teacher/courses', protect, authorize('teacher'), async (req, res) => {
    try {
        const teacherId = req.user.id;

        // Get courses where this teacher is assigned
        const courses = await Course.find({
            teachers: teacherId
        }).select('title _id');

        // For each course, get enrolled students with unread message counts
        const coursesWithStudents = await Promise.all(courses.map(async (course) => {
            const enrollments = await Enrollment.find({
                course: course._id,
                status: { $in: ['pending', 'enrolled'] }
            }).populate('user', 'name email photo role');

            // Get unread counts per student for this course
            const studentsWithUnread = await Promise.all(enrollments.map(async (enrollment) => {
                if (!enrollment.user) return null;

                const unreadCount = await GlobalMessage.countDocuments({
                    sender: enrollment.user._id,
                    recipient: teacherId,
                    course: course._id,
                    isRead: false
                });

                return {
                    _id: enrollment.user._id,
                    name: enrollment.user.name,
                    email: enrollment.user.email,
                    photo: enrollment.user.photo,
                    role: enrollment.user.role,
                    unreadCount
                };
            }));

            const validStudents = studentsWithUnread.filter(s => s !== null);
            const totalUnread = validStudents.reduce((sum, s) => sum + s.unreadCount, 0);

            return {
                _id: course._id,
                title: course.title,
                students: validStudents,
                totalUnread
            };
        }));

        res.json({ success: true, data: coursesWithStudents });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/chat/student/courses
// @desc    Get student's enrolled courses with their teachers for chat
// @access  Private (Student/Intern)
router.get('/student/courses', protect, authorize('student', 'intern'), async (req, res) => {
    try {
        const studentId = req.user.id;

        // Get student's enrollments
        const enrollments = await Enrollment.find({
            user: studentId,
            status: { $in: ['pending', 'enrolled'] }
        }).populate({
            path: 'course',
            select: 'title teachers',
            populate: {
                path: 'teachers',
                select: 'name email photo'
            }
        });

        // Build list of courses with teachers and unread counts
        const coursesWithTeachers = await Promise.all(enrollments.map(async (enrollment) => {
            if (!enrollment.course) return null;

            const teachersWithUnread = await Promise.all((enrollment.course.teachers || []).map(async (teacher) => {
                const unreadCount = await GlobalMessage.countDocuments({
                    sender: teacher._id,
                    recipient: studentId,
                    course: enrollment.course._id,
                    isRead: false
                });

                return {
                    _id: teacher._id,
                    name: teacher.name,
                    email: teacher.email,
                    photo: teacher.photo,
                    unreadCount
                };
            }));

            const totalUnread = teachersWithUnread.reduce((sum, t) => sum + t.unreadCount, 0);

            return {
                _id: enrollment.course._id,
                title: enrollment.course.title,
                teachers: teachersWithUnread,
                totalUnread
            };
        }));

        res.json({ success: true, data: coursesWithTeachers.filter(c => c !== null) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/chat/search
// @desc    Search users by email (Admin/Teacher only)
// @access  Private (Admin/Teacher)
router.get('/search', protect, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const { email, courseId } = req.query;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        let query = {
            email: { $regex: email, $options: 'i' }
        };

        // If teacher, only search within their courses' students
        if (req.user.role === 'teacher' && courseId) {
            const enrollments = await Enrollment.find({
                course: courseId,
                status: { $in: ['pending', 'enrolled'] }
            }).select('user');

            const studentIds = enrollments.map(e => e.user);
            query._id = { $in: studentIds };
        }

        const users = await User.find(query)
            .select('name email photo role')
            .limit(10);

        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/chat/course/:courseId/read/:senderId
// @desc    Mark course messages as read
// @access  Private
router.put('/course/:courseId/read/:senderId', protect, async (req, res) => {
    try {
        const recipientId = req.user.id;
        const senderId = req.params.senderId;
        const courseId = req.params.courseId;

        await GlobalMessage.updateMany(
            { sender: senderId, recipient: recipientId, course: courseId, isRead: false },
            { $set: { isRead: true } }
        );

        res.json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
