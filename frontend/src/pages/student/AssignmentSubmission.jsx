import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle, Clock, Calendar, Search, Filter, AlertCircle, XCircle, ChevronLeft, ChevronRight,
    BookOpen, GraduationCap, ArrowRight, ExternalLink, Send, FileText, ClipboardList, Plus, Link as LinkIcon, MessageCircle, MapPin, Zap, X
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Loader, { ButtonLoader } from '../../components/ui/Loader';
import { assignmentAPI, courseAPI, dailyTaskAPI, enrollmentAPI, chatAPI, feeAPI } from '../../services/api';
import StudentChatTab from './components/StudentChatTab';
import StudentAttendanceTab from './components/StudentAttendanceTab';
import StudentTestsTab from './components/StudentTestsTab';
import { io } from 'socket.io-client';

const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return rawUrl.replace('/api', '');
};

const SOCKET_URL = getSocketURL();

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
    const [newTaskLink, setNewTaskLink] = useState('');
    const [newTaskContent, setNewTaskContent] = useState('');
    const [resubmittingTaskId, setResubmittingTaskId] = useState(null);
    const [currentEnrollment, setCurrentEnrollment] = useState(null);
    const socketRef = useRef();

    useEffect(() => {
        fetchMyCourses();
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
        }
    }, [location.state]);

    const fetchMyCourses = async () => {
        setIsLoading(true);
        try {
            const res = await enrollmentAPI.getMy();
            const enrollments = res.data.data || [];
            // Filter only verified and active/completed courses
            const activeEnrollments = enrollments.filter(e => e.status === 'enrolled' || e.status === 'completed');
            setMyCourses(activeEnrollments.map(e => ({
                ...e.course,
                enrollmentStatus: e.status,
                isPaused: e.isPaused,
                isActive: e.isActive,
                enrollmentId: e._id
            })));
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
        } catch (error) {
            console.error('Error fetching course data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (assignmentId) => {
        if (!submissionUrl.trim() && !submissionText.trim()) return;
        setIsSubmitting(true);
        try {
            // Build FormData so multipart/form-data content-type is satisfied
            const formData = new FormData();
            if (submissionUrl.trim()) formData.append('fileUrl', submissionUrl.trim());
            if (submissionText.trim()) formData.append('notes', submissionText.trim());

            await assignmentAPI.submit(assignmentId, formData);
            setSelectedAssignment(null);
            setSubmissionUrl('');
            setSubmissionText('');
            fetchCourseData();
        } catch (error) {
            console.error('Submission failed:', error);
            alert(error.response?.data?.message || 'Failed to submit assignment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitDailyTask = async (e) => {
        e.preventDefault();
        if (!newTaskContent.trim()) return;
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

    const isDeadlinePassed = (deadline) => new Date(deadline) < new Date();
    
    const formatDate = (date) => new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

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

    const filteredAssignments = assignments;

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
                                        <div>
                                            <Badge variant={course.enrollmentStatus === 'completed' ? 'success' : 'info'}>{course.enrollmentStatus.toUpperCase()}</Badge>
                                            <h3 className="font-black text-gray-900 dark:text-white text-xl mt-1 group-hover:text-primary transition-colors">{course.title}</h3>
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
                    {/* Course Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/40 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSelectedCourseId(null)}
                                className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/5 transition-all"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{myCourses.find(c => c._id === selectedCourseId)?.title}</h2>
                                <div className="flex items-center gap-3 mt-1">
                                    <Badge variant="primary" size="sm">Workspace ACTIVE</Badge>
                                    {isRestricted && <Badge variant="error" size="sm">PORTAL LOCKED</Badge>}
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Tabs & Actions */}
                        <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
                            {/* Tabs */}
                            {/* Tabs - Styled like Teacher Portal */}
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-xl p-1 border border-gray-100 dark:border-slate-800 shadow-sm overflow-x-auto custom-scrollbar no-scrollbar min-w-0 max-w-full">
                                {[
                                    { id: 'daily_tasks', label: 'Class Log', icon: ClipboardList },
                                    { id: 'assignments', label: role === 'intern' ? 'Daily Task' : 'Assignments', icon: FileText },
                                    { id: 'tests', label: 'Tests', icon: Zap },
                                    { id: 'attendance', label: 'Attendance', icon: Calendar },
                                    { id: 'chat', label: 'Chat', icon: MessageCircle },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 py-2.5 px-5 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${activeTab === tab.id
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`} />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Book Action Button */}
                            {myCourses.find(c => c._id === selectedCourseId)?.bookLink && (
                                <button
                                    onClick={() => window.open(myCourses.find(c => c._id === selectedCourseId)?.bookLink, '_blank')}
                                    className="group relative flex items-center gap-2.5 px-6 py-2.5 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black uppercase tracking-widest text-xs hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-lg hover:shadow-xl shadow-gray-900/20 dark:shadow-white/20 ml-auto md:ml-0 border border-gray-800 dark:border-gray-200"
                                    title="Open Course Book"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
                                    <div className="bg-white/20 dark:bg-black/10 p-1.5 rounded-lg group-hover:-rotate-12 transition-transform duration-300 relative z-10">
                                        <BookOpen className="w-4 h-4" />
                                    </div>
                                    <span className="hidden sm:inline relative z-10">Read Book</span>
                                    <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity relative z-10 ml-1" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[500px]">
                        {isLoading ? (
                            <div className="h-[400px]">
                                <Loader message="Synchronizing Workspace..." />
                            </div>
                        ) : activeTab === 'assignments' ? (
                            /* ASSIGNMENTS VIEW */
                            <div className="space-y-8">
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Total', icon: FileText, count: filteredAssignments.length, color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30' },
                                        { label: 'Completed', icon: CheckCircle, count: filteredAssignments.filter((a) => { const s = a.submissions?.[0]?.status; return s === 'graded' || s === 'submitted'; }).length, color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30' },
                                        { label: 'Pending', icon: Clock, count: filteredAssignments.filter((a) => { const s = a.submissions?.[0]?.status || 'pending'; return (s === 'pending' || s === 'rejected') && !isDeadlinePassed(a.dueDate); }).length, color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30' },
                                        { label: 'Overdue', icon: AlertCircle, count: filteredAssignments.filter((a) => { const s = a.submissions?.[0]?.status || 'pending'; return (s === 'pending' || s === 'rejected') && isDeadlinePassed(a.dueDate); }).length, color: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30' },
                                    ].map((stat) => (
                                        <div key={stat.label} className={`${stat.color} rounded-2xl p-4 border flex items-center justify-between shadow-sm`}>
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-widest opacity-70 block mb-1">{stat.label}</span>
                                                <p className="text-2xl font-black leading-none">{stat.count}</p>
                                            </div>
                                            <div className={`p-2 rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-sm`}>
                                                <stat.icon className="w-5 h-5 opacity-80" />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {filteredAssignments.length === 0 ? (
                                    <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-20 border border-gray-100 dark:border-slate-800 text-center">
                                        <FileText className="w-20 h-20 text-gray-200 mx-auto mb-6" />
                                        <h3 className="text-2xl font-black text-gray-400 uppercase tracking-widest">No Assignments Found</h3>
                                        <p className="text-gray-400 font-medium mt-2">Check back later for new tasks</p>
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
                                            // Can resubmit if deadline was extended and it's not passed, even for graded/submitted
                                            const canResubmit = !deadlinePassed && (submissionStatus === 'graded' || submissionStatus === 'submitted') && !isRestricted && !isCompleted;
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
                                                                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">TASK #{index + 1}</span>
                                                                    <h3 className="font-black text-gray-900 dark:text-white text-lg uppercase tracking-tight group-hover:text-primary transition-colors">{assignment.title}</h3>
                                                                </div>
                                                            </div>
                                                            <Badge variant={statusConfig.variant}>{statusConfig.label.toUpperCase()}</Badge>
                                                        </div>

                                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-6 whitespace-pre-wrap">
                                                            {assignment.description}
                                                        </p>

                                                        <div className="mt-auto pt-6 border-t border-gray-50 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                                                            <div className="flex flex-wrap items-center gap-3">
                                                                <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/10 dark:border-primary/30">
                                                                    <Calendar className="w-4 h-4 text-primary" />
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest leading-none mb-1">Dead Line</p>
                                                                        <p className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight">{formatDate(assignment.dueDate)}</p>
                                                                    </div>
                                                                </div>
                                                                {canSubmit && (
                                                                    <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 animate-pulse">
                                                                        <Clock className="w-4 h-4 text-amber-500" />
                                                                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                                                                            {getTimeRemaining(assignment.dueDate)}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {(canSubmit || canResubmit) && selectedAssignment?._id !== assignment._id && (
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedAssignment(assignment);
                                                                        setSubmissionUrl(submissionLink || '');
                                                                        setSubmissionText(submissionNotes || '');
                                                                    }}
                                                                    disabled={isRestricted}
                                                                    className={`px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all text-white shadow-xl hover:shadow-2xl hover:scale-[1.03] active:scale-[0.98] ${submissionStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' : canResubmit ? 'bg-blue-600 hover:bg-blue-700' : 'bg-primary hover:bg-[#e67e00]'} disabled:bg-gray-300 flex items-center justify-center gap-2 w-full sm:w-auto`}
                                                                >
                                                                    <Send className="w-4 h-4" />
                                                                    {isRestricted ? 'PORTAL LOCKED' : (submissionStatus === 'rejected' ? 'RESUBMIT' : canResubmit ? 'RESUBMIT' : 'SUBMIT WORK')}
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Results/Feedback Display */}
                                                        {(submissionStatus === 'submitted' || submissionStatus === 'graded') && (
                                                            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                                                                {submissionStatus === 'graded' && submissionMarks !== undefined && (
                                                                    <div className="bg-primary/5 dark:bg-primary/20 p-4 rounded-2xl border border-primary/10 text-center">
                                                                        <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">Final Result</p>
                                                                        <p className="text-3xl font-black text-primary">{submissionMarks}<span className="text-lg">/{assignment.totalMarks}</span></p>
                                                                    </div>
                                                                )}
                                                                {submissionStatus === 'graded' && submissionFeedback && (
                                                                    <div className="lg:col-span-2 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100">
                                                                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-2"><MessageCircle className="w-3 h-3" /> Teacher Feedback</p>
                                                                        <p className="text-[11px] text-gray-800 dark:text-gray-200 italic">"{submissionFeedback}"</p>
                                                                    </div>
                                                                )}
                                                                <div className={`p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 ${submissionStatus !== 'graded' ? 'lg:col-span-3' : ''}`}>
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">My Submission</p>
                                                                    {submissionLink && (
                                                                        <a href={submissionLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-bold text-blue-600 hover:underline">
                                                                            <LinkIcon className="w-3.5 h-3.5" /> View Submitted Work
                                                                        </a>
                                                                    )}
                                                                    {submissionNotes && <p className="text-[10px] text-slate-600 mt-2 italic">"{submissionNotes}"</p>}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {submissionStatus === 'rejected' && submissionFeedback && (
                                                            <div className="mt-6 bg-red-50 dark:bg-red-900/10 p-5 rounded-2xl border border-red-200">
                                                                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 flex items-center gap-2"><XCircle className="w-3 h-3" /> Rejection Reason</p>
                                                                <p className="text-xs text-red-800 dark:text-red-200 font-medium">"{submissionFeedback}"</p>
                                                            </div>
                                                        )}
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
                                            <motion.div initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }} className="bg-white dark:bg-[#0f172a] w-full max-w-xl rounded-2xl shadow-2xl border border-white/20 relative z-10 overflow-hidden">
                                                <div className="bg-primary p-10 text-white relative">
                                                    <h3 className="text-2xl font-black uppercase tracking-tight leading-none mb-2">Submit Assignment</h3>
                                                    <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Share your work link and notes for evaluation</p>
                                                    <button onClick={() => setSelectedAssignment(null)} className="absolute top-8 right-8 w-10 h-10 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-white"><X className="w-5 h-5" /></button>
                                                </div>
                                                <div className="p-10 space-y-8">
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Work Link</label>
                                                            <input type="text" placeholder="e.g. GitHub, Drive, or Portfolio Link" value={submissionUrl} onChange={(e) => setSubmissionUrl(e.target.value)} className="w-full px-6 py-5 bg-slate-50 dark:bg-black/40 border-2 border-slate-100 dark:border-slate-800 rounded-3xl outline-none focus:border-primary font-bold transition-all text-sm" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Notes</label>
                                                            <textarea placeholder="Any additional notes for the teacher..." rows="4" value={submissionText} onChange={(e) => setSubmissionText(e.target.value)} className="w-full px-6 py-5 bg-slate-50 dark:bg-black/40 border-2 border-slate-100 dark:border-slate-800 rounded-3xl outline-none focus:border-primary font-bold transition-all resize-none text-sm" />
                                                        </div>
                                                    </div>
                                                    <button onClick={() => handleSubmit(selectedAssignment._id)} disabled={isSubmitting} className="w-full py-5 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-3xl shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3">
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
                                <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-10 border border-gray-100 dark:border-slate-800 shadow-sm">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Post Daily Activity Log</h3>
                                    </div>
                                    <form onSubmit={handleSubmitDailyTask} className="space-y-6">

                                        <div>
                                            <textarea 
                                                value={newTaskContent} 
                                                onChange={(e) => {
                                                    setNewTaskContent(e.target.value);
                                                    e.target.style.height = 'auto';
                                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                                }} 
                                                disabled={isRestricted || isCompleted} 
                                                placeholder="Describe what you worked on today, your achievements, and any challenges..." 
                                                rows={4} 
                                                className="w-full px-6 py-5 bg-gray-50 dark:bg-black/40 border border-primary rounded-3xl outline-none focus:ring-4 focus:ring-primary/10 transition-all resize-none text-sm font-medium disabled:opacity-50 min-h-[120px] overflow-hidden" 
                                            />
                                        </div>
                                        <button type="submit" disabled={isSubmitting || !newTaskContent.trim() || isRestricted || isCompleted} className="w-full py-6 bg-primary text-white rounded-[1.5rem] font-black text-lg tracking-widest uppercase shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:grayscale disabled:opacity-50">
                                            <ButtonLoader isLoading={isSubmitting} icon={<Send className="w-6 h-6" />}>
                                                {isCompleted ? 'WORK LOG ARCHIVED' : (isRestricted ? 'PORTAL LOCKED' : (resubmittingTaskId ? 'UPDATE LOG ENTRY' : 'COMMIT DAILY LOG'))}
                                            </ButtonLoader>
                                        </button>
                                    </form>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] text-center my-10">Activity History</h4>
                                    {dailyTasks.length === 0 ? (
                                        <div className="py-20 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                                            <Clock className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No historical data found</p>
                                        </div>
                                    ) : (
                                        [...dailyTasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((task, idx) => (
                                            <motion.div key={task._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} className="bg-white dark:bg-slate-900/40 p-7 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-slate-700">
                                                            <p className="text-[10px] font-black text-gray-900 dark:text-white leading-none">{new Date(task.date || task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                                        </div>
                                                        <Badge variant={task.status === 'verified' ? 'success' : 'warning'}>{task.status.toUpperCase()}</Badge>
                                                    </div>
                                                    {task.status === 'rejected' && (
                                                        <button onClick={() => { setResubmittingTaskId(task._id); setNewTaskContent(task.content); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-[10px] font-black text-primary underline uppercase tracking-widest">Edit & Re-commit</button>
                                                    )}
                                                </div>
                                                <div className="bg-gray-50/50 dark:bg-black/20 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 text-sm italic text-gray-600 dark:text-gray-400 font-medium leading-relaxed mb-4 whitespace-pre-wrap">"{task.content}"</div>
                                                {task.workLink && <a href={task.workLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[10px] font-black text-primary uppercase hover:bg-primary/5 w-fit px-3 py-1.5 rounded-lg border border-primary/10 transition-all"><ExternalLink className="w-3.5 h-3.5" /> View Work</a>}
                                                {task.feedback && (
                                                    <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-800">
                                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Teacher Evaluation</p>
                                                        <p className="text-sm font-semibold italic text-primary">"{task.feedback}"</p>
                                                        {task.marks !== undefined && (
                                                            <div className="mt-4 flex items-center justify-between bg-primary/5 p-4 rounded-xl border border-primary/10">
                                                                <span className="text-xs font-black text-primary uppercase tracking-tight">Proficiency Level</span>
                                                                <span className="text-xl font-black text-primary">{task.marks}<span className="text-xs">/100</span></span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))
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
                                <StudentChatTab course={myCourses.find(c => c._id === selectedCourseId)} isRestricted={false} />
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
