import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Calendar, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
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
            case 'present': return { bg: 'bg-emerald-100', text: 'text-emerald-600', icon: CheckCircle, label: 'Present' };
            case 'absent': return { bg: 'bg-red-100', text: 'text-red-600', icon: XCircle, label: 'Absent' };
            case 'late': return { bg: 'bg-amber-100', text: 'text-amber-600', icon: Clock, label: 'Late' };
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

        // Compare with API date (assuming API returns YYYY-MM-DD part matches intended date)
        // API dates are UTC midnight, so splitting T gives the correct YYYY-MM-DD
        const record = attendanceData.find(a => a.date?.split('T')[0] === dateStr);
        return record?.status || null;
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 text-center shadow-sm">
                    <p className="text-3xl font-black text-emerald-600">
                        {attendanceData.length > 0
                            ? Math.round((attendanceData.filter(a => a.status === 'present').length / attendanceData.length) * 100)
                            : 0}%
                    </p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Attendance</p>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center shadow-sm">
                    <p className="text-3xl font-black text-gray-900">
                        {attendanceData.filter(a => a.status === 'present').length}
                    </p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Presents</p>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center shadow-sm">
                    <p className="text-3xl font-black text-red-600">
                        {attendanceData.filter(a => a.status === 'absent').length}
                    </p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Absents</p>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center shadow-sm">
                    <p className="text-3xl font-black text-[#ff8e01]">{attendanceData.length}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Total Classes</p>
                </div>
            </div>

            {/* Calendar */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-gray-900 uppercase italic">Attendance Calendar</h3>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} 
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <span className="font-bold text-gray-900 min-w-[160px] text-center text-lg">
                            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button 
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} 
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-3">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-xs font-black text-gray-400 uppercase tracking-widest py-2">
                            {day}
                        </div>
                    ))}
                    {generateCalendarDays().map((date, index) => {
                        if (!date) return <div key={`empty-${index}`} className="h-16" />;
                        const status = getAttendanceForDate(date);
                        const config = status ? getStatusConfig(status) : null;
                        const isToday = date.toDateString() === new Date().toDateString();

                        return (
                            <motion.div
                                key={date.toISOString()}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.01 }}
                                className={`h-16 rounded-2xl flex flex-col items-center justify-center relative transition-all ${
                                    config ? config.bg : 'bg-gray-50'
                                } ${isToday ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}
                            >
                                <span className={`text-sm font-black ${config ? config.text : 'text-gray-400'}`}>
                                    {date.getDate()}
                                </span>
                                {config && (
                                    <config.icon className={`w-4 h-4 mt-1 ${config.text}`} />
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-8 pt-6 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-lg bg-emerald-100 border border-emerald-200"></div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Present</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-lg bg-red-100 border border-red-200"></div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Absent</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-lg bg-amber-100 border border-amber-200"></div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Late</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-lg bg-gray-50 border border-gray-200"></div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">No Record</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentAttendanceTab;
