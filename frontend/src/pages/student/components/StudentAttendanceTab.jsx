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
            setAttendanceData(response.data.data || []);
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

    const getAttendanceForDate = (date) => {
        if (!attendanceData.length) return null;
        const dateStr = date.toISOString().split('T')[0];
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

    if (isLoading) return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" /></div>;

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 text-center">
                    <p className="text-2xl font-bold text-emerald-600">
                        {attendanceData.filter(a => a.status === 'present').length}
                    </p>
                    <p className="text-sm text-emerald-600">Present</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 border border-red-100 text-center">
                    <p className="text-2xl font-bold text-red-600">
                        {attendanceData.filter(a => a.status === 'absent').length}
                    </p>
                    <p className="text-sm text-red-600">Absent</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
                    <p className="text-2xl font-bold text-gray-600">
                        {attendanceData.length}
                    </p>
                    <p className="text-sm text-gray-500">Total Days</p>
                </div>
            </div>

            {/* Calendar */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-gray-900">
                        Attendance Calendar
                    </h3>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 hover:bg-gray-100 rounded-lg">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="font-medium text-gray-900 min-w-[140px] text-center">
                            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 hover:bg-gray-100 rounded-lg">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">{day}</div>
                    ))}
                    {generateCalendarDays().map((date, index) => {
                        if (!date) return <div key={`empty-${index}`} className="h-12" />;
                        const status = getAttendanceForDate(date);
                        const config = status ? getStatusConfig(status) : null;
                        const isToday = date.toDateString() === new Date().toDateString();

                        return (
                            <div key={date.toISOString()} className={`h-12 rounded-lg flex items-center justify-center relative ${config ? config.bg : 'bg-gray-50'} ${isToday ? 'ring-2 ring-emerald-500' : ''}`}>
                                <span className={`text-sm font-medium ${config ? config.text : 'text-gray-400'}`}>{date.getDate()}</span>
                                {config && <config.icon className={`w-3 h-3 absolute bottom-1 right-1 ${config.text}`} />}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default StudentAttendanceTab;
