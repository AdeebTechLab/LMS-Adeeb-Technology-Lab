const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Certificate = require('../models/Certificate');
const CertificateRequest = require('../models/CertificateRequest');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');

// @route   GET /api/certificates/my
// @desc    Get logged-in user's certificates
// @access  Private
router.get('/my', protect, async (req, res) => {
    try {
        const certificates = await Certificate.find({ user: req.user.id })
            .populate('course', 'title description location')
            .sort('-issuedAt');

        res.json({ success: true, certificates });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/certificates/requests
// @desc    Get all pending certificate requests
// @access  Private (Admin)
router.get('/requests', protect, authorize('admin'), async (req, res) => {
    try {
        console.log('📋 [ROUTES] Fetching certificate requests for user:', req.user.name);
        const requests = await CertificateRequest.find()
            .populate('user', 'name email rollNo photo role cnic')
            .populate('course', 'title description location')
            .populate('teacher', 'name email')
            .sort('-createdAt');

        // Filter out requests with null references
        const validRequests = requests.filter(r => r.user && r.course);

        console.log(`✅ [ROUTES] Found ${validRequests.length} certificate requests (${requests.length} total)`);
        res.json({ success: true, requests: validRequests });
    } catch (error) {
        console.error('❌ [ROUTES] Error fetching requests:', error.message);
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
        const { rollNo, skills, duration, passoutDate, certificateLink } = req.body;
        const request = await CertificateRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Request is already processed' });
        }

        // Update user rollNo if provided and different
        const user = await User.findById(request.user);
        const normalizedRollNo = rollNo ? rollNo.toString().trim() : '';
        const existingRollNo = user.rollNo ? user.rollNo.toString().trim() : '';

        if (normalizedRollNo && existingRollNo !== normalizedRollNo) {
            user.rollNo = normalizedRollNo;
            await user.save();
        }

        // Create certificate
        const certificate = await Certificate.create({
            user: request.user,
            course: request.course,
            rollNo: rollNo || user.rollNo,
            skills: skills || request.skills,
            duration: duration || request.duration,
            passoutDate: passoutDate || request.passoutDate,
            certificateLink,
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
        console.log('📚 [CERTIFICATES] Fetching courses for certificate management');
        const courses = await Course.find().sort('-createdAt');
        console.log(`📚 [CERTIFICATES] Found ${courses.length} courses`);

        const coursesWithStudents = await Promise.all(courses.map(async (course) => {
            // Get all enrollments for this course (removed status filter)
            const enrollments = await Enrollment.find({
                course: course._id
            }).populate('user', 'name email phone photo rollNo role cnic');

            console.log(`  └─ Course "${course.title}": ${enrollments.length} enrollments`);

            // Get existing certificates as a map for quick lookup
            const certificates = await Certificate.find({ course: course._id });
            const certMap = {};
            certificates.forEach(c => {
                certMap[c.user.toString()] = {
                    _id: c._id,
                    passoutDate: c.passoutDate,
                    skills: c.skills,
                    duration: c.duration,
                    rollNo: c.rollNo,
                    certificateLink: c.certificateLink,
                    issuedAt: c.issuedAt
                };
            });

            // Add certificate status and data to each student
            // Filter out enrollments with null users (deleted users)
            const students = enrollments
                .filter(e => e.user) // Only include enrollments with valid users
                .map(e => ({
                    ...e.user.toObject(),
                    enrollmentStatus: e.status,
                    certificateIssued: !!certMap[e.user._id.toString()],
                    certificate: certMap[e.user._id.toString()] || null
                }));

            return {
                ...course.toObject(),
                students
            };
        }));

        console.log(`✅ [CERTIFICATES] Returning ${coursesWithStudents.length} courses with students`);
        res.json({ success: true, courses: coursesWithStudents });
    } catch (error) {
        console.error('❌ [CERTIFICATES] Error fetching courses:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/certificates/issue
// @desc    Issue certificate to a student
// @access  Private (Admin)
router.post('/issue', protect, authorize('admin'), async (req, res) => {
    try {
        const { userId, courseId, skills, passoutDate, certificateLink, rollNo } = req.body;

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

        // Handle roll number update/set
        const normalizedRollNo = rollNo ? rollNo.toString().trim() : '';
        const existingRollNo = user.rollNo ? user.rollNo.toString().trim() : '';
        const finalRollNo = normalizedRollNo || existingRollNo;

        if (!finalRollNo) {
            return res.status(400).json({ success: false, message: 'Please provide a roll number' });
        }

        if (normalizedRollNo && existingRollNo !== normalizedRollNo) {
            user.rollNo = normalizedRollNo;
            await user.save();
        }

        // Calculate duration
        const startDate = new Date(course.startDate);
        const endDate = new Date(course.endDate);
        const duration = `${startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;

        // Create certificate
        const certificate = await Certificate.create({
            user: userId,
            course: courseId,
            rollNo: finalRollNo,
            skills: skills || course.title,
            duration: duration,
            passoutDate,
            certificateLink,
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

// @route   PUT /api/certificates/:id
// @desc    Update certificate details (passoutDate, skills, certificateLink)
// @access  Private (Admin)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const { passoutDate, skills, certificateLink, rollNo, duration } = req.body;

        const certificate = await Certificate.findById(req.params.id);
        if (!certificate) {
            return res.status(404).json({ success: false, message: 'Certificate not found' });
        }

        // Update fields if provided
        if (passoutDate) certificate.passoutDate = passoutDate;
        if (skills) certificate.skills = skills;
        if (rollNo) certificate.rollNo = rollNo;
        if (duration) certificate.duration = duration;
        if (certificateLink !== undefined) certificate.certificateLink = certificateLink;

        await certificate.save();

        res.json({ success: true, certificate });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/certificates/verify/:rollNo
// @desc    Public verification by roll number
// @access  Public
router.get('/verify/:rollNo', async (req, res) => {
    try {
        const users = await User.find({ rollNo: req.params.rollNo });

        if (!users || users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No record found for this roll number'
            });
        }

        const userIds = users.map(u => u._id);

        // Get certificates for all matching users
        const certificates = await Certificate.find({ user: { $in: userIds } })
            .populate('user', 'name photo role rollNo')
            .populate('course', 'title location');

        if (certificates.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No certificates found for this roll number'
            });
        }

        // Format response - filter out certificates with null references
        const result = certificates
            .filter(cert => cert.user && cert.course) // Only valid certificates
            .map(cert => ({
                rollNo: cert.user.rollNo,
                name: cert.user.name,
                photo: cert.user.photo,
                position: cert.user.role === 'student' ? 'Student' : 'Intern',
                course: cert.course.title,
                skills: cert.skills,
                duration: cert.duration,
                passoutDate: cert.passoutDate,
                certificateLink: cert.certificateLink,
                location: cert.course.location,
                issuedAt: cert.issuedAt
            }));

        res.json({ success: true, certificates: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/certificates/:id
// @desc    Delete certificate
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const certificate = await Certificate.findById(req.params.id);
        if (!certificate) {
            return res.status(404).json({ success: false, message: 'Certificate not found' });
        }

        // Optional: Revert enrollment status? 
        // If we want the student to be able to request again or admin to re-issue,
        // we might want to revert enrollment status.
        await Enrollment.findOneAndUpdate(
            { user: certificate.user, course: certificate.course },
            { status: 'enrolled', completedAt: null }
        );

        await certificate.deleteOne();

        res.json({ success: true, message: 'Certificate deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
