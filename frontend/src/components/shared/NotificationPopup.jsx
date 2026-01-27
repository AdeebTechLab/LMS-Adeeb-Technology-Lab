import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Info, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { notificationAPI } from '../../services/api';

const NotificationPopup = () => {
    const [activeNotifications, setActiveNotifications] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

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
        if (currentIdx < activeNotifications.length - 1) {
            setCurrentIdx(prev => prev + 1);
        } else {
            setIsVisible(false);
        }
    };

    if (!isVisible || activeNotifications.length === 0) return null;

    const current = activeNotifications[currentIdx];

    const getIcon = () => {
        switch (current.type) {
            case 'warning': return <AlertCircle className="w-6 h-6 text-amber-500" />;
            case 'success': return <CheckCircle className="w-6 h-6 text-emerald-500" />;
            case 'error': return <AlertCircle className="w-6 h-6 text-rose-500" />;
            default: return <Info className="w-6 h-6 text-blue-500" />;
        }
    };

    const getColorClass = () => {
        switch (current.type) {
            case 'warning': return 'border-amber-100 bg-amber-50/50';
            case 'success': return 'border-emerald-100 bg-emerald-50/50';
            case 'error': return 'border-rose-100 bg-rose-50/50';
            default: return 'border-blue-100 bg-blue-50/50';
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={`w-full max-w-lg bg-white rounded-[2rem] border-4 shadow-2xl shadow-slate-900/20 overflow-hidden ${getColorClass()}`}
                    >
                        <div className="p-8">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                                        {getIcon()}
                                    </div>
                                    <div className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">
                                        Important Notice
                                    </div>
                                </div>
                                <button
                                    onClick={handleDismiss}
                                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-2xl font-black text-slate-900 leading-tight">
                                    {current.title}
                                </h3>
                                <div className="text-slate-600 leading-relaxed font-medium">
                                    {current.message.split('\n').map((line, i) => (
                                        <p key={i} className={i > 0 ? 'mt-3' : ''}>{line}</p>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-10 flex items-center justify-between gap-4">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Notification {currentIdx + 1} of {activeNotifications.length}
                                </div>
                                <button
                                    onClick={handleDismiss}
                                    className="px-8 py-3.5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-sm tracking-wider shadow-lg shadow-slate-900/20 transition-all active:scale-95"
                                >
                                    {currentIdx < activeNotifications.length - 1 ? 'NEXT NOTIFICATION' : 'DISMISS NOTICE'}
                                </button>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-slate-100">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${((currentIdx + 1) / activeNotifications.length) * 100}%` }}
                                className="h-full bg-emerald-500"
                            />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default NotificationPopup;
