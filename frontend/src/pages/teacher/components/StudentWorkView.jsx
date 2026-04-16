import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, Loader2, FileText, ClipboardList, User,
    CheckCircle, Clock, XCircle, ExternalLink, Upload,
    BookOpen, Tag, Calendar, AlertCircle
} from 'lucide-react';
import { assignmentAPI, enrollmentAPI } from '../../../services/api';
import api from '../../../services/api';
import Badge from '../../../components/ui/Badge';

const TAB_ASSIGNMENTS = 'assignments';
const TAB_DAILY_TASKS = 'daily_tasks';

const statusVariant = {
    graded: 'success',
    verified: 'success',
    rejected: 'error',
    submitted: 'warning',
    pending: 'warning',
};
const statusIcon = {
    graded: <CheckCircle className="w-3.5 h-3.5" />,
    verified: <CheckCircle className="w-3.5 h-3.5" />,
    rejected: <XCircle className="w-3.5 h-3.5" />,
    submitted: <Clock className="w-3.5 h-3.5" />,
    pending: <Clock className="w-3.5 h-3.5" />,
};

const StudentWorkView = ({ student, onBack }) => {
    const [activeTab, setActiveTab] = useState(TAB_ASSIGNMENTS);
    const [assignments, setAssignments] = useState([]);
    const [dailyTasks, setDailyTasks] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStudentWork();
    }, [student]);

    const loadStudentWork = async () => {
        setIsLoading(true);
        try {
            const studentId = student.id || student._id;

            // 1. Get all enrollments to know which courses the student is in
            const enrollRes = await enrollmentAPI.getAll();
            const allEnrollments = enrollRes.data.data || [];
            const studentEnrollments = allEnrollments.filter(e => {
                const uid = String(e.user?._id || e.user);
                return uid === String(studentId);
            });
            setEnrollments(studentEnrollments);

            // 2. Get all assignments for this student (cross-course)
            const assignRes = await assignmentAPI.getUserAssignments(studentId);
            setAssignments(assignRes.data.assignments || []);

            // 3. Fetch daily tasks from each enrolled course
            const courseIds = studentEnrollments.map(e => e.course?._id || e.course);
            const taskPromises = courseIds.map(cId =>
                api.get(`/daily-tasks/course/${cId}`)
                    .then(res => res.data.data || [])
                    .catch(() => [])
            );
            const taskArrays = await Promise.all(taskPromises);
            const allTasks = taskArrays.flat()
                .filter(t => String(t.user?._id || t.user) === String(studentId));
            setDailyTasks(allTasks);
        } catch (err) {
            console.error('Error loading student work:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const assignmentsWithSubmission = assignments.filter(a => a.submissions && a.submissions.length > 0);
    const assignmentsWithoutSubmission = assignments.filter(a => !a.submissions || a.submissions.length === 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold text-sm tracking-wide"
                >
                    <ChevronLeft className="w-4 h-4" />
                    BACK TO SEARCH
                </button>
            </div>

            {/* Student Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-emerald-100 shadow">
                    {student.photo ? (
                        <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-black text-2xl">
                            {(student.name || 'S').charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div className="flex-1">
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{student.name}</h2>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                        {student.rollNo && (
                            <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">
                                {student.rollNo}
                            </span>
                        )}
                        {student.email && (
                            <span className="text-xs text-gray-400 font-medium">{student.email}</span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${student.role === 'intern' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {student.role || 'Student'}
                        </span>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="hidden sm:flex gap-6">
                    <div className="text-center">
                        <p className="text-2xl font-black text-emerald-600">{enrollments.length}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Courses</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-black text-blue-600">{assignments.length}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Assignments</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-black text-purple-600">{dailyTasks.length}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Daily Logs</p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 bg-gray-100/80 p-1.5 rounded-2xl w-fit border border-gray-200">
                <button
                    onClick={() => setActiveTab(TAB_ASSIGNMENTS)}
                    className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === TAB_ASSIGNMENTS
                        ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100'
                        : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                        }`}
                >
                    <FileText className="w-4 h-4" />
                    Assignments
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${activeTab === TAB_ASSIGNMENTS ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                        {assignments.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab(TAB_DAILY_TASKS)}
                    className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === TAB_DAILY_TASKS
                        ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100'
                        : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                        }`}
                >
                    <ClipboardList className="w-4 h-4" />
                    Daily Tasks / Class Logs
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${activeTab === TAB_DAILY_TASKS ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                        {dailyTasks.length}
                    </span>
                </button>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/50 min-h-[400px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                        <span className="text-gray-500 font-medium">Loading student work...</span>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {activeTab === TAB_ASSIGNMENTS && (
                            <motion.div
                                key="assignments"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-gray-900 text-lg">All Assignments</h3>
                                    <div className="flex gap-3">
                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                            {assignmentsWithSubmission.length} submitted
                                        </span>
                                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                                            {assignmentsWithoutSubmission.length} not submitted
                                        </span>
                                    </div>
                                </div>

                                {assignments.length === 0 ? (
                                    <div className="text-center py-16">
                                        <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                        <p className="text-gray-400 font-medium">No assignments found for this student.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {assignments
                                            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                            .map((assignment, idx) => {
                                                const submission = assignment.submissions?.[0];
                                                const isOverdue = new Date(assignment.dueDate) < new Date();

                                                return (
                                                    <motion.div
                                                        key={assignment._id}
                                                        initial={{ opacity: 0, y: 8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        className="bg-gray-50 rounded-2xl p-5 border border-gray-100"
                                                    >
                                                        <div className="flex items-start justify-between gap-4 mb-3">
                                                            <div className="flex-1">
                                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                    <span className="text-[10px] font-black text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-200 uppercase tracking-tight">
                                                                        ASGN #{idx + 1}
                                                                    </span>
                                                                    <h4 className="font-bold text-gray-900 uppercase tracking-tight">{assignment.title}</h4>
                                                                    {isOverdue && !submission && (
                                                                        <Badge variant="error">Overdue</Badge>
                                                                    )}
                                                                </div>
                                                                {assignment.course?.title && (
                                                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1">
                                                                        <BookOpen className="w-3 h-3" />
                                                                        {assignment.course.title}
                                                                    </div>
                                                                )}
                                                                {assignment.description && (
                                                                    <p className="text-xs text-gray-500 font-medium mt-1 line-clamp-2">{assignment.description}</p>
                                                                )}
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                {submission ? (
                                                                    <div className="flex flex-col items-end gap-1">
                                                                        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${submission.status === 'graded' ? 'bg-emerald-50 text-emerald-700' : submission.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                                                                            {statusIcon[submission.status] || statusIcon.pending}
                                                                            {submission.status === 'graded' ? 'GRADED' : submission.status === 'rejected' ? 'REJECTED' : 'PENDING'}
                                                                        </div>
                                                                        {submission.status === 'graded' && submission.marks !== undefined && (
                                                                            <p className="text-lg font-black text-emerald-600">
                                                                                {submission.marks}
                                                                                <span className="text-xs text-emerald-400 font-bold">/{assignment.totalMarks}</span>
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg uppercase">
                                                                        Not Submitted
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Submission Details */}
                                                        {submission && (
                                                            <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                                                                {submission.notes && (
                                                                    <div className="bg-white p-3 rounded-xl border border-gray-100">
                                                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Student Notes</p>
                                                                        <p className="text-sm text-gray-700 italic font-medium whitespace-pre-wrap">{submission.notes}</p>
                                                                    </div>
                                                                )}
                                                                {submission.fileUrl && (
                                                                    <a
                                                                        href={submission.fileUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 border border-blue-100 transition-colors"
                                                                    >
                                                                        <Upload className="w-3.5 h-3.5" />
                                                                        VIEW ATTACHED FILE
                                                                    </a>
                                                                )}
                                                                {submission.feedback && (
                                                                    <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                                                                        <p className="text-[10px] font-black text-blue-500 uppercase mb-1 tracking-widest">Teacher Feedback</p>
                                                                        <p className="text-sm text-blue-900 italic font-medium">{submission.feedback}</p>
                                                                    </div>
                                                                )}
                                                                <p className="text-[10px] text-gray-400 font-medium">
                                                                    Submitted: {new Date(submission.submittedAt).toLocaleString()}
                                                                </p>
                                                            </div>
                                                        )}

                                                        <div className="mt-3 flex items-center gap-3 text-[10px] text-gray-400 font-bold uppercase">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" />
                                                                Due: {new Date(assignment.dueDate).toLocaleDateString()}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Tag className="w-3 h-3" />
                                                                {assignment.totalMarks} marks
                                                            </span>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === TAB_DAILY_TASKS && (
                            <motion.div
                                key="daily_tasks"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-gray-900 text-lg">Daily Tasks / Class Logs</h3>
                                    <div className="flex gap-3">
                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                            {dailyTasks.filter(t => t.status === 'verified' || t.status === 'graded').length} verified
                                        </span>
                                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                                            {dailyTasks.filter(t => t.status === 'submitted' || t.status === 'pending').length} pending
                                        </span>
                                    </div>
                                </div>

                                {dailyTasks.length === 0 ? (
                                    <div className="text-center py-16">
                                        <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                        <p className="text-gray-400 font-medium">No daily tasks or logs found for this student.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {[...dailyTasks]
                                            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                            .map((task, idx) => (
                                                <motion.div
                                                    key={task._id}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className={`bg-gray-50 rounded-2xl p-5 border border-gray-100 ${task.status === 'verified' || task.status === 'graded' ? 'opacity-70' : ''}`}
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 uppercase tracking-tight">
                                                                    LOG #{dailyTasks.length - idx}
                                                                </span>
                                                                <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    {new Date(task.date || task.createdAt).toLocaleDateString()} at {new Date(task.createdAt).toLocaleTimeString()}
                                                                </span>
                                                            </div>

                                                            {task.workLink && (
                                                                <a
                                                                    href={task.workLink}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 text-xs text-emerald-600 font-bold hover:underline bg-emerald-50 w-fit px-3 py-1.5 rounded-xl border border-emerald-100 mb-3"
                                                                >
                                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                                    VIEW WORK LINK
                                                                </a>
                                                            )}

                                                            <div className="bg-white p-4 rounded-2xl text-gray-700 text-sm whitespace-pre-wrap italic border border-gray-100 leading-relaxed">
                                                                "{task.content}"
                                                            </div>

                                                            {task.feedback && (
                                                                <div className="mt-3 p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                                                                    <p className="text-[10px] font-black text-blue-500 uppercase mb-1 tracking-widest">Feedback Given</p>
                                                                    <p className="text-sm text-blue-900 italic font-medium">{task.feedback}</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex-shrink-0">
                                                            <Badge variant={statusVariant[task.status] || 'warning'}>
                                                                {task.status === 'verified' || task.status === 'graded'
                                                                    ? 'VERIFIED ✅'
                                                                    : task.status === 'rejected'
                                                                        ? 'REJECTED ❌'
                                                                        : 'PENDING ⏳'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default StudentWorkView;
