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
import { enrollmentAPI, feeAPI, assignmentAPI } from '../../services/api';


const StudentDashboard = () => {
    const navigate = useNavigate();
    const { role, user } = useSelector((state) => state.auth);
    const [isLoading, setIsLoading] = useState(true);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [pendingFees, setPendingFees] = useState(0);
    const [stats, setStats] = useState([]);
    const [pendingAssignments, setPendingAssignments] = useState([]);

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
                id: e.course?._id || e._id,
                title: e.course?.title || 'Unknown Course',
                teacher: e.course?.teacher?.name || 'TBA',
                progress: e.progress || 0,
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

            // Fetch assignments
            let activeAssignments = [];
            try {
                const assignRes = await assignmentAPI.getMy();
                const allAssignments = assignRes.data.assignments || [];

                // Filter: Assigned to user, not submitted yet, and deadline is in the future
                activeAssignments = allAssignments.filter(a => {
                    const mySub = a.submissions?.find(s => (s.user?._id || s.user) === (user?._id || user?.id));
                    const isSubmitted = !!mySub;
                    const isRejected = mySub?.status === 'rejected';
                    const isDeadlinePassed = new Date(a.dueDate) < new Date();

                    // Return true if (never submitted AND not expired) OR (Submitted but REJECTED)
                    return (!isSubmitted && !isDeadlinePassed) || isRejected;
                });
            } catch (e) {
                console.error('Error fetching assignments:', e);
            }
            setPendingAssignments(activeAssignments);

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
                    value: activeAssignments.length.toString(),
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
        <>
            <div className="space-y-6">
                {/* High Priority Highlight */}
                {pendingAssignments.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-orange-50 border-2 border-[#ff8e01]/20 rounded-2xl p-4 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#ff8e01] rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
                                <Bell className="w-6 h-6 animate-bounce" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Urgent Task Pending</h3>
                                <p className="text-xs text-gray-600 font-medium lowercase">You have {pendingAssignments.length} assignment(s) requiring immediate attention.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate(`/${role}/assignments`)}
                            className="px-4 py-2 bg-[#ff8e01] text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#e67e00] transition-colors shadow-sm"
                        >
                            View All
                        </button>
                    </motion.div>
                )}

                {/* Welcome Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-[#222d38] to-[#394251] rounded-2xl p-6 text-white shadow-xl"
                >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-black mb-1 uppercase italic tracking-tighter">Welcome back, {user?.name?.split(' ')[0] || (role === 'intern' ? 'Intern' : 'Student')}!</h2>
                            <p className="text-white/60 font-bold text-xs uppercase tracking-widest">
                                {enrolledCourses.length} active enrollments • {pendingAssignments.length} pending tasks
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate(`/${role}/attendance`)}
                                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 border border-white/20"
                            >
                                Attendance
                            </button>
                            <button
                                onClick={() => navigate('/student/courses')}
                                className="px-5 py-2.5 bg-[#ff8e01] hover:bg-[#ff8e01]/90 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 shadow-lg shadow-orange-900/20"
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Pending Assignments List */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="lg:col-span-1 space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900 uppercase italic">Active Tasks</h3>
                            <Badge variant="warning">{pendingAssignments.length}</Badge>
                        </div>

                        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4 max-h-[500px] overflow-y-auto">
                            {pendingAssignments.length === 0 ? (
                                <div className="text-center py-10 opacity-50">
                                    <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                                    <p className="text-xs font-black uppercase">All Caught Up!</p>
                                </div>
                            ) : (
                                pendingAssignments.map((assignment, index) => (
                                    <div key={assignment._id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-[#ff8e01]/30 hover:bg-white hover:shadow-xl transition-all">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center border border-orange-200">
                                                    <FileText className="w-5 h-5 text-[#ff8e01]" />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-gray-900 text-sm group-hover:text-[#ff8e01] transition-colors uppercase italic truncate max-w-[150px]">{assignment.title}</h4>
                                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">
                                                        Due: {new Date(assignment.dueDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/${role}/assignments`)}
                                            className="w-full py-2.5 bg-[#222d38] hover:bg-[#394251] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-200 active:scale-95"
                                        >
                                            Submit Now
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>

                    {/* Enrolled Courses Grid */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="lg:col-span-2"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 uppercase italic">My Courses</h3>
                            </div>
                        </div>

                        {enrolledCourses.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 border border-gray-100 text-center">
                                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 mb-4 font-bold uppercase tracking-widest text-xs">No active enrollments</p>
                                <button
                                    onClick={() => navigate('/student/courses')}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium"
                                >
                                    Browse Courses
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {enrolledCourses.map((course, index) => (
                                    <motion.div
                                        key={course.id}
                                        whileHover={{ y: -4 }}
                                        onClick={() => navigate(`../course/${course.id}`)}
                                        className="bg-white rounded-3xl p-6 border border-gray-100 cursor-pointer hover:shadow-lg transition-all group"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-[#ff8e01] transition-colors shadow-inner">
                                                <BookOpen className="w-6 h-6 text-slate-600 group-hover:text-white transition-colors" />
                                            </div>
                                            <Badge variant="success">{course.progress}%</Badge>
                                        </div>
                                        <h4 className="font-bold text-gray-900 mb-1 uppercase tracking-tight group-hover:text-emerald-600 transition-colors">{course.title}</h4>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-4 italic">{course.teacher}</p>

                                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4 p-0.5">
                                            <div
                                                className="h-full bg-gradient-to-r from-[#ff8e01] to-orange-400 rounded-full shadow-sm"
                                                style={{ width: `${course.progress}%` }}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {course.nextClass}
                                            </span>
                                            <ArrowRight className="w-3 h-3 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </>
    );
};

export default StudentDashboard;

