const Attendance = require('../models/Attendance');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

// Called by cron job at 12:00 PM
const lockTodayAttendance = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Get all active courses
    const activeCourses = await Course.find({
        status: 'active',
        startDate: { $lte: new Date() },
        endDate: { $gte: today }
    });

    console.log(`🔒 Starting attendance lock for ${activeCourses.length} active courses...`);

    let processedCount = 0;

    for (const course of activeCourses) {
        // 2. Find or Create attendance record for today
        let attendance = await Attendance.findOne({
            course: course._id,
            date: today
        });

        if (!attendance) {
            // Create new marked record if none exists
            attendance = new Attendance({
                course: course._id,
                date: today,
                records: [],
                isLocked: false
            });
        }

        if (attendance.isLocked) continue; // Already processed

        // 3. Get all enrolled students/interns for this course
        const enrollments = await Enrollment.find({
            course: course._id,
            status: 'enrolled'
        });

        // 4. Mark missing students as absent
        for (const enrollment of enrollments) {
            const studentId = enrollment.user?._id || enrollment.user;
            const existingRecord = attendance.records.find(
                r => (r.user?._id || r.user).toString() === studentId.toString()
            );

            if (!existingRecord) {
                // Not marked yet -> Auto-Absent
                attendance.records.push({
                    user: studentId,
                    status: 'absent',
                    markedAt: new Date()
                });
            }
            // Note: If teacher marked 'present' or 'absent' but didn't save, 
            // the backend wouldn't know. But the user said "unless saved", 
            // so we only care about what IS in the database.
        }

        // 5. Lock it up
        attendance.isLocked = true;
        attendance.lockedAt = new Date();
        await attendance.save();
        processedCount++;
    }

    console.log(`✅ Locked ${processedCount} attendance records at 12:00 PM`);
    return processedCount;
};

module.exports = { lockTodayAttendance };
