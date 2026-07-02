const mongoose = require('mongoose');

const globalMessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        default: null  // null = admin chat, set = course chat
    },
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PaidTask',
        default: null
    },
    isRead: {
        type: Boolean,
        default: false
    },
    isBot: {
        type: Boolean,
        default: false
    },
    options: [
        {
            label: { type: String },
            value: { type: String }
        }
    ]
}, {
    timestamps: true
});

// Index for efficient querying
globalMessageSchema.index({ sender: 1, recipient: 1, course: 1 });
globalMessageSchema.index({ task: 1, sender: 1, recipient: 1, isRead: 1 });

module.exports = mongoose.model('GlobalMessage', globalMessageSchema);
