import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    FileText,
    Clock,
    CheckCircle,
    AlertCircle,
    Calendar,
    Link as LinkIcon,
    Send,
    ExternalLink,
    Loader2,
    RefreshCw,
    ClipboardList,
    Plus,
    XCircle,
    GraduationCap
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { assignmentAPI, dailyTaskAPI, enrollmentAPI } from '../../services/api';

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
    const [dailyTasks, setDailyTasks] = useState([]);
    const [newTaskContent, setNewTaskContent] = useState('');
    const [resubmittingTaskId, setResubmittingTaskId] = useState(null);

    useEffect(() => {
        if (location.state?.tab) {
            setActiveTab(location.state.tab);
        }
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
            const enrollments = enrollRes.data.data || [];
            // Show ALL registered courses for the user, regardless of targetAudience 
            // since they are registered in them.
            const internCourses = enrollments
                .map(e => e.course)
                .filter(c => !!c); // Ensure course exists

            setMyCourses(internCourses);
            if (internCourses.length > 0 && !selectedCourseId) {
                const initialCourseId = internCourses[0]._id;
                setSelectedCourseId(initialCourseId);
                fetchDailyTasks(initialCourseId);
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
            setDailyTasks(res.data.data || []);
        } catch (error) {
            console.error('Error fetching daily tasks:', error);
        }
    };

    const handleCourseChange = (courseId) => {
        setSelectedCourseId(courseId);
        fetchDailyTasks(courseId);
    };

    // New state for work link
    const [newTaskLink, setNewTaskLink] = useState('');

    const handleSubmitDailyTask = async (e) => {
        e.preventDefault();
        if (!newTaskContent.trim() || !selectedCourseId) return;

        setIsSubmitting(true);
        try {
            const res = await dailyTaskAPI.submit({
                courseId: selectedCourseId,
                content: newTaskContent,
                workLink: newTaskLink,
                taskId: resubmittingTaskId
            });

            if (resubmittingTaskId) {
                setDailyTasks(prev => prev.map(t => t._id === resubmittingTaskId ? res.data.data : t));
                setResubmittingTaskId(null);
            } else {
                setDailyTasks([res.data.data, ...dailyTasks]);
            }

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
                    courseId: assignment.course?._id || assignment.course,
                    title: assignment.title,
                    course: assignment.course?.title || 'Course',
                    description: assignment.description,
                    deadline: assignment.dueDate,
                    status,
                    submittedAt: mySubmission?.submittedAt || null,
                    submissionLink: mySubmission?.fileUrl || null,
                    grade: mySubmission?.marks || null,
                    totalMarks: assignment.totalMarks || 100,
                    feedback: mySubmission?.feedback || null
                };
            });

            setAssignments(transformedAssignments);

            // Also fetch courses if not already fetched for the dropdown
            if (myCourses.length === 0) {
                const enrollRes = await enrollmentAPI.getMy();
                const enrollments = enrollRes.data.data || [];
                setMyCourses(enrollments.map(e => e.course).filter(c => !!c));
            }

        } catch (error) {
            console.error('Error fetching assignments:', error);
        } finally {
            setIsLoading(false);
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
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Submission Portal</h1>
                    <p className="text-gray-500">Submit your work and view teacher feedback</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => activeTab === 'assignments' ? fetchAssignments() : fetchInternData()}
                        className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors border border-gray-100"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`w-5 h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    {/* Tab Switcher for Interns */}
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('assignments')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'assignments'
                                ? 'bg-white text-emerald-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <FileText className="w-4 h-4 inline mr-2" />
                            Assignments
                        </button>
                        <button
                            onClick={() => setActiveTab('daily_tasks')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'daily_tasks'
                                ? 'bg-white text-emerald-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <ClipboardList className="w-4 h-4 inline mr-2" />
                            {user?.role === 'intern' ? 'Daily Tasks' : 'Class Logs'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Course Selector - High Contrast */}
            <div className="bg-[#f8fafc] p-8 rounded-3xl border-2 border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-emerald-900/5">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
                        <GraduationCap className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter leading-none mb-1">Step 1: Select Your Course</h3>
                        <p className="text-sm text-gray-500 font-medium">Choose a course to unlock its assignments and tasks</p>
                    </div>
                </div>
                <div className="relative w-full md:w-96 group">
                    <select
                        value={selectedCourseId}
                        onChange={(e) => handleCourseChange(e.target.value)}
                        className={`w-full px-6 py-4 bg-white border-2 rounded-2xl outline-none focus:ring-4 transition-all font-black text-lg uppercase tracking-tight appearance-none cursor-pointer ${!selectedCourseId ? 'border-amber-400 text-amber-600 animate-pulse' : 'border-emerald-500 text-emerald-600 shadow-md'
                            }`}
                    >
                        <option value="">-- Choose Course Here --</option>
                        {myCourses.map(c => (
                            <option key={c._id} value={c._id}>{c.title}</option>
                        ))}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                        <div className={`w-3 h-3 border-r-2 border-b-2 rotate-45 transition-colors ${!selectedCourseId ? 'border-amber-400' : 'border-emerald-600'}`}></div>
                    </div>
                </div>
            </div>

            {activeTab === 'assignments' ? (
                /* ASSIGNMENTS VIEW */
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Pending', count: filteredAssignments.filter((a) => a.status === 'pending' && !isDeadlinePassed(a.deadline)).length, color: 'bg-amber-100 text-amber-700' },
                            { label: 'Submitted', count: filteredAssignments.filter((a) => a.status === 'submitted').length, color: 'bg-blue-100 text-blue-700' },
                            { label: 'Graded', count: filteredAssignments.filter((a) => a.status === 'graded').length, color: 'bg-emerald-100 text-emerald-700' },
                            { label: 'Overdue', count: filteredAssignments.filter((a) => a.status === 'overdue' || (a.status === 'pending' && isDeadlinePassed(a.deadline))).length, color: 'bg-red-100 text-red-700' },
                        ].map((stat) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-xl p-4 border border-gray-100"
                            >
                                <span className="text-gray-500 text-sm whitespace-nowrap">{stat.label}</span>
                                <p className={`text-2xl font-black mt-1 ${stat.color.split(' ')[1]}`}>{stat.count}</p>
                            </motion.div>
                        ))}
                    </div>

                    {filteredAssignments.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Assignments Found</h3>
                            <p className="text-gray-500">
                                {selectedCourseId ? "No assignments registered for this specific course." : "No assignments from your enrolled courses will appear here."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredAssignments
                                .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
                                .map((assignment, index) => {
                                    const statusConfig = getStatusConfig(assignment.status, assignment.deadline);
                                    const canSubmit = !isDeadlinePassed(assignment.deadline) && assignment.status === 'pending';

                                    return (
                                        <motion.div
                                            key={assignment.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className={`bg-white rounded-2xl border transition-all overflow-hidden hover:shadow-lg ${isDeadlinePassed(assignment.deadline) && assignment.status === 'pending'
                                                ? 'border-red-500 shadow-lg shadow-red-900/5'
                                                : 'border-gray-100'
                                                } ${assignment.status === 'graded' ? 'opacity-50 grayscale-[0.3]' : ''}`}
                                        >
                                            <div className="p-6">
                                                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 uppercase tracking-tight">ASGN #{index + 1}</span>
                                                            <h3 className="font-bold text-gray-900 text-lg uppercase tracking-tight">{assignment.title}</h3>
                                                            <div className="flex gap-2">
                                                                {assignment.status === 'pending' && <Badge variant="info">ASSIGNED</Badge>}
                                                                <Badge variant={statusConfig.variant}>
                                                                    <statusConfig.icon className="w-3 h-3 mr-1" />
                                                                    {statusConfig.label.toUpperCase()}
                                                                </Badge>
                                                            </div>
                                                        </div>

                                                        <p className="text-sm text-emerald-600 mb-2 font-black tracking-widest uppercase">{assignment.course}</p>
                                                        <p className="text-sm text-gray-500 font-medium leading-relaxed">{assignment.description}</p>

                                                        <div className="flex flex-wrap items-center gap-4 mt-4">
                                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-lg border border-gray-100 text-xs font-bold text-gray-500 uppercase">
                                                                <Calendar className="w-4 h-4" />
                                                                Due: {formatDate(assignment.deadline)}
                                                            </div>
                                                            {canSubmit && (
                                                                <span className={`text-[10px] font-black uppercase tracking-widest ${getTimeRemaining(assignment.deadline).includes('hours') ? 'text-red-500' : 'text-amber-500'
                                                                    }`}>
                                                                    {getTimeRemaining(assignment.deadline)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-2 min-w-[120px]">
                                                        {assignment.status === 'graded' && (
                                                            <div className="text-center px-6 py-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                                                <p className="text-[10px] font-black text-emerald-600 uppercase mb-1 tracking-widest">Score</p>
                                                                <p className="text-2xl font-black text-emerald-700">{assignment.grade}<span className="text-sm text-emerald-400">/{assignment.totalMarks}</span></p>
                                                            </div>
                                                        )}
                                                        {(canSubmit || assignment.status === 'rejected') && (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedAssignment(assignment);
                                                                    setSubmissionUrl('');
                                                                    setSubmissionText('');
                                                                }}
                                                                className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${assignment.status === 'rejected'
                                                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                                                    : 'bg-[#0D2818] hover:bg-[#1A5D3A] text-white'
                                                                    }`}
                                                            >
                                                                <Send className="w-4 h-4" />
                                                                {assignment.status === 'rejected' ? 'Resubmit Work' : 'Submit Work'}
                                                            </button>
                                                        )}

                                                        {assignment.status === 'submitted' && (
                                                            <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-black uppercase text-center border border-blue-100">
                                                                Awaiting Grade
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {selectedAssignment?.id === assignment.id && (
                                                    <div className="mt-6 pt-6 border-t border-gray-100">
                                                        <div className="space-y-4">
                                                            <input
                                                                type="text"
                                                                placeholder="Paste submission link or title here..."
                                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                                value={submissionUrl}
                                                                onChange={(e) => setSubmissionUrl(e.target.value)}
                                                            />
                                                            <textarea
                                                                placeholder="Add any notes for the teacher..."
                                                                rows="3"
                                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                                value={submissionText}
                                                                onChange={(e) => setSubmissionText(e.target.value)}
                                                            />
                                                            <div className="flex gap-3">
                                                                <button
                                                                    onClick={() => setSelectedAssignment(null)}
                                                                    className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    onClick={() => handleSubmit(assignment.id)}
                                                                    disabled={isSubmitting}
                                                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 disabled:bg-gray-300"
                                                                >
                                                                    {isSubmitting ? 'Submitting...' : 'Upload Submission'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                        </div>
                    )}
                </div>
            ) : (
                /* DAILY TASKS / CLASS LOGS VIEW */
                <div className="space-y-6">
                    {/* Submit New Log */}
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-emerald-100 rounded-xl">
                                <ClipboardList className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 uppercase italic leading-none">
                                    {resubmittingTaskId ? (user?.role === 'intern' ? "Update Work Log" : "Update Class Log") : (user?.role === 'intern' ? "Log Today's Work" : "Log Class Session")}
                                </h3>
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1.5">
                                    {resubmittingTaskId ? `RESUBMITTING ${user?.role === 'intern' ? 'LOG' : 'CLASS'}` : `Next: ${user?.role === 'intern' ? 'LOG' : 'CLASS'} #${dailyTasks.length + 1}`}
                                </p>
                            </div>
                        </div>

                        {!selectedCourseId && (
                            <div className="bg-amber-50 text-amber-800 p-4 rounded-xl flex items-center gap-2 text-sm mb-4 border border-amber-100 font-bold uppercase tracking-tight">
                                <AlertCircle className="w-4 h-4" />
                                Please select a course above to enable logging.
                            </div>
                        )}

                        <form onSubmit={handleSubmitDailyTask} className="space-y-4">
                            {user?.role === 'intern' && (
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                                        Work Link (GitHub, Drive, etc.)
                                    </label>
                                    <div className="relative">
                                        <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={newTaskLink}
                                            onChange={(e) => setNewTaskLink(e.target.value)}
                                            placeholder="Paste your link here..."
                                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                                    {user?.role === 'intern' ? 'Work Description' : 'Class Topic / Learnings'}
                                </label>
                                <textarea
                                    value={newTaskContent}
                                    onChange={(e) => setNewTaskContent(e.target.value)}
                                    placeholder={user?.role === 'intern'
                                        ? "Describe the tasks you worked on today, hurdles faced, and goals for tomorrow..."
                                        : "What was taught in this class? What were the key takeaways or specific tasks completed?"}
                                    rows="4"
                                    className="w-full px-6 py-4 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-gray-800 font-medium resize-none shadow-inner"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !newTaskContent.trim() || !selectedCourseId}
                                className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl shadow-emerald-900/10 transition-all flex items-center justify-center gap-3 disabled:grayscale disabled:opacity-50 active:scale-[0.98] ${resubmittingTaskId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#0D2818] hover:bg-[#1A5D3A]'} text-white`}
                            >
                                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                                {resubmittingTaskId ? 'RESUBMIT CORRECTED ENTRY' : (user?.role === 'intern' ? 'SUBMIT DAILY WORK LOG' : 'SUBMIT CLASS LOG ENTRY')}
                            </button>
                            {resubmittingTaskId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setResubmittingTaskId(null);
                                        setNewTaskContent('');
                                        setNewTaskLink('');
                                    }}
                                    className="w-full py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all uppercase text-xs tracking-widest"
                                >
                                    Cancel Resubmission
                                </button>
                            )}
                        </form>
                    </div>

                    {/* Task History */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between ml-2">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                {user?.role === 'intern' ? 'Work History' : 'Academic Class Logs'}
                            </h4>
                            {selectedCourseId && (
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-100">
                                    {myCourses.find(c => c._id === selectedCourseId)?.title}
                                </p>
                            )}
                        </div>
                        {dailyTasks.length === 0 ? (
                            <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                <p className="text-gray-400 font-black uppercase tracking-widest text-xs italic">No entries recorded for this course</p>
                            </div>
                        ) : (
                            [...dailyTasks]
                                .sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt))
                                .map((task, index) => (
                                    <motion.div
                                        key={task._id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={`p-6 rounded-3xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md ${task.status === 'verified' || task.status === 'graded' ? 'opacity-75 grayscale-[0.3]' : ''}`}
                                    >
                                        <div className="flex justify-between items-start gap-4 mb-4">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-[10px] font-black text-white px-3 py-1 rounded-lg uppercase tracking-tight shadow-sm ${task.status === 'verified' || task.status === 'graded' ? 'bg-gray-400 shadow-none' : 'bg-emerald-600 shadow-emerald-200'}`}>
                                                    {user?.role === 'intern' ? 'LOG' : 'CLASS'} #{index + 1}
                                                </span>
                                                <div className="hidden md:flex p-2 bg-gray-50 rounded-xl border border-gray-100">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 tracking-tight uppercase leading-none mb-1">{new Date(task.date || task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest italic">{new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <Badge variant={task.status === 'verified' || task.status === 'graded' ? 'success' : task.status === 'rejected' ? 'error' : 'warning'}>
                                                    {task.status === 'verified' || task.status === 'graded' ? 'VERIFIED ✅' : task.status === 'rejected' ? 'REJECTED ❌' : 'PENDING ⏳'}
                                                </Badge>
                                                {task.status === 'rejected' && (
                                                    <button
                                                        onClick={() => {
                                                            setResubmittingTaskId(task._id);
                                                            setNewTaskContent(task.content);
                                                            setNewTaskLink(task.workLink || '');
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }}
                                                        className="text-[10px] font-black text-amber-600 uppercase underline tracking-tighter hover:text-amber-700"
                                                    >
                                                        Edit & Resubmit
                                                    </button>
                                                )}
                                                <p className="text-[8px] font-black text-gray-300 uppercase italic tracking-widest">
                                                    {task.status === 'verified' || task.status === 'graded' ? 'Archive Locked' : task.status === 'rejected' ? 'Needs Correction' : 'Submission Pending'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {task.workLink && (
                                                <a
                                                    href={task.workLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-[10px] text-emerald-600 font-black uppercase bg-emerald-50 w-fit px-4 py-2 rounded-xl border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all tracking-widest shadow-sm"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                    View Submission
                                                </a>
                                            )}
                                            <div className="text-gray-600 whitespace-pre-wrap leading-relaxed bg-gray-50/50 p-5 rounded-2xl border border-gray-100 text-sm font-medium italic relative group">
                                                <span className="absolute -left-1 -top-1 opacity-10 group-hover:opacity-20 transition-opacity">
                                                    <FileText className="w-8 h-8 rotate-12" />
                                                </span>
                                                "{task.content}"
                                            </div>
                                        </div>

                                        {(task.status === 'graded' || (task.status === 'verified' && task.marks > 0)) && (
                                            <div className="mt-5 flex items-center justify-between p-5 bg-gradient-to-r from-emerald-50 to-white rounded-2xl border border-emerald-100 shadow-sm">
                                                <div className="flex-1">
                                                    <p className="text-[10px] font-black text-emerald-600 uppercase mb-1.5 tracking-widest">Teacher Feedback</p>
                                                    <p className="text-sm text-emerald-900 font-semibold italic">"{task.feedback || 'Excellent work keep it up!'}"</p>
                                                </div>
                                                <div className="text-right pl-6 border-l border-emerald-100 ml-6">
                                                    <p className="text-[10px] font-black text-emerald-600 uppercase mb-1 tracking-widest">Marked</p>
                                                    <p className="text-3xl font-black text-emerald-700 leading-none">{task.marks}<span className="text-[10px] text-emerald-400 ml-0.5">/100</span></p>
                                                </div>
                                            </div>
                                        )}
                                        {task.status === 'verified' && !task.marks && task.feedback && (
                                            <div className="mt-5 p-5 bg-gradient-to-r from-emerald-50 to-white rounded-2xl border border-emerald-100 shadow-sm">
                                                <p className="text-[10px] font-black text-emerald-600 uppercase mb-1.5 tracking-widest">Teacher Feedback</p>
                                                <p className="text-sm text-emerald-900 font-semibold italic">"{task.feedback}"</p>
                                            </div>
                                        )}
                                    </motion.div>
                                ))
                        )}
                    </div>
                </div>
            )
            }
        </div >
    );
};

export default AssignmentSubmission;
