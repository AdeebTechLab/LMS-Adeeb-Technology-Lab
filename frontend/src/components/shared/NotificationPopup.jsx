import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { notificationAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const NotificationPopup = () => {
    const [activeNotifications, setActiveNotifications] = useState([]);
    const [isVisible, setIsVisible] = useState(false);
    const { user } = useSelector((state) => state.auth);
    const location = useLocation();
    const { isDark } = useTheme();

    useEffect(() => {
        // Only show popup on Dashboard or Tasks pages
        const isDashboardOrTasks =
            location.pathname.endsWith('/dashboard') ||
            location.pathname.endsWith('/tasks');

        if (!isDashboardOrTasks) return;

        const fetchActive = async () => {
            try {
                const response = await notificationAPI.getActive();
                const fetched = response.data.data || [];
                if (fetched.length > 0) {
                    setActiveNotifications(fetched);
                    setIsVisible(true);
                }
            } catch (error) {
                console.error('Error fetching active notifications:', error);
            }
        };

        fetchActive();
    }, [location.pathname]);

    const handleDismiss = () => {
        setIsVisible(false);
    };



    if (!isVisible || activeNotifications.length === 0) return null;

    const getIcon = (type) => {
        switch (type) {
            case 'warning': return <AlertCircle className="w-5 h-5 text-amber-500" />;
            case 'success': return <CheckCircle className="w-5 h-5 text-[#ff8e01]" />;
            case 'error': return <AlertCircle className="w-5 h-5 text-rose-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const getColorClasses = (type) => {
        switch (type) {
            case 'warning': return {
                border: isDark ? 'border-amber-800/60' : 'border-amber-200',
                bg: isDark ? 'bg-amber-900/20' : 'bg-amber-50/80',
                iconBg: isDark ? 'bg-amber-900/30' : 'bg-amber-100',
                bar: 'bg-amber-500'
            };
            case 'success': return {
                border: isDark ? 'border-[#ff8e01]/30' : 'border-[#ff8e01]/20',
                bg: isDark ? 'bg-[#ff8e01]/10' : 'bg-[#ff8e01]/5',
                iconBg: isDark ? 'bg-[#ff8e01]/15' : 'bg-[#ff8e01]/10',
                bar: 'bg-[#ff8e01]'
            };
            case 'error': return {
                border: isDark ? 'border-rose-800/60' : 'border-rose-200',
                bg: isDark ? 'bg-rose-900/20' : 'bg-rose-50/80',
                iconBg: isDark ? 'bg-rose-900/30' : 'bg-rose-100',
                bar: 'bg-rose-500'
            };
            default: return {
                border: isDark ? 'border-blue-800/60' : 'border-blue-200',
                bg: isDark ? 'bg-blue-900/20' : 'bg-blue-50/80',
                iconBg: isDark ? 'bg-blue-900/30' : 'bg-blue-100',
                bar: 'bg-blue-500'
            };
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-900/70 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                        className={`w-full max-w-4xl rounded-[2.5rem] shadow-[0_40px_150px_-30px_rgba(0,0,0,0.4)] overflow-hidden relative max-h-[90vh] flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#1a1f2e]' : 'bg-white'}`}
                    >
                        {/* Header */}
                        <div className={`p-6 md:p-8 pb-4 border-b flex items-center justify-between flex-shrink-0 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                                    <Bell className="w-6 h-6 text-blue-500" />
                                </div>
                                <div>
                                    <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Important Announcements</h2>
                                    <p className={`text-sm font-medium mt-0.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                                        {activeNotifications.length} {activeNotifications.length === 1 ? 'Notification' : 'Notifications'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleDismiss}
                                className={`p-3 rounded-2xl transition-all active:scale-90 flex-shrink-0 ${isDark ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Scrollable Notifications Container */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                            {activeNotifications.map((notification, index) => {
                                const colors = getColorClasses(notification.type);
                                return (
                                    <motion.div
                                        key={notification._id || index}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className={`border-2 ${colors.border} ${colors.bg} rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-all`}
                                    >
                                        {/* Type Color Bar */}
                                        <div className={`h-2 w-full ${colors.bar}`} />

                                        {/* Notification Content */}
                                        <div className="p-6 md:p-8">
                                            <div className="flex items-start gap-4">
                                                <div className={`p-3 ${colors.iconBg} rounded-xl flex-shrink-0 mt-1`}>
                                                    {getIcon(notification.type)}
                                                </div>
                                                <div className="flex-1 min-w-0 space-y-3">
                                                    <h3 className={`text-xl md:text-2xl font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                        {notification.title}
                                                    </h3>
                                                    {notification.isHtml ? (
                                                        <div
                                                            className={`text-base md:text-lg leading-relaxed prose prose-sm max-w-none analytics-html-content ${isDark ? 'text-white/70 prose-invert' : 'text-slate-700'}`}
                                                            dangerouslySetInnerHTML={{ __html: notification.message }}
                                                        />
                                                    ) : (
                                                        <div className={`text-base md:text-lg leading-relaxed space-y-2 ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                                                            {notification.message.split('\n').map((line, i) => (
                                                                <p key={i}>{line}</p>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Metadata */}
                                                    <div className={`flex items-center gap-3 pt-2 text-xs font-medium ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[#ff8e01] animate-pulse" />
                                                            <span className="uppercase tracking-wider">Live Update</span>
                                                        </div>
                                                        {notification.showLifetime && (
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                                <span className="uppercase tracking-wider">Permanent Notice</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default NotificationPopup;
