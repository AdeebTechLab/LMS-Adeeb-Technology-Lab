import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    BookOpen,
    Clock,
    CheckCircle,
    Calendar,
    ArrowRight,
    Loader2,
    RefreshCw,
    XCircle,
    ChevronLeft,
    AlertCircle
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { enrollmentAPI, attendanceAPI } from '../../services/api';

const AttendanceView = () => {
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [attendanceData, setAttendanceData] = useState([]);
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
                <button
                    onClick={() => selectedCourse ? fetchAttendance(selectedCourse.courseId) : fetchEnrollments()}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-xl font-bold text-xs transition-all"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    SYNC
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-600 font-bold">{error}</span>
                </div>
            )}

            {!selectedCourse ? (
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

                    {/* Detailed History Log (NO CALENDAR) */}
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm min-h-[400px]">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-gray-900 uppercase italic">Detailed History</h3>
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
                                Listed Chronologically (Lastest First)
                            </div>
                        </div>

                        {attendanceData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                                <Calendar className="w-12 h-12 text-gray-200 mb-4" />
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">No attendance records found yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {[...attendanceData].reverse().map((record, index) => {
                                    const config = getStatusConfig(record.status);
                                    const date = new Date(record.date);
                                    return (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`flex items-center justify-between p-5 rounded-3xl border transition-all hover:shadow-md ${config.bg} ${config.text.replace('text', 'border')}/20`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                                                    <config.icon className={`w-6 h-6 ${config.text}`} />
                                                </div>
                                                <div>
                                                    <p className="text-lg font-black text-gray-900 leading-none">
                                                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                                        {date.toLocaleDateString('en-US', { weekday: 'long' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant={record.status === 'present' ? 'success' : record.status === 'absent' ? 'error' : 'warning'}>
                                                {record.status.toUpperCase()}
                                            </Badge>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceView;
