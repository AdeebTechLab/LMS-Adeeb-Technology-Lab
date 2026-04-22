import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Menu,
    Bell,
    Search,
    ChevronDown,
    Sun,
    Moon,
    RefreshCw,
    User,
    Settings,
    LifeBuoy
} from 'lucide-react';
import Sidebar from './Sidebar';
import NotificationPopup from '../shared/NotificationPopup';
import ChatWidget from '../shared/ChatWidget';
import { userNotificationAPI, assignmentAPI, courseAPI } from '../../services/api';
import useAutoLogout from '../../hooks/useAutoLogout';
import { useTheme } from '../../context/ThemeContext';
import { ClipboardList, AlertCircle } from 'lucide-react';

const DashboardLayout = () => {
    // Enable auto-logout
    useAutoLogout();

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const { user, role } = useSelector((state) => state.auth);
    const location = useLocation();
    const navigate = useNavigate();
    const { isDark, toggleTheme } = useTheme();
    const [pendingTasks, setPendingTasks] = useState([]);

    // Fetch notifications and tasks
    useEffect(() => {
        fetchNotifications();
        fetchPendingTasks();
        const interval = setInterval(() => {
            fetchNotifications();
            fetchPendingTasks();
        }, 30000); // Poll every 30 seconds
        return () => clearInterval(interval);
    }, [role, user]);

    const fetchPendingTasks = async () => {
        if (!user) return;
        try {
            const tasks = [];
            if (role === 'teacher') {
                const res = await courseAPI.getTeacherDashboard();
                const courses = res.data.data || [];
                for (const course of courses) {
                    if (course.pendingAssignments > 0) {
                        const assignRes = await assignmentAPI.getByCourse(course._id);
                        const assignments = assignRes.data.assignments || [];
                        assignments.forEach(a => {
                            const ungradedCount = (a.submissions || []).filter(s => s.marks === undefined || s.marks === null).length;
                            if (ungradedCount > 0) {
                                tasks.push({
                                    _id: `task-${a._id}`,
                                    title: `${course.name} - ${a.title}`,
                                    message: `${ungradedCount} submission(s) pending grading`,
                                    date: a.dueDate,
                                    type: 'task',
                                    path: `/teacher/course/${course._id}`,
                                    courseId: course._id,
                                    assignmentId: a._id
                                });
                            }
                        });
                    }
                }
            } else if (role === 'student' || role === 'intern') {
                const res = await assignmentAPI.getMy();
                const assignments = res.data.assignments || [];
                const myId = (user.id || user._id).toString();
                assignments.forEach(a => {
                    const mySub = a.submissions?.find(s => (s.user?._id || s.user || s.student?._id || s.student) === myId);
                    if (!mySub) {
                        tasks.push({
                            _id: `task-${a._id}`,
                            title: a.title,
                            message: `Pending submission`,
                            date: a.dueDate,
                            type: 'task',
                            path: `/${role}/assignments`,
                            courseId: a.course?._id || a.course,
                            assignmentId: a._id
                        });
                    }
                });
            }
            setPendingTasks(tasks);
        } catch (error) {
            console.error('Error fetching pending tasks:', error);
        }
    };

    const fetchNotifications = async () => {
        try {
            const [notifRes, countRes] = await Promise.all([
                userNotificationAPI.getAll(),
                userNotificationAPI.getUnreadCount()
            ]);
            setNotifications(notifRes.data.data || []);
            setUnreadCount(countRes.data.count || 0);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const handleNotificationClick = async (notification) => {
        try {
            // Mark as read
            if (!notification.isRead) {
                await userNotificationAPI.markAsRead(notification._id);
                await fetchNotifications();
            }

            // Navigate to related task if exists
            if (notification.relatedTask) {
                setShowNotifications(false);
                navigate(`/${role}/paid-tasks`);
            }
        } catch (error) {
            console.error('Error handling notification:', error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await userNotificationAPI.markAllAsRead();
            await fetchNotifications();
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    // Get current page title from path
    const getPageTitle = () => {
        const segments = location.pathname.split('/').filter(Boolean);
        const lastSegment = segments[segments.length - 1];

        if (!lastSegment) return 'Dashboard';

        // Check if last segment is a MongoDB ObjectId (24 hex characters)
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(lastSegment);

        if (isObjectId) {
            // If it's a course ID, check the previous segment
            const prevSegment = segments[segments.length - 2];
            if (prevSegment === 'course') return 'Course Details';
            return 'Details';
        }

        return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, ' ');
    };

    const formatNotificationTime = (date) => {
        const now = new Date();
        const notifDate = new Date(date);
        const diffMs = now - notifDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return notifDate.toLocaleDateString();
    };

    return (
        <div className={`h-screen flex overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#0f1117]' : 'bg-[#F8FAFC]'}`}>
            {/* Sidebar - Fixed */}
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            {/* Notification Popup */}
            <NotificationPopup />

            {/* Main Content - Scrollable */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className={`border-b sticky top-0 z-30 transition-colors duration-300 ${isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-gray-100'}`}>
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-4 px-4 sm:px-6 py-4 w-full min-w-0">
                        {/* Left: menu + title */}
                        <div className="flex items-center gap-3 sm:gap-4 shrink-0 min-w-0">
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className={`p-2 rounded-xl transition-colors lg:hidden shrink-0 ${isDark ? 'hover:bg-white/10 text-white/80' : 'hover:bg-gray-100 text-gray-600'}`}
                            >
                                <Menu className="w-5 h-5" />
                            </button>

                            <div className="min-w-0">
                                <h1 className={`text-xl sm:text-2xl font-bold transition-colors duration-300 truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{getPageTitle()}</h1>
                            </div>
                        </div>

                        {/* Center: grows to fill space between title and actions */}
                        <div className="flex-1 w-full min-w-0 flex items-stretch">
                            <div
                                className={`flex w-full items-center rounded-xl px-3 sm:px-4 py-2.5 min-h-[2.75rem] transition-colors duration-300 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200/80'}`}
                            >
                                <Search className={`w-4 h-4 mr-2 shrink-0 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
                                <input
                                    type="search"
                                    placeholder="Search courses, pages, and more..."
                                    aria-label="Search"
                                    className={`bg-transparent border-none outline-none text-sm w-full min-w-0 flex-1 ${isDark ? 'text-white/90 placeholder:text-white/35' : 'text-gray-800 placeholder:text-gray-400'}`}
                                />
                            </div>
                        </div>

                        {/* Right: actions */}
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0 justify-end flex-wrap">
                            {/* Refresh Button */}
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="rounded-xl transition-all duration-200 bg-[#222d38] hover:bg-[#1a232c] text-white shadow-md hover:shadow-lg flex items-center justify-center gap-2 px-3 py-2.5"
                                title="Refresh Page"
                            >
                                <RefreshCw className="w-5 h-5 shrink-0" />
                                <span className="hidden sm:inline text-sm font-semibold">Refresh</span>
                            </button>

                            {/* Dark / Light Mode Toggle */}
                            <button
                                type="button"
                                onClick={toggleTheme}
                                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                                className={`relative rounded-xl transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 overflow-hidden px-3 py-2.5 ${isDark
                                    ? 'bg-[#ffab40] hover:bg-[#ff8e01] text-white'
                                    : 'bg-[#222d38] hover:bg-[#1a232c] text-white'
                                    }`}
                            >
                                <AnimatePresence mode="wait" initial={false}>
                                    {isDark ? (
                                        <motion.span
                                            key="sun"
                                            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                                            animate={{ rotate: 0, opacity: 1, scale: 1 }}
                                            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                                            transition={{ duration: 0.25 }}
                                            className="flex items-center justify-center shrink-0"
                                        >
                                            <Sun className="w-5 h-5" />
                                        </motion.span>
                                    ) : (
                                        <motion.span
                                            key="moon"
                                            initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                                            animate={{ rotate: 0, opacity: 1, scale: 1 }}
                                            exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                                            transition={{ duration: 0.25 }}
                                            className="flex items-center justify-center shrink-0"
                                        >
                                            <Moon className="w-5 h-5" />
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                                <span className="hidden sm:inline text-sm font-semibold whitespace-nowrap">
                                    {isDark ? 'Light mode' : 'Dark mode'}
                                </span>
                            </button>


                            {/* Notifications */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className={`relative p-2.5 rounded-xl transition-all flex items-center gap-2 ${isDark ? 'hover:bg-white/10 text-white/70' : 'hover:bg-gray-100 text-gray-600'}`}
                                >
                                    <Bell className="w-5 h-5" />
                                    <span className="hidden md:inline text-sm font-semibold">Notifications</span>
                                    {unreadCount + pendingTasks.length > 0 && (
                                        <span className="absolute -top-1 -right-1 md:top-1.5 md:right-1.5 w-5 h-5 bg-[#ff8e01] text-white text-xs rounded-full flex items-center justify-center font-medium shadow-sm">
                                            {unreadCount + pendingTasks.length}
                                        </span>
                                    )}
                                </button>

                                {/* Notifications Dropdown */}
                                {showNotifications && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className={`absolute right-0 mt-2 w-80 rounded-2xl shadow-xl border overflow-hidden z-50 transition-colors duration-200 ${isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-gray-100'}`}
                                    >
                                        <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                                            <div className="flex items-center justify-between">
                                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
                                                <button
                                                    onClick={handleMarkAllRead}
                                                    className="text-sm text-[#ff8e01] hover:text-[#ffab40]"
                                                >
                                                    Mark all read
                                                </button>
                                            </div>
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            {/* Actionable Tasks */}
                                            {pendingTasks.map((task) => (
                                                <div
                                                    key={task._id}
                                                    onClick={() => {
                                                        navigate(task.path, { 
                                                            state: { 
                                                                tab: 'assignments', 
                                                                assignmentId: task.assignmentId,
                                                                courseId: task.courseId 
                                                            } 
                                                        });
                                                        setShowNotifications(false);
                                                    }}
                                                    className={`p-4 border-b cursor-pointer transition-colors ${isDark
                                                        ? 'border-white/5 hover:bg-[#ff8e01]/10 bg-[#ff8e01]/5'
                                                        : 'border-gray-50 hover:bg-[#ff8e01]/5 bg-[#ff8e01]/[0.02]'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 bg-[#ff8e01]/10 rounded-lg shrink-0">
                                                            <ClipboardList className="w-4 h-4 text-[#ff8e01]" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                {task.title}
                                                            </p>
                                                            <p className={`text-[10px] mt-1 font-bold uppercase tracking-wider ${isDark ? 'text-[#ff8e01]/70' : 'text-[#ff8e01]'}`}>
                                                                {new Date(task.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {notifications.length === 0 && pendingTasks.length === 0 ? (
                                                <div className={`p-8 text-center ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                                    <p className="text-sm">No notifications</p>
                                                </div>
                                            ) : (
                                                notifications.map((notification) => (
                                                    <div
                                                        key={notification._id}
                                                        onClick={() => handleNotificationClick(notification)}
                                                        className={`p-4 border-b cursor-pointer transition-colors ${isDark
                                                                ? `border-white/5 hover:bg-white/5 ${!notification.isRead ? 'bg-[#ff8e01]/10' : ''}`
                                                                : `border-gray-50 hover:bg-gray-50 ${!notification.isRead ? 'bg-[#ff8e01]/5' : ''}`
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div
                                                                className={`w-2 h-2 rounded-full mt-2 ${!notification.isRead ? 'bg-[#ff8e01]' : isDark ? 'bg-white/20' : 'bg-gray-300'}`}
                                                            />
                                                            <div className="flex-1">
                                                                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                    {notification.title}
                                                                </p>
                                                                <p className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-gray-600'}`}>
                                                                    {notification.message}
                                                                </p>
                                                                <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                                                                    {formatNotificationTime(notification.createdAt)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <div className={`p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                            <button className={`w-full text-center text-sm font-medium ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                                                View all notifications
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* User Menu */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className={`flex items-center gap-3 p-1.5 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                                >
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#ff8e01] to-[#ffab40] flex items-center justify-center text-white font-semibold text-sm overflow-hidden border border-white/20">
                                        {user?.photo ? (
                                            <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            user?.name?.charAt(0) || 'U'
                                        )}
                                    </div>
                                    <div className="hidden md:block text-left">
                                        <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {user?.name || 'User'}
                                        </p>
                                        <p className={`text-xs capitalize ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{role}</p>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 hidden md:block ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
                                </button>

                                {/* User Dropdown */}
                                {showUserMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`absolute right-0 mt-2 w-56 rounded-2xl shadow-xl border overflow-hidden z-50 transition-colors duration-200 ${isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-gray-100'}`}
                                    >
                                        <div className={`p-4 border-b flex items-center gap-3 ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff8e01] to-[#ffab40] flex items-center justify-center text-white font-bold overflow-hidden">
                                                {user?.photo ? (
                                                    <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    user?.name?.charAt(0) || 'U'
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.name}</p>
                                                <p className={`text-xs truncate ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{user?.email}</p>
                                            </div>
                                        </div>
                                        <div className="p-2">
                                            <button 
                                                onClick={() => {
                                                    navigate(`/${role}/profile`);
                                                    setShowUserMenu(false);
                                                }}
                                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg ${isDark ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                <User className="w-4 h-4" />
                                                Profile
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    navigate(`/${role}/settings`);
                                                    setShowUserMenu(false);
                                                }}
                                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg ${isDark ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                <Settings className="w-4 h-4" />
                                                Settings
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    window.dispatchEvent(new CustomEvent('openChatWidget', { detail: { open: true } }));
                                                    setShowUserMenu(false);
                                                }}
                                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg ${isDark ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                <LifeBuoy className="w-4 h-4" />
                                                Help & Support
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className={`flex-1 p-6 overflow-y-auto overflow-x-hidden transition-colors duration-300 ${isDark ? 'bg-[#0f1117]' : 'bg-[#F8FAFC]'}`}>
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Outlet />
                    </motion.div>
                </main>
            </div>

            {/* Click outside to close dropdowns */}
            {(showNotifications || showUserMenu) && (
                <div
                    className="fixed inset-0 z-20"
                    onClick={() => {
                        setShowNotifications(false);
                        setShowUserMenu(false);
                    }}
                />
            )}
            {/* Global Chat Widget */}
            <ChatWidget />
        </div>
    );
};

export default DashboardLayout;
