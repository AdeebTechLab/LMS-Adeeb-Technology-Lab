import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Clock, CheckCircle, Loader2 } from 'lucide-react';
import api from '../../../services/api';

const StudentDailyTasksTab = ({ course }) => {
    const [tasks, setTasks] = useState([]);
    const [newTask, setNewTask] = useState('');
    const [workLink, setWorkLink] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchMyTasks();
    }, [course]);

    const fetchMyTasks = async () => {
        setIsLoading(true);
        try {
            const res = await api.get(`/daily-tasks/my/${course._id}`);
            setTasks(res.data.data || []);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newTask.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await api.post('/daily-tasks', {
                courseId: course._id,
                content: newTask,
                workLink
            });
            setTasks([res.data.data, ...tasks]);
            setNewTask('');
            setWorkLink('');
        } catch (error) {
            console.error('Error submitting task:', error);
            alert('Failed to submit task');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (taskId) => {
        if (!confirm('Are you sure you want to delete this log entry?')) return;
        try {
            await api.delete(`/daily-tasks/${taskId}`);
            setTasks(prev => prev.filter(t => t._id !== taskId));
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Failed to delete task');
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900">{course.targetAudience === 'interns' ? 'Daily Work Log' : 'Class Log Session'}</h3>

            {/* Submit New Task */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="font-semibold text-gray-800 mb-4">{course.targetAudience === 'interns' ? "Log Today's Work" : "Log Class Session"}</h4>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        value={workLink}
                        onChange={(e) => setWorkLink(e.target.value)}
                        placeholder={course.targetAudience === 'interns' ? "Work Link or Title (Optional)" : "Topic / Reference Link (Optional)"}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <textarea
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        placeholder={course.targetAudience === 'interns' ? "What did you work on today?" : "What was taught in this class?"}
                        rows="3"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                    />
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isSubmitting || !newTask.trim()}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Submit Log
                        </button>
                    </div>
                </form>
            </div>

            {/* Task History */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
                    </div>
                ) : (
                    tasks.map((task) => (
                        <motion.div
                            key={task._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`bg-white p-5 rounded-xl border border-gray-100 transition-all ${task.status === 'verified' || task.status === 'graded' ? 'opacity-50 grayscale-[0.2]' : ''}`}
                        >
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${task.status === 'verified' || task.status === 'graded' ? 'bg-emerald-100 text-emerald-700' : task.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {task.status === 'graded' ? 'verified' : task.status}
                                        </span>
                                        <span className="text-xs text-gray-400 font-medium">
                                            {new Date(task.date || task.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>

                                    {task.workLink && (
                                        <a
                                            href={task.workLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-emerald-600 font-bold hover:underline block mb-2"
                                        >
                                            View Work Link ↗
                                        </a>
                                    )}
                                    <p className="text-gray-800 whitespace-pre-wrap text-sm">{task.content}</p>

                                    {task.feedback && (
                                        <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                            <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">Feedback</p>
                                            <p className="text-sm text-blue-800 italic">{task.feedback}</p>
                                        </div>
                                    )}
                                </div>
                                {task.status !== 'verified' && task.status !== 'graded' && (
                                    <button
                                        onClick={() => handleDelete(task._id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        title="Delete Log"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))
                )}

                {tasks.length === 0 && !isLoading && (
                    <p className="text-center text-gray-500 text-sm">No work logs submitted yet.</p>
                )}
            </div>
        </div>
    );
};

export default StudentDailyTasksTab;
