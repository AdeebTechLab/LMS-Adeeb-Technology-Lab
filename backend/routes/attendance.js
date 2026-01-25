const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

// Lock function for cron job
const lockTodayAttendance = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all unlocked attendance records for today
    const attendances = await Attendance.find({
        date: today,
        isLocked: false
    }).populate({
        path: 'course',
        select: 'startDate endDate'
    });

    for (const attendance of attendances) {
        // Get all enrolled students for this course
        const enrollments = await Enrollment.find({
            course: attendance.course._id,
            status: 'enrolled'
        });

        // Mark all unmarked students as absent
        for (const enrollment of enrollments) {
            const existingRecord = attendance.records.find(
                r => r.user.toString() === enrollment.user.toString()
            );

            if (!existingRecord) {
                attendance.records.push({
                    user: enrollment.user,
                    status: 'absent',
                    markedAt: new Date()
                });
            }
        }

        attendance.isLocked = true;
        attendance.lockedAt = new Date();
        await attendance.save();
    }

    return attendances.length;
};

// @route   GET /api/attendance/my/:courseId
// @desc    Get current user's attendance history for a course
// @access  Private
router.get('/my/:courseId', protect, async (req, res) => {
    try {
        const { courseId } = req.params;

        // Find all attendance records for this course that contain a record for this user
        const attendances = await Attendance.find({
            course: courseId,
            'records.user': req.user.id
        }).sort('date');

        // Extract only the current user's status for each date
        const myHistory = attendances.map(a => {
            const userRecord = a.records.find(r => r.user.toString() === req.user.id);
            return {
                date: a.date,
                status: userRecord ? userRecord.status : 'absent'
            };
        });

        res.json({ success: true, attendances: myHistory });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/attendance/:courseId/:date
// @desc    Get attendance for a course on a date
// @access  Private (Teacher, Admin)
router.get('/:courseId/:date', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const { courseId, date } = req.params;
        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        let attendance = await Attendance.findOne({
            course: courseId,
            date: attendanceDate
        }).populate('records.user', 'name rollNo photo role');

        // If no attendance record exists, create empty one
        if (!attendance) {
            attendance = {
                course: courseId,
                date: attendanceDate,
                records: [],
                isLocked: false
            };
        }

        // Check if should be locked (12pm passed)
        const now = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isToday = attendanceDate.getTime() === today.getTime();
        const isPast12pm = now.getHours() >= 12;

        res.json({
            success: true,
            attendance,
            canEdit: isToday && !isPast12pm && !attendance.isLocked
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/attendance
// @desc    Mark attendance
// @access  Private (Teacher, Admin)
router.post('/', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const { courseId, date, records } = req.body;
        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        // Find or create attendance record
        let attendance = await Attendance.findOne({
            course: courseId,
            date: attendanceDate
        });

        if (!attendance) {
            attendance = new Attendance({
                course: courseId,
                date: attendanceDate,
                records: []
            });
        }

        // Update records
        for (const record of records) {
            const existingIndex = attendance.records.findIndex(
                r => r.user.toString() === record.userId
            );

            if (existingIndex >= 0) {
                attendance.records[existingIndex].status = record.status;
                attendance.records[existingIndex].markedBy = req.user.id;
                attendance.records[existingIndex].markedAt = new Date();
            } else {
                attendance.records.push({
                    user: record.userId,
                    status: record.status,
                    markedBy: req.user.id,
                    markedAt: new Date()
                });
            }
        }

        await attendance.save();

        res.json({ success: true, attendance });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/attendance/report/:courseId
// @desc    Get attendance report for a course
// @access  Private (Teacher, Admin)
router.get('/report/:courseId', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const attendances = await Attendance.find({ course: req.params.courseId })
            .populate('records.user', 'name rollNo')
            .sort('date');

        res.json({ success: true, attendances });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
module.exports.lockTodayAttendance = lockTodayAttendance;
