import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
    CheckCircle, X, Search, Calendar, ChevronLeft,
    Users, Save, AlertCircle, RefreshCw,
    UserCheck, UserX, Clock, Filter, Download, MapPin, GraduationCap
} from 'lucide-react';
import { courseAPI, attendanceAPI, userAPI, settingsAPI } from '../../services/api';
import ProfileAvatar from '../../components/ui/ProfileAvatar';
import Badge from '../../components/ui/Badge';
import Loader, { ButtonLoader } from '../../components/ui/Loader';

const DEFAULT_CLASS_TIME_OPTIONS = [
    { label: "Class 1 11AM", value: "Class 1 11AM" },
    { label: "Class 2 3PM", value: "Class 2 3PM" },
    { label: "Class 3 5PM", value: "Class 3 5PM" },
    { label: "Class 3 9PM", value: "Class 3 9PM" }
];

export { DEFAULT_CLASS_TIME_OPTIONS };
import { showToast } from '../../utils/customToast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, differenceInDays, addDays, isBefore, parseISO } from 'date-fns';
import { io } from 'socket.io-client';
import { getLocalDateString, getTodayAttendanceDateKey } from '../../utils/attendanceDate';

const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Offline';
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffInMs = now - lastSeenDate;
    const diffInMins = Math.floor(diffInMs / 1000 / 60);

    // Only show Online if active in the last 3 minutes AND not in the future (due to clock skew)
    if (diffInMins >= 0 && diffInMins < 3) return 'Online';
    if (diffInMins >= 0 && diffInMins < 60) return `${diffInMins}m ago`;
    const diffInHours = Math.floor(diffInMins / 60);
    if (diffInHours >= 0 && diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays > 90) return 'Offline';
    return format(lastSeenDate, 'dd MMM');
};

const getStatusColor = (lastSeen) => {
    if (!lastSeen) return 'bg-gray-300';
    const diffInMins = Math.floor((new Date() - new Date(lastSeen)) / 1000 / 60);
    if (diffInMins < 3) return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]';
    if (diffInMins < 60) return 'bg-amber-400';
    return 'bg-gray-400';
};

