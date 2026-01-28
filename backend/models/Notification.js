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
    isHtml: {
        type: Boolean,
        default: false
    },
    showLifetime: {
        type: Boolean,
        default: false
    },
    startDate: {
        type: Date,
        required: function () {
            return !this.showLifetime;
        }
    },
    endDate: {
        type: Date,
        required: function () {
            return !this.showLifetime;
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    targetAudience: {
        type: [String],
        enum: ['all', 'student', 'teacher', 'intern', 'course_creator', 'job'],
        default: ['all']
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
    if (!this.isActive) return false;
    if (this.showLifetime) return true;
    const now = new Date();
    return now >= this.startDate && now <= this.endDate;
});

module.exports = mongoose.model('Notification', notificationSchema);
