import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    Clock, CheckCircle, BookOpen, CreditCard, Users, TrendingUp, Loader2, Bell
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { enrollmentAPI, assignmentAPI, feeAPI } from '../../services/api';
import { getCourseIcon } from '../../utils/courseIcons';

const InternDashboard = () => {
    const { user, role } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [enrollments, setEnrollments] = useState([]);
    const [pendingAssignments, setPendingAssignments] = useState([]);
    const [stats, setStats] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            // Fetch Enrollments
            const response = await enrollmentAPI.getMy();
            const data = response.data.data || [];
            setEnrollments(data);

            const courses = data.map(e => ({
                id: e.course?._id || e._id,
                title: e.course?.title || 'Unknown Program',
                isActive: e.isActive,
                isCompleted: e.status === 'completed',
                isFirstMonthVerified: e.installments?.[0]?.status === 'verified',
                durationMonths: e.course?.durationMonths
            }));

            // Fetch Fees
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
                // Ignore if no fee API access
            }

            // Fetch Assignments
            let activeAssignments = [];
            try {
                const assignRes = await assignmentAPI.getMy();
                const allAssignments = assignRes.data.assignments || [];
                activeAssignments = allAssignments.filter(a => {
                    const courseId = a.course?._id || a.course;
                    const courseEnroll = courses.find(c => c.id === courseId);
                    const isFirstMonthVerified = courseEnroll?.isFirstMonthVerified;

                    const mySub = a.submissions?.find(s => (s.user?._id || s.user) === (user?._id || user?.id));
                    const isSubmitted = !!mySub;
                    const isRejected = mySub?.status === 'rejected';

                    if (!isFirstMonthVerified) return false;

                    return (!isSubmitted) || isRejected;
                });
            } catch (e) {
                console.error('Error fetching assignments:', e);
            }
            setPendingAssignments(activeAssignments);

            // Build Stats
            setStats([
                {
                    title: 'Enrolled Programs',
                    value: courses.filter(c => c.isActive && !c.isCompleted).length.toString(),
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading dashboard...</span>
            </div>
        );
    }

    return (
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
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Assignment Due Soon</h3>
                            <p className="text-xs text-gray-600 font-medium lowercase">You have {pendingAssignments.length} pending task(s) in your pipeline.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(`/${role}/assignments`)}
                        className="px-4 py-2 bg-[#ff8e01] text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#e67e00] transition-colors shadow-sm"
                    >
                        Review Now
                    </button>
                </motion.div>
            )}

            {/* Welcome Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-[#222d38] to-[#394251] rounded-2xl p-8 text-white shadow-xl"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black mb-1 uppercase italic tracking-tighter">
                            Welcome back, {user?.name?.split(' ')[0] || 'Intern'}! 👋
                        </h1>
                        <p className="text-white/60 text-sm font-bold uppercase tracking-widest">
                            {enrollments.filter(e => e.isActive).length} Active Programs • {pendingAssignments.length} Pending Tasks
                        </p>
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

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pending Tasks */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="lg:col-span-1 space-y-4"
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900 uppercase italic">Active Assignments</h2>
                        <Badge variant="warning">{pendingAssignments.length}</Badge>
                    </div>
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4 max-h-[500px] overflow-y-auto">
                        {pendingAssignments.length === 0 ? (
                            <div className="text-center py-12 opacity-50">
                                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                                <p className="text-xs font-black uppercase">Assignments Clear!</p>
                            </div>
                        ) : (
                            pendingAssignments.map((assignment) => (
                                <div key={assignment._id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-[#ff8e01]/30 hover:bg-white hover:shadow-xl transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center border border-orange-100 group-hover:bg-[#ff8e01] transition-colors">
                                                <Clock className="w-5 h-5 text-[#ff8e01] group-hover:text-white" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-gray-900 text-sm group-hover:text-[#ff8e01] transition-colors uppercase italic truncate max-w-[150px]">{assignment.title}</h4>
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">
                                                    Deadline: {new Date(assignment.dueDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/${role}/assignments`)}
                                        className="w-full py-2.5 bg-[#222d38] hover:bg-[#394251] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                                    >
                                        Go to Submission
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* Enrolled Programs */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="lg:col-span-2 space-y-4"
                >
                    <h2 className="text-xl font-bold text-gray-900 uppercase italic">Registered Programs</h2>
                    <div className="space-y-4">
                        {enrollments.map((enrollment) => (
                            <div
                                key={enrollment._id}
                                className="flex items-center justify-between p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 group-hover:bg-blue-600 transition-colors">
                                        {(() => {
                                            const Icon = getCourseIcon(enrollment.course?.category, enrollment.course?.title);
                                            return <Icon className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />;
                                        })()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{enrollment.course?.title || 'Program'}</h3>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1 italic">
                                            {enrollment.course?.durationMonths
                                                ? `${enrollment.course.durationMonths} ${enrollment.course.durationMonths === 1 ? 'Month' : 'Months'}`
                                                : 'Ongoing'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {enrollment.installments?.[0]?.status !== 'verified' ? (
                                        <button
                                            onClick={() => navigate(`/${role}/fees`)}
                                            className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-all active:scale-95"
                                        >
                                            Pay Fee
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => navigate(`/${role}/attendance`)}
                                            className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all active:scale-95"
                                        >
                                            Portal
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default InternDashboard;