const QuickAttendance = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useSelector((state) => state.auth);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedDate, setSelectedDate] = useState(getTodayAttendanceDateKey());
    const [students, setStudents] = useState([]);
    const [attendanceMarks, setAttendanceMarks] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCourse, setFilterCourse] = useState('all');
    const [filterStatus, setFilterStatus] = useState(location.state?.initialFilter || 'all');
    const [filterLocation, setFilterLocation] = useState('all');
    const [filterCategory, setFilterCategory] = useState(location.state?.initialCategory || 'all');
    const [filterAttendType, setFilterAttendType] = useState('all');
    const [filterClassTime, setFilterClassTime] = useState('all');
    const [courses, setCourses] = useState([]);
    const [holidayDays, setHolidayDays] = useState([]);
    const [classTimeOptions, setClassTimeOptions] = useState(DEFAULT_CLASS_TIME_OPTIONS);
    const socketRef = useRef(null);

    const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? 'https://lms-adeeb-technology-lab.onrender.com/api' : 'http://localhost:5000/api');
    return rawUrl === '/api' ? 'https://lms-adeeb-technology-lab.onrender.com' : rawUrl.replace(/\/api\/?$/, '');
};
    const SOCKET_URL = getSocketURL();

    // Range Report States
    const [showRangeModal, setShowRangeModal] = useState(false);
    const [rangeStart, setRangeStart] = useState(getLocalDateString(new Date(new Date().setDate(new Date().getDate() - 7))));
    const [rangeEnd, setRangeEnd] = useState(getTodayAttendanceDateKey());
    const [isGeneratingRange, setIsGeneratingRange] = useState(false);

    useEffect(() => {
        fetchInitialData();

        // Setup Socket connection
        socketRef.current = io(SOCKET_URL, { withCredentials: true });

        if (user?.id || user?._id) {
            socketRef.current.emit('join_chat', String(user.id || user._id));
        }

        socketRef.current.on('user_status_update', (data) => {
            setStudents(prev => prev.map(s => {
                if (s.id === data.userId || s.id === String(data.userId)) {
                    return { ...s, lastSeen: data.lastSeen };
                }
                return s;
            }));
        });

        // Force re-render every minute to update "Online" / "Xm ago" status
        const statusInterval = setInterval(() => {
            setStudents(prev => [...prev]);
        }, 60000);

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
            clearInterval(statusInterval);
        };
    }, []);

    useEffect(() => {
        if (courses.length > 0) {
            fetchAllAttendance();
        }
    }, [courses, selectedDate]);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Teacher's Courses
            const coursesRes = await courseAPI.getTeacherDashboard();
            const activeCourses = (coursesRes.data.data || []).filter(c => c.status !== 'inactive');
            setCourses(activeCourses);

            // Fetch class time settings
            try {
                const settingsRes = await settingsAPI.getAll();
                const savedSlots = settingsRes.data.data?.class_time_slots;
                if (Array.isArray(savedSlots) && savedSlots.length > 0) {
                    setClassTimeOptions(savedSlots.map(s => ({ label: s, value: s })));
                }
            } catch { /* use defaults */ }

            // 2. Flatten Students
            const allStudents = [];
            const seen = new Set();
            activeCourses.forEach(course => {
                (course.enrollments || []).forEach(e => {
                    const uid = e.user?._id || e.user;
                    if (uid && e.isActive && e.status !== 'completed' && !e.isPaused) {
                        const uniqueId = `${course._id}-${uid}`;
                        if (!seen.has(uniqueId)) {
                            seen.add(uniqueId);
                            allStudents.push({
                                id: uid,
                                name: e.user?.name || 'Student',
                                rollNo: e.user?.rollNo || 'N/A',
                                photo: e.user?.photo || '',
                                courseId: course._id,
                                courseName: course.title || course.name,
                                audience: course.targetAudience,
                                location: course.city || course.location || 'N/A',
                                attendType: e.user?.attendType || 'Physical',
                                classTime: e.user?.classTime || null,
                                guardianPhone: e.user?.guardianPhone || '',
                                lastSeen: e.user?.lastSeen
                            });
                        }
                    }
                });
            });
            setStudents(allStudents);

            // 3. Fetch Holidays
            const holidayRes = await attendanceAPI.getGlobalHolidays();
            setHolidayDays(holidayRes.data.holidayDays || []);

        } catch (error) {
            console.error('Error fetching quick attendance data:', error);
            showToast.error('Load Failed', 'Could not load student data');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAllAttendance = async () => {
        // We need to fetch attendance for each course for the selected date
        const marks = {};
        try {
            await Promise.all(courses.map(async (course) => {
                const res = await attendanceAPI.get(course._id, selectedDate);
                const records = res.data.attendance?.records || [];
                records.forEach(r => {
                    marks[`${course._id}-${r.user?._id || r.user}`] = {
                        status: r.status,
                        mode: r.mode // Will fallback to student preference in UI if not set
                    };
                });
            }));
            setAttendanceMarks(marks);
        } catch (error) {
            console.error('Error fetching attendance records:', error);
        }
    };

    const handleClassTimeChange = async (studentId, newTime) => {
        try {
            await userAPI.updateClassTime(studentId, newTime);
            setStudents(prev => prev.map(s => 
                s.id === studentId ? { ...s, classTime: newTime } : s
            ));
            showToast.success('Updated', 'Class time updated successfully');
        } catch (error) {
            console.error('Error updating class time:', error);
            showToast.error('Error', 'Failed to update class time');
        }
    };
    const handleMark = async (student, status) => {
        const markKey = `${student.courseId}-${student.id}`;
        const defaultMode = (student.attendType || '').toLowerCase().includes('online') ? 'online' : 'onsite';

        // Optimistic UI Update
        const oldData = attendanceMarks[markKey];
        setAttendanceMarks(prev => ({
            ...prev,
            [markKey]: { status, mode: defaultMode }
        }));

        // WHATSAPP POPUP LOGIC (Triggered before await to bypass browser popup blocker)
        if (student.guardianPhone) {
            const isIntern = student.audience === 'interns';
            const academyName = isIntern ? "Adeeb Technology Lab\nDigital Tech Expert Software House" : "The Computer Courses\nLearn and Earn";
            const campus = student.location && student.location !== 'N/A' ? `\n*Campus:* ${student.location}` : "";
            const dt = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
            const statusIndicator = status === 'present' ? '✅' : (status === 'absent' ? '❌' : '');
            const message = `*DAILY ATTENDANCE REPORT*\n${academyName}${campus}\n\n*Student:* ${student.name}\n*Course:* ${student.courseName}\n*Date:* ${dt}\n*Status:* ${status.toUpperCase()} ${statusIndicator}`;
            
            const formattedPhone = student.guardianPhone.replace(/\D/g, '');
            let finalPhone = formattedPhone;
            if (finalPhone.startsWith('0')) {
                finalPhone = '92' + finalPhone.substring(1);
            } else if (!finalPhone.startsWith('92') && finalPhone.length === 10) {
                finalPhone = '92' + finalPhone; 
            }

            window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`, '_blank');
        }

        try {
            // OPTIMIZED: Only send the changed student to the backend to prevent notification storms 
            // and reduce server load. The backend will update this specific student in the record.
            const record = {
                userId: student.id,
                status: status,
                mode: defaultMode
            };

            await attendanceAPI.mark({
                courseId: student.courseId,
                date: selectedDate,
                records: [record] // Send only the updated record
            });
        } catch (error) {
            console.error('Failed to save attendance:', error);
            setAttendanceMarks(prev => ({ ...prev, [markKey]: oldData }));
            showToast.error('Sync Error', 'Failed to save attendance');
        }
    };

    const handleDownloadPDF = () => {
        try {
            const doc = new jsPDF();
            const [y, m, d] = selectedDate.split('-').map(Number);
            const dateStr = format(new Date(y, m - 1, d), 'dd MMMM yyyy');
            const timestamp = format(new Date(), 'dd-MMM-yyyy HH:mm');

            // Header Section
            doc.setFontSize(22);
            doc.setTextColor(16, 185, 129); // primary
            doc.text('LMS ADEEB TECH LAB', 14, 20);

            doc.setFontSize(14);
            doc.setTextColor(100, 116, 139); // Slate-500
            doc.text('Attendance Report', 14, 30);

            doc.setFontSize(10);
            doc.text(`Session Date: ${dateStr}`, 14, 38);
            doc.text(`Generated On: ${timestamp}`, 14, 44);

            const tableRows = filteredStudents.map((s, idx) => {
                const markKey = `${s.courseId}-${s.id}`;
                const data = attendanceMarks[markKey] || { status: 'Not Marked', mode: 'onsite' };
                const status = data.status || 'Not Marked';
                const mode = data.mode || 'onsite';
                return [
                    idx + 1,
                    s.name.toUpperCase(),
                    s.rollNo,
                    s.courseName.toUpperCase(),
                    s.location.toUpperCase(),
                    s.audience === 'interns' ? 'INTERN' : 'STUDENT',
                    mode.toUpperCase(),
                    status.toUpperCase()
                ];
            });

            autoTable(doc, {
                startY: 55,
                head: [['#', 'Student Name', 'Roll Number', 'Course', 'Campus Location', 'Category', 'Mode', 'Status']],
                body: tableRows,
                headStyles: {
                    fillColor: [16, 185, 129],
                    textColor: [255, 255, 255],
                    fontSize: 10,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                styles: {
                    fontSize: 9,
                    cellPadding: 4,
                    valign: 'middle'
                },
                columnStyles: {
                    0: { halign: 'center' },
                    2: { halign: 'center' },
                    4: { halign: 'center' },
                    5: { halign: 'center' },
                    6: { halign: 'center' },
                    7: { halign: 'center', fontStyle: 'bold' }
                },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 7) {
                        const status = data.cell.raw.toString().toLowerCase();
                        if (status === 'present') data.cell.styles.textColor = [5, 150, 105];
                        if (status === 'absent') data.cell.styles.textColor = [220, 38, 38];
                    }
                }
            });

            const fileName = `Attendance_${selectedDate}_${filterStatus}.pdf`;
            doc.save(fileName);
            showToast.success('PDF Generated', 'Report downloaded successfully');
        } catch (error) {
            console.error('PDF Error:', error);
            showToast.error('Export Failed', 'Could not generate PDF');
        }
    };

    const handleDownloadRangePDF = async () => {
        setIsGeneratingRange(true);
        try {
            const doc = new jsPDF({ orientation: 'landscape' });
            const startStr = format(parseISO(rangeStart), 'dd MMM yyyy');
            const endStr = format(parseISO(rangeEnd), 'dd MMM yyyy');
            const timestamp = format(new Date(), 'dd-MMM-yyyy HH:mm');

            // Header Section
            doc.setFontSize(24);
            doc.setTextColor(16, 185, 129);
            doc.text('LMS ADEEB TECH LAB', 14, 20);

            doc.setFontSize(14);
            doc.setTextColor(100, 116, 139);
            doc.text('Detailed Attendance Matrix Report', 14, 30);

            doc.setFontSize(10);
            doc.text(`Period: ${startStr} to ${endStr}`, 14, 38);
            doc.text(`Generated On: ${timestamp}`, 14, 44);

            // Fetch Data for each day in range
            const dateRange = [];
            let current = parseISO(rangeStart);
            const last = parseISO(rangeEnd);
            while (!isBefore(last, current)) {
                dateRange.push(format(current, 'yyyy-MM-dd'));
                current = addDays(current, 1);
            }

            // Student Summary Object with daily marks
            const summary = {};
            students.forEach(s => {
                summary[s.id] = {
                    name: s.name,
                    rollNo: s.rollNo,
                    course: s.courseName,
                    location: s.location,
                    daily: {}, // Will store date: status
                    present: 0,
                    absent: 0,
                    totalDays: 0
                };
            });

            // Fetch and aggregate (Sequential for stability)
            for (const date of dateRange) {
                const dateObj = parseISO(date);
                if (holidayDays.includes(dateObj.getDay())) continue;

                for (const course of courses) {
                    try {
                        const res = await attendanceAPI.get(course._id, date);
                        const records = res.data.attendance?.records || [];
                        records.forEach(r => {
                            const uid = r.user?._id || r.user;
                            if (uid && summary[uid]) {
                                // Only count if we haven't marked this user for this date yet 
                                // (to avoid double counting if user is in multiple courses - though rare in this context)
                                if (!summary[uid].daily[date]) {
                                    summary[uid].totalDays++;
                                    summary[uid].daily[date] = r.status === 'present' ? 'P' : 'A';
                                    if (r.status === 'present') summary[uid].present++;
                                    else if (r.status === 'absent') summary[uid].absent++;
                                }
                            }
                        });
                    } catch (err) {
                        console.warn(`Could not fetch attendance for ${course.title || course.name} on ${date}`);
                    }
                }
            }

            // Build Matrix Columns
            const dateHeaders = dateRange.filter(d => !holidayDays.includes(parseISO(d).getDay()))
                .map(d => format(parseISO(d), 'dd/MM'));

            const tableHead = [['#', 'Student Name', 'Roll No', 'Course', 'Location', ...dateHeaders, 'Pres', 'Abs', '%']];

            const tableRows = Object.values(summary).map((s, idx) => {
                const dailyMarks = dateRange.filter(d => !holidayDays.includes(parseISO(d).getDay()))
                    .map(d => s.daily[d] || '-');

                const percent = s.totalDays > 0 ? ((s.present / s.totalDays) * 100).toFixed(0) : '0';

                return [
                    idx + 1,
                    (s.name || 'UNKNOWN').toUpperCase(),
                    s.rollNo || 'N/A',
                    (s.course || 'N/A').toUpperCase(),
                    (s.location || 'N/A').toUpperCase(),
                    ...dailyMarks,
                    s.present,
                    s.absent,
                    `${percent}%`
                ];
            });

            autoTable(doc, {
                startY: 55,
                head: tableHead,
                body: tableRows,
                theme: 'grid',
                headStyles: {
                    fillColor: [16, 185, 129],
                    fontSize: 6.5,
                    halign: 'center',
                    valign: 'middle'
                },
                styles: {
                    fontSize: 6.5,
                    cellPadding: 1.2,
                    halign: 'center',
                    valign: 'middle',
                    overflow: 'linebreak'
                },
                columnStyles: {
                    0: { cellWidth: 8 },
                    1: { halign: 'left', fontStyle: 'bold', cellWidth: 30 },
                    2: { cellWidth: 15 },
                    3: { halign: 'left', cellWidth: 25 },
                    4: { halign: 'center', cellWidth: 18 },
                    // Summary columns at the end
                    [tableHead[0].length - 3]: { cellWidth: 10 },
                    [tableHead[0].length - 2]: { cellWidth: 10 },
                    [tableHead[0].length - 1]: { fontStyle: 'bold', cellWidth: 12 }
                },
                didParseCell: (data) => {
                    if (data.section === 'body') {
                        const val = data.cell.raw;
                        if (val === 'P') data.cell.styles.textColor = [16, 185, 129];
                        if (val === 'A') data.cell.styles.textColor = [220, 38, 38];
                    }
                }
            });

            doc.save(`Attendance_Matrix_${rangeStart}_to_${rangeEnd}.pdf`);
            showToast.success('Matrix Exported', 'Detailed report downloaded');
            setShowRangeModal(false);
        } catch (error) {
            console.error('Matrix PDF Error:', error);
            showToast.error('Export Failed', 'Error generating matrix report');
        } finally {
            setIsGeneratingRange(false);
        }
    };

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.rollNo.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCourse = filterCourse === 'all' || s.courseId === filterCourse;
        const matchesLocation = filterLocation === 'all' || s.location?.toLowerCase() === filterLocation.toLowerCase();
        const matchesCategory = filterCategory === 'all' || s.audience?.toLowerCase() === filterCategory.toLowerCase();
        const matchesAttendType = filterAttendType === 'all' || s.attendType?.toLowerCase() === filterAttendType.toLowerCase();
        const matchesClassTime = filterClassTime === 'all' || s.classTime === filterClassTime;

        const markKey = `${s.courseId}-${s.id}`;
        const currentData = attendanceMarks[markKey];
        const currentMark = currentData?.status;
        const matchesStatus = filterStatus === 'all' ||
            (filterStatus === 'present' && currentMark === 'present') ||
            (filterStatus === 'absent' && currentMark === 'absent') ||
            (filterStatus === 'not_marked' && !currentMark);

        return matchesSearch && matchesCourse && matchesLocation && matchesCategory && matchesAttendType && matchesClassTime && matchesStatus;
    });

    const isDateHoliday = () => {
        const [year, month, day] = selectedDate.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        return holidayDays.includes(dateObj.getDay());
    };

    const markedCount = filteredStudents.filter(s => attendanceMarks[`${s.courseId}-${s.id}`]?.status).length;
    const presentCount = filteredStudents.filter(s => attendanceMarks[`${s.courseId}-${s.id}`]?.status === 'present').length;
    const absentCount = filteredStudents.filter(s => attendanceMarks[`${s.courseId}-${s.id}`]?.status === 'absent').length;
    const totalCount = filteredStudents.length;
    const progressPercent = totalCount > 0 ? Math.round((markedCount / totalCount) * 100) : 0;

    if (isLoading) {
        return (
            <Loader message="Initializing Active Attendance..." />
        );
    }

    return (
        <div className="w-full px-4 md:px-6 lg:px-8 space-y-3 pb-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-gray-100 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 opacity-40 pointer-events-none"></div>

                <div className="relative z-10 flex items-center gap-3 min-w-0">
                    <div>
                        <button
                            onClick={() => navigate('/teacher/dashboard')}
                            className="flex items-center gap-1 text-primary font-black text-[9px] uppercase tracking-[0.15em] mb-0.5"
                        >
                            <ChevronLeft className="w-3 h-3" />
                            Back to Portal
                        </button>
                        <h1 className="text-lg sm:text-xl font-black text-gray-900 uppercase tracking-tight leading-none">Active Attendance</h1>
                        <p className="text-gray-500 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 mt-0.5 truncate">
                            <Users className="w-3 h-3 text-primary shrink-0" />
                            Marking for {filteredStudents.length} {filterCategory === 'all' ? 'active members' : filterCategory}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 relative z-10 shrink-0">
                    <button
                        onClick={() => setShowRangeModal(true)}
                        className="flex items-center justify-center gap-1.5 bg-white text-rose-600 px-3 py-2 rounded-lg font-black uppercase tracking-wider text-[10px] border border-rose-100 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-100 transition-all active:scale-95"
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        Range Export
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center justify-center gap-1.5 bg-white text-primary px-3 py-2 rounded-lg font-black uppercase tracking-wider text-[10px] border border-primary/15 hover:border-primary hover:shadow-primary/10 transition-all active:scale-95"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Download Today
                    </button>
                    <div className="flex flex-col">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Selection Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary" />
                            <input
                                type="date"
                                value={selectedDate}
                                max={getTodayAttendanceDateKey()}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="pl-8 pr-3 py-2 bg-gray-50 border border-transparent focus:border-primary focus:bg-white rounded-lg text-xs font-bold outline-none transition-all cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Attendance Progress â€” top bar */}
            {!isDateHoliday() && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                    <div className="w-full flex-1 min-w-[180px] space-y-1.5">
                        <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider shrink-0">Attendance Progress</span>
                            <span className="text-xs font-black text-gray-900 tabular-nums whitespace-nowrap">
                                {markedCount}/{totalCount}
                                <span className="text-gray-400 font-bold"> ({progressPercent}%)</span>
                            </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(255,142,1,0.3)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 0.4 }}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 shadow-sm shadow-emerald-500/5">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <div>
                                <span className="text-[8px] font-black text-emerald-600/80 uppercase tracking-wider block leading-none">Present</span>
                                <span className="text-sm font-black text-emerald-700 tabular-nums leading-tight">{presentCount}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-100 shadow-sm shadow-rose-500/5">
                            <UserX className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <div>
                                <span className="text-[8px] font-black text-rose-600/80 uppercase tracking-wider block leading-none">Absent</span>
                                <span className="text-sm font-black text-rose-700 tabular-nums leading-tight">{absentCount}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100 shadow-sm shadow-amber-500/5">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <div>
                                <span className="text-[8px] font-black text-amber-600/80 uppercase tracking-wider block leading-none">Pending</span>
                                <span className="text-sm font-black text-amber-700 tabular-nums leading-tight">{totalCount - markedCount}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/teacher/dashboard')}
                            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap shadow-lg shadow-primary/20"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Finish Marking
                        </button>
                    </div>
                </div>
            )}

            {/* Warning if Holiday */}
            {isDateHoliday() && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-4"
                >
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Weekly Off Day Detected</h4>
                        <p className="text-xs text-amber-700 font-bold uppercase tracking-widest opacity-80 mt-0.5">Attendance is locked for holiday sessions.</p>
                    </div>
                </motion.div>
            )}

            {/* Professional Filter Toolbar */}
            <div className="bg-white/80 backdrop-blur-xl p-2.5 sm:p-3 rounded-xl border border-gray-100 shadow-sm space-y-2.5">
                <div className="flex flex-col lg:flex-row gap-2 items-center">
                    {/* Search Bar - Sleek Design */}
                    <div className="relative flex-1 w-full group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="w-3.5 h-3.5 text-gray-400 group-focus-within:text-primary transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name or roll number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 !bg-gray-50/50 dark:!bg-white/5 border border-gray-100 focus:border-primary/30 focus:!bg-white dark:focus:!bg-white/10 focus:ring-2 focus:ring-primary/5 rounded-lg text-xs font-bold outline-none transition-all placeholder:text-gray-400 dark:text-white"
                        />
                    </div>

                    {/* Filters Row */}
                    <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
                        {/* Course Filter */}
                        <div className="relative flex-1 lg:w-48">
                            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 text-primary" />
                            <select
                                value={filterCourse}
                                onChange={(e) => setFilterCourse(e.target.value)}
                                className="w-full pl-9 pr-8 py-1.5 bg-gray-50/50 border border-gray-100 rounded-lg text-[8px] font-black uppercase tracking-wider outline-none focus:border-primary/30 focus:bg-white transition-all cursor-pointer appearance-none"
                            >
                                <option value="all">All Courses</option>
                                {courses.map(c => (
                                    <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Location Filter - Buttons */}
                        <div className="flex items-center gap-1.5 bg-gray-50/50 p-0.5 rounded-lg border border-gray-100">
                            {[
                                { id: 'all', label: 'All Locations' },
                                { id: 'Bahawalpur', label: 'Bahawalpur' },
                                { id: 'Islamabad', label: 'Islamabad' }
                            ].map(loc => (
                                <button
                                    key={loc.id}
                                    onClick={() => setFilterLocation(loc.id)}
                                    className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all ${filterLocation === loc.id
                                        ? 'bg-primary text-white shadow-md'
                                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    {loc.label}
                                </button>
                            ))}
                        </div>

                        {/* Category Filter - Buttons */}
                        <div className="flex items-center gap-1.5 bg-gray-50/50 p-0.5 rounded-lg border border-gray-100">
                            {[
                                { id: 'all', label: 'All Categories' },
                                { id: 'students', label: 'Students' },
                                { id: 'interns', label: 'Interns' }
                            ].map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setFilterCategory(cat.id)}
                                    className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all ${filterCategory === cat.id
                                        ? 'bg-primary text-white shadow-md'
                                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* Attend Type Filter - Buttons */}
                        <div className="flex items-center gap-1.5 bg-gray-50/50 p-0.5 rounded-lg border border-gray-100">
                            {[
                                { id: 'all', label: 'All Modes' },
                                { id: 'physical', label: 'Onsite' },
                                { id: 'online', label: 'Online' }
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setFilterAttendType(type.id)}
                                    className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all ${filterAttendType === type.id
                                        ? 'bg-primary text-white shadow-md'
                                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>

                        {/* Class Time Filter */}
                        <div className="flex items-center gap-1.5 bg-gray-50/50 p-0.5 rounded-lg border border-gray-100">
                            <select
                                value={filterClassTime}
                                onChange={(e) => setFilterClassTime(e.target.value)}
                                className="px-2 py-1 rounded-md text-[10px] font-bold text-gray-700 bg-transparent border-none focus:ring-0 outline-none w-32 cursor-pointer max-w-[150px] truncate"
                            >
                                <option value="all">All Times</option>
                                {classTimeOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Status Chips - Interactive Filtering */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-full shrink-0 border border-gray-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-wider">Quick Status Filter</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {[
                            { id: 'all', label: 'All Students', icon: Users, baseColor: 'gray', activeClass: 'bg-gray-900 border-gray-900 text-white shadow-gray-200' },
                            { id: 'present', label: 'Present', icon: UserCheck, baseColor: 'emerald', activeClass: 'bg-present-fixed border-present-fixed text-white shadow-emerald-100' },
                            { id: 'absent', label: 'Absent', icon: UserX, baseColor: 'rose', activeClass: 'bg-absent-fixed border-absent-fixed text-white shadow-rose-100' },
                            { id: 'not_marked', label: 'Not Marked', icon: Clock, baseColor: 'amber', activeClass: 'bg-norecord-fixed border-norecord-fixed text-white shadow-slate-100' }
                        ].map(btn => (
                            <button
                                key={btn.id}
                                onClick={() => setFilterStatus(btn.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-wider transition-all border ${filterStatus === btn.id
                                    ? `${btn.activeClass} `
                                    : `bg-white border-gray-100 text-gray-500 hover:border-${btn.baseColor}-200 hover:bg-${btn.baseColor}-50/50 hover:text-${btn.baseColor}-600`
                                    }`}
                            >
                                <btn.icon className={`w-3 h-3 ${filterStatus === btn.id ? 'opacity-100' : 'opacity-60'}`} />
                                {btn.label}
                                {filterStatus === btn.id && (
                                    <span className="ml-1 w-1.5 h-1.5 rounded-full bg-white/40"></span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Student List Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-2 shrink-0">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        Showing {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="w-full overflow-x-auto">
                    <table className="w-full min-w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-primary border-b border-primary">
                                <th className="px-1.5 py-2 text-[9px] font-black text-white/90 uppercase tracking-tighter text-center w-8">#</th>
                                <th className="px-2 py-2 text-[9px] font-black text-white/90 uppercase tracking-tighter min-w-[120px]">Student</th>
                                <th className="px-1.5 py-2 text-[9px] font-black text-white/90 uppercase tracking-tighter whitespace-nowrap">Roll No</th>
                                <th className="px-1.5 py-2 text-[9px] font-black text-white/90 uppercase tracking-tighter min-w-[100px]">Course</th>
                                <th className="hidden sm:table-cell px-1.5 py-2 text-[9px] font-black text-white/90 uppercase tracking-tighter whitespace-nowrap">Location</th>
                                <th className="hidden sm:table-cell px-1.5 py-2 text-[9px] font-black text-white/90 uppercase tracking-tighter whitespace-nowrap">Type</th>
                                <th className="hidden sm:table-cell px-1.5 py-2 text-[9px] font-black text-white/90 uppercase tracking-tighter min-w-[120px]">Class Time</th>
                                <th className="px-2 py-2 text-[9px] font-black text-white/90 uppercase tracking-tighter text-center whitespace-nowrap">Mark</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            <AnimatePresence mode='popLayout'>
                                {filteredStudents.map((student, index) => {
                                    const markKey = `${student.courseId}-${student.id}`;
                                    const currentMark = attendanceMarks[markKey];

                                    return (
                                        <motion.tr
                                            key={markKey}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ delay: index * 0.01 }}
                                            className={`group transition-colors ${currentMark?.status === 'present' ? 'bg-present-fixed-light' :
                                                currentMark?.status === 'absent' ? 'bg-absent-fixed-light' :
                                                    'hover:bg-gray-50/50'
                                                }`}
                                        >
                                            <td className="px-2 py-1.5 text-center">
                                                <span className="text-[10px] font-black text-gray-400 tabular-nums">
                                                    {index + 1}
                                                </span>
                                            </td>
                                            <td className="px-3 py-1.5">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="relative">
                                                        <ProfileAvatar
                                                            src={student.photo}
                                                            name={student.name}
                                                            size="sm"
                                                            shape="rounded-lg"
                                                            border={formatLastSeen(student.lastSeen) === 'Online' ? 'online-avatar-glow' : currentMark?.status === 'present' ? 'border-primary' : currentMark?.status === 'absent' ? 'border-rose-500' : 'border-gray-100'}
                                                        />
                                                        {formatLastSeen(student.lastSeen) === 'Online' && (
                                                            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm z-10">
                                                                <div className="absolute w-full h-full rounded-full bg-green-500 animate-status-ping opacity-75"></div>
                                                                <div className="relative w-1.5 h-1.5 rounded-full bg-white"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-tight group-hover:text-primary transition-colors truncate max-w-[150px] sm:max-w-none" title={student.name}>{student.name}</h3>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {formatLastSeen(student.lastSeen) === 'Online' ? (
                                                                <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-green-500/10 border border-green-500/20 rounded-md backdrop-blur-sm">
                                                                    <span className="text-[8px] font-black text-green-600 uppercase tracking-[0.1em]">
                                                                        Active Now
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className={`w-1 h-1 rounded-full ${getStatusColor(student.lastSeen)} opacity-60`}></div>
                                                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                                                                        {formatLastSeen(student.lastSeen)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <span className="text-[10px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100 uppercase tracking-wider whitespace-nowrap">
                                                    {student.rollNo}
                                                </span>
                                            </td>
                                            <td className="px-1.5 py-1.5">
                                                <span className="text-[9px] font-black text-gray-700 uppercase tracking-tight line-clamp-1" title={student.courseName}>{student.courseName}</span>
                                            </td>
                                            <td className="hidden sm:table-cell px-1.5 py-1.5">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[9px] font-black text-gray-700 uppercase tracking-tight">{student.location}</span>
                                                </div>
                                            </td>
                                            <td className="hidden sm:table-cell px-1.5 py-1.5">
                                                <span className={`text-[8px] px-1 py-0.5 rounded font-bold uppercase tracking-wider whitespace-nowrap ${student.audience === 'interns'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {student.audience === 'interns' ? 'Intern' : 'Student'}
                                                </span>
                                            </td>
                                            <td className="hidden sm:table-cell px-1.5 py-1.5">
                                                <select
                                                    value={student.classTime || ''}
                                                    onChange={(e) => handleClassTimeChange(student.id, e.target.value)}
                                                    className="px-1.5 py-1 rounded border border-gray-200 text-[9px] font-bold text-gray-700 bg-white focus:ring-1 focus:ring-primary outline-none max-w-[120px] truncate"
                                                >
                                                    <option value="">Unassigned</option>
                                                    {classTimeOptions.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-3 py-1.5">
                                                <div className="flex items-center justify-center gap-1 flex-nowrap">
                                                    <button
                                                        disabled={isDateHoliday()}
                                                        onClick={() => handleMark(student, 'present')}
                                                        className={`px-2.5 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-[0.1em] transition-all flex items-center justify-center border-2 whitespace-nowrap ${currentMark?.status === 'present'
                                                            ? 'bg-present-fixed border-present-fixed text-white shadow-lg shadow-present-fixed/20'
                                                            : 'bg-white border-gray-100 text-gray-400 hover:border-present-fixed hover:text-present-fixed'
                                                            } disabled:opacity-30 disabled:cursor-not-allowed active:scale-95`}
                                                    >
                                                        Present
                                                    </button>
                                                    <button
                                                        disabled={isDateHoliday()}
                                                        onClick={() => handleMark(student, 'absent')}
                                                        className={`px-2.5 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-[0.1em] transition-all flex items-center justify-center border-2 whitespace-nowrap ${currentMark?.status === 'absent'
                                                            ? 'bg-absent-fixed border-absent-fixed text-white shadow-lg shadow-absent-fixed/20'
                                                            : 'bg-white border-gray-100 text-gray-400 hover:border-absent-fixed hover:text-absent-fixed'
                                                            } disabled:opacity-30 disabled:cursor-not-allowed active:scale-95`}
                                                    >
                                                        Absent
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            {filteredStudents.length === 0 && (
                <div className="bg-white p-20 rounded-[3rem] border border-gray-100 text-center">
                    <Search className="w-16 h-16 text-gray-100 mx-auto mb-6" />
                    <h3 className="text-xl font-black text-gray-300 uppercase tracking-tighter">No Students Detected</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Adjust your filters or try a different search</p>
                </div>
            )}

            {/* Range Report Modal */}
            <AnimatePresence>
                {showRangeModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isGeneratingRange && setShowRangeModal(false)}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                        ></motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
                        >
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Export Range</h2>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Select dates for summary report</p>
                                    </div>
                                    <button
                                        onClick={() => setShowRangeModal(false)}
                                        className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-rose-500 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Start Date</label>
                                            <input
                                                type="date"
                                                value={rangeStart}
                                                onChange={(e) => setRangeStart(e.target.value)}
                                                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-primary rounded-2xl font-black text-sm outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End Date</label>
                                            <input
                                                type="date"
                                                value={rangeEnd}
                                                max={getTodayAttendanceDateKey()}
                                                onChange={(e) => setRangeEnd(e.target.value)}
                                                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-primary rounded-2xl font-black text-sm outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-primary/5 p-4 rounded-2xl flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <AlertCircle className="w-5 h-5" />
                                        </div>
                                        <p className="text-[10px] font-bold text-primary uppercase leading-relaxed">
                                            Report will include summary for all students in this range.
                                        </p>
                                    </div>

                                    <button
                                        disabled={isGeneratingRange}
                                        onClick={handleDownloadRangePDF}
                                        className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-primary transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {isGeneratingRange ? (
                                            <ButtonLoader />
                                        ) : (
                                            <>
                                                <Download className="w-5 h-5" />
                                                Generate PDF Report
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default QuickAttendance;




