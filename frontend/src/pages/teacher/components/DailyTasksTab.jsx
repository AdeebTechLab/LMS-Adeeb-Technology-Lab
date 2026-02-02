import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle, Clock, Search, Loader2, ExternalLink, Trash2, Users, ChevronDown, Check, X } from 'lucide-react';
import Badge from '../../../components/ui/Badge';
import api from '../../../services/api';

const DailyTasksTab = ({ course, students = [] }) => {
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedStudentFilter, setSelectedStudentFilter] = useState('all');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [studentSearchTerm, setStudentSearchTerm] = useState('');

    useEffect(() => {
        fetchTasks();
    }, [course._id]);

    const fetchTasks = async () => {
        setIsLoading(true);
        try {
            const res = await api.get(`/api/daily-tasks/course/${course._id}`);
            setTasks(res.data.data || []);
        } catch (error) {
            console.error('Error fetching daily tasks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyClick = (task) => {
        submitVerification(task._id, 'verified');
    };

    const handleReject = async (task) => {
        if (!confirm('Are you sure you want to reject this submission? The student will be notified to resubmit.')) return;
        submitVerification(task._id, 'rejected');
    };

    const handleDelete = async (task) => {
        if (!confirm('Are you sure you want to delete this log entry permanently?')) return;
        setIsSubmitting(true);
        try {
            await api.delete(`/ daily - tasks / ${task._id} `);
            setTasks(prev => prev.filter(t => t._id !== task._id));
            alert('Log entry deleted successfully');
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Failed to delete task');
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitVerification = async (taskId, status) => {
        setIsSubmitting(true);
        try {
            const res = await api.put(`/ daily - tasks / ${taskId}/grade`, {
                status
            });

            // Update local state
            setTasks(prev => prev.map(t => t._id === taskId ? res.data.data : t));
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

        // If a specific student is selected, filter to that user only
        if (selectedStudentFilter !== 'all') {
            const userId = String(task.user?._id || task.user);
            if (userId !== String(selectedStudentFilter)) return false;
        }

        const matchesSearch = task.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.content?.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesSearch;
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 uppercase italic">
                    {course.targetAudience === 'interns' ? 'Daily Task Submissions' : 'Class Log Submissions'}
                </h3>
                <button onClick={fetchTasks} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                    <Loader2 className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
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
                            className={`w-full flex items-center justify-between px-4 py-3 bg-white border-2 rounded-xl transition-all ${isDropdownOpen ? 'border-emerald-500 ring-4 ring-emerald-500/10' : 'border-gray-100 hover:border-gray-200'}`}>
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-600" />
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
                                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500 transition-all font-medium"
                                            onClick={(e) => e.stopPropagation()}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                    <button
                                        onClick={() => { setSelectedStudentFilter('all'); setIsDropdownOpen(false); setStudentSearchTerm(''); }}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedStudentFilter === 'all' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                                        View All Students
                                    </button>

                                    <div className="h-px bg-gray-50 my-1" />

                                    {(students || []).filter(s => s.name.toLowerCase().includes(studentSearchTerm.toLowerCase())).map(student => (
                                        <button
                                            key={student.id || student._id}
                                            onClick={() => { setSelectedStudentFilter(student.id || student._id); setIsDropdownOpen(false); setStudentSearchTerm(''); }}
                                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${String(selectedStudentFilter) === String(student.id || student._id) ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] text-emerald-700">{student.name.charAt(0)}</div>
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
                                        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-base font-bold text-emerald-600 border border-emerald-100">
                                            {task.user?.name?.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 uppercase tracking-tight">
                                                    {task.user?.role === 'intern' ? 'LOG' : 'CLASS'} #{logNumber}
                                                </span>
                                                <h4 className="font-bold text-gray-900">{task.user?.name}</h4>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${task.user?.role === 'intern' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                                                    }`}>
                                                    {task.user?.role || 'student'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 mb-4 flex items-center gap-1.5 font-medium">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(task.date || task.createdAt).toLocaleDateString()} at {new Date(task.createdAt).toLocaleTimeString()}
                                            </p>

                                            <div className="space-y-3">
                                                {task.workLink && (
                                                    <a
                                                        href={task.workLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 text-sm text-emerald-600 font-bold hover:underline bg-emerald-50 w-fit px-3 py-2 rounded-xl border border-emerald-100"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                        SUBMITTED WORK LINK
                                                    </a>
                                                )}
                                                <div className="bg-gray-50 p-4 rounded-2xl text-gray-700 text-sm whitespace-pre-wrap italic border border-gray-100 leading-relaxed">
                                                    "{task.content}"
                                                </div>
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
                                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50"
                                                >
                                                    {isSubmitting ? '...' : 'VERIFY'}
                                                </button>
                                            )}
                                            {task.status === 'submitted' && (
                                                <button
                                                    onClick={() => handleReject(task)}
                                                    disabled={isSubmitting}
                                                    className="px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    REJECT
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
        </div>
    );
};

export default DailyTasksTab;
