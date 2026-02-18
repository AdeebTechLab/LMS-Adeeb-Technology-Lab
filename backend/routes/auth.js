const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { protect } = require('../middleware/auth');
const { uploadPhoto, uploadRegistration } = require('../config/cloudinary');
const User = require('../models/User');

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', uploadRegistration.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'feeScreenshot', maxCount: 1 }
]), async (req, res) => {
    try {
        const {
            name, email, password, phone, role, location,
            // Job fields
            skills, experience, portfolio,
            // Teacher fields
            specialization, department, cnic, qualification,
            // Student/Intern fields
            dob, age, gender, education, guardianName, guardianPhone,
            guardianOccupation, address, city, country, attendType, heardAbout,
            fatherName, degree, university, semester, rollNumber, cgpa, majorSubjects,
            // Job fields
            teachingExperience, experienceDetails, preferredCity, preferredMode
        } = req.body;

        // CRITICAL: Use read preference 'primary' to avoid stale reads from replicas
        // This ensures we read from the same node we'll write to
        const existingUser = await User.findOne({ email, role: role || 'student' })
            .read('primary')
            .maxTimeMS(10000);

        if (existingUser) {
            return res.status(400).json({ success: false, message: `Account already exists for this email as a ${role || 'student'}` });
        }

        // Check if any user with this email already has a roll number
        let assignedRollNo = null;
        const otherUserWithSameEmail = await User.findOne({ email, rollNo: { $exists: true, $ne: null } })
            .read('primary')
            .maxTimeMS(10000);

        if (otherUserWithSameEmail) {
            assignedRollNo = otherUserWithSameEmail.rollNo;
            console.log(`Reusing roll number ${assignedRollNo} for email ${email}`);
        } else if (['student', 'intern'].includes(role || 'student')) {
            // Generate new roll number ONLY for students/interns if they don't have one yet
            const Counter = require('../models/Counter');
            assignedRollNo = await Counter.getNextRollNo();
            console.log(`Generated new roll number ${assignedRollNo} for email ${email}`);
        }

        // Create user
        const userData = {
            name,
            email,
            password,
            phone,
            role: role || 'student',
            location,
            isVerified: true, // Users are verified by default, admin can revoke
            rollNo: assignedRollNo
        };

        // Add photo if uploaded
        if (req.files && req.files['photo']) {
            userData.photo = req.files['photo'][0].path;
        }

        // Add fee screenshot if uploaded
        if (req.files && req.files['feeScreenshot']) {
            userData.feeScreenshot = req.files['feeScreenshot'][0].path;
        }

        // Add role-specific fields
        if (role === 'job') {
            userData.skills = skills;
            userData.experience = experience;
            userData.portfolio = portfolio;
            userData.cnic = cnic;
            userData.city = city;
            userData.qualification = qualification;
            userData.teachingExperience = teachingExperience;
            userData.experienceDetails = experienceDetails;
            userData.preferredCity = preferredCity;
            userData.preferredMode = preferredMode;
            userData.heardAbout = heardAbout;
            userData.fatherName = fatherName;
        }
        if (role === 'teacher') {
            userData.specialization = specialization;
            userData.department = department;
            userData.cnic = cnic;
            userData.qualification = qualification;
            userData.experience = experience;
            userData.dob = dob;
            userData.gender = gender;
            userData.address = address;
        }
        if (role === 'student' || role === 'intern') {
            userData.cnic = cnic;
            userData.dob = dob;
            userData.age = age;
            userData.gender = gender;
            userData.education = education;
            userData.guardianName = guardianName;
            userData.guardianPhone = guardianPhone;
            userData.guardianOccupation = guardianOccupation;
            userData.address = address;
            userData.city = city;
            userData.country = country || 'Pakistan';
            userData.attendType = attendType;
            userData.heardAbout = heardAbout;
            userData.fatherName = fatherName;
            userData.degree = degree;
            userData.university = university;
            userData.department = department; // Also used for interns
            userData.semester = semester;
            userData.rollNumber = rollNumber;
            userData.cgpa = cgpa;
            userData.majorSubjects = majorSubjects;
            // Also support URL if sent as string (fallback)
            if (req.body.feeScreenshotUrl && !userData.feeScreenshot) {
                userData.feeScreenshot = req.body.feeScreenshotUrl;
            }
        }

        let user;
        try {
            user = await User.create(userData);
        } catch (createError) {
            // Handle duplicate key error (E11000) - user was created by another request
            if (createError.code === 11000) {
                console.log(`⚠️ Duplicate key error for ${email} - user may already exist`);
                return res.status(400).json({
                    success: false,
                    message: `Account already exists for this email as a ${role || 'student'}. If you just registered, please try logging in.`
                });
            }
            throw createError; // Re-throw other errors
        }

        // For non-admins, return success message but no token
        if (user.role !== 'admin') {
            // Send Email Notification to Admin
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: 'info.AdeebTchLab@gmail.com',
                subject: 'New User Registration Notification',
                html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                            <div style="background-color: #0d2818; padding: 20px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0;">New Signup</h1>
                            </div>
                            <div style="padding: 20px; color: #333333;">
                                <p>A new user has registered on the <strong>AdeebTechLab LMS</strong>.</p>
                                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                    <p style="margin: 5px 0;"><strong>Name:</strong> ${user.name}</p>
                                    <p style="margin: 5px 0;"><strong>Email:</strong> ${user.email}</p>
                                    <p style="margin: 5px 0;"><strong>Role:</strong> <span style="text-transform: capitalize;">${user.role}</span></p>
                                    <p style="margin: 5px 0;"><strong>Phone:</strong> ${user.phone || 'N/A'}</p>
                                    <p style="margin: 5px 0;"><strong>Signup Date:</strong> ${new Date().toLocaleString()}</p>
                                </div>
                                <p>Please log in to the admin dashboard to view and verify this user.</p>
                                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="display: inline-block; padding: 12px 24px; background-color: #0d2818; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Login to Admin Panel</a>
                            </div>
                            <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #666666;">
                                This is an automated notification from AdeebTechLab LMS.
                            </div>
                        </div>
                    `
            };

            // Send email asynchronously without awaiting
            transporter.sendMail(mailOptions)
                .then(() => console.log('✅ Admin notification email sent for new user:', user.email))
                .catch(emailError => console.error('❌ Error sending admin notification email:', emailError));

            return res.status(201).json({
                success: true,
                message: 'Registration successful! Your account is pending admin verification. You will be able to login once verified.',
                isPending: true
            });
        }

        // Generate token for admins (if created via this route)
        const token = user.getSignedJwtToken();

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                photo: user.photo,
                rollNo: user.rollNo
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password, role, rememberMe } = req.body;

        // Validate
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        // 1. Try to find an admin user with this email first
        // Use primary read to ensure we get the latest data
        let user = await User.findOne({ email, role: 'admin' })
            .select('+password')
            .read('primary')
            .maxTimeMS(10000);

        // 2. If no admin or password doesn't match, check for the specific role
        if (!user) {
            // Build query for role-based login
            const query = { email };
            if (role) {
                query.role = role;
            }
            user = await User.findOne(query)
                .select('+password')
                .read('primary')
                .maxTimeMS(10000);
        }

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check if account has been revoked by admin
        if (user.role !== 'admin' && !user.isVerified) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been suspended by admin. Please contact support.',
                isRevoked: true
            });
        }

        // Generate token
        // If rememberMe is true, expire in 30 days. Otherwise, expire in 2 hours.
        const expiresIn = rememberMe ? '30d' : '2h';
        const token = user.getSignedJwtToken(expiresIn);

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                _id: user._id, // Include both for compatibility
                name: user.name,
                email: user.email,
                role: user.role,
                photo: user.photo,
                rollNo: user.rollNo,
                phone: user.phone,
                location: user.location,
                // Job fields
                skills: user.skills,
                experience: user.experience,
                portfolio: user.portfolio,
                completedTasks: user.completedTasks,
                rating: user.rating,
                // Teacher fields
                specialization: user.specialization,
                department: user.department,
                qualification: user.qualification,
                // Student/Intern fields
                cnic: user.cnic,
                dob: user.dob,
                age: user.age,
                gender: user.gender,
                education: user.education,
                guardianName: user.guardianName,
                guardianPhone: user.guardianPhone,
                guardianOccupation: user.guardianOccupation,
                address: user.address,
                city: user.city,
                country: user.country,
                attendType: user.attendType,
                heardAbout: user.heardAbout,
                feeScreenshot: user.feeScreenshot,
                // Common fields
                isVerified: user.isVerified,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
const SystemSetting = require('../models/SystemSetting'); // Import SystemSetting

// ... [existing imports]

// ... [lines 9-313]

router.put('/profile', protect, uploadPhoto.single('photo'), async (req, res) => {
    try {
        // Check Global Bio Editing Permission based on user role
        if (req.user.role !== 'admin') { // Admin always allowed
            // Use role-specific setting key
            const settingKey = `allowBioEditing_${req.user.role}`;
            const bioSetting = await SystemSetting.findOne({ key: settingKey });
            const isBioEditingAllowed = bioSetting ? bioSetting.value : false; // Default to false if not set

            // Check if user has no data - allow editing to fill initial data
            const user = await User.findById(req.user.id);
            const hasNoData = !user.phone && !user.city && !user.address;

            if (!isBioEditingAllowed && !hasNoData) {
                // If editing is disabled and user has data, allow ONLY photo updates
                if (!req.file) {
                    return res.status(403).json({
                        success: false,
                        message: 'Profile editing is currently disabled by the administrator.'
                    });
                }
                // If photo is uploaded, we proceed but ignore all body fields
                req.body = {};
            }
        }

        const updates = { ...req.body };

        // Add new photo if uploaded
        if (req.file) {
            updates.photo = req.file.path;
        }

        // Restrict only email and role for non-admins (these should never be changed by user)
        if (req.user.role !== 'admin') {
            const restrictedFields = ['email', 'role', 'isVerified', 'rollNo'];
            restrictedFields.forEach(field => delete updates[field]);
        }

        // Remove password from updates (use separate route for password change)
        delete updates.password;

        const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== FORGOT PASSWORD ====================

// @route   GET /api/auth/test-email
// @desc    Debug route to test email sending
// @access  Public (should optionally be protected in final prod)
router.get('/test-email', async (req, res) => {
    try {
        console.log('Testing Email Configuration...');
        const user = process.env.EMAIL_USER;
        const pass = process.env.EMAIL_PASS;

        if (!user || !pass) {
            return res.status(500).json({ success: false, message: 'EMAIL_USER or EMAIL_PASS not set' });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass }
        });

        await transporter.verify();
        console.log('✅ SMTP Connection verified');

        const info = await transporter.sendMail({
            from: user,
            to: user, // Send to self
            subject: 'LMS Production Email Test',
            text: 'If you received this, email sending is working on Render!'
        });

        res.json({ success: true, message: 'Email passed verification and sent', info });
    } catch (error) {
        console.error('❌ Email Test Failed:', error);
        res.status(500).json({
            success: false,
            message: 'Email test failed',
            error: error.message,
            stack: error.stack
        });
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset via email
// @access  Public
router.post('/forgot-password', async (req, res) => {
    try {
        const { email, role } = req.body;

        if (!email || !role) {
            return res.status(400).json({ success: false, message: 'Please provide email and role' });
        }

        const user = await User.findOne({ email, role });
        if (!user) {
            // Don't reveal if user doesn't exist for security
            return res.json({ success: true, message: 'If account exists for this role, password reset email has been sent' });
        }

        // Check for missing ENV variables early
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error('❌ EMAIL_USER or EMAIL_PASS environment variables are not set!');
            return res.status(500).json({ success: false, message: 'Email service is not configured.' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save({ validateBeforeSave: false });

        // Create reset URL
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

        console.log(`🔑 Generated reset link for ${user.email}: ${resetUrl}`);

        // Send email
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Use service 'gmail' for auto-configuration (Port 465/587 auto-handled)
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'LMS Password Reset',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1a73e8;">LMS Password Reset</h2>
                    <p>Hi ${user.name},</p>
                    <p>You requested to reset your password. Click the button below to reset it:</p>
                    <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1a73e8; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">Reset Password</a>
                    <p>Or copy this link: ${resetUrl}</p>
                    <p style="color: #666;">This link will expire in 10 minutes.</p>
                    <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Password reset email sent to:', user.email);

        res.json({ success: true, message: 'Password reset email sent' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending email. Please check server logs.',
            error: error.message // Send actual error to client for debugging
        });
    }
});

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password using token
// @access  Public
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        // Hash the token from URL
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        // Find user with valid token
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        }

        // Update password
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Password reset successful. Please login with your new password.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;

