import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Search, Lock, AlertCircle, Save, Loader2, Download, Calendar, Sun } from 'lucide-react';
import Badge from '../../../components/ui/Badge';
import { attendanceAPI } from '../../../services/api';

// Utility function to get local date string in YYYY-MM-DD format
const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Day names
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AttendanceTab = ({ course, students }) => {
    const [selectedDate, setSelectedDate] = useState(getLocalDateString(new Date()));
    const [attendanceMarks, setAttendanceMarks] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    const [holidayDays, setHolidayDays] = useState([]);
    const [isHoliday, setIsHoliday] = useState(false);

    useEffect(() => {
        fetchGlobalHolidays();
    }, []);

    useEffect(() => {
        fetchAttendance();
        checkLockStatus();
    }, [course._id, selectedDate, holidayDays]);

    // Fetch global holiday settings
    const fetchGlobalHolidays = async () => {
        try {
            const response = await attendanceAPI.getGlobalHolidays();
            setHolidayDays(response.data.holidayDays || []);
        } catch (err) {
            console.error('Error fetching holiday settings:', err);
        }
    };

    const checkLockStatus = () => {
        const now = new Date();
        const today = getLocalDateString(now);

        const courseStart = course.startDate ? getLocalDateString(new Date(course.startDate)) : null;
        const courseEnd = course.endDate ? getLocalDateString(new Date(course.endDate)) : null;

        let locked = false;

        // 1. Lock only if future date
        if (selectedDate > today) locked = true;

        // 2. Lock if outside course duration
        if (courseStart && selectedDate < courseStart) locked = true;
        if (courseEnd && selectedDate > courseEnd) locked = true;

        // 3. Check if selected date is a holiday
        const [year, month, day] = selectedDate.split('-').map(Number);
        const selectedDateObj = new Date(year, month - 1, day);
        const dayOfWeek = selectedDateObj.getDay();
        const dateIsHoliday = holidayDays.includes(dayOfWeek);
        setIsHoliday(dateIsHoliday);

        // Lock if it's a holiday (no attendance marking allowed)
        if (dateIsHoliday) locked = true;

        setIsLocked(locked);
    };

    const fetchAttendance = async () => {
        try {
            const response = await attendanceAPI.get(course._id, selectedDate);
            const data = response.data.attendance || response.data.data || {};
            const serverMarks = {};
            (data.records || []).forEach(record => {
                serverMarks[record.user?._id || record.user] = {
                    status: record.status,
                    markedAt: record.markedAt
                };
            });

            // Merge with local cache for unsaved changes
            const cacheKey = `attendance_${course._id}_${selectedDate}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const localMarks = JSON.parse(cached);
                console.log('Restoring local unsaved markings for:', selectedDate);
                setAttendanceMarks({ ...serverMarks, ...localMarks });
            } else {
                setAttendanceMarks(serverMarks);
            }
        } catch (err) {
            console.error('Error fetching attendance:', err);
        }
    };

    const markAttendance = async (studentId, status) => {
        if (isLocked) return;

        // 1. Update local state immediately for UI responsiveness
        const newMarks = { ...attendanceMarks, [studentId]: { status, markedAt: new Date().toISOString() } };
        setAttendanceMarks(newMarks);

        // 2. Save to local cache (fallback)
        const cacheKey = `attendance_${course._id}_${selectedDate}`;
        localStorage.setItem(cacheKey, JSON.stringify(newMarks));

        // 3. Auto-save to server
        setIsSaving(true);
        try {
            const records = students.map(student => ({
                userId: student.id,
                status: newMarks[student.id]?.status || 'absent'
            }));

            await attendanceAPI.mark({
                courseId: course._id,
                date: selectedDate,
                records
            });

            setLastSaved(new Date());
        } catch (err) {
            console.error('Auto-save failed:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const records = students.map(student => ({
                userId: student.id,
                status: attendanceMarks[student.id]?.status || 'absent'
            }));
            await attendanceAPI.mark({
                courseId: course._id,
                date: selectedDate,
                records
            });

            // Clear local cache after successful save
            localStorage.removeItem(`attendance_${course._id}_${selectedDate}`);

            alert('Attendance saved successfully!');
        } catch (err) {
            console.error('Error saving:', err);
            alert('Failed to save attendance');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredStudents = students.filter(student =>
        student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.rollNo?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusButton = (studentId, status, currentMark) => {
        const isActive = currentMark?.status === status;
        const config = status === 'present'
            ? { bg: isActive ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-emerald-100', label: 'P' }
            : { bg: isActive ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-100', label: 'A' };

        return (
            <button
                onClick={() => markAttendance(studentId, status)}
                disabled={isLocked}
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all ${config.bg} ${isLocked ? 'cursor-not-allowed opacity-60' : 'active:scale-95 shadow-sm'}`}
            >
                {config.label}
            </button>
        );
    };

    // Get row background color based on attendance status
    const getRowBgColor = (studentId) => {
        const mark = attendanceMarks[studentId];
        if (!mark) return '';
        if (mark.status === 'present') return 'bg-emerald-50';
        if (mark.status === 'absent') return 'bg-red-50';
        return '';
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                {/* Weekly Off Days Display (Read-only, set by admin) */}
                {holidayDays.length > 0 && (
                    <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Sun className="w-4 h-4 text-yellow-600" />
                            <p className="text-xs font-bold text-yellow-800 uppercase tracking-wider">Weekly Off Days</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {DAY_NAMES.map((day, index) => (
                                <span
                                    key={day}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${holidayDays.includes(index)
                                            ? 'bg-yellow-400 text-yellow-900'
                                            : 'bg-gray-100 text-gray-400'
                                        }`}
                                >
                                    {day}
                                </span>
                            ))}
                        </div>
                        <p className="text-[11px] text-yellow-700 mt-2">
                            Off days are set by admin and apply to all courses. Attendance is not marked on these days.
                        </p>
                    </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-lg font-black text-gray-900 uppercase italic">Attendance Sheet</h3>
                        <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-500 font-medium">{selectedDate === getLocalDateString(new Date()) ? "Current Session" : "Historical Record"}</p>
                            {lastSaved && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">
                                    Auto-saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 text-gray-700"
                            />
                        </div>
                    </div>
                </div>

                {isHoliday ? (
                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl flex items-center gap-3 text-sm mb-6 border border-yellow-200">
                        <Sun className="w-5 h-5 text-yellow-600" />
                        <div>
                            <p className="font-bold">Weekly Off Day</p>
                            <p className="text-yellow-700">This day is marked as an off day. Attendance is not recorded and won't count in totals.</p>
                        </div>
                    </div>
                ) : isLocked ? (
                    <div className="bg-amber-50 text-amber-800 p-4 rounded-xl flex items-center gap-3 text-sm mb-6 border border-amber-200">
                        <Lock className="w-5 h-5 text-amber-600" />
                        <div>
                            <p className="font-bold">Entry Restricted</p>
                            <p className="text-amber-700">Attendance cannot be marked for future dates or outside course duration.</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 mb-6">
                        <Clock className="w-5 h-5 text-emerald-600" />
                        <div>
                            <p className="font-bold text-emerald-900 text-sm">Active Attendance Window</p>
                            <p className="text-sm text-emerald-700 font-medium">Attendance auto-saves at 12AM. Mark students as P (Present) or A (Absent).</p>
                        </div>
                    </div>
                )}

                {/* Color Legend */}
                <div className="flex items-center gap-4 mb-4 text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded bg-emerald-500"></div>
                        <span className="text-gray-600">Present</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded bg-red-500"></div>
                        <span className="text-gray-600">Absent</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded bg-yellow-400"></div>
                        <span className="text-gray-600">Off Day</span>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3 mb-6">
                    <div className="flex-1 w-full bg-gray-50 px-4 py-3 rounded-2xl flex items-center border border-gray-100">
                        <Search className="w-5 h-5 text-gray-400 mr-3" />
                        <input
                            type="text"
                            placeholder="Search student name or roll no..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none outline-none w-full text-sm font-medium"
                        />
                    </div>
                    {!isLocked && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full md:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg shadow-emerald-200"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {isSaving ? 'SAVING...' : 'SAVE ATTENDANCE'}
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marked At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredStudents.map((student) => (
                                <tr key={student.id} className={`hover:bg-gray-50 transition-colors ${getRowBgColor(student.id)}`}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${attendanceMarks[student.id]?.status === 'present'
                                                    ? 'bg-emerald-200 text-emerald-700'
                                                    : attendanceMarks[student.id]?.status === 'absent'
                                                        ? 'bg-red-200 text-red-700'
                                                        : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                {student.name.charAt(0)}
                                            </div>
                                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-sm text-gray-500">{student.rollNo}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-2">
                                            {getStatusButton(student.id, 'present', attendanceMarks[student.id])}
                                            {getStatusButton(student.id, 'absent', attendanceMarks[student.id])}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-400">
                                        {attendanceMarks[student.id]?.markedAt ? new Date(attendanceMarks[student.id].markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AttendanceTab;
