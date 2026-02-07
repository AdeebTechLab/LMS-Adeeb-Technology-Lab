import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Search, Lock, AlertCircle, Save, Loader2, Download, Calendar } from 'lucide-react';
import Badge from '../../../components/ui/Badge'; // Adjusted path
import { attendanceAPI } from '../../../services/api';

// Utility function to get local date string in YYYY-MM-DD format
const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const AttendanceTab = ({ course, students }) => {
    const [selectedDate, setSelectedDate] = useState(getLocalDateString(new Date()));
    const [attendanceMarks, setAttendanceMarks] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLocked, setIsLocked] = useState(false);

    useEffect(() => {
        fetchAttendance();
        checkLockStatus();
    }, [course._id, selectedDate]);

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
            // Clear cache after successful server sync
            // localStorage.removeItem(cacheKey); // Keep it just in case? No, better clear if server has it.
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

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
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

                {isLocked ? (
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
                            <p className="text-sm text-emerald-700 font-medium">You can mark attendance for any date during the course duration. Daily locks have been removed for flexibility.</p>
                        </div>
                    </div>
                )}

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
                                <tr key={student.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
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
