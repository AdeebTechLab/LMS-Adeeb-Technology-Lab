import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import {
    BookOpen, Users, Calendar, ArrowRight, ChevronLeft,
    FileText, ClipboardList, CheckCircle, Clock, Loader2, User, Search, Filter, MessageCircle
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { courseAPI, enrollmentAPI, chatAPI, assignmentAPI } from '../../services/api';

const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return rawUrl.replace('/api', '');
};

const SOCKET_URL = getSocketURL();
import { getCourseIcon, getCourseStyle } from '../../utils/courseIcons';

// Tab Components
import AttendanceTab from './components/AttendanceTab';
import DailyTasksTab from './components/DailyTasksTab';
import AssignmentsTab from './components/AssignmentsTab';
import TeacherChatTab from './components/TeacherChatTab';

const AttendanceSheet = () => {
    const { id: routeCourseId } = useParams();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [activeTab, setActiveTab] = useState('daily_tasks'); // assignments | daily_tasks | attendance
    const [isLoading, setIsLoading] = useState(true);
    const [myCourses, setMyCourses] = useState([]);
    const [courseStudents, setCourseStudents] = useState([]);
    const [filteredCourses, setFilteredCourses] = useState([]); // Filtered list

    // Filter States
    // Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCities, setSelectedCities] = useState([]); // Array of strings
    const [selectedTypes, setSelectedTypes] = useState([]);   // Array of strings
    const [chatUnreadCount, setChatUnreadCount] = useState(0);
    // Load submission notifications from localStorage
    const [submissionNotifications, setSubmissionNotifications] = useState(() => {
        try {
            const saved = localStorage.getItem('teacher_submission_notifications');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });
    const socketRef = useRef();
    const activeTabRef = useRef(activeTab);

    // Keep ref in sync with activeTab
    useEffect(() => {
        activeTabRef.current = activeTab;
        // When entering chat tab, refresh unread count after a short delay
        // to allow messages to be marked as read
        if (activeTab === 'chat') {
            // Don't immediately set to 0, let the chat component mark messages as read
            // and then refresh the count
        }
    }, [activeTab]);

    // Persist submission notifications to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('teacher_submission_notifications', JSON.stringify(submissionNotifications));
        } catch (e) {
            console.error('Failed to save notifications:', e);
        }
    }, [submissionNotifications]);

    // Fetch chat unread count function
    const fetchChatUnreadCount = async () => {
        try {
            const res = await chatAPI.getTeacherCourses();
            const courses = res.data.data || [];
            const totalUnread = courses.reduce((sum, c) => sum + (c.totalUnread || 0), 0);
            setChatUnreadCount(totalUnread);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    // Fetch unread count and setup socket
    useEffect(() => {
        fetchChatUnreadCount();

        socketRef.current = io(SOCKET_URL, { withCredentials: true });
        const myId = user?.id || user?._id;
        if (myId) {
            const roomId = String(myId);
            socketRef.current.emit('join_chat', roomId);
            console.log('🔌 Teacher joined socket room:', roomId);
        }

        socketRef.current.on('connect', () => {
            console.log('✅ Socket connected, ID:', socketRef.current.id);
            // Re-join room on reconnect
            const myId = user?.id || user?._id;
            if (myId) {
                socketRef.current.emit('join_chat', String(myId));
            }
        });

        socketRef.current.on('new_global_message', (data) => {
            if (data.course || data.courseId) {
                const senderId = String(data.senderId || data.sender?._id || data.sender);
                const myIdStr = String(user?.id || user?._id);
                if (senderId !== myIdStr && activeTabRef.current !== 'chat') {
                    setChatUnreadCount(prev => prev + 1);
                }
            }
        });

        // Listen for new assignment submissions
        socketRef.current.on('new_submission', (data) => {
            console.log('📥 Received new_submission event:', data);
            if (data.courseId) {
                const courseIdStr = String(data.courseId);
                console.log('📌 Adding notification for course:', courseIdStr);
                setSubmissionNotifications(prev => {
                    const updated = {
                        ...prev,
                        [courseIdStr]: (prev[courseIdStr] || 0) + 1
                    };
                    console.log('📊 Updated notifications:', updated);
                    return updated;
                });
            }
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [user]);

    useEffect(() => {
        fetchMyCourses();
    }, []);

    // Handle deep linking when courses are loaded
    useEffect(() => {
        if (routeCourseId && myCourses.length > 0) {
            const course = myCourses.find(c => c.id.toString() === routeCourseId.toString());
            if (course && (!selectedCourse || selectedCourse.id !== course.id)) {
                handleSelectCourse(course, true); // true to skip navigation
            }
        }
    }, [routeCourseId, myCourses]);

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
            result = result.filter(course =>
                selectedCities.includes(course.city || course.location)
            );
        }

        // 3. Type Filter
        if (selectedTypes.length > 0) {
            result = result.filter(course =>
                selectedTypes.includes(course.targetAudience)
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

            // Filter courses where this teacher is assigned
            // Robust check: user object from login has 'id' not '_id'
            const teacherId = (user?.id || user?._id)?.toString();
            console.log('Logged in Teacher ID:', teacherId);

            const teacherCourses = allCourses.filter(c => {
                const isMatch = c.teachers?.some(t => {
                    const tId = (t._id || t)?.toString();
                    return tId === teacherId;
                });

                if (!isMatch) {
                    console.log(`Filtering out course: ${c.title}. Teachers IDs: ${c.teachers?.map(t => t._id || t).join(', ')}, Expected: ${teacherId}`);
                }
                return isMatch;
            });

            // Get enrollments to count students per course
            let enrollments = [];
            try {
                const enrollmentsRes = await enrollmentAPI.getAll();
                enrollments = enrollmentsRes.data.data || [];
            } catch (e) {
                console.error('Enrollment fetch failed:', e);
            }

            // Map courses with student counts and enrollment data
            const coursesWithData = teacherCourses.map(course => {
                const courseEnrollments = enrollments.filter(e => {
                    const eCourseId = (e.course?._id || e.course)?.toString();
                    return eCourseId === course._id.toString();
                });

                // FORCE FIX: Ensure 'Gen AI' is treated as Interns, but also respect DB targetAudience
                let audience = course.targetAudience || 'students';
                if (course.title && course.title.toLowerCase().includes('gen')) {
                    audience = 'interns';
                }

                return {
                    id: course._id,
                    _id: course._id, // Keep both for compatibility
                    name: course.title,
                    internCount: courseEnrollments.length,
                    startDate: course.startDate,
                    endDate: course.endDate,
                    status: course.isActive !== false ? 'active' : 'inactive',
                    location: course.location,
                    city: course.city,
                    duration: course.duration,
                    category: course.category,
                    targetAudience: audience,
                    enrollments: courseEnrollments,
                    bookLink: course.bookLink || '' // Add book link
                };
            });

            // Fetch assignment data for each course to get marks
            const coursesWithAssignmentData = await Promise.all(coursesWithData.map(async (courseData) => {
                try {
                    const assignmentsRes = await assignmentAPI.getByCourse(courseData.id);
                    const assignments = assignmentsRes.data.assignments || [];
                    
                    // Calculate assignment stats
                    let totalSubmissions = 0;
                    let gradedSubmissions = 0;
                    let totalMarks = 0;
                    let totalPossibleMarks = 0;
                    
                    assignments.forEach(a => {
                        const submissions = a.submissions || [];
                        totalSubmissions += submissions.length;
                        submissions.forEach(s => {
                            if (s.marks !== undefined && s.marks !== null) {
                                gradedSubmissions++;
                                totalMarks += s.marks;
                                totalPossibleMarks += (a.totalMarks || 100);
                            }
                        });
                    });
                    
                    const avgPercentage = totalPossibleMarks > 0 
                        ? Math.round((totalMarks / totalPossibleMarks) * 100) 
                        : 0;
                    
                    return {
                        ...courseData,
                        assignmentStats: {
                            totalAssignments: assignments.length,
                            totalSubmissions,
                            gradedSubmissions,
                            avgPercentage,
                            pendingGrading: totalSubmissions - gradedSubmissions
                        }
                    };
                } catch (e) {
                    return { ...courseData, assignmentStats: null };
                }
            }));

            console.log('Courses loaded:', coursesWithAssignmentData);
            setMyCourses(coursesWithAssignmentData);
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectCourse = (course, skipNavigation = false) => {
        // Filter out students who are inactive (unverified first payment or overdue installments)
        // ALSO filter out students who have completed the course (assigned certificate)
        const activeEnrollments = course.enrollments.filter(e => e.isActive && e.status !== 'completed');

        const studentsList = activeEnrollments.map((e, idx) => ({
            id: e.user?._id || e.user, // IMPORTANT: Repair script used 'user' field
            _id: e.user?._id || e.user,
            name: e.user?.name || 'Enrolled Student',
            rollNo: e.user?.rollNo || `STU-${String(idx + 1).padStart(3, '0')}`,
            email: e.user?.email || '',
            photo: e.user?.photo || '',
            role: e.user?.role || 'intern',
            enrolledAt: e.enrolledAt
        }));

        console.log('Selected course eligible students:', studentsList);
        setCourseStudents(studentsList);
        setSelectedCourse(course);

        // Clear submission notifications for this course (use string for consistent matching)
        const courseId = String(course.id || course._id);
        setSubmissionNotifications(prev => {
            const updated = { ...prev };
            delete updated[courseId];
            return updated;
        });

        // Update URL if not already there
        if (!skipNavigation) {
            navigate(`/teacher/course/${course.id}`);
        }

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
                <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
                    <span className="text-gray-600">Loading Dashboard...</span>
                </div>
            </div>
        );
    }

    if (!selectedCourse) {
        // Course Selection List
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Attendance & Logs</h1>
                        <p className="text-gray-500">Manage your students, assignments and daily tasks</p>
                    </div>
                </div>

                {/* Filters and Search */}
                {/* Filters and Search */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col xl:flex-row gap-4">
                    <div className="flex-1 flex items-center bg-gray-50 rounded-xl px-4 py-3">
                        <Search className="w-5 h-5 text-gray-400 mr-3" />
                        <input
                            type="text"
                            placeholder="Search courses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none outline-none w-full text-gray-700 placeholder-gray-400"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* City Filters */}
                        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl">
                            {['Bahawalpur', 'Islamabad'].map((city) => (
                                <button
                                    key={city}
                                    onClick={() => {
                                        setSelectedCities(prev =>
                                            prev.includes(city)
                                                ? prev.filter(c => c !== city)
                                                : [...prev, city]
                                        );
                                    }}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${selectedCities.includes(city)
                                        ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                        }`}
                                >
                                    {city}
                                </button>
                            ))}
                        </div>

                        {/* Type Filters */}
                        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl">
                            {[
                                { id: 'students', label: 'Student' },
                                { id: 'interns', label: 'Intern' }
                            ].map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() => {
                                        setSelectedTypes(prev =>
                                            prev.includes(type.id)
                                                ? prev.filter(t => t !== type.id)
                                                : [...prev, type.id]
                                        );
                                    }}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${selectedTypes.includes(type.id)
                                        ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                        }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {filteredCourses.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">No courses match your filters</p>
                        {(searchQuery || selectedCities.length > 0 || selectedTypes.length > 0) ? (
                            <button
                                onClick={() => { setSearchQuery(''); setSelectedCities([]); setSelectedTypes([]); }}
                                className="mt-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                            >
                                Clear all filters
                            </button>
                        ) : (
                            <p className="text-sm text-gray-400 mt-1">Please contact Admin to assign courses to your account.</p>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredCourses.map((course, index) => {
                            const CourseIcon = getCourseIcon(course.category, course.name);
                            const courseStyle = getCourseStyle(course.category, course.name);
                            // Ensure courseId is a string for consistent matching with socket events
                            const courseId = String(course.id || course._id);
                            const notificationCount = submissionNotifications[courseId] || 0;

                            return (
                                <motion.div
                                    key={course.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => handleSelectCourse(course)}
                                    className="bg-white rounded-2xl p-6 border border-gray-100 cursor-pointer hover:shadow-lg hover:border-emerald-200 transition-all group relative"
                                >
                                    {/* Pending (ungraded) Submission Count Badge */}
                                    {course.assignmentStats?.pendingGrading > 0 && (
                                        <div className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                                            {course.assignmentStats.pendingGrading > 99 ? '99+' : course.assignmentStats.pendingGrading}
                                        </div>
                                    )}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br ${courseStyle.gradient}`}>
                                            <CourseIcon className="w-7 h-7 text-white" />
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <Badge variant={course.status === 'active' ? 'success' : 'warning'}>
                                                {course.status}
                                            </Badge>
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${course.targetAudience === 'interns'
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {course.targetAudience === 'interns' ? 'Internship' : 'Student'}
                                            </span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors uppercase">{course.name}</h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3 font-medium">
                                        <span className="flex items-center gap-1.5">
                                            <Users className="w-4 h-4 text-gray-400" />
                                            {course.internCount} Registered
                                        </span>
                                        {(course.city || course.location) && (
                                            <span className="flex items-center gap-1.5 uppercase">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {course.city || course.location}
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Assignment Stats */}
                                    {course.assignmentStats && course.assignmentStats.totalAssignments > 0 && (
                                        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-3 mb-4 border border-emerald-100/50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-emerald-600" />
                                                    <span className="text-xs font-bold text-gray-700">
                                                        {course.assignmentStats.totalAssignments} Assignment{course.assignmentStats.totalAssignments > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {course.assignmentStats.gradedSubmissions > 0 && (
                                                        <div className="flex items-center gap-1">
                                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                                            <span className="text-xs font-bold text-emerald-600">
                                                                Avg: {course.assignmentStats.avgPercentage}%
                                                            </span>
                                                        </div>
                                                    )}
                                                    {course.assignmentStats.pendingGrading > 0 && (
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                                                            <span className="text-xs font-bold text-amber-600">
                                                                {course.assignmentStats.pendingGrading} to grade
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-2 text-[10px] text-gray-500 font-medium">
                                                {course.assignmentStats.totalSubmissions} submission{course.assignmentStats.totalSubmissions !== 1 ? 's' : ''} • {course.assignmentStats.gradedSubmissions} graded
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center text-emerald-600 font-bold text-sm">
                                        <span>OPEN DASHBOARD</span>
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <button
                        onClick={() => {
                            setSelectedCourse(null);
                            navigate('/teacher/attendance');
                        }}
                        className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-2 font-bold text-sm tracking-wide"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        BACK TO ALL COURSES
                    </button>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">{selectedCourse.name || 'Course Dashboard'}</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${selectedCourse.targetAudience === 'interns'
                            ? 'bg-purple-600 text-white'
                            : 'bg-emerald-600 text-white'
                            }`}>
                            {selectedCourse.targetAudience} Portal
                        </span>
                        <span className="text-gray-500 text-sm font-semibold italic">{courseStudents.length} Students Active</span>
                    </div>
                </div>
                {/* Book Button */}
                {selectedCourse.bookLink && (
                    <a
                        href={selectedCourse.bookLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl transition-all font-bold text-sm uppercase tracking-wide active:scale-95"
                    >
                        <BookOpen className="w-5 h-5" />
                        Course Book
                    </a>
                )}
            </div>

            {/* Course Content: Multi-Tab */}
            <div className="space-y-6">
                {/* Tab Navigation */}
                <div className="flex gap-2 bg-gray-100/80 p-1.5 rounded-2xl w-fit border border-gray-200">
                    <button
                        onClick={() => setActiveTab('daily_tasks')}
                        className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'daily_tasks'
                            ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100'
                            : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                            }`}
                    >
                        <ClipboardList className="w-4 h-4" />
                        {selectedCourse.targetAudience === 'interns' ? 'Daily Tasks' : 'Class Logs'}
                    </button>
                    <button
                        onClick={() => setActiveTab('assignments')}
                        className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'assignments'
                            ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100'
                            : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        Assignments
                    </button>
                    <button
                        onClick={() => setActiveTab('attendance')}
                        className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'attendance'
                            ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100'
                            : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                            }`}
                    >
                        <Clock className="w-4 h-4" />
                        Attendance
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 relative ${activeTab === 'chat'
                            ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100'
                            : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                            }`}
                    >
                        <MessageCircle className="w-4 h-4" />
                        Chat
                        {chatUnreadCount > 0 && activeTab !== 'chat' && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                                {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/50 min-h-[500px]">
                    {activeTab === 'daily_tasks' && (
                        <DailyTasksTab course={selectedCourse} students={courseStudents} />
                    )}
                    {activeTab === 'assignments' && (
                        <AssignmentsTab course={selectedCourse} students={courseStudents} />
                    )}
                    {activeTab === 'attendance' && (
                        <AttendanceTab course={selectedCourse} students={courseStudents} />
                    )}
                    {activeTab === 'chat' && (
                        <TeacherChatTab course={selectedCourse} students={courseStudents} onUnreadCountChange={fetchChatUnreadCount} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttendanceSheet;
