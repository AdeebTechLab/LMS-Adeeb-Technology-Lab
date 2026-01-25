const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Course title is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Description is required']
    },
    fee: {
        type: Number,
        required: [true, 'Fee is required']
    },
    duration: {
        type: String,
        required: [true, 'Duration is required']
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    jober: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    targetAudience: {
        type: String,
        enum: ['students', 'interns'],
        required: true
    },
    location: {
        type: String,
        enum: ['islamabad', 'bahawalpur'],
        required: [true, 'Location is required']
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required']
    },
    maxStudents: {
        type: Number,
        default: 50
    },
    enrolledCount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'upcoming'],
        default: 'upcoming'
    },
    category: {
        type: String,
        default: 'General'
    },
    rating: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Update status based on dates
courseSchema.pre('save', function (next) {
    const now = new Date();
    if (now < this.startDate) {
        this.status = 'upcoming';
    } else if (now >= this.startDate && now <= this.endDate) {
        this.status = 'active';
    } else {
        this.status = 'completed';
    }
    next();
});

module.exports = mongoose.model('Course', courseSchema);
