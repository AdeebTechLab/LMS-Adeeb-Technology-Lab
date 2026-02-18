import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    CheckCircle, Clock, Calendar, Search, Filter, AlertCircle, XCircle, ChevronLeft, ChevronRight,
    BookOpen, GraduationCap, ArrowRight, ExternalLink, Send, FileText, ClipboardList, Plus, Loader2, Link as LinkIcon, MessageCircle, CalendarCheck
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { assignmentAPI, courseAPI, dailyTaskAPI, enrollmentAPI, chatAPI, feeAPI } from '../../services/api';
import StudentChatTab from './components/StudentChatTab';
import { io } from 'socket.io-client';

const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return rawUrl.replace('/api', '');
};

const SOCKET_URL = getSocketURL();

// Portal for submissions and work logs
const AssignmentSubmission = () => {
    const { user } = useSelector((state) => state.auth);
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [assignments, setAssignments] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [submissionUrl, setSubmissionUrl] = useState('');
    const [submissionText, setSubmissionText] = useState('');

    // Tabs for Interns
    const [activeTab, setActiveTab] = useState(location.state?.tab || 'assignments'); // assignments | daily_tasks
    const [myCourses, setMyCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [enrollments, setEnrollments] = useState([]);
    const [selectedEnrollment, setSelectedEnrollment] = useState(null);
    const [dailyTasks, setDailyTasks] = useState([]);
    const [newTaskContent, setNewTaskContent] = useState('');
    const [resubmittingTaskId, setResubmittingTaskId] = useState(null);
    const [chatUnreadCount, setChatUnreadCount] = useState(0);
    const [feeOverdue, setFeeOverdue] = useState({ hasOverdue: false, overdueInstallment: null });
    const socketRef = useRef();
    const activeTabRef = useRef(activeTab);

    // Keep ref in sync with activeTab
    useEffect(() => {
        activeTabRef.current = activeTab;
        // Clear unread when switching to chat tab
        if (activeTab === 'chat') {
            setChatUnreadCount(0);
        }
    }, [activeTab]);

    // Fetch initial unread count and setup socket
    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                const res = await chatAPI.getStudentCourses();
                const courses = res.data.data || [];
                const totalUnread = courses.reduce((sum, c) => sum + (c.totalUnread || 0), 0);
                setChatUnreadCount(totalUnread);
            } catch (error) {
                console.error('Error fetching unread count:', error);
            }
        };

        fetchUnreadCount();

        // Setup socket for real-time notifications
        socketRef.current = io(SOCKET_URL, { withCredentials: true });
        const myId = user?.id || user?._id;
        if (myId) {
            socketRef.current.emit('join_chat', myId);
        }

        socketRef.current.on('new_global_message', (data) => {
            // Only count if it's a course message and we're not on chat tab
            if (data.course || data.courseId) {
                const senderId = String(data.senderId || data.sender?._id || data.sender);
                const myIdStr = String(user?.id || user?._id);
                // If message is from someone else (teacher sending to us)
                if (senderId !== myIdStr && activeTabRef.current !== 'chat') {
                    setChatUnreadCount(prev => prev + 1);
                }
            }
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [user]);

    useEffect(() => {
        // Restore tab and selected course from location state or localStorage
        const savedTab = location.state?.tab || localStorage.getItem('submission_activeTab');
        const savedCourse = location.state?.courseId || localStorage.getItem('submission_selectedCourse');
        if (savedTab) setActiveTab(savedTab);
        if (savedCourse) setSelectedCourseId(savedCourse);
    }, [location.state]);

    useEffect(() => {
        if (activeTab === 'assignments') {
            fetchAssignments();
        } else {
            fetchInternData();
        }
    }, [activeTab]);

    const fetchInternData = async () => {
        setIsLoading(true);
        try {
            const enrollRes = await enrollmentAPI.getMy();
            const myEnrollments = enrollRes.data.data || [];
            setEnrollments(myEnrollments);

            const internCourses = myEnrollments
                .map(e => ({
                    ...e.course,
                    isActive: e.isActive,
                    isFirstMonthVerified: e.installments?.[0]?.status === 'verified',
                    isCompleted: e.status === 'completed',
                    enrollment: e
                }))
                .filter(c => !!c._id); // Ensure course exists

            setMyCourses(internCourses);

            // Validate selectedCourseId against enrolled courses
            let validCourseId = selectedCourseId;
            if (selectedCourseId) {
                // Check if the selected course is in the user's enrolled courses
                const isValidCourse = internCourses.some(c => c._id === selectedCourseId);
                if (!isValidCourse) {
                    console.log('Selected course not found in enrollments, resetting...');
                    validCourseId = null;
                    localStorage.removeItem('submission_selectedCourse');
                }
            }

            if (validCourseId) {
                const enroll = myEnrollments.find(e => (e.course?._id || e.course) === validCourseId);
                setSelectedEnrollment(enroll);
                fetchDailyTasks(validCourseId);
            } else if (internCourses.length > 0) {
                // Find first "active" or just first one
                const firstAvailable = internCourses.find(c => c.isActive) || internCourses[0];
                setSelectedCourseId(firstAvailable._id);
                setSelectedEnrollment(firstAvailable.enrollment);
                if (firstAvailable.isActive) {
                    fetchDailyTasks(firstAvailable._id);
                }
            }
        } catch (error) {
            console.error('Error fetching intern courses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDailyTasks = async (courseId) => {
        try {
            const res = await dailyTaskAPI.getMy(courseId);
            const serverTasks = res.data.data || [];

            // Merge with any locally cached pending tasks to avoid vanishing entries
            try {
                const key = `dailyTasks_cache_${courseId}`;
                const cached = JSON.parse(localStorage.getItem(key) || '[]');
                // Keep cached tasks that are not present on server (by _id)
                const merged = [
                    ...serverTasks,
                    ...cached.filter(ct => !serverTasks.find(st => String(st._id) === String(ct._id)))
                ];
                setDailyTasks(merged);
            } catch (e) {
                setDailyTasks(serverTasks);
            }
        } catch (error) {
            console.error('Error fetching daily tasks:', error);
        }
    };

    const handleCourseChange = (courseId) => {
        setSelectedCourseId(courseId);
        fetchDailyTasks(courseId);
        checkFeeStatus(courseId);
    };

    // Check fee status for selected course
    const checkFeeStatus = async (courseId) => {
        if (!courseId) return;
        try {
            const res = await feeAPI.checkStatus(courseId);
            setFeeOverdue({
                hasOverdue: res.data.hasOverdue || false,
                overdueInstallment: res.data.overdueInstallment || null
            });
        } catch (error) {
            console.error('Error checking fee status:', error);
            setFeeOverdue({ hasOverdue: false, overdueInstallment: null });
        }
    };

    // Check fee status when course is selected
    useEffect(() => {
        if (selectedCourseId) {
            checkFeeStatus(selectedCourseId);
        }
    }, [selectedCourseId]);

    // Cleanup cached items that exist on server after fetching
    useEffect(() => {
        if (!selectedCourseId) return;
        try {
            const key = `dailyTasks_cache_${selectedCourseId}`;
            const cached = JSON.parse(localStorage.getItem(key) || '[]');
            if (!cached.length) return;
            // When dailyTasks updates from server, remove cached entries that now exist on server
            const toKeep = cached.filter(c => !dailyTasks.find(s => String(s._id) === String(c._id)));
            if (toKeep.length !== cached.length) {
                localStorage.setItem(key, JSON.stringify(toKeep));
            }
        } catch (e) { }
    }, [dailyTasks, selectedCourseId]);

    // Persist selected course and active tab to localStorage so view survives refresh
    useEffect(() => {
        try {
            if (activeTab) localStorage.setItem('submission_activeTab', activeTab);
            if (selectedCourseId) localStorage.setItem('submission_selectedCourse', selectedCourseId);
        } catch (e) { }
    }, [activeTab, selectedCourseId]);

    // New state for work link
    const [newTaskLink, setNewTaskLink] = useState('');

    const handleSubmitDailyTask = async (e) => {
        e.preventDefault();
        if (!newTaskContent.trim() || !selectedCourseId) return;

        // Validate that the selected course is in user's enrollments
        const enroll = enrollments.find(e => (e.course?._id || e.course) === selectedCourseId);
        if (!enroll) {
            alert('Invalid course selected. Please refresh the page and try again.');
            localStorage.removeItem('submission_selectedCourse');
            return;
        }

        // Check restriction using fee status from API
        if (feeOverdue.hasOverdue) {
            alert(`You have an overdue fee payment (Installment #${feeOverdue.overdueInstallment?.installmentNumber || '?'}, ${feeOverdue.overdueInstallment?.daysPastDue || 0} days overdue). Please pay your installment to submit daily tasks.`);
            return;
        }

        // Check first payment verification
        const isBlocked = enroll.installments?.[0]?.status !== 'verified';

        if (isBlocked) {
            alert('Access to this course is blocked until your first payment is verified.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await dailyTaskAPI.submit({
                courseId: selectedCourseId,
                content: newTaskContent,
                workLink: newTaskLink,
                taskId: resubmittingTaskId
            });
            // ... (rest of logic same)

            if (resubmittingTaskId) {
                setDailyTasks(prev => prev.map(t => t._id === resubmittingTaskId ? res.data.data : t));
                setResubmittingTaskId(null);
            } else {
                setDailyTasks([res.data.data, ...dailyTasks]);
            }

            // Ensure server-sourced data is used on next reload
            try { await fetchDailyTasks(selectedCourseId); } catch (e) { }

            // Cache the submitted task locally so it remains visible after refresh
            try {
                const key = `dailyTasks_cache_${selectedCourseId}`;
                const cached = JSON.parse(localStorage.getItem(key) || '[]');
                const newTask = res.data.data;
                // Replace if exists or prepend
                const updated = [newTask, ...cached.filter(t => String(t._id) !== String(newTask._id))];
                localStorage.setItem(key, JSON.stringify(updated));
            } catch (e) { console.error('Cache save failed', e); }

            setNewTaskContent('');
            setNewTaskLink('');
            alert(`Daily task log ${resubmittingTaskId ? 'updated' : 'submitted'} successfully!`);
        } catch (error) {
            console.error('Error submitting daily task:', error);
            alert('Failed to submit daily task');
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchAssignments = async () => {
        setIsLoading(true);
        try {
            const response = await assignmentAPI.getMy();
            const data = response.data.assignments || [];

            // Transform assignments to include user's submission status
            const transformedAssignments = data.map(assignment => {
                const mySubmission = assignment.submissions?.find(
                    s => (s.user?._id || s.user) === (user?._id || user?.id)
                );

                let status = 'pending';
                if (mySubmission) {
                    if (mySubmission.status === 'rejected') {
                        status = 'rejected';
                    } else if (mySubmission.marks !== undefined && mySubmission.marks !== null) {
                        status = 'graded';
                    } else {
                        status = 'submitted';
                    }
                } else if (new Date(assignment.dueDate) < new Date()) {
                    status = 'overdue';
                }

                return {
                    id: assignment._id,
                    _id: assignment._id,
                    createdAt: assignment.createdAt, // Keep for sorting
                    courseId: assignment.course?._id || assignment.course,
                    title: assignment.title,
                    course: assignment.course?.title || 'Course',
                    description: assignment.description,
                    deadline: assignment.dueDate,
                    status,
                    submittedAt: mySubmission?.submittedAt || null,
                    submissionLink: mySubmission?.fileUrl || null,
                    grade: mySubmission?.marks ?? null, // Use ?? to allow 0
                    totalMarks: assignment.totalMarks || 100,
                    feedback: mySubmission?.feedback || null,
                    notes: mySubmission?.notes || null
                };
            });

            // Sort by createdAt descending (Newest first)
            setAssignments(transformedAssignments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));

            // Fetch enrollments to get course IDs and active status
            const enrollRes = await enrollmentAPI.getMy();
            const myEnrollments = enrollRes.data.data || [];
            setEnrollments(myEnrollments);

            const enrolledCourses = myEnrollments.map(e => ({
                ...e.course,
                isActive: e.isActive,
                isFirstMonthVerified: e.installments?.[0]?.status === 'verified',
                isCompleted: e.status === 'completed',
                enrollment: e
            })).filter(c => !!c && !!c._id);

            setMyCourses(enrolledCourses);

            // Validate selectedCourseId - if it doesn't match any enrolled course, reset it
            if (selectedCourseId) {
                const isValidCourse = enrolledCourses.some(c => c._id === selectedCourseId);
                if (isValidCourse) {
                    const enroll = myEnrollments.find(e => (e.course?._id || e.course) === selectedCourseId);
                    setSelectedEnrollment(enroll);
                } else {
                    // Invalid course ID, clear it
                    console.log('Invalid selectedCourseId in assignments, clearing...');
                    setSelectedCourseId('');
                    localStorage.removeItem('submission_selectedCourse');
                }
            }

        } catch (error) {
            console.error('Error fetching assignments:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCourseSelect = (courseId) => {
        const enroll = enrollments.find(e => (e.course?._id || e.course) === courseId);
        const isFirstPaid = enroll?.installments?.[0]?.status === 'verified';

        if (!isFirstPaid) {
            alert('Your enrollment for this course is pending fee verification. Please ensure your first month\'s fee is paid and verified.');
            return;
        }

        setSelectedCourseId(courseId);
        setSelectedEnrollment(enroll);
        if (activeTab === 'daily_tasks') {
            fetchDailyTasks(courseId);
        }
    };

    // Filter assignments by course if one is selected
    const filteredAssignments = selectedCourseId
        ? assignments.filter(a => a.courseId === selectedCourseId)
        : assignments;

    const getStatusConfig = (status, deadline) => {
        const isOverdue = new Date(deadline) < new Date() && status === 'pending';
        if (isOverdue) {
            return { variant: 'error', icon: AlertCircle, label: 'Overdue', color: 'text-red-600' };
        }
        switch (status) {
            case 'submitted':
                return { variant: 'info', icon: Clock, label: 'Submitted', color: 'text-blue-600' };
            case 'graded':
                return { variant: 'success', icon: CheckCircle, label: 'Graded', color: 'text-emerald-600' };
            case 'overdue':
                return { variant: 'error', icon: AlertCircle, label: 'Overdue', color: 'text-red-600' };
            case 'rejected':
                return { variant: 'error', icon: XCircle, label: 'Rejected', color: 'text-red-600' };
            default:
                return { variant: 'warning', icon: Clock, label: 'Pending', color: 'text-amber-600' };
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTimeRemaining = (deadline) => {
        const now = new Date();
        const due = new Date(deadline);
        const diff = due - now;

        if (diff < 0) return 'Overdue';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days} days, ${hours} hours left`;
        if (hours > 0) return `${hours} hours left`;
        return 'Due soon';
    };

    const handleSubmit = async (assignmentId) => {
        // Check for overdue fee payment
        if (feeOverdue.hasOverdue) {
            alert(`You have an overdue fee payment (Installment #${feeOverdue.overdueInstallment?.installmentNumber || '?'}, ${feeOverdue.overdueInstallment?.daysPastDue || 0} days overdue). Please pay your installment to submit assignments.`);
            return;
        }

        if (!submissionUrl && !submissionText) {
            alert('Please provide a submission URL or notes');
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            if (submissionUrl) {
                formData.append('fileUrl', submissionUrl);
            }
            if (submissionText) {
                formData.append('notes', submissionText);
            }

            await assignmentAPI.submit(assignmentId, formData);

            // Update local state
            setAssignments(prev => prev.map(a =>
                a.id === assignmentId
                    ? { ...a, status: 'submitted', submittedAt: new Date().toISOString(), submissionLink: submissionUrl }
                    : a
            ));

            setSelectedAssignment(null);
            setSubmissionUrl('');
            setSubmissionText('');
        } catch (error) {
            console.error('Error submitting assignment:', error);
            alert(error.response?.data?.message || 'Failed to submit assignment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isDeadlinePassed = (deadline) => {
        return new Date(deadline) < new Date();
    };

    if (isLoading && activeTab === 'assignments') {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-gray-600">Loading details...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Course Selection View - shows when no course is selected */}
            {!selectedCourseId ? (
                <>
                    {/* Header for Course Selection */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Submission Portal</h1>
                            <p className="text-gray-500">Submit your work and view teacher feedback</p>
                        </div>
                    </div>

                    {/* COURSE DISCOVERY VIEW */}
                    <div className="space-y-6">
                        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center mb-8">
                            <GraduationCap className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Your Registered Courses</h2>
                            <p className="text-gray-500 font-medium max-w-md mx-auto">Select a course to view its specific assignments, daily work logs and track your progress.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {myCourses.map((course, idx) => {
                                const isRestricted = !course.isActive;
                                const isFirstPaid = course.enrollment?.installments?.[0]?.status === 'verified' || course.isFirstMonthVerified;
                                const isBlocked = !isFirstPaid;

                                return (
                                    <motion.div
                                        key={course._id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        onClick={() => handleCourseSelect(course._id)}
                                        className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-2xl hover:border-emerald-200 transition-all cursor-pointer group relative overflow-hidden flex flex-col h-full"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="flex items-start justify-between mb-4 relative z-10">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                                                <BookOpen className="w-7 h-7" />
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                {course.isCompleted ? (
                                                    <Badge variant="success">Completed</Badge>
                                                ) : isBlocked ? (
                                                    <Badge variant="warning">Verification Pending</Badge>
                                                ) : isRestricted ? (
                                                    <Badge variant="danger">Restricted</Badge>
                                                ) : (
                                                    <Badge variant="success">Active</Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-1 relative z-10">
                                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter group-hover:text-emerald-600 transition-colors leading-tight mb-2">{course.title}</h3>
                                            <div className="flex items-center gap-4 text-xs text-gray-500 font-bold uppercase tracking-widest">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {new Date(course.startDate).toLocaleDateString()}
                                                </span>
                                                {course.bookLink && (
                                                    <a
                                                        href={course.bookLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:shadow-lg transition-all font-black text-[10px] uppercase tracking-widest mt-2 w-fit group-hover:scale-105"
                                                    >
                                                        <BookOpen className="w-3.5 h-3.5" />
                                                        OPEN COURSE BOOK
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-8 pt-4 border-t border-gray-50 flex items-center justify-between relative z-10">
                                            <div className="flex items-center gap-2 text-emerald-600 font-black text-xs tracking-widest uppercase">
                                                ENTER DASHBOARD
                                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </>
            ) : (
                /* SELECTED COURSE VIEW - Teacher Portal Style */
                <div className="space-y-6">
                    {/* Course Header - Teacher Portal Style */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <button
                                onClick={() => setSelectedCourseId('')}
                                className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-2 font-bold text-sm tracking-wide"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                BACK TO ALL COURSES
                            </button>
                            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">{myCourses.find(c => c._id === selectedCourseId)?.title || 'Course Dashboard'}</h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${user?.role === 'intern'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-emerald-600 text-white'
                                    }`}>
                                    {user?.role === 'intern' ? 'Interns Portal' : 'Students Portal'}
                                </span>
                                {selectedEnrollment && selectedEnrollment.status === 'completed' && (
                                    <span className="text-emerald-500 text-sm font-semibold italic flex items-center gap-1">
                                        <CheckCircle className="w-4 h-4" /> Course Completed
                                    </span>
                                )}
                            </div>
                        </div>
                        {/* Course Book Button */}
                        {myCourses.find(c => c._id === selectedCourseId)?.bookLink && (
                            <a
                                href={myCourses.find(c => c._id === selectedCourseId).bookLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl transition-all font-bold text-sm uppercase tracking-wide active:scale-95"
                            >
                                <BookOpen className="w-5 h-5" />
                                Course Book
                            </a>
                        )}
                    </div>

                    {/* Fee Overdue Warning */}
                    {feeOverdue.hasOverdue && (
                        <div className="bg-red-50 border border-red-200 px-4 py-3 rounded-xl flex items-center gap-3 text-red-600">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-sm font-bold">Payment Overdue - Submissions Disabled</span>
                                <span className="text-xs font-medium">Installment #{feeOverdue.overdueInstallment?.installmentNumber} is {feeOverdue.overdueInstallment?.daysPastDue} days overdue. Please pay to unlock submissions.</span>
                            </div>
                        </div>
                    )}

                    {/* Tab Navigation - Teacher Portal Style */}
                    <div className="flex gap-2 bg-gray-100/80 p-1.5 rounded-2xl w-fit border border-gray-200">
                        <button
                            onClick={() => setActiveTab('daily_tasks')}
                            className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'daily_tasks'
                                ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100'
                                : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                                }`}
                        >
                            <ClipboardList className="w-4 h-4" />
                            {user?.role === 'intern' ? 'Daily Tasks' : 'Class Logs'}
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
                    {(() => {
                        const isCompleted = selectedEnrollment && selectedEnrollment.status === 'completed';
                        const isRestricted = feeOverdue.hasOverdue;

                        return (
                            <>

                                {activeTab === 'assignments' ? (
                                    /* ASSIGNMENTS LIST */
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {[
                                                { label: 'Pending', count: filteredAssignments.filter((a) => a.status === 'pending' && !isDeadlinePassed(a.deadline)).length, color: 'text-amber-700 bg-amber-100' },
                                                { label: 'Submitted', count: filteredAssignments.filter((a) => a.status === 'submitted').length, color: 'text-blue-700 bg-blue-100' },
                                                { label: 'Graded', count: filteredAssignments.filter((a) => a.status === 'graded').length, color: 'text-emerald-700 bg-emerald-100' },
                                                { label: 'Overdue', count: filteredAssignments.filter((a) => a.status === 'overdue' || (a.status === 'pending' && isDeadlinePassed(a.deadline))).length, color: 'text-red-700 bg-red-100' },
                                            ].map((stat) => (
                                                <div key={stat.label} className={`${stat.color} rounded-xl p-4 border border-black/5`}>
                                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{stat.label}</span>
                                                    <p className="text-2xl font-black mt-1 leading-none">{stat.count}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {filteredAssignments.length === 0 ? (
                                            <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                                                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Assignments Found</h3>
                                                <p className="text-gray-500 italic">No assignments are currently registered for this workspace.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {filteredAssignments.map((assignment, index) => {
                                                    const canSubmit = !isDeadlinePassed(assignment.deadline) && assignment.status === 'pending' && !isRestricted && !isCompleted;
                                                    const statusConfig = getStatusConfig(assignment.status, assignment.deadline);

                                                    return (
                                                        <motion.div
                                                            key={assignment.id}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className={`bg-white rounded-3xl p-6 border border-gray-100 shadow-sm transition-all hover:shadow-md ${assignment.status === 'graded' ? 'opacity-75' : ''}`}
                                                        >
                                                            <div className="flex flex-col lg:flex-row justify-between gap-6">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-3 mb-3">
                                                                        <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 uppercase tracking-tight">Assignment #{index + 1}</span>
                                                                        <h3 className="font-bold text-gray-900 text-lg uppercase tracking-tight">{assignment.title}</h3>
                                                                        <Badge variant={statusConfig.variant}>{statusConfig.label.toUpperCase()}</Badge>
                                                                    </div>
                                                                    <p className="text-sm text-gray-500 font-medium leading-relaxed mb-4 whitespace-pre-wrap">{assignment.description}</p>
                                                                    <div className="flex flex-wrap items-center gap-4">
                                                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-lg border border-gray-100 text-xs font-bold text-gray-500 uppercase">
                                                                            <Calendar className="w-4 h-4" />
                                                                            Due: {formatDate(assignment.deadline)}
                                                                        </div>
                                                                        {canSubmit && (
                                                                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest animate-pulse">
                                                                                {getTimeRemaining(assignment.deadline)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="flex flex-col gap-3 min-w-[200px]">
                                                                    {assignment.status === 'graded' && (
                                                                        <div className="space-y-3">
                                                                            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                                                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Final Result</p>
                                                                                <p className="text-3xl font-black text-emerald-700">{assignment.grade}<span className="text-lg text-emerald-400">/{assignment.totalMarks}</span></p>
                                                                            </div>
                                                                            {assignment.feedback && (
                                                                                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-5 rounded-2xl border-2 border-amber-200 shadow-sm relative overflow-hidden">
                                                                                    {/* Decorative background icon */}
                                                                                    <MessageCircle className="absolute -right-4 -bottom-4 w-24 h-24 text-amber-100/50 transform rotate-12" />

                                                                                    <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2 relative z-10">
                                                                                        <MessageCircle className="w-4 h-4" />
                                                                                        Teacher's Feedback
                                                                                    </p>
                                                                                    <div className="bg-white/60 p-3 rounded-xl border border-amber-100/50 relative z-10">
                                                                                        <p className="text-sm text-gray-800 italic leading-relaxed whitespace-pre-wrap">"{assignment.feedback}"</p>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {assignment.status === 'rejected' && assignment.feedback && (
                                                                        <div className="bg-gradient-to-r from-red-50 to-rose-50 p-5 rounded-2xl border-2 border-red-200 shadow-sm relative overflow-hidden mb-3">
                                                                            <MessageCircle className="absolute -right-4 -bottom-4 w-24 h-24 text-red-100/50 transform rotate-12" />
                                                                            <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-3 flex items-center gap-2 relative z-10">
                                                                                <MessageCircle className="w-4 h-4" />
                                                                                Rejection Reason
                                                                            </p>
                                                                            <div className="bg-white/60 p-3 rounded-xl border border-red-100/50 relative z-10">
                                                                                <p className="text-sm text-gray-800 italic leading-relaxed whitespace-pre-wrap">"{assignment.feedback}"</p>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {(canSubmit || assignment.status === 'rejected') && (
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedAssignment(assignment);
                                                                                setSubmissionUrl(assignment.status === 'rejected' ? (assignment.submissionLink || '') : '');
                                                                                setSubmissionText(assignment.status === 'rejected' ? (assignment.notes || '') : '');
                                                                            }}
                                                                            disabled={isRestricted}
                                                                            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all text-white shadow-xl ${assignment.status === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0D2818] hover:bg-emerald-900'} disabled:bg-gray-300 disabled:shadow-none`}
                                                                        >
                                                                            {isRestricted ? 'LOCKED (FEE OVERDUE)' : (assignment.status === 'rejected' ? 'RESUBMIT WORK' : 'SUBMIT WORK')}
                                                                        </button>
                                                                    )}

                                                                    {assignment.status === 'submitted' && (
                                                                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
                                                                            <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                                                                            <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Verification Pending</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {selectedAssignment?.id === assignment.id && (
                                                                <div className="mt-8 pt-8 border-t border-gray-100 animate-in fade-in slide-in-from-top-4 duration-500">
                                                                    <div className="space-y-5">
                                                                        <div>
                                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Submission Link / Proof</label>
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Paste URL here..."
                                                                                value={submissionUrl}
                                                                                onChange={(e) => setSubmissionUrl(e.target.value)}
                                                                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium transition-all"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Notes for Teacher</label>
                                                                            <textarea
                                                                                placeholder="Describe your approach..."
                                                                                rows="3"
                                                                                value={submissionText}
                                                                                onChange={(e) => setSubmissionText(e.target.value)}
                                                                                onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                                                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium transition-all resize-none overflow-hidden"
                                                                            />
                                                                        </div>
                                                                        <div className="flex gap-3">
                                                                            <button onClick={() => setSelectedAssignment(null)} className="flex-1 py-4 text-gray-500 font-black uppercase tracking-widest text-xs hover:bg-gray-100 rounded-2xl transition-all">Cancel</button>
                                                                            <button
                                                                                onClick={() => handleSubmit(assignment.id)}
                                                                                disabled={isSubmitting || isRestricted}
                                                                                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-emerald-200 transition-all disabled:bg-gray-300"
                                                                            >
                                                                                {isSubmitting ? 'Processing...' : 'Submit Entry'}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : activeTab === 'daily_tasks' ? (
                                    /* DAILY LOGS VIEW */
                                    <div className="space-y-6">
                                        <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm">
                                            <div className="flex items-center justify-between mb-8">
                                                <div>
                                                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Post Daily Log</h3>
                                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
                                                        {isCompleted ? 'WORK LOGS LOCKED (COURSE COMPLETED)' : 'LOG YOUR SESSION ACHIEVEMENTS'}
                                                    </p>
                                                </div>
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                                    <Plus className="w-6 h-6" />
                                                </div>
                                            </div>

                                            <form onSubmit={handleSubmitDailyTask} className="space-y-6">
                                                {(user?.role === 'intern' || user?.role === 'admin') && (
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5 block ml-1">Live Work Link</label>
                                                        <div className="relative group">
                                                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                                                <LinkIcon className="h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={newTaskLink}
                                                                onChange={(e) => setNewTaskLink(e.target.value)}
                                                                disabled={isRestricted || isCompleted}
                                                                placeholder="URL (GitHub, Drive, Website)"
                                                                className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold transition-all disabled:opacity-50"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                <div>
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5 block ml-1">Learning Summary / Task Description</label>
                                                    <textarea
                                                        value={newTaskContent}
                                                        onChange={(e) => setNewTaskContent(e.target.value)}
                                                        onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                                        disabled={isRestricted || isCompleted}
                                                        placeholder="Describe your achievements and challenges today..."
                                                        rows="4"
                                                        className="w-full px-7 py-5 bg-gray-50 border border-gray-100 rounded-3xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium transition-all resize-none overflow-hidden shadow-inner disabled:opacity-50"
                                                    />
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting || !newTaskContent.trim() || isRestricted || isCompleted}
                                                    className="w-full py-6 bg-[#0D2818] hover:bg-[#1A5D3A] text-white rounded-[1.5rem] font-black text-lg tracking-widest uppercase shadow-2xl shadow-emerald-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:grayscale disabled:opacity-50"
                                                >
                                                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                                                    {isCompleted ? 'LOGS ARCHIVED' : (isRestricted ? 'PORTAL LOCKED' : (resubmittingTaskId ? 'UPDATE ARCHIVE ENTRY' : 'COMMIT DAILY LOG'))}
                                                </button>
                                            </form>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 mb-6 text-center">--- Activity Archive ---</h4>
                                            {dailyTasks.length === 0 ? (
                                                <div className="py-20 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                                                    <Clock className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No historical data found for this workspace</p>
                                                </div>
                                            ) : (
                                                [...dailyTasks]
                                                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                                    .map((task, idx) => (
                                                        <motion.div
                                                            key={task._id}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            className={`bg-white p-7 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden ${task.status === 'verified' ? 'opacity-70' : ''}`}
                                                        >
                                                            <div className="flex justify-between items-start mb-6">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                                                                        <p className="text-[10px] font-black text-gray-900 leading-none">{new Date(task.date || task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter mt-1">{new Date(task.createdAt).getFullYear()}</p>
                                                                    </div>
                                                                    <Badge variant={task.status === 'verified' ? 'success' : 'warning'}>{task.status.toUpperCase()}</Badge>
                                                                </div>
                                                                {task.status === 'rejected' && (
                                                                    <button onClick={() => { setResubmittingTaskId(task._id); setNewTaskContent(task.content); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-[10px] font-black text-emerald-600 underline uppercase tracking-widest">Edit & Re-commit</button>
                                                                )}
                                                            </div>
                                                            <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 text-sm italic text-gray-600 font-medium leading-relaxed mb-4 whitespace-pre-wrap">"{task.content}"</div>
                                                            {task.workLink && (
                                                                <a href={task.workLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase hover:bg-emerald-50 w-fit px-3 py-1.5 rounded-lg border border-emerald-100 transition-all">
                                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                                    Review Work
                                                                </a>
                                                            )}
                                                            {task.feedback && (
                                                                <div className="mt-6 pt-6 border-t border-gray-100">
                                                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Teacher Evaluation</p>
                                                                    <p className="text-sm font-semibold italic text-emerald-900">"{task.feedback}"</p>
                                                                    {task.marks !== undefined && (
                                                                        <div className="mt-4 flex items-center justify-between bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                                                            <span className="text-xs font-black text-emerald-700 uppercase">Proficiency Met</span>
                                                                            <span className="text-xl font-black text-emerald-700">{task.marks}<span className="text-xs text-emerald-400">/100</span></span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    ))
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    /* CHAT VIEW */
                                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm min-h-[500px]">
                                        {selectedCourseId && myCourses.find(c => c._id === selectedCourseId) ? (
                                            <StudentChatTab
                                                course={myCourses.find(c => c._id === selectedCourseId)}
                                                isRestricted={isRestricted}
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full py-20 text-gray-400">
                                                <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
                                                <p className="text-lg font-bold">Select a course to start chatting</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>

            )}
        </div>
    );
};

export default AssignmentSubmission;
