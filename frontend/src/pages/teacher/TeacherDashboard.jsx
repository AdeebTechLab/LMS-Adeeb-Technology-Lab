import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen,
    Users,
    ClipboardList,
    CheckCircle,
    Clock,
    ArrowRight,
    Plus,
    MoreHorizontal,
    FileText,
    TrendingUp,
    Loader2,
    Calendar
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { BarChart } from '../../components/charts/Charts';
import { courseAPI, enrollmentAPI } from '../../services/api';


const TeacherDashboard = () => {
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [myCourses, setMyCourses] = useState([]);
    const [totalStudents, setTotalStudents] = useState(0);
    const [stats, setStats] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            // Fetch all courses
            const coursesRes = await courseAPI.getAll();
            const allCourses = coursesRes.data.data || [];

            // Filter courses where this teacher is assigned (check teachers array)
            const teacherCourses = allCourses.filter(c =>
                c.teachers?.some(t => String(t._id || t) === String(user?._id))
            );

            // Get enrollments to count students per course
            let enrollments = [];
            try {
                const enrollmentsRes = await enrollmentAPI.getAll();
                enrollments = enrollmentsRes.data.data || [];
            } catch (e) { }

            // Map courses with student counts
            const coursesWithData = teacherCourses.map(course => {
                const courseEnrollments = enrollments.filter(e => e.course?._id === course._id);
                return {
                    id: course._id,
                    title: course.title,
                    students: courseEnrollments.length,
                    assignments: 0,
                    pendingSubmissions: 0,
                    status: course.isActive ? 'active' : 'inactive',
                    startDate: course.startDate,
                    duration: course.duration
                };
            });

            setMyCourses(coursesWithData);

            // Calculate total students
            const total = coursesWithData.reduce((sum, c) => sum + c.students, 0);
            setTotalStudents(total);

            // Build stats
            setStats([
                {
                    title: 'My Courses',
                    value: coursesWithData.length.toString(),
                    icon: BookOpen,
                    iconBg: 'bg-emerald-100',
                    iconColor: 'text-emerald-600',
                },
                {
                    title: 'Total Students',
                    value: total.toString(),
                    icon: Users,
                    iconBg: 'bg-blue-100',
                    iconColor: 'text-blue-600',
                },
                {
                    title: 'Pending Reviews',
                    value: '0',
                    icon: ClipboardList,
                    iconBg: 'bg-amber-100',
                    iconColor: 'text-amber-600',
                },
                {
                    title: 'Active Courses',
                    value: coursesWithData.filter(c => c.status === 'active').length.toString(),
                    icon: CheckCircle,
                    iconBg: 'bg-purple-100',
                    iconColor: 'text-purple-600',
                },
            ]);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const submissionsChartData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                label: 'Submissions',
                data: [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: '#22C55E',
                borderRadius: 6,
                barThickness: 24,
            },
        ],
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-gray-600">Loading dashboard...</span>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                {/* Welcome Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-[#0D2818] to-[#1A5D3A] rounded-2xl p-6 text-white"
                >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Welcome back, {user?.name || 'Teacher'}!</h2>
                            <p className="text-white/70">
                                You have {myCourses.length} courses with {totalStudents} students enrolled.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate('/teacher/attendance')}
                                className="px-5 py-2.5 bg-white hover:bg-white/90 text-[#0D2818] rounded-xl font-medium transition-all duration-300"
                            >
                                Mark Attendance
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <StatCard {...stat} />
                        </motion.div>
                    ))}
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* My Courses */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">My Courses</h3>
                                <p className="text-sm text-gray-500">Select a course to manage assignments and daily work</p>
                            </div>
                        </div>

                        {myCourses.length === 0 ? (
                            <div className="text-center py-12">
                                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">No courses assigned yet</p>
                                <p className="text-sm text-gray-400 mt-1">Contact admin to get courses assigned to you</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {myCourses.map((course, index) => (
                                    <motion.div
                                        key={course.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 + index * 0.1 }}
                                        className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer border border-gray-100"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                                                <BookOpen className="w-6 h-6 text-white" />
                                            </div>
                                            <Badge variant={course.status === 'active' ? 'success' : 'secondary'}>
                                                {course.status}
                                            </Badge>
                                        </div>
                                        <h4 className="font-semibold text-gray-900 mb-2">{course.title}</h4>
                                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                                            <span className="flex items-center gap-1">
                                                <Users className="w-4 h-4" /> {course.students} students
                                            </span>
                                            {course.startDate && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" /> {new Date(course.startDate).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => navigate('/teacher/attendance')}
                                            className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                                        >
                                            Manage Course <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* Submissions Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white rounded-2xl p-6 border border-gray-100"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Weekly Activity</h3>
                                <p className="text-sm text-gray-500">Student submissions</p>
                            </div>
                        </div>
                        <BarChart data={submissionsChartData} height={200} />
                    </motion.div>
                </div>

                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white rounded-2xl p-6 border border-gray-100"
                >
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            onClick={() => navigate('/teacher/attendance')}
                            className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
                        >
                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <ClipboardList className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-gray-900">Mark Attendance</p>
                                <p className="text-sm text-gray-500">Take today's attendance</p>
                            </div>
                        </button>
                        <button
                            onClick={() => navigate('/teacher/profile')}
                            className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                        >
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-gray-900">My Profile</p>
                                <p className="text-sm text-gray-500">View and edit profile</p>
                            </div>
                        </button>
                        <button
                            className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
                        >
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-purple-600" />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-gray-900">View Reports</p>
                                <p className="text-sm text-gray-500">Check attendance reports</p>
                            </div>
                        </button>
                    </div>
                </motion.div>
            </div>
        </>
    );
};

export default TeacherDashboard;

