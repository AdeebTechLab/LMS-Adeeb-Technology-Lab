import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
    BookOpen, Users, Calendar, ArrowRight, ChevronLeft,
    FileText, ClipboardList, CheckCircle, Clock, Loader2, RefreshCw, User, Award, X
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { courseAPI, enrollmentAPI, assignmentAPI, attendanceAPI } from '../../services/api';
import StatCard from '../../components/ui/StatCard';

// Tab Components
import AttendanceTab from './components/AttendanceTab';
import DailyTasksTab from './components/DailyTasksTab';
import AssignmentsTab from './components/AssignmentsTab';
import CertificatesTab from './components/CertificatesTab';

const TeacherCourses = () => {
    const { user } = useSelector((state) => state.auth);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [activeTab, setActiveTab] = useState('daily_tasks'); // assignments | daily_tasks | attendance | certificates
    const [isLoading, setIsLoading] = useState(true);
    const [myCourses, setMyCourses] = useState([]);
    const [courseStudents, setCourseStudents] = useState([]);
    const [summaryStats, setSummaryStats] = useState({
        totalCourses: 0,
        totalStudents: 0,
        activeStudents: 0,
        pendingAssignments: 0,
        todayPresent: 0,
        todayAbsent: 0
    });

    useEffect(() => {
        fetchMyCourses();
    }, []);

    const fetchMyCourses = async () => {
        setIsLoading(true);
        try {
            // Fetch all courses
            const coursesRes = await courseAPI.getAll();
            const allCourses = coursesRes.data.data || [];

            // Filter courses where this teacher is assigned (check teachers array)
            const teacherCourses = allCourses.filter(c =>
                c.teachers?.some(t => String(t._id || t) === String(user?._id))
            );

            // Get enrollments once
            let enrollments = [];
            try {
                const enrollmentsRes = await enrollmentAPI.getAll();
                enrollments = enrollmentsRes.data.data || [];
            } catch (e) { }

            const today = new Date().toISOString().split('T')[0];

            // Fetch extra data for each course in parallel
            const coursesWithData = await Promise.all(teacherCourses.map(async (course) => {
                const courseEnrollments = enrollments.filter(e => String(e.course?._id || e.course) === String(course._id));

                // Calculate student stats
                const totalStudents = courseEnrollments.length;
                const activeStudents = courseEnrollments.filter(e => e.isActive && e.status !== 'completed').length;

                // Fetch assignments to count pending grading
                let pendingAssignments = 0;
                try {
                    const assignRes = await assignmentAPI.getByCourse(course._id);
                    const assignments = assignRes.data.assignments || [];
                    pendingAssignments = assignments.reduce((acc, a) =>
                        acc + (a.submissions?.filter(s => s.status === 'submitted' || !s.marks).length || 0), 0
                    );
                } catch (e) { }

                // Fetch today's attendance (check local storage first for "unsaved" marked today)
                let presentCount = 0;
                let absentCount = 0;

                const cacheKey = `attendance_${course._id}_${today}`;
                const cached = localStorage.getItem(cacheKey);

                if (cached) {
                    const localMarks = JSON.parse(cached);
                    Object.values(localMarks).forEach(record => {
                        if (record.status === 'present') presentCount++;
                        else if (record.status === 'absent') absentCount++;
                    });
                } else {
                    try {
                        const attRes = await attendanceAPI.get(course._id, today);
                        const records = attRes.data.attendance?.records || attRes.data.data?.records || [];
                        records.forEach(r => {
                            if (r.status === 'present') presentCount++;
                            else if (r.status === 'absent') absentCount++;
                        });
                    } catch (e) { }
                }

                return {
                    id: course._id,
                    _id: course._id,
                    name: course.title,
                    internCount: totalStudents,
                    activeStudents,
                    pendingAssignments,
                    presentCount,
                    absentCount,
                    durationMonths: course.durationMonths,
                    status: course.isActive !== false ? 'active' : 'inactive',
                    location: course.location,
                    city: course.city,
                    targetAudience: course.targetAudience || 'students',
                    enrollments: courseEnrollments
                };
            }));

            setMyCourses(coursesWithData);

            // Calculate overall summary
            setSummaryStats({
                totalCourses: coursesWithData.length,
                totalStudents: coursesWithData.reduce((acc, c) => acc + c.internCount, 0),
                activeStudents: coursesWithData.reduce((acc, c) => acc + c.activeStudents, 0),
                pendingAssignments: coursesWithData.reduce((acc, c) => acc + c.pendingAssignments, 0),
                todayPresent: coursesWithData.reduce((acc, c) => acc + c.presentCount, 0),
                todayAbsent: coursesWithData.reduce((acc, c) => acc + c.absentCount, 0),
            });
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectCourse = (course) => {
        const studentsList = course.enrollments.map((e, idx) => ({
            id: e.user?._id || e.student?._id, // Support both student and user field
            _id: e.user?._id || e.student?._id,
            name: (e.user?.name || e.student?.name) || 'Unknown',
            rollNo: (e.user?.rollNo || e.student?.rollNo) || `STU-${String(idx + 1).padStart(3, '0')}`,
            email: (e.user?.email || e.student?.email) || '',
            photo: (e.user?.photo || e.student?.photo) || '',
            role: (e.user?.role || e.student?.role) || 'student',
            enrolledAt: e.enrolledAt
        }));

        setCourseStudents(studentsList);
        setSelectedCourse(course);

        // Default tab based on audience
        if (course.targetAudience === 'interns') {
            setActiveTab('daily_tasks');
        } else {
            setActiveTab('attendance');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-gray-600">Loading courses...</span>
            </div>
        );
    }

    if (!selectedCourse) {
        // Course Selection List
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
                        <p className="text-gray-500">Overview of your courses and student activity</p>
                    </div>
                    <button onClick={fetchMyCourses} className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
                        <RefreshCw className={`w-5 h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <StatCard
                        title="Total Courses"
                        value={summaryStats.totalCourses}
                        icon={BookOpen}
                        iconBg="bg-blue-50"
                        iconColor="text-blue-600"
                    />
                    <StatCard
                        title="Total Students"
                        value={summaryStats.totalStudents}
                        icon={Users}
                        iconBg="bg-indigo-50"
                        iconColor="text-indigo-600"
                    />
                    <StatCard
                        title="Active Now"
                        value={summaryStats.activeStudents}
                        icon={CheckCircle}
                        iconBg="bg-emerald-50"
                        iconColor="text-emerald-600"
                    />
                    <StatCard
                        title="Pending Gradings"
                        value={summaryStats.pendingAssignments}
                        icon={FileText}
                        iconBg="bg-amber-50"
                        iconColor="text-amber-600"
                    />
                    <StatCard
                        title="Today's Present"
                        value={summaryStats.todayPresent}
                        icon={User}
                        iconBg="bg-emerald-50"
                        iconColor="text-emerald-700"
                    />
                    <StatCard
                        title="Today's Absent"
                        value={summaryStats.todayAbsent}
                        icon={X}
                        iconBg="bg-red-50"
                        iconColor="text-red-600"
                    />
                </div>

                {myCourses.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No courses assigned to you yet</p>
                        <p className="text-sm text-gray-400 mt-1">Contact admin to get courses assigned</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {myCourses.map((course, index) => (
                            <motion.div
                                key={course.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                onClick={() => handleSelectCourse(course)}
                                className="bg-white rounded-3xl p-6 border border-gray-100 cursor-pointer hover:shadow-xl hover:border-emerald-200 transition-all group overflow-hidden relative"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-full -mr-16 -mt-16 group-hover:bg-emerald-100/50 transition-colors" />

                                <div className="relative z-10">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${course.targetAudience === 'interns'
                                            ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                                            : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                                            } shadow-lg shadow-emerald-900/10`}>
                                            <BookOpen className="w-7 h-7 text-white" />
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <Badge variant={course.status === 'active' ? 'success' : 'warning'}>
                                                {course.status.toUpperCase()}
                                            </Badge>
                                            <span className={`text-[10px] px-2 py-1 rounded-lg font-black uppercase tracking-widest ${course.targetAudience === 'interns'
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {course.targetAudience === 'interns' ? 'Internship' : 'Regular Course'}
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight group-hover:text-emerald-700 transition-colors line-clamp-1">{course.name}</h3>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-sm text-gray-500 font-bold">
                                                <Users className="w-4 h-4 text-gray-400" />
                                                <span>{course.internCount} Total</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-emerald-600 font-bold">
                                                <CheckCircle className="w-4 h-4" />
                                                <span>{course.activeStudents} Active</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-amber-600 font-bold">
                                                <FileText className="w-4 h-4" />
                                                <span>{course.pendingAssignments} Pending Tasks</span>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">Today's Attendance</p>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs font-bold text-gray-500">Present</span>
                                                <span className="text-sm font-black text-emerald-600">{course.presentCount}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-500">Absent</span>
                                                <span className="text-sm font-black text-red-500">{course.absentCount}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {course.city || course.location}
                                        </div>
                                        <div className="flex items-center text-emerald-600 font-black text-xs uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                            <span>Manage Portal</span>
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <button
                        onClick={() => { setSelectedCourse(null); }}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-2"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to Courses
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">{selectedCourse.name || 'Course Management'}</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${selectedCourse.targetAudience === 'interns'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                            }`}>
                            Manage {selectedCourse.targetAudience}
                        </span>
                        <span className="text-gray-500 text-sm">{courseStudents.length} students enrolled</span>
                    </div>
                </div>
            </div>

            {/* Tab Navigation (Unified for both Students and Interns) */}
            <div className="space-y-6">
                <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto max-w-full">
                    <button
                        onClick={() => setActiveTab('daily_tasks')}
                        className={`px-6 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'daily_tasks'
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <ClipboardList className="w-4 h-4 inline mr-2" />
                        {selectedCourse.targetAudience === 'interns' ? 'Daily Tasks' : 'Class Logs'}
                    </button>
                    <button
                        onClick={() => setActiveTab('assignments')}
                        className={`px-6 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'assignments'
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <FileText className="w-4 h-4 inline mr-2" />
                        Assignments
                    </button>
                    <button
                        onClick={() => setActiveTab('attendance')}
                        className={`px-6 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'attendance'
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <Clock className="w-4 h-4 inline mr-2" />
                        Attendance
                    </button>
                    <button
                        onClick={() => setActiveTab('certificates')}
                        className={`px-6 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'certificates'
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <Award className="w-4 h-4 inline mr-2" />
                        Certificates
                    </button>
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 min-h-[400px]">
                    {activeTab === 'daily_tasks' && <DailyTasksTab course={selectedCourse} />}
                    {activeTab === 'assignments' && <AssignmentsTab course={selectedCourse} students={courseStudents} />}
                    {activeTab === 'attendance' && <AttendanceTab course={selectedCourse} students={courseStudents} />}
                    {activeTab === 'certificates' && <CertificatesTab course={selectedCourse} students={courseStudents} />}
                </div>
            </div>
        </div>
    );
};

export default TeacherCourses;
