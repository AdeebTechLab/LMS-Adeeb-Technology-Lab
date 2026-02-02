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
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for efficient querying
globalMessageSchema.index({ sender: 1, recipient: 1, course: 1 });

module.exports = mongoose.model('GlobalMessage', globalMessageSchema);
