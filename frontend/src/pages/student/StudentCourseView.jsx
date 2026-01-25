import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, FileText, ClipboardList, Clock, Loader2, BookOpen, Calendar, MapPin } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { courseAPI } from '../../services/api';

// Tabs
import StudentAttendanceTab from './components/StudentAttendanceTab';
import StudentAssignmentsTab from './components/StudentAssignmentsTab';
import StudentDailyTasksTab from './components/StudentDailyTasksTab';

import { useSelector } from 'react-redux';

const StudentCourseView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, role } = useSelector((state) => state.auth);
    const [course, setCourse] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('attendance'); // Default for students

    useEffect(() => {
        fetchCourse();
    }, [id]);

    const fetchCourse = async () => {
        setIsLoading(true);
        try {
            const res = await courseAPI.getOne(id);
            const courseData = res.data.data;
            setCourse(courseData);

            // Set default tab based on audience or role
            if (courseData.targetAudience === 'interns' || role === 'intern') {
                setActiveTab('daily_tasks');
            } else {
                setActiveTab('attendance');
            }
        } catch (error) {
            console.error('Error fetching course:', error);
            // navigate('/student/dashboard'); // Optional: redirect on error
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (!course) return null;

    return (
        <div className="space-y-6">
            {/* Header / Back */}
            <div>
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Dashboard
                </button>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${course.targetAudience === 'interns'
                                ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                                : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                                }`}>
                                <BookOpen className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">{course.title}</h1>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {new Date(course.startDate).toLocaleDateString()} - {new Date(course.endDate).toLocaleDateString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        {course.location}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <Badge variant={course.status === 'active' ? 'success' : 'warning'}>
                            {course.status}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Content Logic */}
            {role === 'student' && course.targetAudience === 'students' ? (
                // STUDENT VIEW: Attendance & Marks (Marks mostly implied via attendance or future feature)
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900">Attendance & Performance</h2>
                    <StudentAttendanceTab course={course} />
                </div>
            ) : (
                // INTERN VIEW or Intern enrolled in Student course: Tabs
                <div className="space-y-6">
                    {/* Tab Nav */}
                    <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
                        <button
                            onClick={() => setActiveTab('daily_tasks')}
                            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'daily_tasks'
                                ? 'bg-white text-emerald-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            <ClipboardList className="w-4 h-4 inline mr-2" />
                            Daily Tasks
                        </button>
                        <button
                            onClick={() => setActiveTab('assignments')}
                            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'assignments'
                                ? 'bg-white text-emerald-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <FileText className="w-4 h-4 inline mr-2" />
                            Assignments
                        </button>
                        <button
                            onClick={() => setActiveTab('attendance')}
                            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'attendance'
                                ? 'bg-white text-emerald-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <Clock className="w-4 h-4 inline mr-2" />
                            Attendance
                        </button>
                    </div>

                    {/* Tab Content */}
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl p-6 border border-gray-100 min-h-[400px]"
                    >
                        {activeTab === 'daily_tasks' && <StudentDailyTasksTab course={course} />}
                        {activeTab === 'assignments' && <StudentAssignmentsTab course={course} />}
                        {activeTab === 'attendance' && <StudentAttendanceTab course={course} />}
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default StudentCourseView;
