import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    Briefcase, Clock, FileText, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw
} from 'lucide-react';
import { taskAPI } from '../../services/api';

const JobDashboard = () => {
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [tasks, setTasks] = useState([]);
    const [assignedTasks, setAssignedTasks] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            // Fetch available tasks
            const tasksRes = await taskAPI.getAll();
            setTasks(tasksRes.data.data || []);

            // Fetch my assigned tasks
            const myTasksRes = await taskAPI.getMy();
            setAssignedTasks(myTasksRes.data.data || []);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const applicationSteps = [
        { id: 1, title: 'Account Created', status: 'completed', date: new Date(user?.createdAt).toLocaleDateString() || 'Done' },
        { id: 2, title: 'Profile Complete', status: user?.phone ? 'completed' : 'current', date: user?.phone ? 'Done' : 'In Progress' },
        { id: 3, title: 'Browse Tasks', status: tasks.length > 0 ? 'completed' : 'pending', date: tasks.length > 0 ? 'Available' : 'Pending' },
        { id: 4, title: 'Apply for Tasks', status: assignedTasks.length > 0 ? 'completed' : 'pending', date: assignedTasks.length > 0 ? 'Applied' : 'Pending' },
        { id: 5, title: 'Complete Work', status: 'pending', date: 'Pending' },
    ];

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-6 h-6 text-green-500" />;
            case 'current':
                return <Clock className="w-6 h-6 text-blue-500 animate-pulse" />;
            case 'pending':
                return <AlertCircle className="w-6 h-6 text-gray-300" />;
            default:
                return <XCircle className="w-6 h-6 text-red-500" />;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
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
                className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">
                            Welcome, {user?.name || 'Applicant'}! 👋
                        </h1>
                        <p className="text-purple-100 text-lg">
                            Browse available tasks and track your work!
                        </p>
                    </div>
                    <button onClick={fetchDashboardData} className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </motion.div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                >
                    <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-600" />
                        Task Overview
                    </h2>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="p-4 bg-purple-50 rounded-xl">
                            <p className="text-sm text-gray-500 mb-1">Available Tasks</p>
                            <p className="text-2xl font-bold text-purple-900">{tasks.length}</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-xl">
                            <p className="text-sm text-gray-500 mb-1">My Assigned Tasks</p>
                            <p className="text-2xl font-bold text-green-900">{assignedTasks.length}</p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-xl">
                            <p className="text-sm text-gray-500 mb-1">Location</p>
                            <p className="font-semibold text-blue-900 capitalize">{user?.location || 'Not set'}</p>
                        </div>
                        <div className="p-4 bg-orange-50 rounded-xl">
                            <p className="text-sm text-gray-500 mb-1">Account Status</p>
                            <p className="font-semibold text-orange-900">{user?.isActive ? 'Active' : 'Pending'}</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                >
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/job/tasks')}
                            className="w-full flex items-center gap-3 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
                        >
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Briefcase className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-purple-900">Browse Tasks</p>
                                <p className="text-sm text-purple-600">Find available paid tasks</p>
                            </div>
                        </button>
                        <button
                            onClick={() => navigate('/job/profile')}
                            className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <FileText className="w-5 h-5 text-gray-600" />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-gray-900">My Profile</p>
                                <p className="text-sm text-gray-600">Update your information</p>
                            </div>
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Progress Steps */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    Getting Started
                </h2>

                <div className="space-y-4">
                    {applicationSteps.map((step, index) => (
                        <div key={step.id} className="flex items-start gap-4">
                            <div className="flex flex-col items-center">
                                {getStatusIcon(step.status)}
                                {index < applicationSteps.length - 1 && (
                                    <div className={`w-0.5 h-12 ${step.status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                                        }`} />
                                )}
                            </div>
                            <div className={`flex-1 pb-4 ${step.status === 'current' ? 'bg-blue-50 -mx-4 px-4 py-3 rounded-xl' : ''}`}>
                                <h3 className={`font-medium ${step.status === 'pending' ? 'text-gray-400' : 'text-gray-900'
                                    }`}>
                                    {step.title}
                                </h3>
                                <p className={`text-sm ${step.status === 'pending' ? 'text-gray-300' : 'text-gray-500'
                                    }`}>
                                    {step.date}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Info Box */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200"
            >
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Need Help?</h3>
                        <p className="text-gray-600 text-sm">
                            If you have any questions about available tasks or payments,
                            please contact our support team at <span className="font-medium">support@edulms.com</span> or
                            call <span className="font-medium">+92 300 1234567</span>.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default JobDashboard;
