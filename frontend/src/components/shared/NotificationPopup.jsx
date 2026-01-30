import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { notificationAPI } from '../../services/api';

const NotificationPopup = () => {
    const [activeNotifications, setActiveNotifications] = useState([]);
    const [isVisible, setIsVisible] = useState(false);
    const { user } = useSelector((state) => state.auth);

    useEffect(() => {
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
    }, []);

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
                border: 'border-amber-200',
                bg: 'bg-amber-50/80',
                iconBg: 'bg-amber-100',
                bar: 'bg-amber-500'
            };
            case 'success': return {
                border: 'border-[#ff8e01]/20',
                bg: 'bg-[#ff8e01]/5',
                iconBg: 'bg-[#ff8e01]/10',
                bar: 'bg-[#ff8e01]'
            };
            case 'error': return {
                border: 'border-rose-200',
                bg: 'bg-rose-50/80',
                iconBg: 'bg-rose-100',
                bar: 'bg-rose-500'
            };
            default: return {
                border: 'border-blue-200',
                bg: 'bg-blue-50/80',
                iconBg: 'bg-blue-100',
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
                        className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-[0_40px_150px_-30px_rgba(0,0,0,0.4)] overflow-hidden relative max-h-[90vh] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 md:p-8 pb-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 rounded-2xl">
                                    <Bell className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Important Announcements</h2>
                                    <p className="text-sm text-slate-500 font-medium mt-0.5">
                                        {activeNotifications.length} {activeNotifications.length === 1 ? 'Notification' : 'Notifications'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleDismiss}
                                className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900 active:scale-90 flex-shrink-0"
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
                                                    <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                                                        {notification.title}
                                                    </h3>
                                                    {notification.isHtml ? (
                                                        <div
                                                            className="text-slate-700 text-base md:text-lg leading-relaxed prose prose-sm max-w-none analytics-html-content"
                                                            dangerouslySetInnerHTML={{ __html: notification.message }}
                                                        />
                                                    ) : (
                                                        <div className="text-slate-700 text-base md:text-lg leading-relaxed space-y-2">
                                                            {notification.message.split('\n').map((line, i) => (
                                                                <p key={i}>{line}</p>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Metadata */}
                                                    <div className="flex items-center gap-3 pt-2 text-xs text-slate-400 font-medium">
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
