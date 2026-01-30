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

        // Check if user exists for this specific role
        const existingUser = await User.findOne({ email, role: role || 'student' });
        if (existingUser) {
            return res.status(400).json({ success: false, message: `Account already exists for this email as a ${role || 'student'}` });
        }

        // Create user
        const userData = {
            name,
            email,
            password,
            phone,
            role: role || 'student',
            location,
            isVerified: true  // Auto-verify all new users
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

        const user = await User.create(userData);

        // For non-admins, return success message but no token
        if (user.role !== 'admin') {
            // Send Email Notification to Admin
            try {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });

                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: 'adeebtechnologylab@gmail.com',
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
                                <p>Please log in to the admin dashboard to view this user. The account has been automatically verified.</p>
                                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="display: inline-block; padding: 12px 24px; background-color: #0d2818; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Login to Admin Panel</a>
                            </div>
                            <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #666666;">
                                This is an automated notification from AdeebTechLab LMS.
                            </div>
                        </div>
                    `
                };

                await transporter.sendMail(mailOptions);
                console.log('✅ Admin notification email sent for new user:', user.email);
            } catch (emailError) {
                console.error('❌ Error sending admin notification email:', emailError);
                // We don't block registration if email fails
            }

            return res.status(201).json({
                success: true,
                message: 'Registration successful! Your account has been verified. You can now login.',
                isPending: false
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
        const { email, password, role } = req.body;

        // Validate
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        // Build query
        const query = { email };
        if (role) {
            query.role = role;
        }

        // Find user
        const user = await User.findOne(query).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check verification status (skip for admins and job seekers)
        // Disable verification check for now to allow immediate login
        /*
        if (user.role !== 'admin' && !user.isVerified) {
            return res.status(403).json({
                success: false,
                message: 'Your account is pending admin verification. Please try again later or contact support.',
                isPending: true
            });
        }
        */

        // Generate token
        const token = user.getSignedJwtToken();

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
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
router.put('/profile', protect, uploadPhoto.single('photo'), async (req, res) => {
    try {
        const updates = { ...req.body };

        // Add new photo if uploaded
        if (req.file) {
            updates.photo = req.file.path;
        }

        // Restrict core fields for non-admins
        if (req.user.role !== 'admin') {
            const restrictedFields = [
                'name', 'email', 'rollNo', 'cnic', 'dob', 'gender',
                'education', 'department', 'specialization', 'qualification',
                'role', 'isVerified'
            ];
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

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save({ validateBeforeSave: false });

        // Create reset URL
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

        // Send email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
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
        res.status(500).json({ success: false, message: 'Error sending email. Please try again.' });
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

