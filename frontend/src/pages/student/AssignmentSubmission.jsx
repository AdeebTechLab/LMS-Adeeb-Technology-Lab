import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle, Clock, Calendar, Search, Filter, AlertCircle, XCircle, ChevronLeft, ChevronRight,
    BookOpen, GraduationCap, ArrowRight, ExternalLink, Send, FileText, ClipboardList, Plus, Link as LinkIcon, MessageCircle, MapPin, Zap, X, Pencil, Trash2, Upload
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Loader, { ButtonLoader } from '../../components/ui/Loader';
import { assignmentAPI, courseAPI, dailyTaskAPI, enrollmentAPI, chatAPI, feeAPI, googleDriveAPI } from '../../services/api';
import { formatDate } from '../../utils/dateFormatter';
import RichTextEditor from '../../components/ui/RichTextEditor';
import RichTextContent from '../../components/ui/RichTextContent';
import { isRichTextEmpty } from '../../utils/richText';
import StudentChatTab from './components/StudentChatTab';
import StudentAttendanceTab from './components/StudentAttendanceTab';
import StudentTestsTab from './components/StudentTestsTab';
import WorkspaceRestrictedBanner from '../../components/dashboard/WorkspaceRestrictedBanner';
import { calculateOutstandingFees } from '../../utils/feeHelpers';
import { io } from 'socket.io-client';

const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? 'https://lms-adeeb-technology-lab.onrender.com/api' : 'http://localhost:5000/api');
    return rawUrl === '/api' ? 'https://lms-adeeb-technology-lab.onrender.com' : rawUrl.replace(/\/api\/?$/, '');
};

const SOCKET_URL = getSocketURL();

const GoogleDriveIcon = ({ className = '' }) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path fill="currentColor" d="M8.1 3h5.2l7.3 12.6H15.4L8.1 3Z" opacity="0.95" />
        <path fill="currentColor" d="M8.1 3 1.4 14.6 4 19.1 10.7 7.5 8.1 3Z" opacity="0.75" />
        <path fill="currentColor" d="M4 19.1h13.5l2.6-4.5H6.6L4 19.1Z" />
    </svg>
);

