const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Notification title is required'],
        trim: true
    },
    message: {
        type: String,
        required: [true, 'Notification message is required'],
        trim: true
    },
    type: {
        type: String,
        enum: ['info', 'warning', 'success', 'error'],
        default: 'info'
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Virtual to check if notification is currently active based on time
notificationSchema.virtual('isCurrentlyEffective').get(function () {
    const now = new Date();
    return this.isActive && now >= this.startDate && now <= this.endDate;
});

module.exports = mongoose.model('Notification', notificationSchema);
