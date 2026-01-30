import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
    BookOpen, Users, Calendar, ArrowRight, ChevronLeft,
    FileText, ClipboardList, CheckCircle, Clock, Loader2, RefreshCw, User
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { courseAPI, enrollmentAPI } from '../../services/api';

// Tab Components
import AttendanceTab from './components/AttendanceTab';
import DailyTasksTab from './components/DailyTasksTab';
import AssignmentsTab from './components/AssignmentsTab';

const AttendanceSheet = () => {
    const { id: routeCourseId } = useParams();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [activeTab, setActiveTab] = useState('daily_tasks'); // assignments | daily_tasks | attendance
    const [isLoading, setIsLoading] = useState(true);
    const [myCourses, setMyCourses] = useState([]);
    const [courseStudents, setCourseStudents] = useState([]);

    useEffect(() => {
        fetchMyCourses();
    }, []);

    // Handle deep linking when courses are loaded
    useEffect(() => {
        if (routeCourseId && myCourses.length > 0) {
            const course = myCourses.find(c => c.id.toString() === routeCourseId.toString());
            if (course && (!selectedCourse || selectedCourse.id !== course.id)) {
                handleSelectCourse(course, true); // true to skip navigation
            }
        }
    }, [routeCourseId, myCourses]);

    const fetchMyCourses = async () => {
        setIsLoading(true);
        try {
            // Fetch all courses
            const coursesRes = await courseAPI.getAll();
            const allCourses = coursesRes.data.data || [];

            // Filter courses where this teacher is assigned
            // Robust check: check both ._id and .id, convert to string for safe comparison
            const teacherId = (user?._id || user?.id)?.toString();
            console.log('Logged in Teacher ID:', teacherId);

            const teacherCourses = allCourses.filter(c => {
                const isMatch = c.teachers?.some(t => {
                    const tId = (t._id || t)?.toString();
                    return tId === teacherId;
                });

                if (!isMatch) {
                    console.log(`Filtering out course: ${c.title}. Teachers IDs: ${c.teachers?.map(t => t._id || t).join(', ')}, Expected: ${teacherId}`);
                }
                return isMatch;
            });

            // Get enrollments to count students per course
            let enrollments = [];
            try {
                const enrollmentsRes = await enrollmentAPI.getAll();
                enrollments = enrollmentsRes.data.data || [];
            } catch (e) {
                console.error('Enrollment fetch failed:', e);
            }

            // Map courses with student counts and enrollment data
            const coursesWithData = teacherCourses.map(course => {
                const courseEnrollments = enrollments.filter(e => {
                    const eCourseId = (e.course?._id || e.course)?.toString();
                    return eCourseId === course._id.toString();
                });

                // FORCE FIX: Ensure 'Gen AI' is treated as Interns, but also respect DB targetAudience
                let audience = course.targetAudience || 'students';
                if (course.title && course.title.toLowerCase().includes('gen')) {
                    audience = 'interns';
                }

                return {
                    id: course._id,
                    _id: course._id, // Keep both for compatibility
                    name: course.title,
                    internCount: courseEnrollments.length,
                    startDate: course.startDate,
                    endDate: course.endDate,
                    status: course.isActive !== false ? 'active' : 'inactive',
                    location: course.location,
                    duration: course.duration,
                    targetAudience: audience,
                    enrollments: courseEnrollments
                };
            });

            console.log('Courses loaded:', coursesWithData);
            setMyCourses(coursesWithData);
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectCourse = (course, skipNavigation = false) => {
        const studentsList = course.enrollments.map((e, idx) => ({
            id: e.user?._id || e.user, // IMPORTANT: Repair script used 'user' field
            _id: e.user?._id || e.user,
            name: e.user?.name || 'Enrolled Student',
            rollNo: e.user?.rollNo || `STU-${String(idx + 1).padStart(3, '0')}`,
            email: e.user?.email || '',
            photo: e.user?.photo || '',
            role: e.user?.role || 'intern',
            enrolledAt: e.enrolledAt
        }));

        console.log('Selected course students:', studentsList);
        setCourseStudents(studentsList);
        setSelectedCourse(course);

        // Update URL if not already there
        if (!skipNavigation) {
            navigate(`/teacher/course/${course.id}`);
        }

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
                <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
                    <span className="text-gray-600">Loading Dashboard...</span>
                </div>
            </div>
        );
    }

    if (!selectedCourse) {
        // Course Selection List
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
                        <p className="text-gray-500">Manage your students, assignments and daily tasks</p>
                    </div>
                    <button onClick={fetchMyCourses} className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
                        <RefreshCw className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                {myCourses.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">No courses assigned to you</p>
                        <p className="text-sm text-gray-400 mt-1">Please contact Admin to assign courses to your account.</p>
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
                                className="bg-white rounded-2xl p-6 border border-gray-100 cursor-pointer hover:shadow-lg hover:border-emerald-200 transition-all group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${course.targetAudience === 'interns'
                                        ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                                        : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                                        }`}>
                                        <BookOpen className="w-7 h-7 text-white" />
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <Badge variant={course.status === 'active' ? 'success' : 'warning'}>
                                            {course.status}
                                        </Badge>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${course.targetAudience === 'interns'
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {course.targetAudience === 'interns' ? 'Internship' : 'Student'}
                                        </span>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors uppercase">{course.name}</h3>
                                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4 font-medium">
                                    <span className="flex items-center gap-1.5">
                                        <Users className="w-4 h-4 text-gray-400" />
                                        {course.internCount} Registered
                                    </span>
                                    {course.location && (
                                        <span className="flex items-center gap-1.5 uppercase">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            {course.location}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center text-emerald-600 font-bold text-sm">
                                    <span>OPEN DASHBOARD</span>
                                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <button
                        onClick={() => {
                            setSelectedCourse(null);
                            navigate('/teacher/attendance');
                        }}
                        className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-2 font-bold text-sm tracking-wide"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        BACK TO ALL COURSES
                    </button>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">{selectedCourse.name || 'Course Dashboard'}</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${selectedCourse.targetAudience === 'interns'
                            ? 'bg-purple-600 text-white'
                            : 'bg-emerald-600 text-white'
                            }`}>
                            {selectedCourse.targetAudience} Portal
                        </span>
                        <span className="text-gray-500 text-sm font-semibold italic">{courseStudents.length} Students Active</span>
                    </div>
                </div>
            </div>

            {/* Course Content: Multi-Tab */}
            <div className="space-y-6">
                {/* Tab Navigation */}
                <div className="flex gap-2 bg-gray-100/80 p-1.5 rounded-2xl w-fit border border-gray-200">
                    <button
                        onClick={() => setActiveTab('daily_tasks')}
                        className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'daily_tasks'
                            ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100'
                            : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                            }`}
                    >
                        <ClipboardList className="w-4 h-4" />
                        {selectedCourse.targetAudience === 'interns' ? 'Daily Tasks' : 'Class Logs'}
                    </button>
                    <button
                        onClick={() => setActiveTab('assignments')}
                        className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'assignments'
                            ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100'
                            : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        Assignments
                    </button>
                    <button
                        onClick={() => setActiveTab('attendance')}
                        className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'attendance'
                            ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100'
                            : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                            }`}
                    >
                        <Clock className="w-4 h-4" />
                        Attendance
                    </button>
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/50 min-h-[500px]">
                    {activeTab === 'daily_tasks' && (
                        <DailyTasksTab course={selectedCourse} />
                    )}
                    {activeTab === 'assignments' && (
                        <AssignmentsTab course={selectedCourse} students={courseStudents} />
                    )}
                    {activeTab === 'attendance' && (
                        <AttendanceTab course={selectedCourse} students={courseStudents} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttendanceSheet;
