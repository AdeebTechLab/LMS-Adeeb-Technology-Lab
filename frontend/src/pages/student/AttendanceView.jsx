import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    BookOpen,
    Clock,
    CheckCircle,
    Calendar,
    ArrowRight,
    Loader2,
    XCircle,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    GraduationCap
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { enrollmentAPI, attendanceAPI } from '../../services/api';

const AttendanceView = () => {
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [attendanceData, setAttendanceData] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchEnrollments();
    }, []);

    const fetchEnrollments = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await enrollmentAPI.getMy();
            const enrollments = response.data.data || [];

            const courses = enrollments.map(e => ({
                id: e._id,
                courseId: e.course?._id,
                title: e.course?.title || 'Unknown Course',
                teacher: e.course?.teacher?.name || 'TBA',
                totalClasses: e.totalClasses || 0,
                attended: e.attendedClasses || 0,
                progress: e.totalClasses > 0 ? Math.round((e.attendedClasses / e.totalClasses) * 100) : 0
            }));
            setEnrolledCourses(courses);
        } catch (err) {
            console.error('Error fetching enrollments:', err);
            setError('Failed to load courses');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAttendance = async (courseId) => {
        try {
            const response = await attendanceAPI.getMy(courseId);
            const data = response.data.attendances || response.data.data || [];
            setAttendanceData(data);
        } catch (err) {
            console.error('Error fetching attendance:', err);
        }
    };

    const handleCourseSelect = async (course) => {
        setSelectedCourse(course);
        if (course.courseId) {
            await fetchAttendance(course.courseId);
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
        // Use local date string to avoid timezone shifts
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const record = attendanceData.find(a => {
            // Also convert server date to local YYYY-MM-DD format to avoid timezone issues
            const serverDate = new Date(a.date);
            const serverYear = serverDate.getFullYear();
            const serverMonth = String(serverDate.getMonth() + 1).padStart(2, '0');
            const serverDay = String(serverDate.getDate()).padStart(2, '0');
            const serverDateStr = `${serverYear}-${serverMonth}-${serverDay}`;
            return serverDateStr === dateStr;
        });
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-gray-600 font-bold uppercase tracking-widest text-xs">Loading records...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 uppercase italic">My Attendance</h2>
                    <p className="text-gray-500 font-medium">Track your attendance and progress across all courses</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-600 font-bold">{error}</span>
                </div>
            )}

            {!selectedCourse ? (
                <div className="space-y-8">
                    {/* Guidance Header */}
                    <div className="bg-[#f8fafc] p-8 rounded-3xl border-2 border-emerald-500/20 flex items-center gap-6 shadow-xl shadow-emerald-900/5">
                        <div className="p-4 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
                            <GraduationCap className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter leading-none mb-1">Step 1: Select Your Course</h3>
                            <p className="text-sm text-gray-500 font-medium">Click on a course card below to reveal your detailed attendance history and logs</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {enrolledCourses.map((course, index) => (
                            <motion.div
                                key={course.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                onClick={() => handleCourseSelect(course)}
                                className="bg-white rounded-3xl p-8 border border-gray-100 cursor-pointer hover:shadow-xl hover:border-emerald-500/30 transition-all group"
                            >
                                <div className="flex items-start justify-between mb-6">
                                    <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center">
                                        <BookOpen className="w-7 h-7 text-emerald-600" />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase mb-1 tracking-widest leading-none">Overall</p>
                                        <p className={`text-3xl font-black ${course.progress >= 75 ? 'text-emerald-700' : 'text-amber-600'}`}>{course.progress}%</p>
                                    </div>
                                </div>
                                <h3 className="text-xl font-black text-gray-900 mb-1 uppercase tracking-tight group-hover:text-emerald-600 transition-colors">{course.title}</h3>
                                <p className="text-sm text-gray-500 mb-6 italic">{course.teacher}</p>

                                <div className="flex justify-between text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3">
                                    <span>Presents: <strong className="text-emerald-600 text-sm italic">{course.attended}</strong></span>
                                    <span>Total Classes: <strong className="text-gray-900 text-sm">{course.totalClasses}</strong></span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${course.progress >= 75 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                        style={{ width: `${course.progress}%` }}
                                    />
                                </div>

                                <div className="mt-6 flex items-center justify-end text-emerald-600 text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                    View Details <ArrowRight className="w-4 h-4 ml-1" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <button
                        onClick={() => setSelectedCourse(null)}
                        className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-black text-xs uppercase tracking-widest"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to Courses
                    </button>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 border border-gray-100 text-center shadow-sm">
                            <p className="text-3xl font-black text-emerald-600">
                                {attendanceData.length > 0
                                    ? Math.round((attendanceData.filter(a => a.status === 'present').length / attendanceData.length) * 100)
                                    : 0}%
                            </p>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Attendance</p>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-3xl p-6 border border-gray-100 text-center shadow-sm">
                            <p className="text-3xl font-black text-gray-900">
                                {attendanceData.filter(a => a.status === 'present').length}
                            </p>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Presents</p>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-3xl p-6 border border-gray-100 text-center shadow-sm">
                            <p className="text-3xl font-black text-red-600">
                                {attendanceData.filter(a => a.status === 'absent').length}
                            </p>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Absents</p>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-3xl p-6 border border-gray-100 text-center shadow-sm">
                            <p className="text-3xl font-black text-blue-600">{attendanceData.length}</p>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Total Classes</p>
                        </motion.div>
                    </div>

                    {/* Attendance Calendar */}
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
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

                        {/* Day Headers */}
                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="text-center text-xs font-bold text-gray-500 uppercase tracking-wider py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-2">
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
                                        className={`h-16 rounded-xl flex flex-col items-center justify-center relative transition-all ${
                                            config ? config.bg : 'bg-gray-50'
                                        } ${isToday ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}
                                    >
                                        <span className={`text-sm font-bold ${config ? config.text : 'text-gray-400'}`}>
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
                        <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-200"></div>
                                <span className="text-xs text-gray-600 font-medium">Present</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-red-100 border border-red-200"></div>
                                <span className="text-xs text-gray-600 font-medium">Absent</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-amber-100 border border-amber-200"></div>
                                <span className="text-xs text-gray-600 font-medium">Late</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-gray-50 border border-gray-200"></div>
                                <span className="text-xs text-gray-600 font-medium">No Record</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceView;
