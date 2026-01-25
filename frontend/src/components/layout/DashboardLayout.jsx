import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
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
} from 'lucide-react';
import Sidebar from './Sidebar';

const DashboardLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const { user, role } = useSelector((state) => state.auth);
    const location = useLocation();

    // Get current page title from path
    const getPageTitle = () => {
        const path = location.pathname.split('/').pop();
        return path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
    };

    // Mock notifications
    const notifications = [
        { id: 1, title: 'New assignment posted', time: '5 min ago', unread: true },
        { id: 2, title: 'Fee payment verified', time: '1 hour ago', unread: true },
        { id: 3, title: 'New message from teacher', time: '2 hours ago', unread: false },
    ];

    const unreadCount = notifications.filter((n) => n.unread).length;

    return (
        <div className="h-screen bg-[#F8FAFC] flex overflow-hidden">
            {/* Sidebar - Fixed */}
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

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



                            {/* Notifications */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="relative p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    <Bell className="w-5 h-5 text-gray-600" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
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
                                                <button className="text-sm text-emerald-600 hover:text-emerald-700">
                                                    Mark all read
                                                </button>
                                            </div>
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            {notifications.map((notification) => (
                                                <div
                                                    key={notification.id}
                                                    className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${notification.unread ? 'bg-emerald-50/50' : ''
                                                        }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div
                                                            className={`w-2 h-2 rounded-full mt-2 ${notification.unread ? 'bg-emerald-500' : 'bg-gray-300'
                                                                }`}
                                                        />
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {notification.title}
                                                            </p>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {notification.time}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
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
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold text-sm">
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
        </div>
    );
};

export default DashboardLayout;
