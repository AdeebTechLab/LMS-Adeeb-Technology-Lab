import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
    BookOpen,
    Clock,
    CheckCircle,
    CreditCard,
    Calendar,
    ArrowRight,
    FileText,
    Bell,
    Loader2,
    RefreshCw
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { enrollmentAPI, feeAPI } from '../../services/api';

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { role } = useSelector((state) => state.auth);
    const [isLoading, setIsLoading] = useState(true);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [pendingFees, setPendingFees] = useState(0);
    const [stats, setStats] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            // Fetch enrollments
            const enrollmentRes = await enrollmentAPI.getMy();
            const enrollments = enrollmentRes.data.data || [];

            const courses = enrollments.map(e => ({
                id: e._id,
                title: e.course?.title || 'Unknown Course',
                teacher: e.course?.teacher?.name || 'TBA',
                progress: e.progress || Math.floor(Math.random() * 100),
                nextClass: e.course?.schedule || 'Check schedule'
            }));
            setEnrolledCourses(courses);

            // Fetch fees
            let totalPending = 0;
            try {
                const feeRes = await feeAPI.getMy();
                const fees = feeRes.data.data || [];
                fees.forEach(f => {
                    f.installments?.forEach(inst => {
                        if (inst.status === 'pending' || inst.status === 'rejected') {
                            totalPending += inst.amount || 0;
                        }
                    });
                });
            } catch (e) {
                // Fees API might not exist for this user
            }
            setPendingFees(totalPending);

            // Build stats
            setStats([
                {
                    title: 'Enrolled Courses',
                    value: courses.length.toString(),
                    icon: BookOpen,
                    iconBg: 'bg-emerald-100',
                    iconColor: 'text-emerald-600',
                },
                {
                    title: 'Pending Assignments',
                    value: '0',
                    icon: Clock,
                    iconBg: 'bg-amber-100',
                    iconColor: 'text-amber-600',
                },
                {
                    title: 'Completed',
                    value: courses.filter(c => c.progress === 100).length.toString(),
                    icon: CheckCircle,
                    iconBg: 'bg-blue-100',
                    iconColor: 'text-blue-600',
                },
                {
                    title: 'Pending Fees',
                    value: totalPending > 0 ? `Rs ${totalPending.toLocaleString()}` : 'Paid',
                    icon: CreditCard,
                    iconBg: totalPending > 0 ? 'bg-red-100' : 'bg-green-100',
                    iconColor: totalPending > 0 ? 'text-red-600' : 'text-green-600',
                },
            ]);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'border-l-red-500';
            case 'medium': return 'border-l-amber-500';
            case 'low': return 'border-l-green-500';
            default: return 'border-l-gray-300';
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'assignment': return FileText;
            case 'fee': return CreditCard;
            case 'quiz': return CheckCircle;
            default: return Clock;
        }
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
        <div className="space-y-6">
            {/* Welcome Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-[#0D2818] to-[#1A5D3A] rounded-2xl p-6 text-white"
            >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Welcome back, Student!</h2>
                        <p className="text-white/70">
                            You have {enrolledCourses.length} enrolled courses.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate(`/${role}/attendance`)}
                            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-all duration-300 border border-white/20"
                        >
                            View Attendance
                        </button>
                        <button
                            onClick={() => navigate('/student/courses')}
                            className="px-5 py-2.5 bg-white hover:bg-white/90 text-[#0D2818] rounded-xl font-medium transition-all duration-300"
                        >
                            Browse Courses
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

            {/* Enrolled Courses */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">My Courses</h3>
                        <p className="text-sm text-gray-500">Continue learning where you left off</p>
                    </div>
                    <button
                        onClick={fetchDashboardData}
                        className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>

                {enrolledCourses.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">You haven't enrolled in any courses yet</p>
                        <button
                            onClick={() => navigate('/student/courses')}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium"
                        >
                            Browse Courses
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {enrolledCourses.map((course, index) => (
                            <motion.div
                                key={course.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 + index * 0.1 }}
                                whileHover={{ y: -4 }}
                                onClick={() => navigate(`../course/${course.id}`)}
                                className="bg-white rounded-2xl p-6 border border-gray-100 cursor-pointer hover:shadow-lg transition-all"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                                        <BookOpen className="w-6 h-6 text-white" />
                                    </div>
                                    <Badge variant="primary">{course.progress}%</Badge>
                                </div>
                                <h4 className="font-bold text-gray-900 mb-1">{course.title}</h4>
                                <p className="text-sm text-gray-500 mb-4">{course.teacher}</p>

                                {/* Progress Bar */}
                                <div className="mb-4">
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${course.progress}%` }}
                                            transition={{ duration: 1, delay: 0.8 }}
                                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {course.nextClass}
                                    </span>
                                    <ArrowRight className="w-4 h-4 text-emerald-600" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default StudentDashboard;
