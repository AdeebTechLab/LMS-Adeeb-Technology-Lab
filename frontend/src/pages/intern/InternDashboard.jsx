import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    Clock, CheckCircle, BookOpen, Calendar, Users, TrendingUp, Loader2, RefreshCw
} from 'lucide-react';
import { enrollmentAPI } from '../../services/api';

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
                setInternshipData({
                    program: firstEnrollment.course?.title || 'Internship Program',
                    duration: firstEnrollment.course?.duration || '3 Month',
                    status: firstEnrollment.status || 'Active',
                    progress: firstEnrollment.progress || Math.floor(Math.random() * 60) + 20,
                    mentor: firstEnrollment.course?.teacher?.name || 'TBA',
                    completedModules: Math.floor((firstEnrollment.progress || 0) / 10),
                    totalModules: 10
                });
            }
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
            {/* Welcome Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">
                            Welcome back, {user?.name || 'Intern'}! 👋
                        </h1>
                        <p className="text-blue-100 text-lg">
                            Keep up the great work on your {internshipData.program} internship!
                        </p>
                    </div>
                    <button onClick={fetchDashboardData} className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
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
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">{internshipData.progress}%</h3>
                    <p className="text-gray-500 text-sm mt-1">Overall Progress</p>
                    <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-green-500 h-2 rounded-full transition-all"
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

            {/* Enrolled Programs */}
            {enrollments.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                >
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        Your Programs
                    </h2>
                    <div className="space-y-4">
                        {enrollments.map((enrollment) => (
                            <div
                                key={enrollment._id}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <BookOpen className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900">{enrollment.course?.title || 'Program'}</h3>
                                        <p className="text-sm text-gray-500 flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {enrollment.course?.duration || 'In Progress'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate('/intern/attendance')}
                                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                    View
                                </button>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default InternDashboard;
