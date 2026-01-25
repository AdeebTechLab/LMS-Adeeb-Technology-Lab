import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
    Search, Calendar, Briefcase, CheckCircle, Send, Upload, CreditCard, Loader2, RefreshCw, AlertCircle, Link, Trash2
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { taskAPI } from '../../services/api';
import TaskChat from './components/TaskChat';
import { io } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api', '');

const BrowseTasks = () => {
    const { user } = useSelector((state) => state.auth);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('available');
    const [selectedTask, setSelectedTask] = useState(null);
    const [applyModalOpen, setApplyModalOpen] = useState(false);
    const [submitModalOpen, setSubmitModalOpen] = useState(false);
    const [chatModalOpen, setChatModalOpen] = useState(false);
    const [applicationMessage, setApplicationMessage] = useState('');
    const [submission, setSubmission] = useState({ notes: '', projectLink: '', accountDetails: '' });
    const [tasks, setTasks] = useState([]);
    const [myTasks, setMyTasks] = useState([]);
    const [isFetching, setIsFetching] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch tasks on component mount
    useEffect(() => {
        fetchTasks();

        // Socket for real-time unread updates
        const socket = io(SOCKET_URL, { withCredentials: true });
        socket.on('new_message', (data) => {
            // Refresh tasks to get latest messages and timestamps
            // Alternatively, we could update the specific task in state
            setMyTasks(prev => prev.map(t => {
                if (t._id === data.taskId) {
                    return {
                        ...t,
                        messages: [...(t.messages || []), { ...data, createdAt: new Date() }]
                    };
                }
                return t;
            }));
        });

        return () => socket.disconnect();
    }, []);

    const fetchTasks = async () => {
        setIsFetching(true);
        setError('');
        try {
            const [allTasksRes, myTasksRes] = await Promise.all([
                taskAPI.getAll({ status: 'open' }),
                taskAPI.getMy()
            ]);
            setTasks(allTasksRes.data.data || []);
            setMyTasks(myTasksRes.data.data || []);
        } catch (err) {
            console.error('Error fetching tasks:', err);
            setError('Failed to load tasks. Please try again.');
        } finally {
            setIsFetching(false);
        }
    };

    // Check if user has applied to a task
    const hasApplied = (task) => {
        return task.applicants?.some(a => a.user?._id === user?.id || a.user === user?.id);
    };

    // Check if task is assigned to current user
    const isAssignedToMe = (task) => {
        return task.assignedTo?._id === user?.id || task.assignedTo === user?.id;
    };

    // Get available tasks (open and not applied)
    const availableTasks = tasks.filter(t => t.status === 'open' && !hasApplied(t));

    // Get tasks I've applied to (from my tasks)
    const appliedTasks = myTasks.filter(t => hasApplied(t) && !isAssignedToMe(t) && t.status === 'open');

    // Get tasks assigned to me
    const assignedTasks = myTasks.filter(t => isAssignedToMe(t));

    const getCurrentTasks = () => {
        switch (activeTab) {
            case 'applied': return appliedTasks;
            case 'assigned': return assignedTasks;
            default: return availableTasks;
        }
    };

    const hasUnread = (task) => {
        if (!task.messages || task.messages.length === 0) return false;
        const lastMessage = task.messages[task.messages.length - 1];
        const lastRead = new Date(task.lastReadByJober || 0);
        return new Date(lastMessage.createdAt) > lastRead && (lastMessage.sender?._id !== user.id && lastMessage.senderId !== user.id);
    };

    const filteredTasks = getCurrentTasks().filter(t =>
        t.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleApply = async () => {
        if (!applicationMessage.trim() || !selectedTask) return;
        setIsSubmitting(true);
        setError('');
        try {
            await taskAPI.apply(selectedTask._id, applicationMessage);
            setApplyModalOpen(false);
            setApplicationMessage('');
            setSelectedTask(null);
            fetchTasks();
        } catch (err) {
            console.error('Error applying:', err);
            setError(err.response?.data?.message || 'Failed to apply. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitWork = async () => {
        if (!submission.notes.trim() || !submission.accountDetails.trim() || !selectedTask) {
            alert('Please fill all fields');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('notes', submission.notes);
            formData.append('projectLink', submission.projectLink);
            formData.append('accountDetails', submission.accountDetails);
            await taskAPI.submit(selectedTask._id, formData);
            setSubmitModalOpen(false);
            setSubmission({ notes: '', projectLink: '', accountDetails: '' });
            setSelectedTask(null);
            fetchTasks();
        } catch (err) {
            console.error('Error submitting:', err);
            setError(err.response?.data?.message || 'Failed to submit. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Are you sure you want to PERMANENTLY delete this project from the database? This action cannot be undone.')) return;

        setIsDeleting(taskId);
        try {
            await taskAPI.delete(taskId);
            fetchTasks();
            alert('Project deleted permanently.');
        } catch (err) {
            console.error('Error deleting task:', err);
            alert(err.response?.data?.message || 'Failed to delete task');
        } finally {
            setIsDeleting(false);
        }
    };

    if (isFetching) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                <span className="ml-2 text-gray-600">Loading tasks...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Paid Tasks</h1>
                    <p className="text-gray-500">Browse, apply, and complete paid tasks</p>
                </div>
                <button onClick={fetchTasks} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-600">{error}</span>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('available')}
                    className={`px-5 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'available' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600'}`}
                >
                    Available ({availableTasks.length})
                </button>
                <button
                    onClick={() => setActiveTab('applied')}
                    className={`px-5 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'applied' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600'}`}
                >
                    My Applications ({appliedTasks.length})
                </button>
                <button
                    onClick={() => setActiveTab('assigned')}
                    className={`px-5 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'assigned' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600'}`}
                >
                    Assigned ({assignedTasks.length})
                </button>
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center bg-gray-50 rounded-xl px-4 py-3">
                    <Search className="w-5 h-5 text-gray-400 mr-3" />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none w-full text-gray-700"
                    />
                </div>
            </div>

            {/* Tasks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTasks.map((task, index) => {
                    const assigned = isAssignedToMe(task);
                    const hasSubmitted = task.submission?.notes;
                    const isPaid = task.paymentSent;

                    return (
                        <motion.div
                            key={task._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all ${hasSubmitted ? 'opacity-75' : ''}`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                                    <Briefcase className="w-6 h-6 text-white" />
                                </div>
                                {hasApplied(task) && !assigned && <Badge variant="warning">Applied</Badge>}
                                {assigned && !hasSubmitted && <Badge variant="info">Assigned</Badge>}
                                {hasSubmitted && !isPaid && <Badge variant="warning">Pending Payment</Badge>}
                                {isPaid && <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>}
                            </div>

                            <h3 className="font-bold text-gray-900 mb-2">{task.title}</h3>
                            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{task.description}</p>

                            <div className="flex flex-wrap gap-1 mb-4">
                                {(task.skills || '').split(',').map((skill, i) => (
                                    <span key={i} className="px-2 py-1 bg-purple-50 text-purple-600 text-xs rounded-md">
                                        {skill.trim()}
                                    </span>
                                ))}
                            </div>

                            <div className="flex items-center justify-between text-sm mb-4">
                                <span className="flex items-center gap-1 text-gray-500">
                                    <Calendar className="w-4 h-4" />
                                    {task.deadline && new Date(task.deadline).toLocaleDateString()}
                                </span>
                                <span className="font-bold text-purple-600">
                                    Rs {(task.budget || 0).toLocaleString()}
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 border-t border-gray-100">
                                {!hasApplied(task) && !assigned && (
                                    <button
                                        onClick={() => { setSelectedTask(task); setApplyModalOpen(true); }}
                                        className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                                    >
                                        <Send className="w-4 h-4" />
                                        Apply Now
                                    </button>
                                )}
                                {hasApplied(task) && !assigned && (
                                    <div className="text-center text-sm text-gray-500 py-2">Application under review</div>
                                )}
                                {assigned && !hasSubmitted && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setSelectedTask(task); setSubmitModalOpen(true); }}
                                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                                        >
                                            <Upload className="w-4 h-4" />
                                            Submit
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedTask(task);
                                                setChatModalOpen(true);
                                                // Update local state immediately to hide dot
                                                setMyTasks(prev => prev.map(t => t._id === task._id ? { ...t, lastReadByJober: new Date().toISOString() } : t));
                                            }}
                                            className="flex-1 py-2.5 bg-purple-100 text-purple-600 hover:bg-purple-200 rounded-xl font-medium flex items-center justify-center gap-2 relative"
                                        >
                                            <Link className="w-4 h-4" />
                                            Chat
                                            {hasUnread(task) && (
                                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTask(task._id)}
                                            disabled={isDeleting === task._id}
                                            className="px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 font-medium"
                                            title="Permanently Delete Project"
                                        >
                                            {isDeleting === task._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            Delete
                                        </button>
                                    </div>
                                )}
                                {hasSubmitted && !isPaid && (
                                    <div className="text-center text-sm text-amber-600 py-2">Awaiting verification & payment</div>
                                )}
                                {isPaid && (
                                    <div className="text-center text-sm text-emerald-600 py-2 flex items-center justify-center gap-1">
                                        <CheckCircle className="w-4 h-4" />
                                        Payment Received
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {filteredTasks.length === 0 && (
                <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No tasks found</p>
                </div>
            )}

            {/* Apply Modal */}
            <Modal isOpen={applyModalOpen} onClose={() => setApplyModalOpen(false)} title="Apply for Task" size="md">
                {selectedTask && (
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <h3 className="font-semibold text-gray-900">{selectedTask.title}</h3>
                            <p className="text-sm text-purple-600 font-medium mt-1">
                                Budget: Rs {(selectedTask.budget || 0).toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Why should we hire you? *
                            </label>
                            <textarea
                                value={applicationMessage}
                                onChange={(e) => setApplicationMessage(e.target.value)}
                                placeholder="Describe your experience and why you're the best fit..."
                                rows={4}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                            />
                        </div>
                        <div className="flex gap-3 pt-4 border-t">
                            <button onClick={() => setApplyModalOpen(false)} className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">
                                Cancel
                            </button>
                            <button
                                onClick={handleApply}
                                disabled={isSubmitting}
                                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Application'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Submit Work Modal */}
            <Modal isOpen={submitModalOpen} onClose={() => setSubmitModalOpen(false)} title="Submit Your Work" size="md">
                {selectedTask && (
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <h3 className="font-semibold text-gray-900">{selectedTask.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">Deadline: {selectedTask.deadline && new Date(selectedTask.deadline).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Work Description / Notes *</label>
                            <textarea
                                value={submission.notes}
                                onChange={(e) => setSubmission({ ...submission, notes: e.target.value })}
                                placeholder="Describe what you've completed..."
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Link className="w-4 h-4 inline mr-1" />
                                Project Link (e.g., GitHub, Drive)
                            </label>
                            <input
                                type="url"
                                value={submission.projectLink}
                                onChange={(e) => setSubmission({ ...submission, projectLink: e.target.value })}
                                placeholder="https://github.com/your-repo"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <CreditCard className="w-4 h-4 inline mr-1" />
                                Payment Account Details *
                            </label>
                            <input
                                type="text"
                                value={submission.accountDetails}
                                onChange={(e) => setSubmission({ ...submission, accountDetails: e.target.value })}
                                placeholder="e.g., JazzCash: 0300-1234567 or Bank: IBAN..."
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                            />
                        </div>
                        <div className="flex gap-3 pt-4 border-t">
                            <button onClick={() => setSubmitModalOpen(false)} className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitWork}
                                disabled={isSubmitting}
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Work'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
            {/* Chat Modal */}
            <Modal isOpen={chatModalOpen} onClose={() => setChatModalOpen(false)} title="Project Discussion" size="md">
                {selectedTask && (
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <h3 className="font-semibold text-gray-900 leading-tight">{selectedTask.title}</h3>
                            <p className="text-xs text-gray-500 mt-1 uppercase font-bold tracking-widest">Chat with Admin</p>
                        </div>

                        <TaskChat
                            taskId={selectedTask._id}
                            currentUser={user}
                            taskMessages={selectedTask.messages || []}
                        />

                        <div className="pt-2">
                            <button onClick={() => setChatModalOpen(false)} className="w-full py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default BrowseTasks;
