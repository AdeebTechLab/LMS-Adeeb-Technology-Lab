import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle, Clock, Search, Filter, Loader2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import api from '../../../services/api';

const DailyTasksTab = ({ course }) => {
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTask, setSelectedTask] = useState(null);
    const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);

    // Grading Form
    const [marks, setMarks] = useState('');
    const [feedback, setFeedback] = useState('');
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

    const handleGradeClick = (task) => {
        setSelectedTask(task);
        setMarks(task.marks || '');
        setFeedback(task.feedback || '');
        setIsGradeModalOpen(true);
    };

    const handleSubmitGrade = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await api.put(`/daily-tasks/${selectedTask._id}/grade`, {
                marks: Number(marks),
                feedback
            });

            // Update local state
            setTasks(prev => prev.map(t => t._id === selectedTask._id ? res.data.data : t));
            setIsGradeModalOpen(false);
        } catch (error) {
            console.error('Error grading task:', error);
            alert('Failed to submit grade');
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
                <h3 className="text-lg font-bold text-gray-900">Daily Task Submissions</h3>
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
                        .filter(t => (t.user?._id || t.user) === (task.user?._id || task.user))
                        .sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));
                    const logNumber = userTasks.findIndex(t => t._id === task._id) + 1;

                    return (
                        <motion.div
                            key={task._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-md transition-all group"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-base font-bold text-emerald-600 border border-emerald-100">
                                        {task.user?.name?.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100 uppercase tracking-tight">LOG #{logNumber}</span>
                                            <h4 className="font-bold text-gray-900">{task.user?.name}</h4>
                                            <span className="text-xs text-gray-400 font-medium px-2 py-0.5 bg-gray-50 rounded-full border border-gray-100">Intern</span>
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

                                <div className="flex flex-col items-end gap-4">
                                    <Badge variant={task.status === 'graded' ? 'success' : 'warning'}>
                                        {task.status === 'graded' ? 'GRADED ✅' : 'PENDING ⏳'}
                                    </Badge>

                                    {task.status === 'graded' ? (
                                        <div className="text-right bg-emerald-50 px-5 py-2 rounded-2xl border border-emerald-100">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Score</span>
                                                <span className="text-2xl font-black text-emerald-700">{task.marks}<span className="text-sm text-emerald-400">/100</span></span>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleGradeClick(task)}
                                            className="px-6 py-3 bg-[#0D2818] hover:bg-[#1A5D3A] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/10 active:scale-95"
                                        >
                                            ENTER GRADE
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {filteredTasks.length === 0 && !isLoading && (
                    <div className="text-center py-24 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h4 className="text-lg font-bold text-gray-400">No Submissions Found</h4>
                        <p className="text-sm text-gray-400">When interns log their work, it will appear here.</p>
                    </div>
                )}
            </div>

            {/* Grade Modal */}
            <Modal
                isOpen={isGradeModalOpen}
                onClose={() => setIsGradeModalOpen(false)}
                title="Grade Daily Task Submission"
            >
                <form onSubmit={handleSubmitGrade} className="space-y-5">
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mb-4">
                        <p className="text-[10px] font-black text-emerald-600 uppercase mb-2 tracking-widest">Grading Instructions</p>
                        <p className="text-xs text-emerald-800 font-medium">Please evaluate the intern's work log and submitted links. Daily tasks are graded on a scale of 0 to 100.</p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Obtained Marks</label>
                        <div className="relative">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={marks}
                                onChange={(e) => setMarks(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-gray-800"
                                placeholder="0-100"
                                required
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">/ 100</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Grading Feedback</label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium text-gray-800 resize-none"
                            rows="3"
                            placeholder="Provide constructive feedback for the intern..."
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsGradeModalOpen(false)}
                            className="px-6 py-3 text-gray-500 hover:bg-gray-100 rounded-xl font-bold text-xs uppercase"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-3 bg-[#0D2818] hover:bg-[#1A5D3A] text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Grade & Feedback'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default DailyTasksTab;
