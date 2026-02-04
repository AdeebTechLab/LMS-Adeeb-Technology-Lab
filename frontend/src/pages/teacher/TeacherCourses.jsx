import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import Select from 'react-select';
import {
    BookOpen, Users, Calendar, ArrowRight, ChevronLeft,
    FileText, ClipboardList, CheckCircle, Clock, Loader2, User, Award, X, Search,
    Video, ExternalLink, StopCircle
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { courseAPI, enrollmentAPI, assignmentAPI, attendanceAPI, liveClassAPI } from '../../services/api';
import StatCard from '../../components/ui/StatCard';
import { getCourseIcon, getCourseStyle } from '../../utils/courseIcons';

// Tab Components
import AttendanceTab from './components/AttendanceTab';
import DailyTasksTab from './components/DailyTasksTab';
import AssignmentsTab from './components/AssignmentsTab';
import CertificatesTab from './components/CertificatesTab';

const CITY_OPTIONS = [
    { value: 'Bahawalpur', label: 'Bahawalpur' },
    { value: 'Islamabad', label: 'Islamabad' }
];

const TYPE_OPTIONS = [
    { value: 'students', label: 'Student' },
    { value: 'interns', label: 'Intern' }
];

const TeacherCourses = () => {
    const { user } = useSelector((state) => state.auth);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [activeTab, setActiveTab] = useState('daily_tasks'); // assignments | daily_tasks | attendance | certificates
    const [isLoading, setIsLoading] = useState(true);
    const [myCourses, setMyCourses] = useState([]);
    const [filteredCourses, setFilteredCourses] = useState([]); // Filtered list
    const [courseStudents, setCourseStudents] = useState([]);
    const [summaryStats, setSummaryStats] = useState({
        totalCourses: 0,
        totalStudents: 0,
        activeStudents: 0,
        pendingAssignments: 0,
        todayPresent: 0,
        todayAbsent: 0
    });

    // Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCities, setSelectedCities] = useState([]);
    const [selectedTypes, setSelectedTypes] = useState([]);

    // Live Class States
    const [showLiveClassModal, setShowLiveClassModal] = useState(false);
    const [liveClassForm, setLiveClassForm] = useState({
        title: '',
        link: '',
        description: '',
        visibility: 'all'
    });
    const [activeLiveClasses, setActiveLiveClasses] = useState([]);
    const [isCreatingLiveClass, setIsCreatingLiveClass] = useState(false);

    useEffect(() => {
        fetchMyCourses();
        fetchActiveLiveClasses();
    }, []);

    const fetchActiveLiveClasses = async () => {
        try {
            const res = await liveClassAPI.getAll();
            setActiveLiveClasses((res.data.data || []).filter(lc => lc.isActive));
        } catch (error) {
            console.error('Error fetching live classes:', error);
        }
    };

    const handleCreateLiveClass = async (e) => {
        e.preventDefault();
        if (!liveClassForm.title || !liveClassForm.link) return;

        setIsCreatingLiveClass(true);
        try {
            await liveClassAPI.create(liveClassForm);
            setShowLiveClassModal(false);
            setLiveClassForm({ title: '', link: '', description: '', visibility: 'all' });
            fetchActiveLiveClasses();
        } catch (error) {
            console.error('Error creating live class:', error);
            alert('Failed to create live class');
        } finally {
            setIsCreatingLiveClass(false);
        }
    };

    const handleEndLiveClass = async (id) => {
        if (!window.confirm('Are you sure you want to end this live class?')) return;
        try {
            await liveClassAPI.end(id);
            fetchActiveLiveClasses();
        } catch (error) {
            console.error('Error ending live class:', error);
        }
    };

    // Effect to apply filters whenever courses or filter states change
    useEffect(() => {
        let result = myCourses;

        // 1. Search Filter (Title)
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(course =>
                course.name.toLowerCase().includes(lowerQuery)
            );
        }

        // 2. City Filter
        if (selectedCities.length > 0) {
            const cities = selectedCities.map(c => c.value);
            result = result.filter(course =>
                cities.includes(course.city || course.location)
            );
        }

        // 3. Type Filter
        if (selectedTypes.length > 0) {
            const types = selectedTypes.map(t => t.value);
            result = result.filter(course =>
                types.includes(course.targetAudience)
            );
        }

        setFilteredCourses(result);
    }, [myCourses, searchQuery, selectedCities, selectedTypes]);

    const fetchMyCourses = async () => {
        setIsLoading(true);
        try {
            // Fetch all courses
            const coursesRes = await courseAPI.getAll();
            const allCourses = coursesRes.data.data || [];

            // Filter courses where this teacher is assigned (check teachers array)
            const teacherCourses = allCourses.filter(c =>
                c.teachers?.some(t => String(t._id || t) === String(user?._id))
            );

            // Get enrollments once
            let enrollments = [];
            try {
                const enrollmentsRes = await enrollmentAPI.getAll();
                enrollments = enrollmentsRes.data.data || [];
            } catch (e) { }

            const today = new Date().toISOString().split('T')[0];

            // Fetch extra data for each course in parallel
            const coursesWithData = await Promise.all(teacherCourses.map(async (course) => {
                const courseEnrollments = enrollments.filter(e => String(e.course?._id || e.course) === String(course._id));

                // Calculate student stats
                const totalStudents = courseEnrollments.length;
                const activeStudents = courseEnrollments.filter(e => e.isActive && e.status !== 'completed').length;

                // Fetch assignments to count pending grading
                let pendingAssignments = 0;
                try {
                    const assignRes = await assignmentAPI.getByCourse(course._id);
                    const assignments = assignRes.data.assignments || [];
                    pendingAssignments = assignments.reduce((acc, a) =>
                        acc + (a.submissions?.filter(s => s.status === 'submitted' || !s.marks).length || 0), 0
                    );
                } catch (e) { }

                // Fetch today's attendance (check local storage first for "unsaved" marked today)
                let presentCount = 0;
                let absentCount = 0;

                const cacheKey = `attendance_${course._id}_${today}`;
                const cached = localStorage.getItem(cacheKey);

                if (cached) {
                    const localMarks = JSON.parse(cached);
                    Object.values(localMarks).forEach(record => {
                        if (record.status === 'present') presentCount++;
                        else if (record.status === 'absent') absentCount++;
                    });
                } else {
                    try {
                        const attRes = await attendanceAPI.get(course._id, today);
                        const records = attRes.data.attendance?.records || attRes.data.data?.records || [];
                        records.forEach(r => {
                            if (r.status === 'present') presentCount++;
                            else if (r.status === 'absent') absentCount++;
                        });
                    } catch (e) { }
                }

                return {
                    id: course._id,
                    _id: course._id,
                    name: course.title,
                    internCount: totalStudents,
                    activeStudents,
                    pendingAssignments,
                    presentCount,
                    absentCount,
                    durationMonths: course.durationMonths,
                    status: course.isActive !== false ? 'active' : 'inactive',
                    location: course.location,
                    city: course.city,
                    category: course.category,
                    targetAudience: course.targetAudience || 'students',
                    enrollments: courseEnrollments
                };
            }));

            setMyCourses(coursesWithData);

            // Calculate overall summary
            // 1. Unique Students
            const uniqueStudentIds = new Set();
            coursesWithData.forEach(c => {
                c.enrollments.forEach(e => {
                    const uid = e.user?._id || e.student?._id || e.user || e.student;
                    if (uid) uniqueStudentIds.add(String(uid));
                });
            });

            const totalActive = coursesWithData.reduce((acc, c) => acc + c.activeStudents, 0);
            const totalPending = coursesWithData.reduce((acc, c) => acc + c.pendingAssignments, 0);
            const todayPresent = coursesWithData.reduce((acc, c) => acc + c.presentCount, 0);
            const todayAbsent = coursesWithData.reduce((acc, c) => acc + c.absentCount, 0);

            console.log('[TeacherDashboard] Stats Calculated:', {
                courses: coursesWithData.length,
                uniqueStudents: uniqueStudentIds.size,
                active: totalActive,
                pending: totalPending
            });

            setSummaryStats({
                totalCourses: coursesWithData.length,
                totalStudents: uniqueStudentIds.size, // Use Unique Count
                activeStudents: totalActive,
                pendingAssignments: totalPending,
                todayPresent: todayPresent,
                todayAbsent: todayAbsent,
            });
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectCourse = (course) => {
        const studentsList = course.enrollments.map((e, idx) => ({
            id: e.user?._id || e.student?._id, // Support both student and user field
            _id: e.user?._id || e.student?._id,
            name: (e.user?.name || e.student?.name) || 'Unknown',
            rollNo: (e.user?.rollNo || e.student?.rollNo) || `STU-${String(idx + 1).padStart(3, '0')}`,
            email: (e.user?.email || e.student?.email) || '',
            photo: (e.user?.photo || e.student?.photo) || '',
            role: (e.user?.role || e.student?.role) || 'student',
            enrolledAt: e.enrolledAt
        }));

        setCourseStudents(studentsList);
        setSelectedCourse(course);

        // Default tab based on audience
        if (course.targetAudience === 'interns') {
            setActiveTab('daily_tasks');
        } else {
            setActiveTab('attendance');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-gray-600">Loading courses...</span>
            </div>
        );
    }

    if (!selectedCourse) {
        // Course Selection List
        return (
            <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
                        <p className="text-gray-500">Overview of your courses and student activity</p>
                    </div>
                    <button
                        onClick={() => setShowLiveClassModal(true)}
                        className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all duration-300 flex items-center gap-2 shadow-lg shadow-red-200"
                    >
                        <Video className="w-5 h-5" />
                        Start Live Class
                    </button>
                </div>

                {/* Active Live Classes Banner */}
                {activeLiveClasses.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-4 text-white"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                                <span className="font-bold">🔴 Live Class Active: {activeLiveClasses[0]?.title}</span>
                            </div>
                            <div className="flex gap-2">
                                <a
                                    href={activeLiveClasses[0]?.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-white text-red-600 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center gap-2"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Open
                                </a>
                                <button
                                    onClick={() => handleEndLiveClass(activeLiveClasses[0]?._id)}
                                    className="px-4 py-2 bg-red-700 text-white rounded-lg font-medium hover:bg-red-800 transition-colors flex items-center gap-2"
                                >
                                    <StopCircle className="w-4 h-4" />
                                    End Class
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <StatCard
                        title="Total Courses"
                        value={summaryStats.totalCourses}
                        icon={BookOpen}
                        iconBg="bg-blue-50"
                        iconColor="text-blue-600"
                    />
                    <StatCard
                        title="Total Students"
                        value={summaryStats.totalStudents}
                        icon={Users}
                        iconBg="bg-indigo-50"
                        iconColor="text-indigo-600"
                    />
                    <StatCard
                        title="Active Now"
                        value={summaryStats.activeStudents}
                        icon={CheckCircle}
                        iconBg="bg-emerald-50"
                        iconColor="text-emerald-600"
                    />
                    <StatCard
                        title="Pending Gradings"
                        value={summaryStats.pendingAssignments}
                        icon={FileText}
                        iconBg="bg-amber-50"
                        iconColor="text-amber-600"
                    />
                    <StatCard
                        title="Today's Present"
                        value={summaryStats.todayPresent}
                        icon={User}
                        iconBg="bg-emerald-50"
                        iconColor="text-emerald-700"
                    />
                    <StatCard
                        title="Today's Absent"
                        value={summaryStats.todayAbsent}
                        icon={X}
                        iconBg="bg-red-50"
                        iconColor="text-red-600"
                    />
                </div>

                {/* Filters and Search */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between z-50 relative">
                    <div className="flex-1 w-full relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search courses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="w-full md:w-48">
                            <Select
                                options={CITY_OPTIONS}
                                isMulti
                                value={selectedCities}
                                onChange={setSelectedCities}
                                placeholder="Filter by City"
                                className="react-select-container"
                                classNamePrefix="react-select"
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        borderRadius: '0.75rem',
                                        backgroundColor: '#f9fafb',
                                        borderColor: '#e5e7eb',
                                    })
                                }}
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <Select
                                options={TYPE_OPTIONS}
                                isMulti
                                value={selectedTypes}
                                onChange={setSelectedTypes}
                                placeholder="Filter by Type"
                                className="react-select-container"
                                classNamePrefix="react-select"
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        borderRadius: '0.75rem',
                                        backgroundColor: '#f9fafb',
                                        borderColor: '#e5e7eb',
                                    })
                                }}
                            />
                        </div>
                    </div>
                </div>

                {filteredCourses.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No courses match your filters</p>
                        {(searchQuery || selectedCities.length > 0 || selectedTypes.length > 0) && (
                            <button
                                onClick={() => { setSearchQuery(''); setSelectedCities([]); setSelectedTypes([]); }}
                                className="mt-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredCourses.map((course, index) => {
                            const CourseIcon = getCourseIcon(course.category, course.name);
                            const courseStyle = getCourseStyle(course.category, course.name);

                            return (
                                <motion.div
                                    key={course.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => handleSelectCourse(course)}
                                    className="bg-white rounded-3xl p-6 border border-gray-100 cursor-pointer hover:shadow-xl hover:border-emerald-200 transition-all group overflow-hidden relative"
                                >
                                    <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full -mr-16 -mt-16 transition-colors ${courseStyle.bg}`} />

                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-6">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${courseStyle.gradient} shadow-lg shadow-emerald-900/10`}>
                                                <CourseIcon className="w-7 h-7 text-white" />
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <Badge variant={course.status === 'active' ? 'success' : 'warning'}>
                                                    {course.status.toUpperCase()}
                                                </Badge>
                                                <span className={`text-[10px] px-2 py-1 rounded-lg font-black uppercase tracking-widest ${course.targetAudience === 'interns'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {course.targetAudience === 'interns' ? 'Internship' : 'Regular Course'}
                                                </span>
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight group-hover:text-emerald-700 transition-colors line-clamp-1">{course.name}</h3>

                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 text-sm text-gray-500 font-bold">
                                                    <Users className="w-4 h-4 text-gray-400" />
                                                    <span>{course.internCount} Total</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-emerald-600 font-bold">
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span>{course.activeStudents} Active</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-amber-600 font-bold">
                                                    <FileText className="w-4 h-4" />
                                                    <span>{course.pendingAssignments} Pending Tasks</span>
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">Today's Attendance</p>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xs font-bold text-gray-500">Present</span>
                                                    <span className="text-sm font-black text-emerald-600">{course.presentCount}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-gray-500">Absent</span>
                                                    <span className="text-sm font-black text-red-500">{course.absentCount}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {course.city || course.location}
                                            </div>
                                            <div className="flex items-center text-emerald-600 font-black text-xs uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                                <span>Manage Portal</span>
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Live Class Modal */}
            {showLiveClassModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl p-6 w-full max-w-md"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Video className="w-6 h-6 text-red-500" />
                                Start Live Class
                            </h3>
                            <button
                                onClick={() => setShowLiveClassModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateLiveClass} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Class Title *
                                </label>
                                <input
                                    type="text"
                                    value={liveClassForm.title}
                                    onChange={(e) => setLiveClassForm({ ...liveClassForm, title: e.target.value })}
                                    placeholder="e.g., Web Development Live Session"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Live Class Link *
                                </label>
                                <input
                                    type="url"
                                    value={liveClassForm.link}
                                    onChange={(e) => setLiveClassForm({ ...liveClassForm, link: e.target.value })}
                                    placeholder="https://meet.google.com/... or Zoom link"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description (Optional)
                                </label>
                                <textarea
                                    value={liveClassForm.description}
                                    onChange={(e) => setLiveClassForm({ ...liveClassForm, description: e.target.value })}
                                    placeholder="Brief description about the class..."
                                    rows={2}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Show to *
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { value: 'all', label: 'All' },
                                        { value: 'student', label: 'Students Only' },
                                        { value: 'intern', label: 'Interns Only' }
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setLiveClassForm({ ...liveClassForm, visibility: opt.value })}
                                            className={`px-4 py-3 rounded-xl font-medium transition-all ${
                                                liveClassForm.visibility === opt.value
                                                    ? 'bg-emerald-500 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowLiveClassModal(false)}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingLiveClass}
                                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isCreatingLiveClass ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Video className="w-5 h-5" />
                                    )}
                                    {isCreatingLiveClass ? 'Starting...' : 'Start Live Class'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
            </>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <button
                        onClick={() => { setSelectedCourse(null); }}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-2"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to Courses
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">{selectedCourse.name || 'Course Management'}</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${selectedCourse.targetAudience === 'interns'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                            }`}>
                            Manage {selectedCourse.targetAudience}
                        </span>
                        <span className="text-gray-500 text-sm">{courseStudents.length} students enrolled</span>
                    </div>
                </div>
            </div>

            {/* Tab Navigation (Unified for both Students and Interns) */}
            <div className="space-y-6">
                <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto max-w-full">
                    <button
                        onClick={() => setActiveTab('daily_tasks')}
                        className={`px-6 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'daily_tasks'
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <ClipboardList className="w-4 h-4 inline mr-2" />
                        {selectedCourse.targetAudience === 'interns' ? 'Daily Tasks' : 'Class Logs'}
                    </button>
                    <button
                        onClick={() => setActiveTab('assignments')}
                        className={`px-6 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'assignments'
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <FileText className="w-4 h-4 inline mr-2" />
                        Assignments
                    </button>
                    <button
                        onClick={() => setActiveTab('attendance')}
                        className={`px-6 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'attendance'
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <Clock className="w-4 h-4 inline mr-2" />
                        Attendance
                    </button>
                    <button
                        onClick={() => setActiveTab('certificates')}
                        className={`px-6 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'certificates'
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <Award className="w-4 h-4 inline mr-2" />
                        Certificates
                    </button>
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 min-h-[400px]">
                    {activeTab === 'daily_tasks' && <DailyTasksTab course={selectedCourse} />}
                    {activeTab === 'assignments' && <AssignmentsTab course={selectedCourse} students={courseStudents} />}
                    {activeTab === 'attendance' && <AttendanceTab course={selectedCourse} students={courseStudents} />}
                    {activeTab === 'certificates' && <CertificatesTab course={selectedCourse} students={courseStudents} />}
                </div>
            </div>
        </div>
    );
};

export default TeacherCourses;