const AssignmentSubmission = () => {
    const { user, role } = useSelector((state) => state.auth);
    const location = useLocation();
    const navigate = useNavigate();

    const [myCourses, setMyCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState(location.state?.courseId || null);
    const [activeTab, setActiveTab] = useState(location.state?.tab || 'daily_tasks');
    const [assignments, setAssignments] = useState([]);
    const [dailyTasks, setDailyTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [submissionUrl, setSubmissionUrl] = useState('');
    const [submissionText, setSubmissionText] = useState('');
    const [driveStatus, setDriveStatus] = useState({ configured: false, connected: false, googleEmail: '' });
    const [driveFile, setDriveFile] = useState(null);
    const [isDriveUploading, setIsDriveUploading] = useState(false);
    const [driveError, setDriveError] = useState('');
    const [newTaskLink, setNewTaskLink] = useState('');
    const [newTaskContent, setNewTaskContent] = useState('');
    const [resubmittingTaskId, setResubmittingTaskId] = useState(null);
    const [editingTask, setEditingTask] = useState(null); // { id, content, workLink }
    const [deletingTaskId, setDeletingTaskId] = useState(null);
    const [currentEnrollment, setCurrentEnrollment] = useState(null);
    const [pendingFees, setPendingFees] = useState(0);
    const [assignFilter, setAssignFilter] = useState('all');
    const [dailyFilter, setDailyFilter] = useState('all');
    const socketRef = useRef();

    useEffect(() => {
        fetchMyCourses();
        googleDriveAPI.getStatus()
            .then(response => setDriveStatus(response.data))
            .catch(() => setDriveStatus({ configured: false, connected: false, googleEmail: '' }));
        socketRef.current = io(SOCKET_URL, { withCredentials: true });
        
        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    useEffect(() => {
        if (selectedCourseId) {
            fetchCourseData();
        }
    }, [selectedCourseId]);

    useEffect(() => {
        if (location.state?.tab) {
            setActiveTab(location.state.tab);
        }
        if (location.state?.courseId) {
            setSelectedCourseId(location.state.courseId);
        } else if (myCourses.length === 1 && !selectedCourseId) {
            setSelectedCourseId(myCourses[0]._id);
        }
    }, [location.state, myCourses, selectedCourseId]);

    const fetchMyCourses = async () => {
        setIsLoading(true);
        try {
            const res = await enrollmentAPI.getMy();
            const enrollments = res.data.data || [];
            // Filter only verified and active/completed courses
            const activeEnrollments = enrollments.filter(e => e.status === 'enrolled' || e.status === 'completed');
            const courses = activeEnrollments.map(e => ({
                ...e.course,
                enrollmentStatus: e.status,
                isPaused: e.isPaused,
                isActive: e.isActive,
                enrollmentId: e._id
            }));
            setMyCourses(courses);

            // Auto-select when only one enrolled course (sidebar: Class Logs, Daily Task, Tests, etc.)
            if (location.state?.courseId) {
                setSelectedCourseId(location.state.courseId);
            } else if (courses.length === 1) {
                setSelectedCourseId(courses[0]._id);
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCourseData = async () => {
        setIsLoading(true);
        try {
            const [assignRes, dailyRes, enrollmentRes] = await Promise.all([
                assignmentAPI.getByCourse(selectedCourseId),
                dailyTaskAPI.getMy(selectedCourseId),
                enrollmentAPI.getMy()
            ]);
            setAssignments(assignRes.data.assignments || []);
            setDailyTasks(dailyRes.data.data || []);
            
            const enroll = enrollmentRes.data.data.find(e => (e.course?._id || e.course) === selectedCourseId);
            setCurrentEnrollment(enroll);

            try {
                const feeRes = await feeAPI.getMy();
                const { totalAmount } = calculateOutstandingFees(feeRes.data.data || []);
                setPendingFees(totalAmount);
            } catch {
                setPendingFees(0);
            }
        } catch (error) {
            console.error('Error fetching course data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (assignmentId) => {
        if (!submissionUrl.trim() && !submissionText.trim() && !driveFile) return;
        setIsSubmitting(true);
        try {
            // Build FormData so multipart/form-data content-type is satisfied
            const formData = new FormData();
            if (submissionUrl.trim() && !driveFile) formData.append('fileUrl', submissionUrl.trim());
            if (submissionText.trim()) formData.append('notes', submissionText.trim());
            if (driveFile) {
                formData.append('fileUrl', driveFile.webViewLink);
                formData.append('googleDriveFileId', driveFile.id);
                formData.append('googleDriveFileName', driveFile.name);
                formData.append('googleDriveFileMimeType', driveFile.mimeType || '');
                formData.append('googleDriveFileSize', String(driveFile.size || 0));
                formData.append('googleDriveThumbnailLink', driveFile.thumbnailLink || '');
            }

            await assignmentAPI.submit(assignmentId, formData);
            setSelectedAssignment(null);
            setSubmissionUrl('');
            setSubmissionText('');
            setDriveFile(null);
            fetchCourseData();
        } catch (error) {
            console.error('Submission failed:', error);
            alert(error.response?.data?.message || 'Failed to submit assignment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConnectGoogleDrive = async () => {
        try {
            setDriveError('');
            const response = await googleDriveAPI.getAuthUrl();
            window.location.assign(response.data.url);
        } catch (error) {
            setDriveError(error.response?.data?.message || 'Google Drive connection is not configured yet.');
        }
    };

    const handleDriveUpload = async (event) => {
        const files = Array.from(event.target.files || []);
        event.target.value = '';
        if (!files.length || !selectedAssignment) return;
        setIsDriveUploading(true);
        setDriveError('');
        try {
            const formData = new FormData();
            files.forEach(file => formData.append('files', file));
            formData.append('assignmentId', selectedAssignment._id);
            const response = await googleDriveAPI.upload(formData);
            setDriveFile(response.data.file);
        } catch (error) {
            setDriveError(error.response?.data?.message || 'Google Drive upload failed.');
        } finally {
            setIsDriveUploading(false);
        }
    };

    const handleSubmitDailyTask = async (e) => {
        e.preventDefault();
        if (isRichTextEmpty(newTaskContent)) return;
        setIsSubmitting(true);
        try {
            await dailyTaskAPI.submit({
                courseId: selectedCourseId,
                content: newTaskContent,
                workLink: newTaskLink
            });
            setResubmittingTaskId(null);
            setNewTaskContent('');
            setNewTaskLink('');
            fetchCourseData();
        } catch (error) {
            console.error('Daily log failed:', error);
            alert(error.response?.data?.message || 'Failed to post daily log');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditTask = async (e) => {
        e.preventDefault();
        if (!editingTask || isRichTextEmpty(editingTask.content)) return;
        setIsSubmitting(true);
        try {
            await dailyTaskAPI.edit(editingTask.id, {
                content: editingTask.content,
                workLink: editingTask.workLink
            });
            setEditingTask(null);
            fetchCourseData();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to edit log');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm(isInternCourse ? 'Kya aap ye meeting log delete karna chahte hain?' : 'Kya aap ye class log delete karna chahte hain?')) return;
        setDeletingTaskId(taskId);
        try {
            await dailyTaskAPI.delete(taskId);
            fetchCourseData();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to delete log');
        } finally {
            setDeletingTaskId(null);
        }
    };

    const isDeadlinePassed = (deadline) => new Date(deadline) < new Date();
    

    const getTimeRemaining = (deadline) => {
        const diff = new Date(deadline) - new Date();
        if (diff < 0) return 'Deadline Passed';
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        if (days > 0) return `${days}d ${hours}h remaining`;
        return `${hours}h remaining`;
    };

    const getStatusConfig = (status, deadline) => {
        if (status === 'graded') return { label: 'Graded', variant: 'success' };
        if (status === 'submitted') return { label: 'Submitted', variant: 'info' };
        if (status === 'rejected') return { label: 'Rejected', variant: 'error' };
        if (isDeadlinePassed(deadline)) return { label: 'Overdue', variant: 'error' };
        return { label: 'Pending', variant: 'warning' };
    };

    const isRestricted = currentEnrollment?.isPaused || !currentEnrollment?.isActive;
    const isCompleted = currentEnrollment?.status === 'completed';
    const selectedCourseData = myCourses.find(c => c._id === selectedCourseId);
    const isInternCourse = (currentEnrollment?.course?.targetAudience || selectedCourseData?.targetAudience) === 'interns';

    const filteredAssignments = assignments.filter((a) => {
        const s = a.submissions?.[0]?.status || 'pending';
        const isPast = isDeadlinePassed(a.dueDate);
        
        if (assignFilter === 'completed') {
            return s === 'graded' || s === 'submitted';
        }
        if (assignFilter === 'pending') {
            return (s === 'pending' || s === 'rejected') && !isPast;
        }
        if (assignFilter === 'overdue') {
            return (s === 'pending' || s === 'rejected') && isPast;
        }
        if (assignFilter === 'rejected') {
            return s === 'rejected';
        }
        return true;
    });

    const filteredDailyTasks = dailyTasks.filter(t => {
        if (dailyFilter === 'verified') {
            return t.status === 'verified' || t.status === 'graded';
        }
        if (dailyFilter === 'pending') {
            return t.status === 'submitted' || t.status === 'pending';
        }
        if (dailyFilter === 'rejected') {
            return t.status === 'rejected';
        }
        return true;
    });

    if (isLoading && !selectedCourseId) {
        return <Loader message="Loading your workspaces..." />;
    }

    return (
        <div className="space-y-6">
            {!selectedCourseId ? (
                /* COURSE SELECTION VIEW */
                <div className="space-y-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Course Portal</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mt-1">Select a workspace to manage your tasks and progress</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myCourses.length === 0 ? (
                            <div className="col-span-full py-20 bg-white dark:bg-slate-900/40 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-800 text-center">
                                <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-gray-400 uppercase tracking-widest">No Active Courses</h3>
                                <p className="text-gray-400 text-sm mt-2">Enroll in a course to start your journey</p>
                                <button onClick={() => navigate(`/${role}/courses`)} className="mt-6 px-8 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-200">Browse Courses</button>
                            </div>
                        ) : (
                            myCourses.map((course) => (
                                <motion.div
                                    key={course._id}
                                    whileHover={{ y: -8, scale: 1.02 }}
                                    onClick={() => setSelectedCourseId(course._id)}
                                    className="bg-white dark:bg-slate-900/40 p-8 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:border-primary transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-orange-100">
                                            <GraduationCap className="w-8 h-8" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge variant={course.enrollmentStatus === 'completed' ? 'success' : 'info'}>{course.enrollmentStatus.toUpperCase()}</Badge>
                                                <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${course.targetAudience === 'interns'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {course.targetAudience === 'interns' ? 'Internship' : 'Student'}
                                                </span>
                                            </div>
                                            <h3 className="font-black text-gray-900 dark:text-white text-xl mt-1 group-hover:text-primary transition-colors">{course.title}</h3>
                                            {(course.city || course.location) && (
                                                <span className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
                                                    <MapPin className="w-3 h-3 text-primary" />
                                                    {course.city || course.location}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-6 border-t border-gray-50 dark:border-slate-800/50">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enter Workspace</span>
                                        <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                                            <ArrowRight className="w-5 h-5" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                /* WORKSPACE VIEW */
                <div className="space-y-6">
                    {/* Course Header - Transparent like Teacher Portal */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            {myCourses.length > 1 && (
                                <button
                                    onClick={() => setSelectedCourseId(null)}
                                    className="flex items-center gap-2 text-primary hover:text-primary mb-2 font-bold text-sm tracking-wide uppercase"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    BACK TO {isInternCourse ? 'MY SKILLS' : 'MY COURSES'}
                                </button>
                            )}
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none mb-3">
                                {myCourses.find(c => c._id === selectedCourseId)?.title}
                            </h1>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm ${isInternCourse
                                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                                    : 'bg-blue-100 text-blue-700 border-blue-200'
                                    }`}>
                                    {isInternCourse ? 'Internship' : 'Student'}
                                </span>
                                {(myCourses.find(c => c._id === selectedCourseId)?.city || myCourses.find(c => c._id === selectedCourseId)?.location) && (
                                    <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-200 shadow-sm">
                                        <MapPin className="w-2.5 h-2.5 text-primary" />
                                        {myCourses.find(c => c._id === selectedCourseId)?.city || myCourses.find(c => c._id === selectedCourseId)?.location}
                                    </span>
                                )}
                                <Badge variant="primary" size="sm">Workspace ACTIVE</Badge>
                                {isRestricted && <Badge variant="error" size="sm">PORTAL LOCKED</Badge>}
                            </div>
                        </div>

                        {/* Right Side: Actions */}
                        <div className="flex items-center gap-3">
                            {/* Book Action Button */}
                            {myCourses.find(c => c._id === selectedCourseId)?.bookLink && (
                                <button
                                    onClick={() => window.open(myCourses.find(c => c._id === selectedCourseId)?.bookLink, '_blank')}
                                    className="group relative flex items-center justify-center gap-2 px-3 sm:px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-wider sm:tracking-widest text-[10px] sm:text-xs hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-lg hover:shadow-xl shadow-primary/20 border border-primary/30 whitespace-nowrap"
                                    title="Open Course Book"
                                >
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
                                    <div className="bg-white/20 p-1.5 rounded-lg group-hover:-rotate-12 transition-transform duration-300 relative z-10">
                                        <BookOpen className="w-4 h-4" />
                                    </div>
                                    <span className="relative z-10">Read Book</span>
                                    <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-50 group-hover:opacity-100 transition-opacity relative z-10" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Navigation Tabs - Separate Row like Teacher Portal */}
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900/40 rounded-2xl p-1.5 border border-gray-100 dark:border-slate-800 shadow-sm overflow-x-auto no-scrollbar">
                        {[
                            { id: 'daily_tasks', label: isInternCourse ? 'Meeting logs' : 'Class Log', icon: ClipboardList },
                            { id: 'assignments', label: isInternCourse ? 'Projects' : 'Assignments', icon: FileText },
                            { id: 'tests', label: 'Tests', icon: Zap },
                            { id: 'attendance', label: 'Attendance', icon: Calendar },
                            { id: 'chat', label: 'Chat', icon: MessageCircle },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    navigate(location.pathname, {
                                        replace: true,
                                        state: {
                                            ...location.state,
                                            tab: tab.id,
                                            courseId: selectedCourseId
                                        }
                                    });
                                }}
                                className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-primary text-white shadow-xl shadow-primary/30'
                                    : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-primary'
                                    }`}
                            >
                                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : 'text-gray-400 group-hover:text-primary'}`} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[500px]">
                        {isLoading ? (
                            <div className="h-[400px]">
                                <Loader message="Synchronizing Workspace..." />
                            </div>
                        ) : isRestricted ? (
                            <WorkspaceRestrictedBanner
                                role={role}
                                pendingFees={pendingFees}
                                restrictionType={currentEnrollment?.isPaused ? 'paused' : 'fee'}
                                lockedCourses={[{
                                    id: selectedCourseId,
                                    title: currentEnrollment?.course?.title
                                        || myCourses.find((c) => c._id === selectedCourseId)?.title
                                        || 'This Course',
                                }]}
                                onBack={() => setSelectedCourseId(null)}
                                backLabel="Back to Courses"
                                className="my-4"
                            />
                        ) : activeTab === 'assignments' ? (
                            /* ASSIGNMENTS VIEW */
                            <div className="space-y-8">
                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                    {[
                                        { id: 'all', label: 'Total', icon: FileText, count: assignments.length, color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30', activeColor: 'ring-4 ring-blue-500/20 bg-blue-100 dark:bg-blue-900/40 border-blue-400 scale-105' },
                                        { id: 'completed', label: 'Completed', icon: CheckCircle, count: assignments.filter((a) => { const s = a.submissions?.[0]?.status; return s === 'graded' || s === 'submitted'; }).length, color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30', activeColor: 'ring-4 ring-emerald-500/20 bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400 scale-105' },
                                        { id: 'pending', label: 'Pending', icon: Clock, count: assignments.filter((a) => { const s = a.submissions?.[0]?.status || 'pending'; return (s === 'pending' || s === 'rejected') && !isDeadlinePassed(a.dueDate); }).length, color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30', activeColor: 'ring-4 ring-amber-500/20 bg-amber-100 dark:bg-amber-900/40 border-amber-400 scale-105' },
                                        { id: 'overdue', label: 'Overdue', icon: AlertCircle, count: assignments.filter((a) => { const s = a.submissions?.[0]?.status || 'pending'; return (s === 'pending' || s === 'rejected') && isDeadlinePassed(a.dueDate); }).length, color: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30', activeColor: 'ring-4 ring-red-500/20 bg-red-100 dark:bg-red-900/40 border-red-400 scale-105' },
                                        { id: 'rejected', label: 'Rejected', icon: XCircle, count: assignments.filter((a) => { const s = a.submissions?.[0]?.status || 'pending'; return s === 'rejected'; }).length, color: 'text-pink-700 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20 border-pink-100 dark:border-pink-800/30', activeColor: 'ring-4 ring-pink-500/20 bg-pink-100 dark:bg-pink-900/40 border-pink-400 scale-105' },
                                    ].map((stat) => (
                                        <button 
                                            key={stat.id} 
                                            onClick={() => setAssignFilter(stat.id === assignFilter ? 'all' : stat.id)}
                                            className={`${stat.color} ${assignFilter === stat.id ? stat.activeColor : 'border hover:scale-105'} rounded-2xl p-4 flex items-center justify-between shadow-sm text-left transition-all focus:outline-none`}
                                        >
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-widest opacity-70 block mb-1">{stat.label}</span>
                                                <p className="text-2xl font-black leading-none">{stat.count}</p>
                                            </div>
                                            <div className={`p-2 rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-sm`}>
                                                <stat.icon className="w-5 h-5 opacity-80" />
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {filteredAssignments.length === 0 ? (
                                    <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-20 border border-gray-100 dark:border-slate-800 text-center">
                                        <FileText className="w-20 h-20 text-gray-200 mx-auto mb-6" />
                                        <h3 className="text-2xl font-black text-gray-400 uppercase tracking-widest">{isInternCourse ? 'No Projects Found' : 'No Assignments Found'}</h3>
                                        <p className="text-gray-400 font-medium mt-2">{isInternCourse ? 'Check back later for new projects' : 'Check back later for new tasks'}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {filteredAssignments.map((assignment, index) => {
                                            // Get student's own submission details from the submissions array
                                            const mySubmission = assignment.submissions && assignment.submissions.length > 0 ? assignment.submissions[0] : null;
                                            const submissionStatus = mySubmission ? mySubmission.status : 'pending';
                                            const submissionMarks = mySubmission ? mySubmission.marks : undefined;
                                            const submissionFeedback = mySubmission ? mySubmission.feedback : undefined;
                                            const submissionNotes = mySubmission ? mySubmission.notes : undefined;
                                            const submissionLink = mySubmission ? mySubmission.fileUrl : undefined;
                                            
                                            const deadlinePassed = isDeadlinePassed(assignment.dueDate);
                                            // Can submit if deadline not passed AND no submission yet (or rejected)
                                            const canSubmit = !deadlinePassed && (submissionStatus === 'pending' || submissionStatus === 'rejected') && !isRestricted && !isCompleted;
                                            // Can resubmit if deadline was extended and it's not passed, but NOT if already graded
                                            const canResubmit = !deadlinePassed && (submissionStatus === 'submitted') && !isRestricted && !isCompleted;
                                            const statusConfig = getStatusConfig(submissionStatus, assignment.dueDate);

                                            return (
                                                <motion.div
                                                    key={assignment.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`bg-white dark:bg-slate-900/40 rounded-2xl p-8 border border-gray-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-2xl hover:border-primary dark:hover:border-primary/50 group relative overflow-hidden ${assignment.status === 'graded' ? 'opacity-95' : ''}`}
                                                >
                                                    <div className={`absolute top-0 right-0 w-40 h-40 rounded-full -mr-20 -mt-20 blur-3xl opacity-10 transition-opacity group-hover:opacity-20 ${assignment.status === 'graded' ? 'bg-primary' : assignment.status === 'overdue' ? 'bg-red-500' : 'bg-amber-500'}`}></div>

                                                    <div className="flex flex-col h-full relative z-10">
                                                        <div className="flex items-start justify-between mb-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${assignment.status === 'graded' ? 'bg-primary' : assignment.status === 'submitted' ? 'bg-blue-600' : 'bg-primary-dark'}`}>
                                                                    <FileText className="w-6 h-6" />
                                                                </div>
                                                                <div>
                                                                    {(() => {
                                                                        const sortedAssignments = [...assignments].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                                                                        const assignmentNumber = sortedAssignments.findIndex(a => String(a._id || a.id) === String(assignment._id || assignment.id)) + 1;
                                                                        return <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">ASSIGNMENT #{assignmentNumber}</span>;
                                                                    })()}
                                                                    <h3 className="font-black text-gray-900 dark:text-white text-lg uppercase tracking-tight group-hover:text-primary transition-colors">{assignment.title}</h3>
                                                                </div>
                                                            </div>
                                                            <Badge variant={statusConfig.variant}>{statusConfig.label.toUpperCase()}</Badge>
                                                        </div>

                                                        <RichTextContent
                                                            html={assignment.description}
                                                            className="mb-6 dark:text-gray-400"
                                                            emptyText="No instructions provided."
                                                        />

                                                        {/* Compact Action Row */}
                                                        <div className="mt-auto pt-6 border-t border-gray-50 dark:border-slate-800/50 flex flex-wrap items-center justify-between gap-4">
                                                            <div className="flex flex-wrap items-center gap-3">
                                                                {/* Deadline & Remaining Time */}
                                                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-gray-100 dark:border-slate-800">
                                                                    <Calendar className="w-3.5 h-3.5 text-primary" />
                                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dead Line:</span>
                                                                    <span className="text-[10px] font-black text-gray-900 dark:text-gray-200 uppercase">{formatDate(assignment.dueDate)}</span>
                                                                    {!deadlinePassed && (submissionStatus === 'pending' || submissionStatus === 'rejected' || canResubmit) && (
                                                                        <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-lg border border-amber-100 dark:border-amber-800/30 animate-pulse ml-1">
                                                                            {getTimeRemaining(assignment.dueDate)}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Inline Rejection Feedback */}
                                                                {submissionStatus === 'rejected' && submissionFeedback && (
                                                                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-800/30">
                                                                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                                                                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest shrink-0">Reason:</span>
                                                                        <span className="text-[10px] text-red-800 dark:text-red-200 font-bold italic">"{submissionFeedback}"</span>
                                                                    </div>
                                                                )}

                                                                {/* Graded Summary */}
                                                                {submissionStatus === 'graded' && submissionMarks !== undefined && (
                                                                    <>
                                                                        {submissionLink && (
                                                                            <a href={submissionLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-xl border border-blue-100 dark:border-blue-800/30 transition-colors uppercase">
                                                                                <LinkIcon className="w-3.5 h-3.5" /> My Work
                                                                            </a>
                                                                        )}
                                                                        {submissionFeedback && (
                                                                            <div className="flex items-start gap-2 px-3 py-2 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700 max-w-[600px]">
                                                                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest shrink-0 mt-0.5">Teacher Feedback:</span>
                                                                                <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 italic break-words">"{submissionFeedback}"</span>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {/* Submitted but Pending Grade Summary */}
                                                                {submissionStatus === 'submitted' && (
                                                                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Submitted</span>
                                                                        {submissionLink && (
                                                                            <a href={submissionLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 hover:text-blue-700 bg-white/50 dark:bg-white/5 px-2 py-1 rounded-lg border border-blue-100/50 transition-colors ml-1 uppercase">
                                                                                <LinkIcon className="w-3 h-3" /> View Link
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Action Button / Graded Score on Right */}
                                                            <div className="flex items-center gap-4 shrink-0 ml-auto">
                                                                {submissionStatus === 'graded' && submissionMarks !== undefined && (
                                                                    <div className="text-right bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10">
                                                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Marks</p>
                                                                        <p className="text-3xl font-black text-primary leading-none">{submissionMarks}<span className="text-lg opacity-50">/{assignment.totalMarks}</span></p>
                                                                    </div>
                                                                )}
                                                                {(canSubmit || canResubmit) && selectedAssignment?._id !== assignment._id && (
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedAssignment(assignment);
                                                                        setSubmissionUrl(submissionLink || '');
                                                                        setSubmissionText(submissionNotes || '');
                                                                        setDriveFile(null);
                                                                        setDriveError('');
                                                                    }}
                                                                    disabled={isRestricted}
                                                                    className={`px-10 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all text-white shadow-xl hover:shadow-2xl hover:scale-[1.05] active:scale-95 ${submissionStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' : canResubmit ? 'bg-blue-600 hover:bg-blue-700' : 'bg-primary hover:bg-[#e67e00]'} disabled:opacity-50`}
                                                                    >
                                                                        {submissionStatus === 'rejected' ? 'RESUBMIT' : canResubmit ? 'RESUBMIT' : 'SUBMIT WORK'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* SUBMISSION MODAL */}
                                <AnimatePresence>
                                    {selectedAssignment && (
                                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedAssignment(null)} className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-xl" />
                                            <motion.div initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }} className="bg-white dark:bg-[#111827] w-full max-w-2xl max-h-[92vh] rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 relative z-10 overflow-hidden flex flex-col">
                                                <div className="bg-gradient-to-r from-primary to-orange-500 px-6 py-5 sm:px-8 sm:py-6 text-white relative shrink-0">
                                                    <div className="pr-14">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-1">Student Workspace</p>
                                                        <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-none mb-2">Submit Assignment</h3>
                                                        <p className="text-white/80 text-[11px] sm:text-xs font-semibold">Upload your work to Drive, add notes, then submit.</p>
                                                    </div>
                                                    <button onClick={() => setSelectedAssignment(null)} className="absolute top-1/2 -translate-y-1/2 right-5 w-10 h-10 rounded-xl bg-black/10 hover:bg-black/20 border border-white/15 flex items-center justify-center text-white transition-colors"><X className="w-5 h-5" /></button>
                                                </div>
                                                <div className="p-5 sm:p-7 space-y-5 overflow-y-auto">
                                                    <div className="space-y-5">
                                                        <div className="rounded-2xl border border-primary/30 dark:border-primary/40 bg-gradient-to-br from-primary/10 to-white dark:from-primary/10 dark:to-slate-900 p-4 sm:p-5 shadow-sm">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/25">
                                                                        <GoogleDriveIcon className="w-7 h-7" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="text-sm font-black text-gray-900 dark:text-white">Google Drive Upload</p>
                                                                            {driveStatus.connected && <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">Connected</span>}
                                                                        </div>
                                                                        <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-slate-400 truncate max-w-[260px]">
                                                                            {driveStatus.connected
                                                                                ? (driveStatus.googleEmail || 'Your Google account')
                                                                                : 'Connect once, then select a file from this device.'}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {driveStatus.connected ? (
                                                                    <label className={`min-h-12 px-5 sm:px-6 py-3 rounded-xl bg-primary hover:bg-orange-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 cursor-pointer shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 active:translate-y-0 ${isDriveUploading ? 'opacity-60 pointer-events-none' : ''}`}>
                                                                        <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                                                                        {isDriveUploading
                                                                            ? 'Uploading...'
                                                                            : role === 'intern'
                                                                                ? 'Upload Project'
                                                                                : 'Upload Assignment'}
                                                                        <input
                                                                            type="file"
                                                                            multiple
                                                                            className="hidden"
                                                                            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
                                                                            onChange={handleDriveUpload}
                                                                            disabled={isDriveUploading}
                                                                        />
                                                                    </label>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleConnectGoogleDrive}
                                                                        disabled={!driveStatus.configured}
                                                                        className="min-h-12 px-5 sm:px-6 py-3 rounded-xl bg-primary hover:bg-orange-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-wide shadow-lg shadow-primary/25 disabled:opacity-50"
                                                                    >
                                                                        Connect Google Drive
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {driveFile && (
                                                                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 p-3">
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                                                                            {driveFile.files?.length || 1} file{(driveFile.files?.length || 1) === 1 ? '' : 's'} uploaded
                                                                        </p>
                                                                        <p className="text-[10px] text-gray-400">Saved together in one Drive folder • Teacher access enabled</p>
                                                                    </div>
                                                                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                                                                </div>
                                                            )}
                                                            {driveFile?.files?.length > 0 && (
                                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                                    {driveFile.files.map(file => (
                                                                        <span key={file.id} className="max-w-full truncate px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-primary/20 dark:border-primary/30 text-[9px] font-bold text-gray-500 dark:text-slate-300">
                                                                            {file.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {!driveStatus.configured && (
                                                                <p className="mt-3 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                                                    Google Drive setup is awaiting administrator configuration.
                                                                </p>
                                                            )}
                                                            {driveError && (
                                                                <p className="mt-3 text-[11px] font-semibold text-red-600 dark:text-red-400">{driveError}</p>
                                                            )}
                                                        </div>
                                                        {!driveFile && (
                                                        <div>
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Work Link <span className="font-semibold normal-case tracking-normal">(Optional alternative)</span></label>
                                                            <div className="relative">
                                                                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                                <input type="text" placeholder="GitHub, portfolio, or another link" value={submissionUrl} onChange={(e) => setSubmissionUrl(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 font-semibold transition-all text-sm" />
                                                            </div>
                                                        </div>
                                                        )}
                                                        <div>
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Notes for Teacher <span className="font-semibold normal-case tracking-normal">(Optional)</span></label>
                                                            <RichTextEditor
                                                                value={submissionText}
                                                                onChange={setSubmissionText}
                                                                placeholder="Any additional notes for the teacher..."
                                                                minHeight="120px"
                                                                className="border-primary/30"
                                                            />
                                                        </div>
                                                    </div>
                                                    <button onClick={() => handleSubmit(selectedAssignment._id)} disabled={isSubmitting || isDriveUploading} className="w-full py-4 bg-primary hover:bg-orange-600 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3">
                                                        <ButtonLoader isLoading={isSubmitting}>CONFIRM SUBMISSION</ButtonLoader>
                                                    </button>
                                                </div>
                                            </motion.div>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : activeTab === 'daily_tasks' ? (
                            /* DAILY LOGS VIEW */
                            <div className="space-y-8">
                                    {/* Daily Tasks Filter Stats */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                        {[
                                            { id: 'all', label: isInternCourse ? 'Total' : 'Total Classes', icon: BookOpen, count: dailyTasks.length, color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30', activeColor: 'ring-4 ring-blue-500/20 bg-blue-100 dark:bg-blue-900/40 border-blue-400 scale-105' },
                                            { id: 'verified', label: isInternCourse ? 'Verified' : 'Verified Classes', icon: CheckCircle, count: dailyTasks.filter(t => t.status === 'verified' || t.status === 'graded').length, color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30', activeColor: 'ring-4 ring-emerald-500/20 bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400 scale-105' },
                                            { id: 'pending', label: isInternCourse ? 'Pending' : 'Pending Verification', icon: Clock, count: dailyTasks.filter(t => t.status === 'submitted' || t.status === 'pending').length, color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30', activeColor: 'ring-4 ring-amber-500/20 bg-amber-100 dark:bg-amber-900/40 border-amber-400 scale-105' },
                                            { id: 'rejected', label: isInternCourse ? 'Rejected' : 'Rejected Classes', icon: XCircle, count: dailyTasks.filter(t => t.status === 'rejected').length, color: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30', activeColor: 'ring-4 ring-red-500/20 bg-red-100 dark:bg-red-900/40 border-red-400 scale-105' },
                                        ].map((stat) => (
                                            <button
                                                key={stat.id}
                                                onClick={() => setDailyFilter(stat.id === dailyFilter ? 'all' : stat.id)}
                                                className={`${stat.color} ${dailyFilter === stat.id ? stat.activeColor : 'border hover:scale-105'} rounded-2xl p-4 flex items-center justify-between shadow-sm text-left transition-all focus:outline-none`}
                                            >
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-70 block mb-1">{stat.label}</span>
                                                    <p className="text-2xl font-black leading-none">{stat.count}</p>
                                                </div>
                                                <div className="p-2 rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                                                    <stat.icon className="w-5 h-5 opacity-80" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-10 border border-gray-100 dark:border-slate-800 shadow-sm">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{isInternCourse ? 'Post Daily Meeting Log' : 'Post Daily Class'}</h3>
                                    </div>
                                    <form onSubmit={handleSubmitDailyTask} className="space-y-6">

                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                                                {(currentEnrollment?.course?.targetAudience ||
                                                    myCourses.find((c) => c._id === selectedCourseId)?.targetAudience) ===
                                                'interns'
                                                    ? 'Daily work log'
                                                    : 'Class activity log'}{' '}
                                                <span className="text-primary">(visual editor)</span>
                                            </label>
                                            <RichTextEditor
                                                value={newTaskContent}
                                                onChange={setNewTaskContent}
                                                disabled={isRestricted || isCompleted}
                                                placeholder="Describe what you worked on today — use headings, lists, and links like WordPress…"
                                                minHeight="200px"
                                                className="border-primary/30"
                                            />
                                        </div>
                                        <button type="submit" disabled={isSubmitting || isRichTextEmpty(newTaskContent) || isRestricted || isCompleted} className="w-full py-6 bg-primary text-white rounded-[1.5rem] font-black text-lg tracking-widest uppercase shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:grayscale disabled:opacity-50">
                                            <ButtonLoader isLoading={isSubmitting} icon={<Send className="w-6 h-6" />}>
                                                {isCompleted ? 'CLASS ARCHIVED' : (isRestricted ? 'PORTAL LOCKED' : (resubmittingTaskId ? 'UPDATE CLASS ENTRY' : 'COMMIT DAILY CLASS'))}
                                            </ButtonLoader>
                                        </button>
                                    </form>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] text-center my-6">Activity History</h4>
                                    


                                    {filteredDailyTasks.length === 0 ? (
                                        <div className="py-20 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                                            <Clock className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No historical data found</p>
                                        </div>
                                    ) : (
                                        [...filteredDailyTasks]
                                            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                            .map((task, idx) => {
                                                // Calculate Log # for this user
                                                const sortedTasks = [...dailyTasks].sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));
                                                const logNumber = sortedTasks.findIndex(t => String(t._id) === String(task._id)) + 1;

                                                return (
                                                    <motion.div 
                                                        key={task._id} 
                                                        initial={{ opacity: 0, x: -10 }} 
                                                        animate={{ opacity: 1, x: 0 }} 
                                                        transition={{ delay: idx * 0.05 }} 
                                                        className="bg-white dark:bg-slate-900/40 p-7 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden"
                                                    >
                                                        <div className="flex items-start justify-between mb-6">
                                                            <div className="flex items-center gap-4">
                                                                {user?.photo ? (
                                                                    <img src={user.photo} alt="" className="w-11 h-11 rounded-full object-cover border border-primary/10" />
                                                                ) : (
                                                                    <div className="w-11 h-11 rounded-full bg-primary/5 flex items-center justify-center text-primary font-bold border border-primary/10 uppercase">
                                                                        {user?.name?.charAt(0)}
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-0.5">
                                                                        <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10 uppercase tracking-tight">
                                                                            {isInternCourse ? 'LOG' : 'CLASS'} #{logNumber}
                                                                        </span>
                                                                        <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-tight">{user?.name}</h4>
                                                                        {user?.rollNo && (
                                                                            <span className="text-[10px] font-black text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-lg border border-red-100 dark:border-red-800/30">
                                                                                {user?.rollNo}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1.5 uppercase tracking-wider">
                                                                        <Clock className="w-3.5 h-3.5" />
                                                                        {new Date(task.date || task.createdAt).toLocaleDateString('en-GB')} at {new Date(task.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3 flex-wrap">
                                                                <Badge variant={task.status === 'verified' || task.status === 'graded' ? 'success' : task.status === 'rejected' ? 'error' : 'warning'}>{task.status.toUpperCase()}</Badge>
                                                                {/* Edit/Delete only when NOT graded or verified */}
                                                                {(task.status !== 'verified' && task.status !== 'graded') && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => setEditingTask({ id: task._id, content: task.content, workLink: task.workLink || '' })}
                                                                            className="flex items-center gap-1 text-[10px] font-black text-blue-500 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg border border-blue-100 uppercase tracking-widest transition-all"
                                                                        >
                                                                            <Pencil className="w-3 h-3" /> Edit
                                                                        </button>
                                                                        <button
                                                                            disabled={deletingTaskId === task._id}
                                                                            onClick={() => handleDeleteTask(task._id)}
                                                                            className="flex items-center gap-1 text-[10px] font-black text-red-500 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg border border-red-100 uppercase tracking-widest transition-all disabled:opacity-50"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" /> {deletingTaskId === task._id ? '...' : 'Delete'}
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Inline edit form */}
                                                        {editingTask?.id === task._id ? (
                                                            <form onSubmit={handleEditTask} className="space-y-3 mb-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                                                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{isInternCourse ? 'Edit Meeting Log' : 'Edit Class Log'}</p>
                                                                <RichTextEditor
                                                                    value={editingTask.content}
                                                                    onChange={(v) => setEditingTask(prev => ({ ...prev, content: v }))}
                                                                    placeholder={isInternCourse ? 'Update your meeting log...' : 'Update your class log...'}
                                                                    minHeight="150px"
                                                                />
                                                                <input
                                                                    type="url"
                                                                    value={editingTask.workLink}
                                                                    onChange={(e) => setEditingTask(prev => ({ ...prev, workLink: e.target.value }))}
                                                                    placeholder="Work link (optional)"
                                                                    className="w-full text-xs px-3 py-2 border border-blue-100 rounded-xl focus:outline-none focus:border-blue-400"
                                                                />
                                                                <div className="flex gap-2">
                                                                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50">
                                                                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                                                                    </button>
                                                                    <button type="button" onClick={() => setEditingTask(null)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest">
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </form>
                                                        ) : (
                                                        <RichTextContent
                                                            html={task.content}
                                                            className="bg-gray-50/50 dark:bg-black/20 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 mb-4 italic"
                                                        />
                                                        )}
                                                        
                                                        {task.workLink && (
                                                            <a href={task.workLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[10px] font-black text-primary uppercase hover:bg-primary/5 w-fit px-3 py-1.5 rounded-lg border border-primary/10 transition-all">
                                                                <ExternalLink className="w-3.5 h-3.5" /> 
                                                                View Submitted Work
                                                            </a>
                                                        )}

                                                        {task.feedback && (
                                                            <div className="mt-5 pt-5 border-t border-gray-100 dark:border-slate-800/50 flex flex-wrap items-center gap-4">
                                                                {/* Compact Score */}
                                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 dark:bg-primary/20 rounded-xl border border-primary/10 dark:border-primary/30">
                                                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">Marks:</span>
                                                                    <span className="text-sm font-black text-primary">{task.marks !== undefined ? task.marks : 0}<span className="text-[10px]">/10</span></span>
                                                                </div>

                                                                {/* Inline Feedback */}
                                                                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                                                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest shrink-0">Teacher Feedback:</span>
                                                                    <span className="text-[11px] text-primary dark:text-primary-light font-bold italic truncate">"{task.feedback}"</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                );
                                            })
                                    )}
                                </div>
                            </div>
                        ) : activeTab === 'attendance' ? (
                            /* ATTENDANCE VIEW */
                            <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-8 border border-gray-100 dark:border-slate-800 shadow-sm min-h-[400px]">
                                <StudentAttendanceTab course={myCourses.find(c => c._id === selectedCourseId)} />
                            </div>
                        ) : activeTab === 'chat' ? (
                            /* CHAT VIEW */
                            <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm min-h-[500px]">
                                <StudentChatTab course={myCourses.find(c => c._id === selectedCourseId)} isRestricted={isRestricted} />
                            </div>
                        ) : activeTab === 'tests' ? (
                            /* TESTS VIEW */
                            <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-8 border border-gray-100 dark:border-slate-800 shadow-sm min-h-[400px]">
                                <StudentTestsTab courseId={selectedCourseId} isRestricted={isRestricted} />
                            </div>
                        ) : (
                            /* TESTS VIEW */
                            <div className="bg-white dark:bg-slate-900/40 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm min-h-[400px]">
                                <StudentTestsTab courseId={selectedCourseId} isRestricted={isRestricted} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssignmentSubmission;
