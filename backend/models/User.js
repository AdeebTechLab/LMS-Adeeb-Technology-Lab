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
    feeScreenshot: {
        type: String, // Cloudinary URL or external link
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
    teachingExperience: String,
    experienceDetails: String,
    preferredCity: String,
    preferredMode: String,
    cvUrl: String,
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
    fatherName: String, // Added for all user types
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
    // Intern academic fields
    degree: String,
    university: String,
    department: String,
    semester: String,
    rollNumber: String,
    cgpa: String,
    majorSubjects: String,
    // Teacher specific
    specialization: String,
    qualification: String,
    // Verification status (true by default, admin can revoke)
    isVerified: {
        type: Boolean,
        default: true
    },
    verifiedAt: Date,
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Compound unique index for email and role
userSchema.index({ email: 1, role: 1 }, { unique: true });

// Hash password before saving - DISABLED AS PER USER REQUEST
// userSchema.pre('save', async function (next) {
//     if (!this.isModified('password')) {
//         next();
//     }
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
// });

// Match password
userSchema.methods.matchPassword = async function (enteredPassword) {
    // Plain text comparison
    return enteredPassword === this.password;
    // return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
userSchema.methods.getSignedJwtToken = function (expiresIn) {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: expiresIn || process.env.JWT_EXPIRE || '30d'
    });
};

module.exports = mongoose.model('User', userSchema);
