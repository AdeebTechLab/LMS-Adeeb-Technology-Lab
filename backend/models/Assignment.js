const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fileUrl: String,
    notes: String,
    submittedAt: {
        type: Date,
        default: Date.now
    },
    marks: Number,
    feedback: String,
    gradedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    gradedAt: Date
});

const assignmentSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Title is required']
    },
    description: String,
    dueDate: {
        type: Date,
        required: true
    },
    totalMarks: {
        type: Number,
        default: 100
    },
    assignTo: {
        type: String,
        enum: ['all', 'selected'],
        default: 'all'
    },
    assignedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    submissions: [submissionSchema],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Assignment', assignmentSchema);
