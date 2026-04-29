import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Calendar, ChevronLeft, ChevronRight, Loader2, TrendingUp } from 'lucide-react';
import Badge from '../../../components/ui/Badge';
import { attendanceAPI } from '../../../services/api';

const StudentAttendanceTab = ({ course }) => {
    const [attendanceData, setAttendanceData] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchAttendance();
    }, [course]);

    const fetchAttendance = async () => {
        setIsLoading(true);
        try {
            const response = await attendanceAPI.getMy(course._id);
            setAttendanceData(response.data.attendances || response.data.data || []);
        } catch (err) {
            console.error('Error fetching attendance:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'present': return { bg: 'bg-present-fixed-light', text: 'text-present-fixed', icon: CheckCircle, label: 'Present' };
            case 'absent': return { bg: 'bg-absent-fixed-light', text: 'text-absent-fixed', icon: XCircle, label: 'Absent' };
            default: return { bg: 'bg-gray-100', text: 'text-gray-400', icon: Calendar, label: '-' };
        }
    };

    // Helper to get local date string YYYY-MM-DD
    const getLocalDateString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getAttendanceForDate = (date) => {
        if (!attendanceData.length) return null;

        // Use local date string for comparison to match visual calendar date
        const dateStr = getLocalDateString(date);

        // Compare with API date by converting it to local date string first
        const record = attendanceData.find(a => {
            if (!a.date) return false;
            const apiDate = new Date(a.date);
            return getLocalDateString(apiDate) === dateStr;
        });
        return record || null;
    };

    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];

        for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
        for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
        return days;
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <img src="/loading.gif" alt="Loading" className="w-24 h-24 object-contain" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Fetching Attendance Records...</p>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-present-fixed-light rounded-3xl p-4 sm:p-6 border border-present-fixed/10 text-center shadow-sm group hover:shadow-md transition-all">
                    <div className="w-10 h-10 bg-present-fixed/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <TrendingUp className="w-5 h-5 text-present-fixed" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-present-fixed">
                        {attendanceData.length > 0
                            ? Math.round((attendanceData.filter(a => a.status === 'present').length / attendanceData.length) * 100)
                            : 0}%
                    </p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Attendance</p>
                </div>
                <div className="bg-white dark:bg-[#1a1f2e] rounded-3xl p-4 sm:p-6 border border-gray-100 dark:border-gray-800 text-center shadow-sm group hover:shadow-md transition-all">
                    <div className="w-10 h-10 bg-present-fixed/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <CheckCircle className="w-5 h-5 text-present-fixed" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-present-fixed">
                        {attendanceData.filter(a => a.status === 'present').length}
                    </p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Presents</p>
                </div>
                <div className="bg-white dark:bg-[#1a1f2e] rounded-3xl p-4 sm:p-6 border border-gray-100 dark:border-gray-800 text-center shadow-sm group hover:shadow-md transition-all">
                    <div className="w-10 h-10 bg-absent-fixed/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <XCircle className="w-5 h-5 text-absent-fixed" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-absent-fixed">
                        {attendanceData.filter(a => a.status === 'absent').length}
                    </p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Absents</p>
                </div>
                <div className="bg-white dark:bg-[#1a1f2e] rounded-3xl p-4 sm:p-6 border border-gray-100 dark:border-gray-800 text-center shadow-sm group hover:shadow-md transition-all">
                    <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-primary">{attendanceData.length}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Total Classes</p>
                </div>
            </div>

            {/* Calendar */}
            <div className="bg-white rounded-3xl p-4 sm:p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-gray-900 uppercase italic">Attendance Calendar</h3>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} 
                            className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-colors border border-transparent hover:border-primary/20"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="bg-primary/5 px-6 py-2 rounded-xl border border-primary/10">
                            <span className="font-black text-primary min-w-[140px] text-center text-sm sm:text-base uppercase tracking-widest">
                                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                        <button 
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} 
                            className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-colors border border-transparent hover:border-primary/20"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-4">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                        <div key={i} className="text-center py-3 bg-primary/5 rounded-xl border border-primary/10">
                            <span className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-[0.2em]">
                                {day}
                            </span>
                        </div>
                    ))}
                    {generateCalendarDays().map((date, index) => {
                        if (!date) return <div key={`empty-${index}`} className="h-12 sm:h-24 opacity-0" />;
                        const record = getAttendanceForDate(date);
                        const status = record?.status || null;
                        const config = status ? getStatusConfig(status) : null;
                        const isToday = date.toDateString() === new Date().toDateString();

                        return (
                            <motion.div
                                key={date.toISOString()}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.01 }}
                                className={`h-14 sm:h-24 rounded-xl sm:rounded-[1.5rem] flex flex-col items-center justify-center relative transition-all duration-300 group cursor-default border ${
                                    config 
                                        ? `${config.bg} border-transparent shadow-sm` 
                                        : 'bg-gray-50/50 dark:bg-white/5 border-gray-100 dark:border-gray-800'
                                } ${isToday ? 'ring-2 ring-primary ring-offset-4 ring-offset-white dark:ring-offset-[#1a1f2e] scale-[1.02] z-10 shadow-lg shadow-primary/20' : 'hover:scale-105 hover:shadow-md hover:z-10'}`}
                            >
                                <span className={`text-xs sm:text-lg font-black transition-colors ${config ? config.text : 'text-gray-400 group-hover:text-gray-600'}`}>
                                    {date.getDate()}
                                </span>
                                
                                {config ? (
                                    <div className="flex flex-col items-center">
                                        <config.icon className={`w-3 h-3 sm:w-5 sm:h-5 mt-1 ${config.text}`} />
                                        {record.markedAt && (
                                            <span className={`text-[7px] sm:text-[10px] font-bold mt-1 opacity-60 ${config.text}`}>
                                                {new Date(record.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                ) : isToday && (
                                    <span className="text-[8px] font-black text-primary uppercase tracking-tighter mt-1">Today</span>
                                )}

                                {/* Hover tooltip-like effect for status */}
                                {config && (
                                    <div className="absolute -top-1 -right-1">
                                        <div className={`w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${status === 'present' ? 'bg-present-fixed' : 'bg-absent-fixed'}`}></div>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-10 pt-8 border-t border-gray-50 dark:border-gray-800">
                    <div className="flex items-center gap-3 px-4 py-2 bg-present-fixed-light rounded-2xl border border-present-fixed/10">
                        <div className="w-3 h-3 rounded-full bg-present-fixed shadow-sm shadow-present-fixed/20"></div>
                        <span className="text-[10px] font-black text-present-fixed uppercase tracking-widest">Present</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 bg-absent-fixed-light rounded-2xl border border-absent-fixed/10">
                        <div className="w-3 h-3 rounded-full bg-absent-fixed shadow-sm shadow-absent-fixed/20"></div>
                        <span className="text-[10px] font-black text-absent-fixed uppercase tracking-widest">Absent</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 bg-norecord-fixed-light rounded-2xl border border-gray-100">
                        <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 shadow-sm"></div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No Record</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentAttendanceTab;



