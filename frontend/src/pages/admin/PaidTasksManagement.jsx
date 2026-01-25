import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search, Calendar, CheckCircle, Loader2, Eye, Users, Briefcase, RefreshCw, AlertCircle, Link, Trash2
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { taskAPI } from '../../services/api';
import TaskChat from '../job/components/TaskChat';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api', '');

const PaidTasksManagement = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const { user } = useSelector((state) => state.auth);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [viewMode, setViewMode] = useState(null);
    const [viewingProfile, setViewingProfile] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        budget: '',
        deadline: '',
        skills: '',
    });

    // Fetch tasks on component mount
    useEffect(() => {
        fetchTasks();

        // Socket for real-time unread updates
        const socket = io(SOCKET_URL, { withCredentials: true });
        socket.on('new_message', (data) => {
            setTasks(prev => prev.map(t => {
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
            const response = await taskAPI.getAll();
            setTasks(response.data.data || []);
        } catch (err) {
            console.error('Error fetching tasks:', err);
            setError('Failed to load tasks. Please try again.');
        } finally {
            setIsFetching(false);
        }
    };

    const hasUnread = (task) => {
        if (!task.messages || task.messages.length === 0) return false;
        const lastMessage = task.messages[task.messages.length - 1];
        const lastRead = new Date(task.lastReadByAdmin || 0);
        return new Date(lastMessage.createdAt) > lastRead && (lastMessage.sender?._id !== user.id && lastMessage.senderId !== user.id);
    };

    const filteredTasks = tasks.filter((task) =>
        task.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusConfig = (status) => {
        switch (status) {
            case 'open': return { variant: 'success', label: 'Open for Applications' };
            case 'assigned': return { variant: 'warning', label: 'Assigned' };
            case 'submitted': return { variant: 'info', label: 'Pending Review' };
            case 'completed': return { variant: 'primary', label: 'Completed' };
            default: return { variant: 'secondary', label: status };
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await taskAPI.create({
                title: formData.title,
                description: formData.description,
                budget: Number(formData.budget),
                deadline: formData.deadline,
                skills: formData.skills,
            });
            setIsModalOpen(false);
            setFormData({ title: '', description: '', budget: '', deadline: '', skills: '' });
            fetchTasks(); // Refresh list
        } catch (err) {
            console.error('Error creating task:', err);
            setError(err.response?.data?.message || 'Failed to create task');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAssignTask = async (taskId, applicantId) => {
        try {
            await taskAPI.assign(taskId, applicantId);
            setViewMode(null);
            setSelectedTask(null);
            fetchTasks(); // Refresh list
        } catch (err) {
            console.error('Error assigning task:', err);
            alert(err.response?.data?.message || 'Failed to assign task');
        }
    };

    const handleVerifyAndPay = async (taskId) => {
        try {
            await taskAPI.complete(taskId);
            setViewMode(null);
            setSelectedTask(null);
            fetchTasks(); // Refresh list
        } catch (err) {
            console.error('Error completing task:', err);
            alert(err.response?.data?.message || 'Failed to complete task');
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Are you sure you want to PERMANENTLY delete this task from the database? This action cannot be undone.')) return;

        setIsDeleting(taskId);
        try {
            await taskAPI.delete(taskId);
            fetchTasks(); // Refresh list
            alert('Task deleted permanently.');
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Paid Tasks</h1>
                    <p className="text-gray-500">Create and manage freelance tasks</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchTasks}
                        className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all duration-300 font-medium"
                    >
                        <Briefcase className="w-5 h-5" />
                        Create Paid Task
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-600">{error}</span>
                </div>
            )}

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

            {/* No Tasks */}
            {filteredTasks.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600">No tasks found</h3>
                    <p className="text-gray-400">Create your first paid task to get started</p>
                </div>
            )}

            {/* Tasks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTasks.map((task, index) => {
                    const statusConfig = getStatusConfig(task.status);
                    return (
                        <motion.div
                            key={task._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`bg-white rounded-2xl p-6 border border-gray-100 ${task.status === 'assigned' ? 'opacity-75' : ''}`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                                    <Briefcase className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex gap-2">
                                    <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                                    <button
                                        onClick={() => handleDeleteTask(task._id)}
                                        disabled={isDeleting === task._id}
                                        className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-sm border border-red-100"
                                        title="Permanently Delete Task"
                                    >
                                        {isDeleting === task._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                        Delete
                                    </button>
                                </div>
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

                            {/* Actions based on status */}
                            <div className="flex gap-2 pt-4 border-t border-gray-100">
                                {task.status === 'open' && (
                                    <button
                                        onClick={() => { setSelectedTask(task); setViewMode('applicants'); }}
                                        className="flex-1 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl flex items-center justify-center gap-1"
                                    >
                                        <Users className="w-4 h-4" />
                                        {task.applicants?.length || 0} Applicants
                                    </button>
                                )}
                                {task.status === 'assigned' && (
                                    <div className="flex gap-2 w-full">
                                        <div className="flex-1 py-2 text-sm text-gray-500">
                                            Assigned to: <strong>{task.assignedTo?.name}</strong>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedTask(task);
                                                setViewMode('chat');
                                                // Update local state immediately
                                                setTasks(prev => prev.map(t => t._id === task._id ? { ...t, lastReadByAdmin: new Date().toISOString() } : t));
                                            }}
                                            className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl flex items-center justify-center gap-1 relative"
                                        >
                                            <Link className="w-4 h-4" />
                                            Chat
                                            {hasUnread(task) && (
                                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse" />
                                            )}
                                        </button>
                                    </div>
                                )}
                                {task.status === 'submitted' && (
                                    <div className="flex gap-2 w-full">
                                        <button
                                            onClick={() => { setSelectedTask(task); setViewMode('submission'); }}
                                            className="flex-1 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl flex items-center justify-center gap-1"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Review
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedTask(task);
                                                setViewMode('chat');
                                                // Update local state immediately
                                                setTasks(prev => prev.map(t => t._id === task._id ? { ...t, lastReadByAdmin: new Date().toISOString() } : t));
                                            }}
                                            className="flex-1 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl flex items-center justify-center gap-1 relative"
                                        >
                                            <Link className="w-4 h-4" />
                                            Chat
                                            {hasUnread(task) && (
                                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse" />
                                            )}
                                        </button>
                                    </div>
                                )}
                                {task.status === 'completed' && (
                                    <div className="flex-1 py-2 text-sm text-center text-emerald-600 bg-emerald-50 rounded-xl flex items-center justify-center gap-1">
                                        <CheckCircle className="w-4 h-4" />
                                        Payment Sent
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Create Task Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Paid Task" size="lg">
                <form onSubmit={handleCreateTask} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Task Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Build a Landing Page"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Budget (Rs) *</label>
                            <input
                                type="number"
                                value={formData.budget}
                                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                placeholder="25000"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Deadline *</label>
                            <input
                                type="date"
                                value={formData.deadline}
                                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Required Skills</label>
                        <input
                            type="text"
                            value={formData.skills}
                            onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                            placeholder="e.g., React, Node.js, MongoDB"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                        />
                    </div>
                    <div className="flex gap-3 pt-4 border-t">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">
                            Cancel
                        </button>
                        <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Task'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View Applicants Modal */}
            <Modal isOpen={viewMode === 'applicants' && selectedTask} onClose={() => { setViewMode(null); setSelectedTask(null); }} title="Task Applicants" size="lg">
                {selectedTask && (
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <h3 className="font-semibold text-gray-900">{selectedTask.title}</h3>
                            <p className="text-sm text-gray-500">Budget: Rs {(selectedTask.budget || 0).toLocaleString()}</p>
                        </div>
                        {(!selectedTask.applicants || selectedTask.applicants.length === 0) ? (
                            <p className="text-center text-gray-500 py-8">No applications yet</p>
                        ) : (
                            <div className="space-y-3">
                                {selectedTask.applicants.map((applicant) => (
                                    <div key={applicant.user?._id || applicant._id} className="p-4 bg-gray-50 rounded-xl">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-lg">
                                                    {applicant.user?.name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{applicant.user?.name}</p>
                                                    <p className="text-sm text-gray-500">{applicant.user?.email}</p>
                                                    {applicant.user?.rating && (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <span className="text-amber-500">★</span>
                                                            <span className="text-xs text-gray-500">{applicant.user.rating} • {applicant.user.completedTasks || 0} tasks</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setViewingProfile(applicant.user)}
                                                    className="px-3 py-2 text-purple-600 bg-white border border-purple-200 hover:bg-purple-50 text-sm rounded-xl font-medium flex items-center gap-1"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    Profile
                                                </button>
                                                <button
                                                    onClick={() => handleAssignTask(selectedTask._id, applicant.user?._id)}
                                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-xl font-medium"
                                                >
                                                    Assign
                                                </button>
                                            </div>
                                        </div>
                                        {applicant.message && (
                                            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-100">
                                                <p className="text-xs text-gray-400 mb-1">Application Message:</p>
                                                <p className="text-sm text-gray-600">{applicant.message}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* View Profile Modal */}
            <Modal isOpen={viewingProfile !== null} onClose={() => setViewingProfile(null)} title="Applicant Profile" size="md">
                {viewingProfile && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-2xl">
                                {viewingProfile.name?.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{viewingProfile.name}</h3>
                                <p className="text-gray-500">{viewingProfile.email}</p>
                                {viewingProfile.rating && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-amber-500 text-lg">★ {viewingProfile.rating}</span>
                                        <span className="text-sm text-gray-400">({viewingProfile.completedTasks || 0} tasks)</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <p className="text-xs text-gray-400 mb-1">Phone</p>
                                <p className="text-sm font-medium text-gray-900">{viewingProfile.phone || 'Not provided'}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <p className="text-xs text-gray-400 mb-1">Experience</p>
                                <p className="text-sm font-medium text-gray-900">{viewingProfile.experience || 'Not specified'}</p>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-400 mb-2">Skills</p>
                            <div className="flex flex-wrap gap-2">
                                {(viewingProfile.skills || '').split(',').map((skill, i) => (
                                    <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-lg">
                                        {skill.trim()}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {viewingProfile.portfolio && (
                            <div className="p-4 bg-blue-50 rounded-xl">
                                <p className="text-xs text-gray-400 mb-1">Portfolio</p>
                                <a href={viewingProfile.portfolio} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                                    {viewingProfile.portfolio}
                                </a>
                            </div>
                        )}

                        <button onClick={() => setViewingProfile(null)} className="w-full py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">
                            Close
                        </button>
                    </div>
                )}
            </Modal>

            {/* View Submission Modal */}
            <Modal isOpen={viewMode === 'submission' && selectedTask} onClose={() => { setViewMode(null); setSelectedTask(null); }} title="Review Submission" size="lg">
                {selectedTask?.submission && (
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-gray-900">{selectedTask.title}</h3>
                                <span className="text-sm text-gray-500">By: {selectedTask.assignedTo?.name}</span>
                            </div>
                            <p className="text-sm text-gray-500">Budget: Rs {(selectedTask.budget || 0).toLocaleString()}</p>
                        </div>

                        <div className="p-4 bg-blue-50 rounded-xl">
                            <h4 className="font-medium text-gray-900 mb-2">Submission Details</h4>
                            <p className="text-sm text-gray-600 mb-2">{selectedTask.submission.notes}</p>

                            {selectedTask.submission.projectLink && (
                                <div className="mt-3 mb-3">
                                    <p className="text-xs text-gray-400 mb-1">Project Link:</p>
                                    <a
                                        href={selectedTask.submission.projectLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline font-medium flex items-center gap-1 text-sm"
                                    >
                                        <Link className="w-4 h-4" />
                                        {selectedTask.submission.projectLink}
                                    </a>
                                </div>
                            )}

                            <p className="text-xs text-gray-500">Submitted: {selectedTask.submission.submittedAt && new Date(selectedTask.submission.submittedAt).toLocaleDateString()}</p>
                        </div>

                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                            <h4 className="font-medium text-gray-900 mb-2">Payment Details</h4>
                            <p className="text-sm text-emerald-700 font-mono">{selectedTask.submission.accountDetails}</p>
                        </div>

                        <div className="flex gap-3 pt-4 border-t">
                            <button onClick={() => { setViewMode(null); setSelectedTask(null); }} className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">
                                Close
                            </button>
                            <button
                                onClick={() => handleVerifyAndPay(selectedTask._id)}
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" />
                                Verify & Send Payment
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Chat Modal */}
            <Modal isOpen={viewMode === 'chat' && selectedTask} onClose={() => { setViewMode(null); setSelectedTask(null); }} title="Project Discussion" size="md">
                {selectedTask && (
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <h3 className="font-semibold text-gray-900 leading-tight">{selectedTask.title}</h3>
                            <p className="text-xs text-gray-500 mt-1 uppercase font-bold tracking-widest">Chat with {selectedTask.assignedTo?.name || 'Jober'}</p>
                        </div>

                        <TaskChat
                            taskId={selectedTask._id}
                            currentUser={user}
                            taskMessages={selectedTask.messages || []}
                        />

                        <div className="pt-2">
                            <button onClick={() => { setViewMode(null); setSelectedTask(null); }} className="w-full py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default PaidTasksManagement;
