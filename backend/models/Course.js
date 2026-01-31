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
    durationMonths: {
        type: Number,
        required: [true, 'Duration is required'],
        min: [1, 'Duration must be at least 1 month'],
        max: [10, 'Duration cannot exceed 10 months']
    },
    city: {
        type: String,
        enum: ['Bahawalpur', 'Islamabad'],
        required: [true, 'City is required']
    },
    teachers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
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
    maxStudents: {
        type: Number,
        default: 50
    },
    enrolledCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    category: {
        type: String,
        default: 'General'
    },
    rating: {
        type: Number,
        default: 0
    },
    bookLink: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Course', courseSchema);
