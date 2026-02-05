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
    Calendar,
    Video,
    X,
    ExternalLink,
    StopCircle
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { BarChart } from '../../components/charts/Charts';
import { courseAPI, enrollmentAPI, assignmentAPI, dailyTaskAPI, liveClassAPI } from '../../services/api';
import { getCourseIcon, getCourseStyle } from '../../utils/courseIcons';


const TeacherDashboard = () => {
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [myCourses, setMyCourses] = useState([]);
    const [totalStudents, setTotalStudents] = useState(0);
    const [stats, setStats] = useState([]);
    
    // Live Class States
    const [showLiveClassModal, setShowLiveClassModal] = useState(false);
    const [liveClassForm, setLiveClassForm] = useState({
        title: '',
        link: '',
        description: '',
        visibility: 'all'
    });
    const [activeLiveClasses, setActiveLiveClasses] = useState([]);
    const [isCreatingLiveClass, setIsCreatingLiveClass] = useState(false);

    useEffect(() => {
        if (user?.id || user?._id) {
            fetchDashboardData();
            fetchActiveLiveClasses();
        }
    }, [user]);

    const fetchActiveLiveClasses = async () => {
        try {
            const res = await liveClassAPI.getAll();
            setActiveLiveClasses((res.data.data || []).filter(lc => lc.isActive));
        } catch (error) {
            console.error('Error fetching live classes:', error);
        }
    };

    const handleCreateLiveClass = async (e) => {
        e.preventDefault();
        if (!liveClassForm.title || !liveClassForm.link) return;

        setIsCreatingLiveClass(true);
        try {
            await liveClassAPI.create(liveClassForm);
            setShowLiveClassModal(false);
            setLiveClassForm({ title: '', link: '', description: '', visibility: 'all' });
            fetchActiveLiveClasses();
        } catch (error) {
            console.error('Error creating live class:', error);
            alert('Failed to create live class');
        } finally {
            setIsCreatingLiveClass(false);
        }
    };

    const handleEndLiveClass = async (id) => {
        if (!window.confirm('Are you sure you want to end this live class?')) return;
        try {
            await liveClassAPI.end(id);
            fetchActiveLiveClasses();
        } catch (error) {
            console.error('Error ending live class:', error);
        }
    };

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            // Fetch all courses
            const coursesRes = await courseAPI.getAll();
            const allCourses = coursesRes.data.data || [];

            // Filter courses where this teacher is assigned (check teachers array)
            // User object from login has 'id' not '_id'
            const teacherId = (user?.id || user?._id)?.toString();
            console.log('Dashboard - Logged in Teacher ID:', teacherId);

            const teacherCourses = allCourses.filter(c => {
                const isMatch = c.teachers?.some(t => {
                    const tId = (t._id || t)?.toString();
                    return tId === teacherId;
                });
                return isMatch;
            });

            console.log('Dashboard - Teacher courses found:', teacherCourses.length, teacherCourses.map(c => c.title));

            // Get enrollments to count students per course
            let enrollments = [];
            try {
                const enrollmentsRes = await enrollmentAPI.getAll();
                enrollments = enrollmentsRes.data.data || [];
                console.log('Dashboard - Total enrollments fetched:', enrollments.length);
            } catch (e) { 
                console.error('Error fetching enrollments:', e);
            }

            // Map courses with student counts
            const coursesWithData = teacherCourses.map(course => {
                // Compare course IDs as strings for proper matching
                const courseIdStr = course._id.toString();
                const courseEnrollments = enrollments.filter(e => {
                    const enrollCourseId = (e.course?._id || e.course)?.toString();
                    return enrollCourseId === courseIdStr;
                });
                
                console.log(`Dashboard - Course "${course.title}": ${courseEnrollments.length} enrollments`);
                
                return {
                    id: course._id,
                    title: course.title,
                    students: courseEnrollments.length,
                    assignments: 0,
                    pendingSubmissions: 0,
                    status: course.isActive !== false ? 'active' : 'inactive',
                    startDate: course.startDate,
                    category: course.category,
                    duration: course.duration
                };
            });

            // Fetch assignments and daily tasks for each course
            let totalPendingReviews = 0;
            const coursesWithFullData = await Promise.all(coursesWithData.map(async (courseData) => {
                try {
                    // Fetch assignments for this course
                    const assignmentsRes = await assignmentAPI.getByCourse(courseData.id);
                    const assignments = assignmentsRes.data.assignments || [];
                    
                    // Count pending submissions (submitted but not graded)
                    let pendingAssignments = 0;
                    let totalSubmissions = 0;
                    let gradedSubmissions = 0;
                    let totalMarks = 0;
                    let totalPossibleMarks = 0;
                    
                    assignments.forEach(a => {
                        const submissions = a.submissions || [];
                        totalSubmissions += submissions.length;
                        
                        submissions.forEach(s => {
                            if (s.marks !== undefined && s.marks !== null) {
                                gradedSubmissions++;
                                totalMarks += s.marks;
                                totalPossibleMarks += (a.totalMarks || 100);
                            } else {
                                pendingAssignments++;
                            }
                        });
                    });
                    
                    const avgPercentage = totalPossibleMarks > 0 
                        ? Math.round((totalMarks / totalPossibleMarks) * 100) 
                        : 0;

                    // Fetch daily tasks for this course
                    let pendingTasks = 0;
                    try {
                        const tasksRes = await dailyTaskAPI.getByCourse(courseData.id);
                        const tasks = tasksRes.data.data || [];
                        pendingTasks = tasks.filter(t => t.status === 'submitted').length;
                    } catch (e) {
                        // Daily tasks might not be available for all courses
                    }

                    const totalPending = pendingAssignments + pendingTasks;
                    totalPendingReviews += totalPending;

                    console.log(`Dashboard - Course "${courseData.title}" assignment stats:`, {
                        totalSubmissions,
                        gradedSubmissions,
                        pendingGrading: pendingAssignments
                    });
                    
                    return {
                        ...courseData,
                        assignments: assignments.length,
                        pendingSubmissions: totalPending,
                        assignmentStats: {
                            totalSubmissions,
                            gradedSubmissions,
                            avgPercentage,
                            pendingGrading: pendingAssignments
                        }
                    };
                } catch (e) {
                    console.error(`Error fetching data for course ${courseData.title}:`, e);
                    return {
                        ...courseData,
                        assignmentStats: { totalSubmissions: 0, gradedSubmissions: 0, avgPercentage: 0, pendingGrading: 0 }
                    };
                }
            }));

            console.log('Dashboard - Courses with full data:', coursesWithFullData.map(c => ({
                title: c.title,
                assignmentStats: c.assignmentStats
            })));

            setMyCourses(coursesWithFullData);

            // Calculate total students
            const total = coursesWithFullData.reduce((sum, c) => sum + c.students, 0);
            setTotalStudents(total);

            // Build stats
            setStats([
                {
                    title: 'My Courses',
                    value: coursesWithFullData.length.toString(),
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
                    value: totalPendingReviews.toString(),
                    icon: ClipboardList,
                    iconBg: 'bg-amber-100',
                    iconColor: 'text-amber-600',
                },
                {
                    title: 'Active Courses',
                    value: coursesWithFullData.filter(c => c.status === 'active').length.toString(),
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
                                onClick={() => setShowLiveClassModal(true)}
                                className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all duration-300 flex items-center gap-2"
                            >
                                <Video className="w-4 h-4" />
                                Start Live Class
                            </button>
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
                        className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 overflow-visible"
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-visible pt-2 pr-2">
                                {myCourses.map((course, index) => (
                                    <motion.div
                                        key={course.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 + index * 0.1 }}
                                        className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer border border-gray-100 relative"
                                    >
                                        {/* Pending (ungraded) Submission Count Badge */}
                                        {course.assignmentStats?.pendingGrading > 0 && (
                                            <div className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                                                {course.assignmentStats.pendingGrading > 99 ? '99+' : course.assignmentStats.pendingGrading}
                                            </div>
                                        )}
                                        <div className="flex items-start justify-between mb-3">
                                            {(() => {
                                                const CourseIcon = getCourseIcon(course.category, course.title);
                                                const courseStyle = getCourseStyle(course.category, course.title);
                                                return (
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${courseStyle.gradient}`}>
                                                        <CourseIcon className="w-6 h-6 text-white" />
                                                    </div>
                                                );
                                            })()}
                                            <Badge variant={course.status === 'active' ? 'success' : 'secondary'}>
                                                {course.status}
                                            </Badge>
                                        </div>
                                        <h4 className="font-semibold text-gray-900 mb-2">{course.title}</h4>
                                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                                            <span className="flex items-center gap-1">
                                                <Users className="w-4 h-4" /> {course.students} students
                                            </span>
                                            {course.startDate && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" /> {new Date(course.startDate).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        
                                        {/* Assignment Stats */}
                                        {course.assignmentStats && course.assignments > 0 && (
                                            <div className="bg-gradient-to-r from-emerald-50/80 to-blue-50/80 rounded-lg p-2 mb-3 border border-emerald-100/50">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="flex items-center gap-1 text-gray-600 font-medium">
                                                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                                                        {course.assignments} Assignment{course.assignments > 1 ? 's' : ''}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        {course.assignmentStats.gradedSubmissions > 0 && (
                                                            <span className="flex items-center gap-1 text-emerald-600 font-bold">
                                                                <CheckCircle className="w-3 h-3" />
                                                                Avg: {course.assignmentStats.avgPercentage}%
                                                            </span>
                                                        )}
                                                        {course.assignmentStats.pendingGrading > 0 && (
                                                            <span className="flex items-center gap-1 text-amber-600 font-bold">
                                                                <Clock className="w-3 h-3" />
                                                                {course.assignmentStats.pendingGrading} pending
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        
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

                {/* Active Live Classes */}
                {activeLiveClasses.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl p-6 border border-gray-100"
                    >
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Video className="w-5 h-5 text-red-500" />
                            Your Active Live Classes
                        </h3>
                        <div className="space-y-3">
                            {activeLiveClasses.map((lc) => (
                                <div 
                                    key={lc._id} 
                                    className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{lc.title}</p>
                                            <p className="text-sm text-gray-500">
                                                Visible to: {lc.visibility === 'all' ? 'All Students & Interns' : lc.visibility === 'student' ? 'Students Only' : 'Interns Only'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <a
                                            href={lc.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Open
                                        </a>
                                        <button
                                            onClick={() => handleEndLiveClass(lc._id)}
                                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                                        >
                                            <StopCircle className="w-4 h-4" />
                                            End Class
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Live Class Creation Modal */}
            {showLiveClassModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl p-6 w-full max-w-md"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Video className="w-6 h-6 text-red-500" />
                                Start Live Class
                            </h3>
                            <button
                                onClick={() => setShowLiveClassModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateLiveClass} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Class Title *
                                </label>
                                <input
                                    type="text"
                                    value={liveClassForm.title}
                                    onChange={(e) => setLiveClassForm({ ...liveClassForm, title: e.target.value })}
                                    placeholder="e.g., Web Development Live Session"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Live Class Link *
                                </label>
                                <input
                                    type="url"
                                    value={liveClassForm.link}
                                    onChange={(e) => setLiveClassForm({ ...liveClassForm, link: e.target.value })}
                                    placeholder="https://meet.google.com/... or Zoom link"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description (Optional)
                                </label>
                                <textarea
                                    value={liveClassForm.description}
                                    onChange={(e) => setLiveClassForm({ ...liveClassForm, description: e.target.value })}
                                    placeholder="Brief description about the class..."
                                    rows={2}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Show to *
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { value: 'all', label: 'All' },
                                        { value: 'student', label: 'Students Only' },
                                        { value: 'intern', label: 'Interns Only' }
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setLiveClassForm({ ...liveClassForm, visibility: opt.value })}
                                            className={`px-4 py-3 rounded-xl font-medium transition-all ${
                                                liveClassForm.visibility === opt.value
                                                    ? 'bg-emerald-500 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowLiveClassModal(false)}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingLiveClass}
                                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isCreatingLiveClass ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Video className="w-5 h-5" />
                                    )}
                                    {isCreatingLiveClass ? 'Starting...' : 'Start Live Class'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </>
    );
};

export default TeacherDashboard;

