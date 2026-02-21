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
        type: String, // Changed to String to allow ranges (e.g., "1500-2500")
        required: [true, 'Budget is required']
    },
    deadline: {
        type: Date,
        required: [true, 'Deadline is required']
    },
    skills: String,
    category: {
        type: String,
        enum: [
            'web', 'ai', 'mobile', 'design', 'other',
            'Office Work [IT]', 'Freelancing', 'Digital Marketing, Ads',
            'Video Editing', 'Graphic Designer', 'E-Commerce',
            'UX/UI Designing', 'Youtuber Course', 'Home Architecture',
            'Web Development', 'App Development', 'App Dev Without Coding',
            'Web Dev Without Coding', 'Cyber Security', 'Machine learning',
            'Internet of Thing [IOT]', 'Programming', 'Taxation',
            'Trading', 'Truck Dispatching', 'Software Development'
        ],
        default: 'web'
    },
    status: {
        type: String,
        enum: ['open', 'assigned', 'submitted', 'completed'],
        default: 'open'
    },
    applicants: [applicantSchema],
    assignedTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    assignedAt: Date,
    submissions: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        notes: String,
        projectLink: String,
        fileUrl: String,
        accountDetails: String,
        submittedAt: Date
    }],
    paymentSent: {
        type: Boolean,
        default: false
    },
    paymentSentAt: Date,
    feedback: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        text: String,
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PaidTask', paidTaskSchema);
