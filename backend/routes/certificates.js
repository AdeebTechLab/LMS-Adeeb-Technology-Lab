const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Certificate = require('../models/Certificate');
const CertificateRequest = require('../models/CertificateRequest');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');

// @route   GET /api/certificates/requests
// @desc    Get all pending certificate requests
// @access  Private (Admin)
router.get('/requests', protect, authorize('admin'), async (req, res) => {
    try {
        const requests = await CertificateRequest.find()
            .populate('user', 'name email rollNo photo role')
            .populate('course', 'title description location')
            .populate('teacher', 'name email')
            .sort('-createdAt');

        res.json({ success: true, requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/certificates/request
// @desc    Teacher requests certificate for a student
// @access  Private (Teacher)
router.post('/request', protect, authorize('teacher'), async (req, res) => {
    try {
        const { userId, courseId, skills, duration, notes } = req.body;

        // Check enrollment
        const enrollment = await Enrollment.findOne({ user: userId, course: courseId });
        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Student is not enrolled in this course' });
        }

        // Check if already issued
        const existingCert = await Certificate.findOne({ user: userId, course: courseId });
        if (existingCert) {
            return res.status(400).json({ success: false, message: 'Certificate already issued for this student' });
        }

        // Check if existing pending request
        const existingRequest = await CertificateRequest.findOne({ user: userId, course: courseId, status: 'pending' });
        if (existingRequest) {
            return res.status(400).json({ success: false, message: 'A pending request already exists for this student' });
        }

        const request = await CertificateRequest.create({
            user: userId,
            course: courseId,
            teacher: req.user.id,
            skills,
            duration,
            notes
        });

        res.status(201).json({ success: true, request });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/certificates/requests/:id/approve
// @desc    Approve request and issue certificate
// @access  Private (Admin)
router.put('/requests/:id/approve', protect, authorize('admin'), async (req, res) => {
    try {
        const { rollNo, skills, duration } = req.body;
        const request = await CertificateRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Request is already processed' });
        }

        // Update user rollNo if provided and different
        const user = await User.findById(request.user);
        if (rollNo && user.rollNo !== rollNo) {
            user.rollNo = rollNo;
            await user.save();
        }

        // Create certificate
        const certificate = await Certificate.create({
            user: request.user,
            course: request.course,
            rollNo: rollNo || user.rollNo,
            skills: skills || request.skills,
            duration: duration || request.duration,
            issuedBy: req.user.id
        });

        // Update request status
        request.status = 'issued';
        await request.save();

        // Update enrollment status
        await Enrollment.findOneAndUpdate(
            { user: request.user, course: request.course },
            { status: 'completed', completedAt: new Date() }
        );

        res.json({ success: true, certificate });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/certificates/requests/:id/reject
// @desc    Reject certificate request
// @access  Private (Admin)
router.put('/requests/:id/reject', protect, authorize('admin'), async (req, res) => {
    try {
        const request = await CertificateRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        request.status = 'rejected';
        await request.save();

        res.json({ success: true, message: 'Request rejected' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/certificates/courses
// @desc    Get courses with enrolled students for certificate management
// @access  Private (Admin)
router.get('/courses', protect, authorize('admin'), async (req, res) => {
    try {
        const courses = await Course.find().sort('-createdAt');

        const coursesWithStudents = await Promise.all(courses.map(async (course) => {
            // Get enrollments
            const enrollments = await Enrollment.find({
                course: course._id,
                status: { $in: ['enrolled', 'completed'] }
            }).populate('user', 'name email phone photo rollNo role');

            // Get existing certificates
            const certificates = await Certificate.find({ course: course._id });
            const certifiedUserIds = certificates.map(c => c.user.toString());

            // Add certificate status to each student
            const students = enrollments.map(e => ({
                ...e.user.toObject(),
                enrollmentStatus: e.status,
                certificateIssued: certifiedUserIds.includes(e.user._id.toString())
            }));

            return {
                ...course.toObject(),
                students
            };
        }));

        res.json({ success: true, courses: coursesWithStudents });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/certificates/issue
// @desc    Issue certificate to a student
// @access  Private (Admin)
router.post('/issue', protect, authorize('admin'), async (req, res) => {
    try {
        const { userId, courseId, skills } = req.body;

        // Check if already issued
        const existing = await Certificate.findOne({ user: userId, course: courseId });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Certificate already issued' });
        }

        // Get user and course details
        const user = await User.findById(userId);
        const course = await Course.findById(courseId);

        if (!user || !course) {
            return res.status(404).json({ success: false, message: 'User or course not found' });
        }

        if (!user.rollNo) {
            return res.status(400).json({ success: false, message: 'User does not have a roll number' });
        }

        // Calculate duration
        const startDate = new Date(course.startDate);
        const endDate = new Date(course.endDate);
        const duration = `${startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;

        // Create certificate
        const certificate = await Certificate.create({
            user: userId,
            course: courseId,
            rollNo: user.rollNo,
            skills: skills || course.title,
            duration,
            issuedBy: req.user.id
        });

        // Update enrollment status to completed
        await Enrollment.findOneAndUpdate(
            { user: userId, course: courseId },
            { status: 'completed', completedAt: new Date() }
        );

        res.status(201).json({ success: true, certificate });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/certificates/verify/:rollNo
// @desc    Public verification by roll number
// @access  Public
router.get('/verify/:rollNo', async (req, res) => {
    try {
        const user = await User.findOne({ rollNo: req.params.rollNo });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No record found for this roll number'
            });
        }

        // Get certificates for this user
        const certificates = await Certificate.find({ user: user._id })
            .populate('course', 'title location');

        if (certificates.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No certificates found for this roll number'
            });
        }

        // Format response
        const result = certificates.map(cert => ({
            rollNo: user.rollNo,
            name: user.name,
            photo: user.photo,
            position: user.role === 'student' ? 'Student' : 'Intern',
            course: cert.course.title,
            skills: cert.skills,
            duration: cert.duration,
            location: cert.course.location,
            issuedAt: cert.issuedAt
        }));

        res.json({ success: true, certificates: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
