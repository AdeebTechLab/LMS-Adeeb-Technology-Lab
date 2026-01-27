const mongoose = require('mongoose');

const applicantSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: String,
    appliedAt: {
        type: Date,
        default: Date.now
    }
});

const paidTaskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Description is required']
    },
    budget: {
        type: Number,
        required: [true, 'Budget is required']
    },
    deadline: {
        type: Date,
        required: [true, 'Deadline is required']
    },
    skills: String,
    category: {
        type: String,
        enum: ['web', 'ai', 'mobile', 'design', 'other'],
        default: 'web'
    },
    status: {
        type: String,
        enum: ['open', 'assigned', 'submitted', 'completed'],
        default: 'open'
    },
    applicants: [applicantSchema],
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedAt: Date,
    submission: {
        notes: String,
        projectLink: String,
        fileUrl: String,
        accountDetails: String,
        submittedAt: Date
    },
    paymentSent: {
        type: Boolean,
        default: false
    },
    paymentSentAt: Date,
    messages: [{
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        text: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    lastReadByAdmin: {
        type: Date,
        default: Date.now
    },
    lastReadByJober: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PaidTask', paidTaskSchema);
