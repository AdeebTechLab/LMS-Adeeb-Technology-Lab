import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle, Clock, Search, Loader2, ExternalLink, Trash2 } from 'lucide-react';
import Badge from '../../../components/ui/Badge';
import api from '../../../services/api';

const DailyTasksTab = ({ course }) => {
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchTasks();
    }, [course._id]);

    const fetchTasks = async () => {
        setIsLoading(true);
        try {
            const res = await api.get(`/daily-tasks/course/${course._id}`);
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

    const submitVerification = async (taskId, status) => {
        setIsSubmitting(true);
        try {
            const res = await api.put(`/daily-tasks/${taskId}/grade`, {
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

    const filteredTasks = tasks.filter(task =>
        task.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                {filteredTasks.map((task) => {
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
