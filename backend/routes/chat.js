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
                    "user.name": 1,
                    "user.role": 1,
                    "user.email": 1
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
// @route   DELETE /api/chat/conversations/:userId
// @desc    Delete a conversation (Admin only)
// @access  Private (Admin)
router.delete('/conversations/:userId', protect, authorize('admin'), async (req, res) => {
    try {
        const adminId = req.user.id;
        const otherUserId = req.params.userId;

        // Delete all messages between admin and this user
        await GlobalMessage.deleteMany({
            $or: [
                { sender: adminId, recipient: otherUserId },
                { sender: otherUserId, recipient: adminId }
            ]
        });

        res.json({ success: true, message: 'Conversation deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
