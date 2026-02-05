const Attendance = require('../models/Attendance');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

// Called by cron job at 12:00 AM (midnight) to auto-save and lock yesterday's attendance
const lockTodayAttendance = async () => {
    // We're locking YESTERDAY's attendance (since it's now 12 AM of the new day)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    console.log(`🔒 Auto-saving attendance for ${yesterday.toISOString().split('T')[0]}...`);

    // 1. Get all active courses
    const activeCourses = await Course.find({ isActive: true });

    console.log(`📚 Found ${activeCourses.length} active courses`);

    let processedCount = 0;
    let createdCount = 0;

    for (const course of activeCourses) {
        try {
            // 2. Find or Create attendance record for yesterday
            let attendance = await Attendance.findOne({
                course: course._id,
                date: yesterday
            });

            if (!attendance) {
                // Create new attendance record if none exists
                attendance = new Attendance({
                    course: course._id,
                    date: yesterday,
                    records: [],
                    isLocked: false
                });
                createdCount++;
            }

            if (attendance.isLocked) continue; // Already processed

            // 3. Get all enrolled students/interns for this course
            const enrollments = await Enrollment.find({
                course: course._id,
                status: { $in: ['enrolled', 'active'] }
            });

            // 4. Mark missing students as absent (those not already marked)
            for (const enrollment of enrollments) {
                const studentId = enrollment.user?._id || enrollment.user;
                if (!studentId) continue;

                const existingRecord = attendance.records.find(
                    r => (r.user?._id || r.user)?.toString() === studentId.toString()
                );

                if (!existingRecord) {
                    // Not marked yet -> Auto-Absent
                    attendance.records.push({
                        user: studentId,
                        status: 'absent',
                        markedAt: new Date(),
                        autoMarked: true // Flag to indicate this was auto-marked
                    });
                }
            }

            // 5. Lock it up
            attendance.isLocked = true;
            attendance.lockedAt = new Date();
            await attendance.save();
            processedCount++;
        } catch (err) {
            console.error(`Error processing course ${course.title}:`, err.message);
        }
    }

    console.log(`✅ Auto-saved & locked ${processedCount} attendance records (${createdCount} new) at 12:00 AM`);
    return { processedCount, createdCount };
};

module.exports = { lockTodayAttendance };
