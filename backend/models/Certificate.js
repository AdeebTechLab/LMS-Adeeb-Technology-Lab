const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    rollNo: {
        type: String,
        required: true
    },
    skills: String,
    duration: String,
    issuedAt: {
        type: Date,
        default: Date.now
    },
    issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Compound index for user + course
certificateSchema.index({ user: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Certificate', certificateSchema);
