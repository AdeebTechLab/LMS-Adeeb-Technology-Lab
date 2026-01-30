import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    Clock, CheckCircle, BookOpen, Calendar, Users, TrendingUp, Loader2, RefreshCw
} from 'lucide-react';
import { enrollmentAPI, assignmentAPI } from '../../services/api';

const InternDashboard = () => {
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [internshipData, setInternshipData] = useState({
        program: 'Loading...',
        duration: '',
        status: 'Active',
        progress: 0,
        mentor: 'TBA',
        completedModules: 0,
        totalModules: 0
    });
    const [enrollments, setEnrollments] = useState([]);
    const [pendingAssignments, setPendingAssignments] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            const response = await enrollmentAPI.getMy();
            const data = response.data.data || [];
            setEnrollments(data);

            if (data.length > 0) {
                const firstEnrollment = data[0];
                const durationText = firstEnrollment.course?.durationMonths
                    ? `${firstEnrollment.course.durationMonths} ${firstEnrollment.course.durationMonths === 1 ? 'Month' : 'Months'}`
                    : 'Ongoing';
                const mentorName = firstEnrollment.course?.teachers?.[0]?.name || 'TBA';

                setInternshipData({
                    program: firstEnrollment.course?.title || 'Internship Program',
                    duration: durationText,
                    status: firstEnrollment.status || 'Active',
                    progress: firstEnrollment.progress || 0,
                    mentor: mentorName,
                    completedModules: Math.floor((firstEnrollment.progress || 0) / 10),
                    totalModules: 10
                });
            }

            // Fetch Assignments
            let activeAssignments = [];
            try {
                const assignRes = await assignmentAPI.getMy();
                const allAssignments = assignRes.data.assignments || [];
                activeAssignments = allAssignments.filter(a => {
                    const mySub = a.submissions?.find(s => (s.user?._id || s.user) === (user?._id || user?.id));
                    const isSubmitted = !!mySub;
                    const isDeadlinePassed = new Date(a.dueDate) < new Date();
                    return !isSubmitted && !isDeadlinePassed;
                });
            } catch (e) {
                console.error('Error fetching assignments:', e);
            }
            setPendingAssignments(activeAssignments);
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
                            <Clock className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Assignment Due Soon</h3>
                            <p className="text-xs text-gray-600 font-medium lowercase">You have {pendingAssignments.length} pending task(s) in your pipeline.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/intern/assignments')}
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
                            {internshipData.program} Internship • {internshipData.progress}% Progress
                        </p>
                    </div>
                    <button onClick={fetchDashboardData} className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors border border-white/10">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-blue-600" />
                        </div>
                        <span className="text-sm text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full">
                            {internshipData.status}
                        </span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">{internshipData.program}</h3>
                    <p className="text-gray-500 text-sm mt-1">Current Program</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center border border-orange-100">
                            <TrendingUp className="w-6 h-6 text-[#ff8e01]" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900">{internshipData.progress}%</h3>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Overall Progress</p>
                    <div className="mt-3 w-full bg-gray-100 rounded-full h-2">
                        <div
                            className="bg-[#ff8e01] h-2 rounded-full transition-all shadow-sm"
                            style={{ width: `${internshipData.progress}%` }}
                        />
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                        {internshipData.completedModules}/{internshipData.totalModules}
                    </h3>
                    <p className="text-gray-500 text-sm mt-1">Modules Completed</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{internshipData.mentor}</h3>
                    <p className="text-gray-500 text-sm mt-1">Your Mentor</p>
                </motion.div>
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
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-lg text-[10px] font-black">{pendingAssignments.length}</span>
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
                                        onClick={() => navigate('/intern/assignments')}
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
                                        <BookOpen className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
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
                                <button
                                    onClick={() => navigate('/intern/attendance')}
                                    className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all active:scale-95"
                                >
                                    Portal
                                </button>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default InternDashboard;
