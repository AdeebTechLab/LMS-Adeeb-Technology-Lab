import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle, Clock, Search, RefreshCw, ExternalLink, Trash2, Users, ChevronDown, Check, X, BookOpen, XCircle } from 'lucide-react';
import Badge from '../../../components/ui/Badge';
import Loader from '../../../components/ui/Loader';
import { formatDateTime } from '../../../utils/dateFormatter';
import api from '../../../services/api';
import RichTextContent from '../../../components/ui/RichTextContent';
import { stripHtmlToText } from '../../../utils/richText';

const DailyTasksTab = ({ course, students = [] }) => {
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedStudentFilter, setSelectedStudentFilter] = useState('all');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    const [selectedTaskForGrading, setSelectedTaskForGrading] = useState(null);
    const [gradingMarks, setGradingMarks] = useState(10);
    const [gradingFeedback, setGradingFeedback] = useState('');
    const [activeStatFilter, setActiveStatFilter] = useState('all');

    const fetchTasks = async () => {
        const courseId = course?._id || course?.id;
        if (!courseId) return;

        setIsLoading(true);
        try {
            const res = await api.get(`/daily-tasks/course/${courseId}`);
            setTasks(res.data.data || []);
        } catch (error) {
            console.error('Error fetching daily tasks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [course?._id, course?.id]);

    const handleVerifyClick = (task) => {
        setSelectedTaskForGrading(task);
        setGradingMarks(10);
        setGradingFeedback('Keep up the good work! Your progress is excellent.');
    };

    const handleEditGradeClick = (task) => {
        setSelectedTaskForGrading(task);
        setGradingMarks(task.marks !== undefined ? task.marks : 10);
        setGradingFeedback(task.feedback || '');
    };

    const handleMarksChange = (e) => {
        const val = e.target.value;
        setGradingMarks(val);
        
        const numVal = parseFloat(val);
        if (!isNaN(numVal)) {
            const percentage = (numVal / 10) * 100;
            if (percentage >= 90) setGradingFeedback('Excellent! Perfect execution and great attention to detail. Keep it up!');
            else if (percentage >= 85) setGradingFeedback('Outstanding effort! Very well done.');
            else if (percentage >= 80) setGradingFeedback('Great job! Keep up the consistent effort.');
            else if (percentage >= 75) setGradingFeedback('Good work! Solid understanding of the concepts.');
            else if (percentage >= 70) setGradingFeedback('Satisfactory effort. Try to focus more on the requirements.');
            else if (percentage >= 65) setGradingFeedback('Average work. Needs more attention and focus.');
            else if (percentage >= 60) setGradingFeedback('Below expectations. Please review the instructions carefully.');
            else setGradingFeedback("Poor performance. Let's work on the basics and improve.");
        }
    };

    const handleReject = async (task) => {
        if (!confirm('Are you sure you want to reject this submission? The student will be notified to resubmit.')) return;
        submitVerification(task._id, 'rejected', 0, 'Incomplete or incorrect work. Please review and resubmit.');
    };

    const handleDelete = async (task) => {
        if (!confirm('Are you sure you want to delete this log entry permanently?')) return;
        setIsSubmitting(true);
        try {
            await api.delete(`/daily-tasks/${task._id}`);
            setTasks(prev => prev.filter(t => t._id !== task._id));
            alert('Log entry deleted successfully');
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Failed to delete task');
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitVerification = async (taskId, status, marks, feedback) => {
        setIsSubmitting(true);
        try {
            const res = await api.put(`/daily-tasks/${taskId}/grade`, {
                status,
                marks: marks || gradingMarks,
                feedback: feedback || gradingFeedback
            });

            // Update local state
            setTasks(prev => prev.map(t => t._id === taskId ? { ...res.data.data, user: t.user } : t));
            setSelectedTaskForGrading(null);
            alert(`Task ${status === 'verified' ? 'verified' : 'rejected'} successfully`);
        } catch (error) {
            console.error(`Error ${status} task:`, error);
            alert(`Failed to ${status} task`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredTasks = tasks.filter(task => {
        // Only show tasks from students passed in props (active & not completed)
        const isStudentActive = (students || []).some(s => String(s.id || s._id) === String(task.user?._id || task.user));

        if (!isStudentActive) return false;

        // Stat filter
        if (activeStatFilter === 'verified') {
            if (task.status !== 'verified' && task.status !== 'graded') return false;
        }
        if (activeStatFilter === 'pending') {
            if (task.status !== 'submitted' && task.status !== 'pending') return false;
        }
        if (activeStatFilter === 'rejected') {
            if (task.status !== 'rejected') return false;
        }

        // If a specific student is selected, filter to that user only
        if (selectedStudentFilter !== 'all') {
            const userId = String(task.user?._id || task.user);
            if (userId !== String(selectedStudentFilter)) return false;
        }

        const contentText = stripHtmlToText(task.content).toLowerCase();
        const matchesSearch =
            task.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            contentText.includes(searchQuery.toLowerCase());

        return matchesSearch;
    });

    if (isLoading && tasks.length === 0) {
        return (
            <Loader message="Loading submissions..." />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 uppercase italic">
                    {course.targetAudience === 'interns' ? 'Meeting Log Submissions' : 'Class Log Submissions'}
                </h3>
                <button
                    onClick={fetchTasks}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary/5 text-primary rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh Logs
                </button>
            </div>

            {/* Quick Stats Summary Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {[
                    { id: 'all', label: 'Total Submissions', icon: BookOpen, count: tasks.length, color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30', activeColor: 'ring-4 ring-blue-500/20 bg-blue-100 dark:bg-blue-900/40 border-blue-400 scale-105', onClick: () => setActiveStatFilter('all') },
                    { id: 'verified', label: 'Verified Logs', icon: CheckCircle, count: tasks.filter(t => t.status === 'verified' || t.status === 'graded').length, color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30', activeColor: 'ring-4 ring-emerald-500/20 bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400 scale-105', onClick: () => setActiveStatFilter(activeStatFilter === 'verified' ? 'all' : 'verified') },
                    { id: 'pending', label: 'Pending Verification', icon: Clock, count: tasks.filter(t => t.status === 'submitted' || t.status === 'pending').length, color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30', activeColor: 'ring-4 ring-amber-500/20 bg-amber-100 dark:bg-amber-900/40 border-amber-400 scale-105', onClick: () => setActiveStatFilter(activeStatFilter === 'pending' ? 'all' : 'pending') },
                    { id: 'rejected', label: 'Rejected Logs', icon: XCircle, count: tasks.filter(t => t.status === 'rejected').length, color: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30', activeColor: 'ring-4 ring-red-500/20 bg-red-100 dark:bg-red-900/40 border-red-400 scale-105', onClick: () => setActiveStatFilter(activeStatFilter === 'rejected' ? 'all' : 'rejected') },
                ].map((stat) => (
                    <button
                        key={stat.id}
                        onClick={stat.onClick}
                        className={`${stat.color} ${activeStatFilter === stat.id ? stat.activeColor : 'border hover:scale-105'} rounded-2xl p-4 flex items-center justify-between shadow-sm text-left transition-all focus:outline-none`}
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
                <div className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-70 block mb-1">Total Students</span>
                        <p className="text-2xl font-black leading-none">{students.length}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                        <Users className="w-5 h-5 opacity-80" />
                    </div>
                </div>
            </div>

            {/* Student Filter */}
            <div className="relative">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <Users className="w-3 h-3" />
                    Filter by Student
                </p>

                <div className="flex items-center gap-3">
                    <div className="relative min-w-[260px]">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`w-full flex items-center justify-between px-4 py-3 bg-white border-2 rounded-xl transition-all ${isDropdownOpen ? 'border-primary ring-4 ring-primary/10' : 'border-gray-100 hover:border-gray-200'}`}>
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" />
                                <span className="text-sm font-bold text-gray-700">
                                    {selectedStudentFilter === 'all' ? 'All Students' : (students.find(s => String(s.id || s._id) === String(selectedStudentFilter))?.name || 'Select Student')}
                                </span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[60] overflow-hidden">
                                <div className="p-3 border-b border-gray-50 bg-gray-50/50">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search student name..."
                                            value={studentSearchTerm}
                                            onChange={(e) => setStudentSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-primary transition-all font-medium"
                                            onClick={(e) => e.stopPropagation()}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                    <button
                                        onClick={() => { setSelectedStudentFilter('all'); setIsDropdownOpen(false); setStudentSearchTerm(''); }}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedStudentFilter === 'all' ? 'bg-primary/5 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}>
                                        View All Students
                                    </button>

                                    <div className="h-px bg-gray-50 my-1" />

                                    {(students || []).filter(s => s.name.toLowerCase().includes(studentSearchTerm.toLowerCase())).map(student => (
                                        <button
                                            key={student.id || student._id}
                                            onClick={() => { setSelectedStudentFilter(student.id || student._id); setIsDropdownOpen(false); setStudentSearchTerm(''); }}
                                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${String(selectedStudentFilter) === String(student.id || student._id) ? 'bg-primary/5 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}>
                                            <div className="flex items-center gap-3">
                                                {student.photo ? (
                                                    <img src={student.photo} alt={student.name} className="w-6 h-6 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary">{student.name.charAt(0)}</div>
                                                )}
                                                {student.name}
                                            </div>
                                            {String(selectedStudentFilter) === String(student.id || student._id) && <Check className="w-4 h-4" />}
                                        </button>
                                    ))}

                                    {(students || []).filter(s => s.name.toLowerCase().includes(studentSearchTerm.toLowerCase())).length === 0 && (
                                        <div className="py-8 text-center text-xs text-gray-400 font-medium">No students found</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {selectedStudentFilter !== 'all' && (
                        <button onClick={() => setSelectedStudentFilter('all')} className="text-xs font-bold text-red-500 hover:text-red-600 uppercase tracking-wider flex items-center gap-1.5 px-3 py-2 bg-red-50 rounded-lg transition-colors">
                            <X className="w-3 h-3" />
                            Clear Filter
                        </button>
                    )}
                </div>

                {isDropdownOpen && <div className="fixed inset-0 z-[55]" onClick={() => setIsDropdownOpen(false)} />}
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-3 shadow-sm">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by student or content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 outline-none text-gray-700 font-medium"
                />
            </div>

            {/* Task List */}
            <div className="space-y-4">
                {filteredTasks
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map((task) => {
                        // Calculate Log # for this specific user
                        const userTasks = tasks
                            .filter(t => String(t.user?._id || t.user) === String(task.user?._id || task.user))
                            .sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));
                        const logNumber = userTasks.findIndex(t => String(t._id) === String(task._id)) + 1;

                        return (
                            <motion.div
                                key={task._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-md transition-all group ${task.status === 'verified' ? 'opacity-60 bg-gray-50/30' : ''}`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        {task.user?.photo ? (
                                            <img src={task.user.photo} alt={task.user.name} className="w-12 h-12 rounded-full object-cover border border-primary/10" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center text-base font-bold text-primary border border-primary/10">
                                                {task.user?.name?.charAt(0)}
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10 uppercase tracking-tight">
                                                    {task.user?.role === 'intern' ? 'LOG' : 'CLASS'} #{logNumber}
                                                </span>
                                                <h4 className="font-bold text-gray-900">{task.user?.name}</h4>
                                                {task.user?.rollNo && (
                                                    <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">
                                                        {task.user?.rollNo}
                                                    </span>
                                                )}
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${task.user?.role === 'intern' ? 'bg-purple-50 text-primary border-primary/10' : 'bg-blue-50 text-blue-600 border-blue-100'
                                                    }`}>
                                                    {task.user?.role || 'student'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 mb-4 flex items-center gap-1.5 font-medium">
                                                <Clock className="w-3.5 h-3.5" />
                                                {formatDateTime(task.date || task.createdAt)}
                                            </p>

                                            <div className="space-y-3">
                                                {task.workLink && (
                                                    <a
                                                        href={task.workLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 text-sm text-primary font-bold hover:underline bg-primary/5 w-fit px-3 py-2 rounded-xl border border-primary/10"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                        SUBMITTED WORK LINK
                                                    </a>
                                                )}
                                                <RichTextContent
                                                    html={task.content}
                                                    className="bg-gray-50 p-4 rounded-2xl border border-gray-100 italic"
                                                />
                                            </div>

                                            {task.feedback && (
                                                <div className="mt-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                                                    <p className="text-[10px] font-black text-blue-600 uppercase mb-1 tracking-widest">Feedback Given</p>
                                                    <p className="text-sm text-blue-900 font-medium italic">{task.feedback}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-3">
                                        <Badge variant={task.status === 'verified' || task.status === 'graded' ? 'success' : task.status === 'rejected' ? 'error' : 'warning'}>
                                            {task.status === 'verified' || task.status === 'graded' ? 'VERIFIED ✅' : task.status === 'rejected' ? 'REJECTED ❌' : 'PENDING ⏳'}
                                        </Badge>

                                        <div className="flex items-center gap-2">
                                            {(task.status === 'submitted' || task.status === 'rejected') && (
                                                <button
                                                    onClick={() => handleVerifyClick(task)}
                                                    disabled={isSubmitting}
                                                    className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50"
                                                >
                                                    {isSubmitting ? '...' : 'VERIFY'}
                                                </button>
                                            )}
                                            {(task.status === 'verified' || task.status === 'graded') && (
                                                <button
                                                    onClick={() => handleEditGradeClick(task)}
                                                    disabled={isSubmitting}
                                                    className="px-4 py-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                                >
                                                    EDIT GRADE
                                                </button>
                                            )}
                                            {(task.status === 'submitted' || task.status === 'verified' || task.status === 'graded') && (
                                                <button
                                                    onClick={() => handleReject(task)}
                                                    disabled={isSubmitting}
                                                    className="px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {task.status === 'rejected' ? 'REJECTED' : 'REJECT'}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(task)}
                                                disabled={isSubmitting}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete Log"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}

                {filteredTasks.length === 0 && !isLoading && (
                    <div className="text-center py-24 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h4 className="text-lg font-bold text-gray-400">No Submissions Found</h4>
                        <p className="text-sm text-gray-400">When {course.targetAudience === 'interns' ? 'interns' : 'students'} log their work, it will appear here.</p>
                    </div>
                )}
            </div>

            {/* Grading Modal */}
            {selectedTaskForGrading && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => setSelectedTaskForGrading(null)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 border border-gray-100 dark:border-slate-800 flex flex-col" style={{ maxHeight: '90vh' }}
                    >
                        <div className="bg-primary p-8 text-white relative rounded-t-[2.5rem]">
                            <button
                                onClick={() => setSelectedTaskForGrading(null)}
                                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <h3 className="text-xl font-black uppercase tracking-tight mb-1">Verify & Grade Work</h3>
                            <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">Assign marks and feedback for {selectedTaskForGrading.user?.name}</p>
                        </div>

                        {/* Scrollable Content Area */}
                        <div className="overflow-y-auto flex-1 p-8 space-y-6">
                            <div className="bg-gray-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-gray-100 dark:border-slate-800">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Student Log Content</p>
                                <RichTextContent 
                                    html={selectedTaskForGrading.content} 
                                    className="text-sm font-medium text-gray-600 dark:text-gray-400 italic"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Performance Marks (0-10)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        value={gradingMarks}
                                        onChange={handleMarksChange}
                                        className="w-full px-6 py-4 bg-gray-50 dark:bg-black/20 border-2 border-gray-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary font-black text-lg transition-all"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-gray-300 text-lg">/10</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Teacher Feedback</label>
                                <textarea
                                    rows="3"
                                    value={gradingFeedback}
                                    onChange={(e) => setGradingFeedback(e.target.value)}
                                    placeholder="Write a short encouraging feedback..."
                                    className="w-full px-6 py-4 bg-gray-50 dark:bg-black/20 border-2 border-gray-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary font-medium text-sm transition-all resize-none"
                                />
                            </div>
                        </div>

                        {/* Fixed Bottom Buttons */}
                        <div className="flex gap-3 px-8 py-5 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-[2.5rem]">
                            <button
                                onClick={() => setSelectedTaskForGrading(null)}
                                className="flex-1 py-4 px-6 border-2 border-gray-100 dark:border-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => submitVerification(selectedTaskForGrading._id, 'verified')}
                                disabled={isSubmitting}
                                className="flex-2 py-4 px-10 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? 'Processing...' : 'Verify & Post Results'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default DailyTasksTab;



