import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Info, AlertCircle, CheckCircle, CreditCard, FileText, Award, Calendar, Zap, GraduationCap, Megaphone } from 'lucide-react';
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

    const getIcon = (notification) => {
        const title = (notification.title || '').toLowerCase();
        const message = (notification.message || '').toLowerCase();

        if (title.includes('fee') || title.includes('payment') || title.includes('installment') || message.includes('fee')) {
            return <CreditCard className="w-8 h-8 text-emerald-500" />;
        }
        if (title.includes('assignment') || title.includes('task') || message.includes('assignment')) {
            return <FileText className="w-8 h-8 text-blue-500" />;
        }
        if (title.includes('result') || title.includes('marks') || title.includes('certificate') || title.includes('roll')) {
            return <Award className="w-8 h-8 text-amber-500" />;
        }
        if (title.includes('class') || title.includes('session') || title.includes('meeting') || title.includes('zoom') || title.includes('live')) {
            return <Calendar className="w-8 h-8 text-indigo-500" />;
        }
        if (title.includes('urgent') || title.includes('important') || title.includes('attention')) {
            return <Zap className="w-8 h-8 text-[#ff8e01]" />;
        }
        if (title.includes('holiday') || title.includes('closed') || title.includes('off')) {
            return <Megaphone className="w-8 h-8 text-rose-500" />;
        }

        switch (notification.type) {
            case 'warning': return <AlertCircle className="w-8 h-8 text-amber-500" />;
            case 'success': return <CheckCircle className="w-8 h-8 text-emerald-500" />;
            case 'error': return <AlertCircle className="w-8 h-8 text-rose-500" />;
            default: return <Bell className="w-8 h-8 text-[#ff8e01]" />;
        }
    };

    const getColorClasses = (type) => {
        switch (type) {
            case 'warning': return {
                border: isDark ? 'border-amber-500/30' : 'border-amber-200',
                bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50/80',
                iconBg: isDark ? 'bg-amber-500/20' : 'bg-amber-100',
                bar: 'bg-amber-500'
            };
            case 'success': return {
                border: isDark ? 'border-[#ff8e01]/40' : 'border-[#ff8e01]/20',
                bg: isDark ? 'bg-[#ff8e01]/15' : 'bg-[#ff8e01]/5',
                iconBg: isDark ? 'bg-[#ff8e01]/20' : 'bg-[#ff8e01]/10',
                bar: 'bg-[#ff8e01]'
            };
            case 'error': return {
                border: isDark ? 'border-rose-500/30' : 'border-rose-200',
                bg: isDark ? 'bg-rose-500/10' : 'bg-rose-50/80',
                iconBg: isDark ? 'bg-rose-500/20' : 'bg-rose-100',
                bar: 'bg-rose-500'
            };
            default: return {
                border: isDark ? 'border-blue-500/30' : 'border-blue-200',
                bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50/80',
                iconBg: isDark ? 'bg-blue-500/20' : 'bg-blue-100',
                bar: 'bg-blue-500'
            };
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 bg-slate-900/70 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                        className={`w-full max-w-2xl rounded-[1.5rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden relative max-h-[85vh] flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#1a1f2e]' : 'bg-white'}`}
                    >
                        {/* Header */}
                        <div className={`p-4 md:p-5 pb-3 border-b flex items-center justify-between flex-shrink-0 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-xl border border-[#ff8e01]/30 flex items-center justify-center overflow-hidden w-12 h-12 md:w-14 md:h-14 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                    <img
                                        src="/logo.png"
                                        alt="Logo"
                                        className="w-full h-full object-contain scale-80"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'block';
                                        }}
                                    />
                                    <GraduationCap className="w-16 h-16 text-[#ff8e01] hidden" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-[#ff8e01] font-black text-[10px] uppercase tracking-[0.2em]">LMS Adeeb Tech Lab</h1>
                                        <div className="h-1 w-1 rounded-full bg-gray-400" />
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Official Notice</span>
                                    </div>
                                    <h2 className={`text-xl md:text-2xl font-black tracking-tight mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>Important Announcements</h2>
                                    <p className={`text-xs font-medium mt-0.5 ${isDark ? 'text-gray-300' : 'text-slate-500'}`}>
                                        You have <span className="text-[#ff8e01] font-bold">{activeNotifications.length}</span> {activeNotifications.length === 1 ? 'notification' : 'notifications'} to review
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
                        <div className="flex-1 overflow-y-auto px-4 md:px-5 pt-3 md:pt-4 pb-6 space-y-4">
                            {activeNotifications.map((notification, index) => {
                                const colors = getColorClasses(notification.type);
                                return (
                                    <motion.div
                                        key={notification._id || index}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className={`border-2 ${colors.border} ${colors.bg} rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all`}
                                    >
                                        {/* Type Color Bar */}
                                        <div className={`h-2 w-full ${colors.bar}`} />

                                        {/* Notification Content */}
                                        <div className="px-4 md:px-5 py-2 md:py-3">
                                            <h3 className={`text-lg md:text-xl font-black leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                {notification.title?.trim()}
                                            </h3>
                                            {notification.isHtml ? (
                                                <div
                                                    className={`text-sm md:text-base leading-normal prose prose-sm max-w-none announcement-html-content ${isDark ? 'text-gray-200 prose-invert' : 'text-slate-700'} mt-1`}
                                                    dangerouslySetInnerHTML={{ __html: notification.message }}
                                                />
                                            ) : (
                                                <div className={`text-sm md:text-base leading-normal whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-slate-700'} mt-1`}>
                                                    {notification.message?.trim()}
                                                </div>
                                            )}
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
