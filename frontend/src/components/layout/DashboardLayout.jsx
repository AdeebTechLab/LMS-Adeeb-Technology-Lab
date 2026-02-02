import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
    Menu,
    Bell,
    Search,
    Plus,
    ChevronDown,
    Sun,
    Moon,
    RefreshCw,
} from 'lucide-react';
import Sidebar from './Sidebar';
import NotificationPopup from '../shared/NotificationPopup';
import ChatWidget from '../shared/ChatWidget';
import { userNotificationAPI } from '../../services/api';

const DashboardLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const { user, role } = useSelector((state) => state.auth);
    const location = useLocation();
    const navigate = useNavigate();

    // Fetch notifications
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
        return () => clearInterval(interval);
    }, []);

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
        <div className="h-screen bg-[#F8FAFC] flex overflow-hidden">
            {/* Sidebar - Fixed */}
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            {/* Notification Popup */}
            <NotificationPopup />

            {/* Main Content - Scrollable */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
                    <div className="flex items-center justify-between px-6 py-4">
                        {/* Left Side */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors lg:hidden"
                            >
                                <Menu className="w-5 h-5 text-gray-600" />
                            </button>

                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
                            </div>
                        </div>

                        {/* Right Side */}
                        <div className="flex items-center gap-3">
                            {/* Search */}
                            <div className="hidden md:flex items-center bg-gray-50 rounded-xl px-4 py-2.5 w-64">
                                <Search className="w-4 h-4 text-gray-400 mr-2" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="bg-transparent border-none outline-none text-sm text-gray-600 placeholder:text-gray-400 w-full"
                                />
                            </div>

                            {/* Refresh Button */}
                            <button
                                onClick={() => window.location.reload()}
                                className="p-2.5 rounded-xl transition-all duration-200 bg-[#222d38] hover:bg-[#1a232c] text-white shadow-md hover:shadow-lg flex items-center justify-center"
                                title="Refresh Page"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>



                            {/* Notifications */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="relative p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    <Bell className="w-5 h-5 text-gray-600" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#ff8e01] text-white text-xs rounded-full flex items-center justify-center font-medium">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>

                                {/* Notifications Dropdown */}
                                {showNotifications && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
                                    >
                                        <div className="p-4 border-b border-gray-100">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-gray-900">Notifications</h3>
                                                <button 
                                                    onClick={handleMarkAllRead}
                                                    className="text-sm text-[#ff8e01] hover:text-[#ffab40]"
                                                >
                                                    Mark all read
                                                </button>
                                            </div>
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="p-8 text-center text-gray-500">
                                                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                                    <p className="text-sm">No notifications</p>
                                                </div>
                                            ) : (
                                                notifications.map((notification) => (
                                                    <div
                                                        key={notification._id}
                                                        onClick={() => handleNotificationClick(notification)}
                                                        className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.isRead ? 'bg-[#ff8e01]/5' : ''
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div
                                                                className={`w-2 h-2 rounded-full mt-2 ${!notification.isRead ? 'bg-[#ff8e01]' : 'bg-gray-300'
                                                                    }`}
                                                            />
                                                            <div className="flex-1">
                                                                <p className="text-sm font-medium text-gray-900">
                                                                    {notification.title}
                                                                </p>
                                                                <p className="text-xs text-gray-600 mt-1">
                                                                    {notification.message}
                                                                </p>
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    {formatNotificationTime(notification.createdAt)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <div className="p-3 bg-gray-50">
                                            <button className="w-full text-center text-sm text-gray-600 hover:text-gray-900 font-medium">
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
                                    className="flex items-center gap-3 p-1.5 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#ff8e01] to-[#ffab40] flex items-center justify-center text-white font-semibold text-sm">
                                        {user?.name?.charAt(0) || 'U'}
                                    </div>
                                    <div className="hidden md:block text-left">
                                        <p className="text-sm font-medium text-gray-900">
                                            {user?.name || 'User'}
                                        </p>
                                        <p className="text-xs text-gray-500 capitalize">{role}</p>
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
                                </button>

                                {/* User Dropdown */}
                                {showUserMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
                                    >
                                        <div className="p-4 border-b border-gray-100">
                                            <p className="font-medium text-gray-900">{user?.name}</p>
                                            <p className="text-sm text-gray-500">{user?.email}</p>
                                        </div>
                                        <div className="p-2">
                                            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                                                Profile Settings
                                            </button>
                                            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
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
                <main className="flex-1 p-6 overflow-y-auto">
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
