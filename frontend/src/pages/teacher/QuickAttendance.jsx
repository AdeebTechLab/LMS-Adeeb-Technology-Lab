import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { 
    CheckCircle, X, Search, Calendar, ChevronLeft, 
    Loader2, Users, Save, AlertCircle, RefreshCw,
    UserCheck, UserX, Clock, Filter, Download, MapPin, GraduationCap
} from 'lucide-react';
import { courseAPI, attendanceAPI } from '../../services/api';
import ProfileAvatar from '../../components/ui/ProfileAvatar';
import Badge from '../../components/ui/Badge';
import { showToast } from '../../utils/customToast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, differenceInDays, addDays, isBefore, parseISO } from 'date-fns';

const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const QuickAttendance = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useSelector((state) => state.auth);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedDate, setSelectedDate] = useState(getLocalDateString(new Date()));
    const [students, setStudents] = useState([]);
    const [attendanceMarks, setAttendanceMarks] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCourse, setFilterCourse] = useState('all');
    const [filterStatus, setFilterStatus] = useState(location.state?.initialFilter || 'all');
    const [filterLocation, setFilterLocation] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [courses, setCourses] = useState([]);
    const [holidayDays, setHolidayDays] = useState([]);

    // Range Report States
    const [showRangeModal, setShowRangeModal] = useState(false);
    const [rangeStart, setRangeStart] = useState(getLocalDateString(new Date(new Date().setDate(new Date().getDate() - 7))));
    const [rangeEnd, setRangeEnd] = useState(getLocalDateString(new Date()));
    const [isGeneratingRange, setIsGeneratingRange] = useState(false);

    useEffect(() => {
        fetchInitialData();
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
                                courseName: course.name,
                                audience: course.targetAudience,
                                location: course.location || 'N/A',
                                attendType: e.user?.attendType || 'Physical'
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

    const handleMark = async (student, status) => {
        const markKey = `${student.courseId}-${student.id}`;
        const defaultMode = (student.attendType || '').toLowerCase().includes('online') ? 'online' : 'onsite';
        
        // Optimistic UI Update
        const oldData = attendanceMarks[markKey];
        setAttendanceMarks(prev => ({ 
            ...prev, 
            [markKey]: { status, mode: defaultMode } 
        }));

        try {
            const courseStudents = students.filter(s => s.courseId === student.courseId);
            const records = courseStudents.map(s => {
                const sKey = `${s.courseId}-${s.id}`;
                const sDefaultMode = (s.attendType || '').toLowerCase().includes('online') ? 'online' : 'onsite';
                const sData = s.id === student.id ? { status, mode: defaultMode } : (attendanceMarks[sKey] || { status: 'absent', mode: sDefaultMode });
                return {
                    userId: s.id,
                    status: sData.status,
                    mode: sData.mode || sDefaultMode
                };
            });

            await attendanceAPI.mark({
                courseId: student.courseId,
                date: selectedDate,
                records
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
            const dateStr = format(new Date(selectedDate), 'dd MMMM yyyy');
            const timestamp = format(new Date(), 'dd-MMM-yyyy HH:mm');

            // Header Section
            doc.setFontSize(22);
            doc.setTextColor(16, 185, 129); // Emerald-500
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
                    s.audience === 'interns' ? 'INTERN' : 'STUDENT',
                    mode.toUpperCase(),
                    status.toUpperCase()
                ];
            });

            autoTable(doc, {
                startY: 55,
                head: [['#', 'Student Name', 'Roll Number', 'Course', 'Category', 'Mode', 'Status']],
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
                    5: { halign: 'center', fontStyle: 'bold' }
                },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 5) {
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
                        console.warn(`Could not fetch attendance for ${course.name} on ${date}`);
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
        
        const markKey = `${s.courseId}-${s.id}`;
        const currentData = attendanceMarks[markKey];
        const currentMark = currentData?.status;
        const matchesStatus = filterStatus === 'all' || 
                             (filterStatus === 'present' && currentMark === 'present') ||
                             (filterStatus === 'absent' && currentMark === 'absent') ||
                             (filterStatus === 'not_marked' && !currentMark);

        return matchesSearch && matchesCourse && matchesLocation && matchesCategory && matchesStatus;
    });

    const isDateHoliday = () => {
        const [year, month, day] = selectedDate.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        return holidayDays.includes(dateObj.getDay());
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Initializing Active Attendance...</p>
            </div>
        );
    }

    return (
        <div className="w-full px-4 md:px-6 lg:px-8 space-y-6 pb-20">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-32 -mt-32 opacity-50 group-hover:scale-110 transition-transform duration-700"></div>
                
                <div className="relative z-10">
                    <button 
                        onClick={() => navigate('/teacher/dashboard')}
                        className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-black text-[10px] uppercase tracking-[0.2em] mb-4"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to Portal
                    </button>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-2">Active Attendance</h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-500" />
                        Fast marking for {students.length} active students
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
                    <button
                        onClick={() => setShowRangeModal(true)}
                        className="flex items-center justify-center gap-3 bg-white text-rose-600 px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs border-2 border-rose-100 shadow-sm hover:border-rose-500 hover:shadow-lg hover:shadow-rose-100 transition-all active:scale-95"
                    >
                        <Calendar className="w-5 h-5" />
                        Range Export
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center justify-center gap-3 bg-white text-emerald-600 px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs border-2 border-emerald-100 shadow-sm hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-100 transition-all active:scale-95"
                    >
                        <Download className="w-5 h-5" />
                        Download Today
                    </button>
                    <div className="flex flex-col items-end">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 mr-1">Selection Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                            <input 
                                type="date"
                                value={selectedDate}
                                max={getLocalDateString(new Date())}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="pl-12 pr-6 py-3.5 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl text-sm font-black outline-none transition-all cursor-pointer shadow-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>

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
            <div className="bg-white/80 backdrop-blur-xl p-4 sm:p-5 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-5">
                <div className="flex flex-col lg:flex-row gap-4 items-center">
                    {/* Search Bar - Sleek Design */}
                    <div className="relative flex-1 w-full group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                        </div>
                        <input 
                            type="text"
                            placeholder="Search by name or roll number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border border-gray-100 focus:border-emerald-500/30 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 rounded-2xl text-sm font-bold outline-none transition-all placeholder:text-gray-400"
                        />
                    </div>

                    {/* Filters Row */}
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        {/* Course Filter */}
                        <div className="relative flex-1 lg:w-48">
                            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-500" />
                            <select 
                                value={filterCourse}
                                onChange={(e) => setFilterCourse(e.target.value)}
                                className="w-full pl-9 pr-8 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-[9px] font-black uppercase tracking-widest outline-none focus:border-emerald-500/30 focus:bg-white transition-all cursor-pointer appearance-none"
                            >
                                <option value="all">All Courses</option>
                                {courses.map(c => (
                                    <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Location Filter */}
                        <div className="relative flex-1 lg:w-40">
                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-500" />
                            <select 
                                value={filterLocation}
                                onChange={(e) => setFilterLocation(e.target.value)}
                                className="w-full pl-9 pr-8 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-[9px] font-black uppercase tracking-widest outline-none focus:border-emerald-500/30 focus:bg-white transition-all cursor-pointer appearance-none"
                            >
                                <option value="all">All Locations</option>
                                <option value="Bahawalpur">Bahawalpur</option>
                                <option value="Islamabad">Islamabad</option>
                            </select>
                        </div>

                        {/* Category Filter */}
                        <div className="relative flex-1 lg:w-36">
                            <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-500" />
                            <select 
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="w-full pl-9 pr-8 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-[9px] font-black uppercase tracking-widest outline-none focus:border-emerald-500/30 focus:bg-white transition-all cursor-pointer appearance-none"
                            >
                                <option value="all">All Categories</option>
                                <option value="students">Students</option>
                                <option value="interns">Interns</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Status Chips - Interactive Filtering */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.15em]">Quick Status Filter</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                        {[
                            { id: 'all', label: 'All Students', icon: Users, baseColor: 'gray', activeClass: 'bg-gray-900 border-gray-900 text-white shadow-gray-200' },
                            { id: 'present', label: 'Present', icon: UserCheck, baseColor: 'emerald', activeClass: 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-100' },
                            { id: 'absent', label: 'Absent', icon: UserX, baseColor: 'rose', activeClass: 'bg-rose-600 border-rose-600 text-white shadow-rose-100' },
                            { id: 'not_marked', label: 'Not Marked', icon: Clock, baseColor: 'amber', activeClass: 'bg-amber-500 border-amber-500 text-white shadow-amber-100' }
                        ].map(btn => (
                            <button
                                key={btn.id}
                                onClick={() => setFilterStatus(btn.id)}
                                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm ${
                                    filterStatus === btn.id
                                    ? `${btn.activeClass} shadow-lg scale-105`
                                    : `bg-white border-gray-100 text-gray-500 hover:border-${btn.baseColor}-200 hover:bg-${btn.baseColor}-50/50 hover:text-${btn.baseColor}-600`
                                }`}
                            >
                                <btn.icon className={`w-3.5 h-3.5 ${filterStatus === btn.id ? 'opacity-100' : 'opacity-60'}`} />
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
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-emerald-600 border-b border-emerald-700">
                                <th className="px-6 py-5 text-[10px] font-black text-white/90 uppercase tracking-[0.2em] text-center w-12">#</th>
                                <th className="px-8 py-5 text-[10px] font-black text-white/90 uppercase tracking-[0.2em]">Student Details</th>
                                <th className="px-6 py-5 text-[10px] font-black text-white/90 uppercase tracking-[0.2em]">Roll Number</th>
                                <th className="px-6 py-5 text-[10px] font-black text-white/90 uppercase tracking-[0.2em]">Active Course</th>
                                <th className="px-6 py-5 text-[10px] font-black text-white/90 uppercase tracking-[0.2em]">Category</th>
                                <th className="px-6 py-5 text-[10px] font-black text-white/90 uppercase tracking-[0.2em]">Attend Type</th>
                                <th className="px-8 py-5 text-[10px] font-black text-white/90 uppercase tracking-[0.2em] text-center">Attendance Marking</th>
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
                                            className={`group transition-colors ${
                                                currentMark?.status === 'present' ? 'bg-emerald-50/30' : 
                                                currentMark?.status === 'absent' ? 'bg-rose-50/30' : 
                                                'hover:bg-gray-50/50'
                                            }`}
                                        >
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-xs font-black text-gray-400">
                                                    {index + 1}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative">
                                                        <ProfileAvatar 
                                                            src={student.photo} 
                                                            name={student.name} 
                                                            size="lg" 
                                                            shape="rounded-xl"
                                                            border={currentMark?.status === 'present' ? 'border-emerald-500' : currentMark?.status === 'absent' ? 'border-rose-500' : 'border-gray-100'} 
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight group-hover:text-emerald-600 transition-colors">{student.name}</h3>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[11px] font-black text-red-500 bg-red-50 px-2 py-1 rounded-lg border border-red-100 uppercase tracking-wider">
                                                    {student.rollNo}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-gray-700 uppercase tracking-tight">{student.courseName}</span>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Assigned Class</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[9px] px-2 py-1 rounded-md font-black uppercase tracking-widest border ${
                                                    student.audience === 'interns' 
                                                    ? 'bg-purple-50 text-purple-600 border-purple-100' 
                                                    : 'bg-blue-50 text-blue-600 border-blue-100'
                                                }`}>
                                                    {student.audience === 'interns' ? 'Intern' : 'Student'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                    {(student.attendType || '').toLowerCase().includes('online')
                                                    ? <span className="bg-rose-50 text-rose-600 border-rose-200 text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest border shadow-sm">Remote</span>
                                                    : <span className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest border shadow-sm">OnSite</span>
                                                }
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        disabled={isDateHoliday()}
                                                        onClick={() => handleMark(student, 'present')}
                                                        className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 border-2 ${
                                                            currentMark?.status === 'present'
                                                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200'
                                                            : 'bg-white border-gray-100 text-gray-400 hover:border-emerald-500 hover:text-emerald-600'
                                                        } disabled:opacity-30 disabled:cursor-not-allowed active:scale-95`}
                                                    >
                                                        Present
                                                    </button>
                                                    <button
                                                        disabled={isDateHoliday()}
                                                        onClick={() => handleMark(student, 'absent')}
                                                        className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 border-2 ${
                                                            currentMark?.status === 'absent'
                                                            ? 'bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-200'
                                                            : 'bg-white border-gray-100 text-gray-400 hover:border-rose-500 hover:text-rose-600'
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

            {/* Bottom Bar for Global Actions */}
            {!isDateHoliday() && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-4 bg-gray-900/90 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl flex items-center gap-8">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Marked</span>
                            <span className="text-xl font-black text-white leading-none">{Object.keys(attendanceMarks).length} / {students.length}</span>
                        </div>
                        <div className="w-px h-8 bg-white/10"></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Present</span>
                            <span className="text-xl font-black text-white leading-none">
                                {Object.values(attendanceMarks).filter(v => v?.status === 'present').length}
                            </span>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => navigate('/teacher/dashboard')}
                        className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-3"
                    >
                        <CheckCircle className="w-5 h-5" />
                        Finish Marking
                    </button>
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
                                                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl font-black text-sm outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End Date</label>
                                            <input 
                                                type="date"
                                                value={rangeEnd}
                                                max={getLocalDateString(new Date())}
                                                onChange={(e) => setRangeEnd(e.target.value)}
                                                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl font-black text-sm outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-emerald-50 p-4 rounded-2xl flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                                            <AlertCircle className="w-5 h-5" />
                                        </div>
                                        <p className="text-[10px] font-bold text-emerald-800 uppercase leading-relaxed">
                                            Report will include summary for all students in this range.
                                        </p>
                                    </div>

                                    <button
                                        disabled={isGeneratingRange}
                                        onClick={handleDownloadRangePDF}
                                        className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {isGeneratingRange ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Processing Data...
                                            </>
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
