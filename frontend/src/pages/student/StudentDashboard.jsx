import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
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
    Trash2,
    Video,
    ExternalLink
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { enrollmentAPI, feeAPI, assignmentAPI, liveClassAPI } from '../../services/api';
import Modal from '../../components/ui/Modal'; // Assuming Modal component exists
import { getCourseIcon, getCourseColor, getCourseStyle } from '../../utils/courseIcons';

const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return rawUrl.replace('/api', '');
};

const SOCKET_URL = getSocketURL();


const StudentDashboard = () => {
    const navigate = useNavigate();
    const { role, user } = useSelector((state) => state.auth);
    const [isLoading, setIsLoading] = useState(true);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [pendingFees, setPendingFees] = useState(0);
    const [stats, setStats] = useState([]);
    const [pendingAssignments, setPendingAssignments] = useState([]);
    const [withdrawModal, setWithdrawModal] = useState({ open: false, enrollmentId: null, courseTitle: '' });
    const [activeLiveClasses, setActiveLiveClasses] = useState([]);
    const socketRef = useRef(null);

    useEffect(() => {
        fetchDashboardData();
        fetchActiveLiveClasses();

        // Socket connection for live class updates
        socketRef.current = io(SOCKET_URL, { withCredentials: true });
        
        socketRef.current.on('live_class_started', () => {
            fetchActiveLiveClasses();
        });

        socketRef.current.on('live_class_ended', () => {
            fetchActiveLiveClasses();
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const fetchActiveLiveClasses = async () => {
        try {
            const res = await liveClassAPI.getActive();
            setActiveLiveClasses(res.data.data || []);
        } catch (error) {
            console.error('Error fetching live classes:', error);
        }
    };

    const handleWithdrawClick = (e, course) => {
        e.stopPropagation(); // Prevent navigation
        setWithdrawModal({ open: true, enrollmentId: course.enrollmentId, courseTitle: course.title });
    };

    const confirmWithdraw = async () => {
        try {
            await enrollmentAPI.withdraw(withdrawModal.enrollmentId);
            setWithdrawModal({ open: false, enrollmentId: null, courseTitle: '' });
            fetchDashboardData(); // Refresh list
        } catch (error) {
            console.error('Withdrawal failed:', error);
            alert(error.response?.data?.message || 'Failed to withdraw from course');
        }
    };

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            // Fetch enrollments
            const enrollmentRes = await enrollmentAPI.getMy();
            const enrollments = enrollmentRes.data.data || [];

            const courses = enrollments.map(e => ({
                id: e.course?._id || e._id,
                enrollmentId: e._id,
                title: e.course?.title || 'Unknown Course',
                teacher: e.course?.teachers?.[0]?.name || 'TBA',
                bookLink: e.course?.bookLink || '',
                progress: e.progress || 0,
                nextClass: e.course?.schedule || 'Check schedule',
                isActive: e.isActive,
                status: e.status,
                isCompleted: e.status === 'completed',
                isFirstMonthVerified: e.installments?.[0]?.status === 'verified'
            }));
            setEnrolledCourses(courses);

            // Fetch fees
            let totalPendingAmount = 0;
            let totalPendingInstallments = 0;
            try {
                const feeRes = await feeAPI.getMy();
                const fees = feeRes.data.data || [];
                fees.forEach(f => {
                    f.installments?.forEach(inst => {
                        if (inst.status === 'pending' || inst.status === 'rejected') {
                            totalPendingAmount += inst.amount || 0;
                            totalPendingInstallments++;
                        }
                    });
                });
            } catch (e) {
                // Fees API might not exist for this user
            }
            setPendingFees(totalPendingAmount);

            // Fetch assignments
            let activeAssignments = [];
            try {
                const assignRes = await assignmentAPI.getMy();
                const allAssignments = assignRes.data.assignments || [];

                // Filter: Assigned to user, not submitted yet, and deadline is in the future
                // AND only show assignments for courses where at least the first month is verified
                activeAssignments = allAssignments.filter(a => {
                    const courseId = a.course?._id || a.course;
                    const courseEnroll = courses.find(c => c.id === courseId);

                    // Allow if course is active OR completed (sometimes final assignments are post-completion)
                    // But generally, restrict to verified first month
                    const isFirstMonthVerified = courseEnroll?.isFirstMonthVerified;

                    const mySub = a.submissions?.find(s => (s.user?._id || s.user) === (user?._id || user?.id));
                    const isSubmitted = !!mySub;
                    const isRejected = mySub?.status === 'rejected';

                    // Check deadline
                    // const isDeadlinePassed = new Date(a.dueDate) < new Date();

                    // Requirement: "pending assignments from all registered cources"
                    // So we want: Not Submitted OR Rejected.
                    // We typically typically exclude deadline passed if it's strictly "pending actionable", 
                    // but if they can still submit late, we include it.
                    // Let's stick to "Not Submitted or Rejected"

                    if (!isFirstMonthVerified) return false;

                    return (!isSubmitted) || isRejected;
                });
            } catch (e) {
                console.error('Error fetching assignments:', e);
            }
            setPendingAssignments(activeAssignments);

            // Build stats
            setStats([
                {
                    title: 'Enrolled Courses',
                    value: courses.filter(c => !c.isCompleted).length.toString(),
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
                    onClick: () => navigate(`/${role}/assignments`)
                },
                {
                    title: 'Certificates',
                    value: courses.filter(c => c.isCompleted).length.toString(),
                    icon: CheckCircle,
                    iconBg: 'bg-blue-100',
                    iconColor: 'text-blue-600',
                },
                {
                    title: 'Pending Fees',
                    value: totalPendingInstallments > 0 ? `${totalPendingInstallments} Pending` : 'All Clear',
                    subValue: totalPendingAmount > 0 ? `(Rs ${totalPendingAmount.toLocaleString()})` : '',
                    icon: CreditCard,
                    iconBg: totalPendingInstallments > 0 ? 'bg-red-100' : 'bg-green-100',
                    iconColor: totalPendingInstallments > 0 ? 'text-red-600' : 'text-green-600',
                    onClick: () => navigate(`/${role}/fees`)
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
                {/* Live Class Banner - Big and Prominent */}
                <AnimatePresence>
                    {activeLiveClasses.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            className="relative overflow-hidden"
                        >
                            {activeLiveClasses.map((liveClass) => (
                                <div
                                    key={liveClass._id}
                                    className="bg-gradient-to-r from-red-600 via-red-500 to-orange-500 rounded-3xl p-6 md:p-8 text-white shadow-2xl shadow-red-200 border-4 border-red-400"
                                >
                                    {/* Animated Background Pulses */}
                                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-3xl">
                                        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                                        <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-yellow-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                                    </div>

                                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            {/* Animated Live Indicator */}
                                            <div className="flex-shrink-0">
                                                <div className="relative">
                                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                                                        <Video className="w-8 h-8 md:w-10 md:h-10" />
                                                    </div>
                                                    <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-white text-red-600 px-2 py-1 rounded-full text-xs font-black uppercase">
                                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                                        LIVE
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold uppercase tracking-widest text-white/80">🔴 Live Class in Progress</span>
                                                </div>
                                                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
                                                    {liveClass.title}
                                                </h2>
                                                {liveClass.description && (
                                                    <p className="text-white/80 mt-1 text-sm md:text-base">{liveClass.description}</p>
                                                )}
                                                <p className="text-white/70 text-sm mt-2">
                                                    by {liveClass.createdBy?.name || 'Teacher'}
                                                </p>
                                            </div>
                                        </div>

                                        <a
                                            href={liveClass.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-shrink-0 px-8 py-4 md:px-10 md:py-5 bg-white text-red-600 rounded-2xl font-black uppercase tracking-widest text-sm md:text-base hover:bg-gray-100 transition-all shadow-lg flex items-center gap-3 group"
                                        >
                                            <ExternalLink className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-12 transition-transform" />
                                            Join Now
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

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
                                {enrolledCourses.filter(c => c.isActive).length} active enrollments • {pendingAssignments.length} pending tasks
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
                                        className="bg-white p-4 rounded-2xl border border-gray-100 flex gap-4 hover:shadow-md transition-all cursor-pointer group"
                                        onClick={() => {
                                            if (course.isCompleted) {
                                                navigate(`/${role}/assignments`);
                                            } else {
                                                navigate(`../course/${course.id}`);
                                            }
                                        }}
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm ${(() => {
                                            const style = getCourseStyle(course.category || '', course.title);
                                            return `${style.bg}`;
                                        })()}`}>
                                            {(() => {
                                                const style = getCourseStyle(course.category || '', course.title);
                                                const Icon = style.icon;
                                                return <Icon className={`w-6 h-6 ${style.text}`} />;
                                            })()}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">{course.title}</h4>
                                                    <p className="text-xs text-gray-400 mt-1 truncate">{course.teacher}</p>
                                                </div>

                                                <div className="flex flex-col items-end ml-4 space-y-1">
                                                    <div>
                                                        {course.isCompleted ? (
                                                            <Badge variant="success">Completed</Badge>
                                                        ) : !course.isFirstMonthVerified ? (
                                                            <Badge variant="warning">Verification Pending</Badge>
                                                        ) : !course.isActive ? (
                                                            <Badge variant="danger">Restricted</Badge>
                                                        ) : (
                                                            <Badge variant="success">Active</Badge>
                                                        )}
                                                    </div>
                                                    <Badge variant="info">{course.progress}%</Badge>
                                                </div>
                                            </div>

                                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                                                <div
                                                    className="h-full bg-gradient-to-r from-[#ff8e01] to-orange-400 rounded-full shadow-sm"
                                                    style={{ width: `${course.progress}%` }}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                <span className="flex items-center gap-1 truncate">
                                                    <Calendar className="w-3 h-3" />
                                                    <span className="truncate">{course.nextClass}</span>
                                                </span>

                                                <div className="flex items-center gap-2">
                                                    {course.bookLink && (
                                                        <a
                                                            href={course.bookLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="flex items-center gap-2 px-3 py-1 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:shadow-lg transition-all font-black text-[10px] uppercase tracking-widest active:scale-95"
                                                        >
                                                            <BookOpen className="w-3.5 h-3.5" />
                                                            COURSE BOOK
                                                        </a>
                                                    )}

                                                    {!course.isFirstMonthVerified && (
                                                        <button
                                                            onClick={(e) => handleWithdrawClick(e, course)}
                                                            className="flex items-center gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors z-10"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                            Revoke
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </div >
            </div >

            {/* Withdrawal Confirmation Modal */}
            < Modal
                isOpen={withdrawModal.open}
                onClose={() => setWithdrawModal({ ...withdrawModal, open: false })}
                title="Revoke Course Application"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-xl flex items-start gap-3">
                        <Trash2 className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-red-700 text-sm">Are you sure?</h4>
                            <p className="text-xs text-red-600 mt-1">
                                You are about to withdraw from <strong>{withdrawModal.courseTitle}</strong>.
                                This will remove the course and any pending fee records.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={() => setWithdrawModal({ ...withdrawModal, open: false })}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmWithdraw}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
                        >
                            Confirm Revoke
                        </button>
                    </div>
                </div>
            </Modal >
        </>
    );
};

export default StudentDashboard;

