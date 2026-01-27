import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
    BookOpen, Users, Calendar, ArrowRight, ChevronLeft,
    FileText, ClipboardList, CheckCircle, Clock, Loader2, RefreshCw, User, Award
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { courseAPI, enrollmentAPI } from '../../services/api';

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

    useEffect(() => {
        fetchMyCourses();
    }, []);

    const fetchMyCourses = async () => {
        setIsLoading(true);
        try {
            // Fetch all courses
            const coursesRes = await courseAPI.getAll();
            const allCourses = coursesRes.data.data || [];

            // Filter courses where this teacher is assigned
            const teacherCourses = allCourses.filter(c => c.teacher?._id === user?._id);

            // Get enrollments to count students per course
            let enrollments = [];
            try {
                const enrollmentsRes = await enrollmentAPI.getAll();
                enrollments = enrollmentsRes.data.data || [];
            } catch (e) { }

            // Map courses with student counts and enrollment data
            const coursesWithData = teacherCourses.map(course => {
                const courseEnrollments = enrollments.filter(e => e.course?._id === course._id);
                // DEBUG: Check targetAudience
                console.log(`Course: ${course.title}, Audience: ${course.targetAudience}`);

                // FORCE FIX: Check title
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

            setMyCourses(coursesWithData);
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
                        <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
                        <p className="text-gray-500">Select a course to manage</p>
                    </div>
                    <button onClick={fetchMyCourses} className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
                        <RefreshCw className="w-5 h-5 text-gray-600" />
                    </button>
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
                                className="bg-white rounded-2xl p-6 border border-gray-100 cursor-pointer hover:shadow-lg hover:border-emerald-200 transition-all"
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
                                        <span className={`text-xs px-2 py-1 rounded font-medium ${course.targetAudience === 'interns'
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            For {course.targetAudience === 'interns' ? 'Interns' : 'Students'}
                                        </span>
                                    </div>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">{course.name}</h3>
                                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                    <span className="flex items-center gap-1">
                                        <Users className="w-4 h-4" />
                                        {course.internCount} Enrolled
                                    </span>
                                    {course.startDate && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(course.startDate).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center text-emerald-600 font-medium">
                                    <span>Manage Course</span>
                                    <ArrowRight className="w-4 h-4 ml-2" />
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
                    <h1 className="text-2xl font-bold text-gray-900">{selectedCourse.name}</h1>
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
