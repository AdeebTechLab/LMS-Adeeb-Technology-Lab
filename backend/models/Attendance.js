const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['present', 'absent'],
        default: 'absent'
    },
    markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    markedAt: Date
});

const attendanceSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    records: [attendanceRecordSchema],
    isLocked: {
        type: Boolean,
        default: false
    },
    isHoliday: {
        type: Boolean,
        default: false
    },
    lockedAt: Date
}, {
    timestamps: true
});

// Compound index for course + date
attendanceSchema.index({ course: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
