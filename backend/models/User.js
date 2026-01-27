const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
        select: false
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    phone: {
        type: String,
        trim: true
    },
    photo: {
        type: String, // Cloudinary URL
        default: null
    },
    role: {
        type: String,
        enum: ['admin', 'teacher', 'student', 'intern', 'job'],
        default: 'student'
    },
    rollNo: {
        type: String,
        sparse: true // allows multiple null values
    },
    // Additional fields for job role
    skills: String,
    experience: String,
    portfolio: String,
    completedTasks: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    // Location preference
    location: {
        type: String,
        enum: ['islamabad', 'bahawalpur', ''],
        default: ''
    },
    // Common fields
    cnic: String,
    // Student/Intern specific fields
    dob: Date,
    age: String,
    gender: String,
    education: String,
    guardianName: String,
    guardianPhone: String,
    guardianOccupation: String,
    address: String,
    city: String,
    country: { type: String, default: 'Pakistan' },
    attendType: String, // Physical/Online
    heardAbout: String,
    // Teacher specific
    specialization: String,
    department: String,
    qualification: String,
    // Verification status
    isVerified: {
        type: Boolean,
        default: false
    },
    verifiedAt: Date,
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
userSchema.methods.getSignedJwtToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

module.exports = mongoose.model('User', userSchema);
